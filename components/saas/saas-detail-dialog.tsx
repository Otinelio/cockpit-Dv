"use client";

import { useEffect, useState } from "react";
import Avatar from "@/components/_ui/avatar";
import Button from "@/components/_ui/button";
import Tag from "@/components/_ui/tag";
import { Checkbox } from "@/components/_ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/_ui/dialog";
import { Input } from "@/components/_ui/input";
import Field from "@/components/_ui/field";
import NouveauDocumentDialog from "@/components/saas/nouveau-document-dialog";
import DocumentPreviewModal from "@/components/saas/document-preview-modal";
import { useCockpit } from "@/stores/cockpit-store";
import { cn } from "@/lib/utils";
import type {
  SaasDV,
  StatutSaasDV,
  DocumentSaas,
  JalonSaas,
} from "@/server/dv-types";
import {
  ExternalLink,
  Plus,
  FileText,
  Smartphone,
  CheckCircle2,
  Trash2,
  Calendar,
  Clock,
  Code,
  Globe,
  Target,
  ListTodo,
  FolderOpen,
  Info,
  Eye,
  Save,
} from "lucide-react";

interface Props {
  saas: SaasDV | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ContentProps {
  saas: SaasDV;
  onClose: () => void;
}

function SaasDetailContent({ saas, onClose }: ContentProps) {
  const [onglet, setOnglet] = useState<"dossier" | "objectifs" | "taches" | "technique">("dossier");
  const [modalDoc, setModalDoc] = useState(false);
  const [docAVisualiser, setDocAVisualiser] = useState<DocumentSaas | null>(null);

  // Formulaire pour ajouter un objectif
  const [nouvelObjTitre, setNouvelObjTitre] = useState("");
  const [nouvelObjDate, setNouvelObjDate] = useState("");
  const [nouvelObjAttentes, setNouvelObjAttentes] = useState("");
  const [afficherFormObj, setAfficherFormObj] = useState(false);

  // Formulaire rapide pour ajouter une tâche liée
  const [afficherFormTache, setAfficherFormTache] = useState(false);
  const [titreTache, setTitreTache] = useState("");
  const [assigneTache, setAssigneTache] = useState("Othnelio");
  const [echeanceTache, setEcheanceTache] = useState(() => new Date().toISOString().slice(0, 10));

  // Formulaire d'édition complète des informations du SaaS
  const [nom, setNom] = useState(() => saas.nom);
  const [slogan, setSlogan] = useState(() => saas.slogan);
  const [description, setDescription] = useState(() => saas.description);
  const [statut, setStatut] = useState<StatutSaasDV>(() => saas.statut);
  const [leadTech, setLeadTech] = useState(() => saas.leadTech);
  const [leadMarketing, setLeadMarketing] = useState(() => saas.leadMarketing);
  const [leadOps, setLeadOps] = useState(() => saas.leadOps);
  const [url, setUrl] = useState(() => saas.url || "");
  const [depotGit, setDepotGit] = useState(() => saas.depotGit || "");
  const [apkUrl, setApkUrl] = useState(() => saas.apkUrl || "");
  const [mrrFCFA, setMrrFCFA] = useState<number | "">(() => saas.mrrFCFA ?? 0);
  const [objectifMrrFCFA, setObjectifMrrFCFA] = useState<number | "">(() => saas.objectifMrrFCFA ?? 500000);
  const [utilisateurs, setUtilisateurs] = useState<number | "">(() => saas.utilisateurs ?? 0);
  const [enregistrement, setEnregistrement] = useState(false);

  const modifierSaas = useCockpit((s) => s.modifierSaas);
  const supprimerSaas = useCockpit((s) => s.supprimerSaas);
  const taches = useCockpit((s) => s.taches);
  const chargerTaches = useCockpit((s) => s.chargerTaches);
  const ajouterTache = useCockpit((s) => s.ajouterTache);
  const modifierTache = useCockpit((s) => s.modifierTache);
  const toast = useCockpit((s) => s.toast);

  useEffect(() => {
    chargerTaches();
  }, [chargerTaches]);

  // Filtrer les tâches liées à ce SaaS
  const tachesLiees = (taches ?? []).filter(
    (t) =>
      t.saasId === saas.id ||
      t.titre.toLowerCase().includes(saas.nom.toLowerCase()) ||
      t.description?.toLowerCase().includes(saas.nom.toLowerCase()),
  );

  const jalonsFaits = (saas.jalons ?? []).filter((j) => j.termine).length;
  const totalJalons = (saas.jalons ?? []).length;
  const pctJalons = totalJalons > 0 ? Math.round((jalonsFaits / totalJalons) * 100) : 0;

  async function handleAjouterObjectif(e: React.FormEvent) {
    e.preventDefault();
    if (!nouvelObjTitre.trim()) return;

    const nouveauJalon: JalonSaas = {
      id: `obj-${Date.now()}`,
      titre: nouvelObjTitre.trim(),
      dateLimite: nouvelObjDate || undefined,
      echeance: nouvelObjDate || undefined,
      attentes: nouvelObjAttentes.trim() || undefined,
      description: nouvelObjAttentes.trim() || undefined,
      termine: false,
    };

    const nouveaux = [...(saas.jalons ?? []), nouveauJalon];
    await modifierSaas(saas.id, { jalons: nouveaux });

    setNouvelObjTitre("");
    setNouvelObjDate("");
    setNouvelObjAttentes("");
    setAfficherFormObj(false);
    toast({ ton: "succes", titre: "Objectif ajouté", texte: `Ajouté à la roadmap de ${saas.nom}` });
  }

  async function handleAjouterTache(e: React.FormEvent) {
    e.preventDefault();
    if (!titreTache.trim()) return;

    await ajouterTache({
      titre: titreTache.trim(),
      type: "dev_saas",
      assigneA: assigneTache,
      creePar: "Moi",
      statut: "a_faire",
      priorite: "haute",
      echeance: echeanceTache,
      saasId: saas.id,
    });

    setTitreTache("");
    setAfficherFormTache(false);
    toast({ ton: "succes", titre: "Tâche créée", texte: `Liée au projet ${saas.nom}` });
  }

  async function toggleJalon(jId: string, termine: boolean) {
    const maj = (saas.jalons ?? []).map((j) => (j.id === jId ? { ...j, termine } : j));
    await modifierSaas(saas.id, { jalons: maj });
  }

  async function supprimerJalon(jId: string) {
    const maj = (saas.jalons ?? []).filter((j) => j.id !== jId);
    await modifierSaas(saas.id, { jalons: maj });
  }

  async function supprimerDoc(dId: string) {
    const maj = (saas.documents ?? []).filter((d) => d.id !== dId);
    await modifierSaas(saas.id, { documents: maj });
    toast({ ton: "info", titre: "Document supprimé", texte: "Le fichier a été retiré du dossier." });
  }

  async function handleSauvegarderInfos(e: React.FormEvent) {
    e.preventDefault();
    setEnregistrement(true);

    await modifierSaas(saas.id, {
      nom: nom.trim() || saas.nom,
      slogan: slogan.trim() || saas.slogan,
      description: description.trim() || saas.description,
      statut,
      leadTech,
      leadMarketing,
      leadOps,
      url: url.trim() || undefined,
      depotGit: depotGit.trim() || undefined,
      apkUrl: apkUrl.trim() || undefined,
      mrrFCFA: typeof mrrFCFA === "number" ? mrrFCFA : 0,
      objectifMrrFCFA: typeof objectifMrrFCFA === "number" ? objectifMrrFCFA : 500000,
      utilisateurs: typeof utilisateurs === "number" ? utilisateurs : 0,
    });

    setEnregistrement(false);
    toast({
      ton: "succes",
      titre: "Projet SaaS mis à jour",
      texte: "Toutes les informations ont été modifiées avec succès.",
    });
  }

  async function handleSupprimerProjet() {
    if (confirm(`Supprimer définitivement le projet SaaS "${saas.nom}" et tout son dossier ?`)) {
      await supprimerSaas(saas.id);
      onClose();
      toast({
        ton: "succes",
        titre: "SaaS supprimé",
        texte: `Le projet ${saas.nom} a été supprimé.`,
      });
    }
  }

  function statutBadge(s: StatutSaasDV) {
    switch (s) {
      case "production":
        return <Tag tone="green">En production</Tag>;
      case "beta":
        return <Tag tone="purple">Bêta privée</Tag>;
      case "prototypage":
        return <Tag tone="amber">Prototypage / MVP</Tag>;
      case "ideation":
        return <Tag tone="blue">Idéation</Tag>;
      default:
        return <Tag tone="neutral">En pause</Tag>;
    }
  }

  return (
    <>
      {/* Header Dossier de Projet */}
      <DialogHeader className="border-b border-border bg-card/60 p-5 sm:p-6 pb-4">
        <div className="flex flex-col gap-3">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 shadow-xs shrink-0">
                <FolderOpen className="size-6" />
              </div>
              <div className="flex flex-col">
                <div className="flex flex-wrap items-center gap-2">
                  <DialogTitle className="text-xl font-bold">{saas.nom}</DialogTitle>
                  {statutBadge(saas.statut)}
                </div>
                <DialogDescription className="text-xs text-subtle mt-0.5">
                  {saas.slogan}
                </DialogDescription>
              </div>
            </div>

            {/* Liens rapides du projet & Suppression */}
            <div className="flex items-center gap-1.5 shrink-0">
              {saas.url && (
                <a
                  href={saas.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-md border border-border bg-secondary px-2.5 py-1 text-xs text-foreground hover:bg-secondary/80 transition-colors"
                  title="Landing page / Web"
                >
                  <Globe className="size-3 text-purple-400" />
                  <span className="hidden sm:inline">Site web</span>
                </a>
              )}
              {saas.depotGit && (
                <a
                  href={`https://${saas.depotGit.replace(/^https?:\/\//, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-md border border-border bg-secondary px-2.5 py-1 text-xs text-foreground hover:bg-secondary/80 transition-colors"
                  title="Dépôt GitHub"
                >
                  <Code className="size-3" />
                  <span className="hidden sm:inline">GitHub</span>
                </a>
              )}
              {saas.apkUrl && (
                <button
                  type="button"
                  onClick={() => {
                    const apkDoc = saas.documents.find((d) => d.type === "apk");
                    if (apkDoc) setDocAVisualiser(apkDoc);
                    else window.open(saas.apkUrl, "_blank");
                  }}
                  className="inline-flex items-center gap-1 rounded-md bg-purple-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-purple-500 transition-colors"
                  title="Package APK Android"
                >
                  <Smartphone className="size-3" />
                  <span>APK</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleSupprimerProjet}
                className="text-muted-foreground hover:text-red-400 p-1.5 rounded transition-colors"
                title="Supprimer définitivement ce SaaS"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          </div>

          {/* Navigation des sous-dossiers / onglets */}
          <div className="flex items-center gap-2 border-t border-border/60 pt-3 overflow-x-auto scrollbar-none">
            <button
              type="button"
              onClick={() => setOnglet("dossier")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                onglet === "dossier"
                  ? "bg-purple-500/15 text-purple-400 border border-purple-500/30"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <FileText className="size-3.5" />
              Documents & APK ({(saas.documents ?? []).length})
            </button>

            <button
              type="button"
              onClick={() => setOnglet("objectifs")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                onglet === "objectifs"
                  ? "bg-purple-500/15 text-purple-400 border border-purple-500/30"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Target className="size-3.5" />
              Objectifs & Roadmap ({jalonsFaits}/{totalJalons})
            </button>

            <button
              type="button"
              onClick={() => setOnglet("taches")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                onglet === "taches"
                  ? "bg-purple-500/15 text-purple-400 border border-purple-500/30"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <ListTodo className="size-3.5" />
              Tâches liées ({tachesLiees.length})
            </button>

            <button
              type="button"
              onClick={() => setOnglet("technique")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                onglet === "technique"
                  ? "bg-purple-500/15 text-purple-400 border border-purple-500/30"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Info className="size-3.5" />
              Modifier les infos du projet
            </button>
          </div>
        </div>
      </DialogHeader>

      {/* Corps de l'onglet actif */}
      <div className="flex-1 overflow-y-auto p-5 sm:p-6">
        {/* ONGLET 1 : DOCUMENTS & FICHIERS */}
        {onglet === "dossier" && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-subtle">
                Fichiers APK, cahiers des charges, spécifications et maquettes rattachés
              </span>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setModalDoc(true)}
                className="gap-1.5"
              >
                <Plus className="size-3.5" />
                Ajouter / Téléverser un fichier
              </Button>
            </div>

            {(saas.documents ?? []).length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-secondary/20 p-8 text-center">
                <FolderOpen className="size-10 text-muted-foreground stroke-1" />
                <p className="text-sm font-medium text-foreground">
                  Le dossier de {saas.nom} est vide
                </p>
                <p className="text-xs text-subtle max-w-sm">
                  Téléverse ton premier fichier APK, cahier des charges ou ajoute des maquettes pour les regrouper ici.
                </p>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setModalDoc(true)}
                  className="gap-1.5 mt-1"
                >
                  <Plus className="size-3.5" />
                  Téléverser maintenant
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {saas.documents.map((doc) => {
                  const estApk = doc.type === "apk" || doc.nomFichier?.endsWith(".apk");
                  const estLien = doc.urlOuContenu.startsWith("http");

                  return (
                    <div
                      key={doc.id}
                      className="flex flex-col justify-between gap-3 rounded-xl border border-border bg-card p-4 hover:border-line-strong transition-all shadow-2xs group"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2.5 min-w-0">
                          <div
                            className={`flex size-8 items-center justify-center rounded-lg shrink-0 ${
                              estApk
                                ? "bg-purple-500/15 text-purple-400"
                                : "bg-blue-500/15 text-blue-400"
                            }`}
                          >
                            {estApk ? (
                              <Smartphone className="size-4" />
                            ) : (
                              <FileText className="size-4" />
                            )}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="text-xs font-semibold text-foreground truncate" title={doc.titre}>
                              {doc.titre}
                            </span>
                            <span className="text-[11px] text-subtle">
                              {doc.nomFichier ? `${doc.nomFichier} • ` : ""}
                              {doc.tailleOctets ? `${Math.round(doc.tailleOctets / 1024)} Ko • ` : ""}
                              {doc.date}
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => supprimerDoc(doc.id)}
                          className="text-muted-foreground hover:text-red-400 opacity-60 hover:opacity-100 p-1 transition-all"
                          title="Retirer ce document"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>

                      <div className="flex items-center justify-between border-t border-border/50 pt-2 text-xs">
                        <span className="text-[11px] text-muted-foreground capitalize">
                          {doc.type.replace("_", " ")}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setDocAVisualiser(doc)}
                            className="h-7 text-xs px-2 gap-1"
                          >
                            <Eye className="size-3" />
                            Prévisualiser
                          </Button>
                          {estLien && (
                            <a
                              href={doc.urlOuContenu}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-muted-foreground hover:text-foreground p-1"
                              title="Ouvrir le lien"
                            >
                              <ExternalLink className="size-3.5" />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ONGLET 2 : OBJECTIFS & ROADMAP */}
        {onglet === "objectifs" && (
          <div className="flex flex-col gap-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex flex-col">
                <span className="text-xs font-medium text-foreground">
                  Objectifs & Attentes du projet ({jalonsFaits}/{totalJalons} complétés)
                </span>
                <span className="text-[11px] text-subtle">
                  Définis les dates limites et les critères de succès attendus
                </span>
              </div>

              <Button
                variant="primary"
                size="sm"
                onClick={() => setAfficherFormObj(!afficherFormObj)}
                className="gap-1.5 self-start sm:self-auto"
              >
                <Plus className="size-3.5" />
                Nouvel objectif
              </Button>
            </div>

            {/* Barre de progression */}
            <div className="flex flex-col gap-1.5">
              <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full bg-purple-500 transition-all duration-300"
                  style={{ width: `${pctJalons}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-subtle">
                <span>Avancement global</span>
                <span className="font-semibold text-foreground">{pctJalons}%</span>
              </div>
            </div>

            {/* Formulaire création d'objectif */}
            {afficherFormObj && (
              <form
                onSubmit={handleAjouterObjectif}
                className="flex flex-col gap-3 rounded-xl border border-purple-500/30 bg-purple-500/5 p-4"
              >
                <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Target className="size-3.5 text-purple-400" />
                  Créer un nouvel objectif pour {saas.nom}
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <Field label="Intitulé de l'objectif" htmlFor="obj-titre">
                      <Input
                        id="obj-titre"
                        placeholder="Ex : Lancer le module de cashback et points de fidélité"
                        value={nouvelObjTitre}
                        onChange={(e) => setNouvelObjTitre(e.target.value)}
                        required
                      />
                    </Field>
                  </div>

                  <Field label="Date limite" htmlFor="obj-date">
                    <Input
                      id="obj-date"
                      type="date"
                      value={nouvelObjDate}
                      onChange={(e) => setNouvelObjDate(e.target.value)}
                    />
                  </Field>
                </div>

                <Field label="Attentes & Critères de succès" htmlFor="obj-attentes">
                  <textarea
                    id="obj-attentes"
                    rows={2}
                    placeholder="Ex : Doit être validé par au moins 3 restaurateurs pilotes avec un parcours en moins de 15 secondes."
                    value={nouvelObjAttentes}
                    onChange={(e) => setNouvelObjAttentes(e.target.value)}
                    className="w-full rounded-lg border border-line-strong bg-secondary p-2.5 text-xs text-foreground outline-none"
                  />
                </Field>

                <div className="flex justify-end gap-2 mt-1">
                  <Button
                    type="button"
                    variant="subtle"
                    size="sm"
                    onClick={() => setAfficherFormObj(false)}
                  >
                    Annuler
                  </Button>
                  <Button type="submit" variant="primary" size="sm">
                    Enregistrer l&apos;objectif
                  </Button>
                </div>
              </form>
            )}

            {/* Liste des objectifs */}
            {(saas.jalons ?? []).length === 0 ? (
              <p className="text-xs text-subtle italic text-center py-6">
                Aucun objectif enregistré. Clique sur &quot;Nouvel objectif&quot; pour définir la roadmap.
              </p>
            ) : (
              <div className="flex flex-col divide-y divide-border rounded-xl border border-border bg-card">
                {saas.jalons.map((j) => {
                  const dateLim = j.dateLimite || j.echeance;
                  return (
                    <div
                      key={j.id}
                      className="flex items-start justify-between gap-3 p-3.5 hover:bg-secondary/30 transition-colors"
                    >
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <Checkbox
                          checked={j.termine}
                          onCheckedChange={(checked) => toggleJalon(j.id, !!checked)}
                          className="mt-1"
                        />
                        <div className="flex flex-col min-w-0">
                          <span
                            className={cn(
                              "text-xs font-semibold text-foreground",
                              j.termine && "line-through text-muted-foreground",
                            )}
                          >
                            {j.titre}
                          </span>

                          {(j.attentes || j.description) && (
                            <p className="text-subtle text-xs mt-0.5 leading-relaxed">
                              {j.attentes || j.description}
                            </p>
                          )}

                          {dateLim && (
                            <div className="flex items-center gap-1.5 mt-2 text-[11px] text-muted-foreground">
                              <Calendar className="size-3 text-purple-400" />
                              <span>
                                Échéance :{" "}
                                <strong className="text-foreground">
                                  {dateLim.split("-").reverse().join("/")}
                                </strong>
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => supprimerJalon(j.id)}
                        className="text-muted-foreground hover:text-red-400 p-1 transition-colors"
                        title="Supprimer cet objectif"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ONGLET 3 : TÂCHES LIÉES */}
        {onglet === "taches" && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex flex-col">
                <span className="text-xs font-medium text-foreground">
                  Tâches d&apos;équipe synchronisées pour {saas.nom} ({tachesLiees.length})
                </span>
                <span className="text-[11px] text-subtle">
                  Toutes les tâches rattachées à ce SaaS sur la page des tâches apparaissent automatiquement ici
                </span>
              </div>

              <Button
                variant="primary"
                size="sm"
                onClick={() => setAfficherFormTache(!afficherFormTache)}
                className="gap-1.5 self-start sm:self-auto"
              >
                <Plus className="size-3.5" />
                Ajouter une tâche
              </Button>
            </div>

            {/* Formulaire ajout rapide de tâche */}
            {afficherFormTache && (
              <form
                onSubmit={handleAjouterTache}
                className="flex flex-col gap-3 rounded-xl border border-blue-500/30 bg-blue-500/5 p-4"
              >
                <span className="text-xs font-semibold text-foreground">
                  Nouvelle tâche pour {saas.nom}
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <Field label="Intitulé de la tâche" htmlFor="tch-titre">
                      <Input
                        id="tch-titre"
                        placeholder="Ex : Corriger le bug du QR code restaurateur"
                        value={titreTache}
                        onChange={(e) => setTitreTache(e.target.value)}
                        required
                      />
                    </Field>
                  </div>

                  <Field label="Assigné à" htmlFor="tch-assigne">
                    <select
                      id="tch-assigne"
                      value={assigneTache}
                      onChange={(e) => setAssigneTache(e.target.value)}
                      className="border-line-strong bg-secondary text-foreground rounded-lg border px-2.5 py-1.5 text-xs outline-none"
                    >
                      <option value="Othnelio">Othnelio</option>
                      <option value="Medard">Medard</option>
                      <option value="Roméo">Roméo</option>
                    </select>
                  </Field>
                </div>

                <div className="flex justify-between items-center mt-1">
                  <div className="flex items-center gap-2">
                    <Calendar className="size-3.5 text-muted-foreground" />
                    <Input
                      type="date"
                      value={echeanceTache}
                      onChange={(e) => setEcheanceTache(e.target.value)}
                      className="h-8 text-xs w-36"
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="subtle"
                      size="sm"
                      onClick={() => setAfficherFormTache(false)}
                    >
                      Annuler
                    </Button>
                    <Button type="submit" variant="primary" size="sm">
                      Créer la tâche
                    </Button>
                  </div>
                </div>
              </form>
            )}

            {/* Liste des tâches */}
            {tachesLiees.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-border bg-card p-8 text-center">
                <CheckCircle2 className="size-8 text-emerald-400 stroke-1" />
                <p className="text-xs text-subtle">
                  Aucune tâche en cours pour {saas.nom}.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border rounded-xl border border-border bg-card">
                {tachesLiees.map((t) => {
                  const estFaite = t.statut === "terminee";
                  return (
                    <div
                      key={t.id}
                      className="flex items-center justify-between gap-3 p-3 hover:bg-secondary/30 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Checkbox
                          checked={estFaite}
                          onCheckedChange={(checked) => {
                            modifierTache(t.id, {
                              statut: checked ? "terminee" : "a_faire",
                              termineeLe: checked ? new Date().toISOString() : undefined,
                            });
                          }}
                        />
                        <div className="flex flex-col min-w-0">
                          <span
                            className={cn(
                              "text-xs font-medium text-foreground truncate",
                              estFaite && "line-through text-muted-foreground",
                            )}
                          >
                            {t.titre}
                          </span>
                          <div className="flex items-center gap-2 text-[11px] text-subtle">
                            <span className="flex items-center gap-1">
                              <Avatar nom={t.assigneA} ton="purple" className="size-3.5 text-[7px]" />
                              {t.assigneA}
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Clock className="size-3 text-muted-foreground" />
                              {t.echeance.split("-").reverse().join("/")}
                            </span>
                          </div>
                        </div>
                      </div>

                      <Tag
                        tone={
                          t.statut === "terminee"
                            ? "green"
                            : t.priorite === "urgente"
                              ? "red"
                              : t.priorite === "haute"
                                ? "orange"
                                : "neutral"
                        }
                        size="sm"
                      >
                        {t.statut === "terminee" ? "Terminée" : t.priorite}
                      </Tag>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ONGLET 4 : MODIFICATION COMPLÈTE DU PROJET SAAS (CRUD UPDATE) */}
        {onglet === "technique" && (
          <form onSubmit={handleSauvegarderInfos} className="flex flex-col gap-5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-subtle">
                Modifie toutes les informations techniques, leads et objectifs financiers de ce SaaS
              </span>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={enregistrement}
                className="gap-1.5"
              >
                <Save className="size-3.5" />
                {enregistrement ? "Enregistrement…" : "Enregistrer les modifications"}
              </Button>
            </div>

            <div className="rounded-xl border border-border bg-card p-4 sm:p-5 flex flex-col gap-4">
              <h4 className="text-xs font-bold text-foreground uppercase tracking-wide">
                Informations générales & Positionnement
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Nom du produit SaaS" htmlFor="saas-edit-nom">
                  <Input
                    id="saas-edit-nom"
                    value={nom}
                    onChange={(e) => setNom(e.target.value)}
                    required
                  />
                </Field>

                <Field label="Statut du produit" htmlFor="saas-edit-statut">
                  <select
                    id="saas-edit-statut"
                    value={statut}
                    onChange={(e) => setStatut(e.target.value as StatutSaasDV)}
                    className="border-line-strong bg-secondary text-foreground rounded-lg border px-3 py-2 text-xs outline-none"
                  >
                    <option value="ideation">Idéation / Réflexion</option>
                    <option value="prototypage">Prototypage / MVP</option>
                    <option value="beta">Bêta privée</option>
                    <option value="production">En production commerciale</option>
                    <option value="en_pause">En pause</option>
                  </select>
                </Field>
              </div>

              <Field label="Slogan / Proposition de valeur courte" htmlFor="saas-edit-slogan">
                <Input
                  id="saas-edit-slogan"
                  value={slogan}
                  onChange={(e) => setSlogan(e.target.value)}
                  required
                />
              </Field>

              <Field label="Description détaillée du SaaS" htmlFor="saas-edit-description">
                <textarea
                  id="saas-edit-description"
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-lg border border-line-strong bg-secondary p-2.5 text-xs text-foreground outline-none leading-relaxed"
                />
              </Field>
            </div>

            <div className="rounded-xl border border-border bg-card p-4 sm:p-5 flex flex-col gap-4">
              <h4 className="text-xs font-bold text-foreground uppercase tracking-wide">
                Équipe & Leads DigitalVision
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Field label="Lead Technique" htmlFor="saas-edit-lead-tech">
                  <select
                    id="saas-edit-lead-tech"
                    value={leadTech}
                    onChange={(e) => setLeadTech(e.target.value)}
                    className="border-line-strong bg-secondary text-foreground rounded-lg border px-3 py-2 text-xs outline-none"
                  >
                    <option value="Othnelio">Othnelio</option>
                    <option value="Medard">Medard</option>
                    <option value="Roméo">Roméo</option>
                  </select>
                </Field>

                <Field label="Lead Marketing & Ventes" htmlFor="saas-edit-lead-mktg">
                  <select
                    id="saas-edit-lead-mktg"
                    value={leadMarketing}
                    onChange={(e) => setLeadMarketing(e.target.value)}
                    className="border-line-strong bg-secondary text-foreground rounded-lg border px-3 py-2 text-xs outline-none"
                  >
                    <option value="Othnelio">Othnelio</option>
                    <option value="Medard">Medard</option>
                    <option value="Roméo">Roméo</option>
                  </select>
                </Field>

                <Field label="Lead Opérations" htmlFor="saas-edit-lead-ops">
                  <select
                    id="saas-edit-lead-ops"
                    value={leadOps}
                    onChange={(e) => setLeadOps(e.target.value)}
                    className="border-line-strong bg-secondary text-foreground rounded-lg border px-3 py-2 text-xs outline-none"
                  >
                    <option value="Othnelio">Othnelio</option>
                    <option value="Medard">Medard</option>
                    <option value="Roméo">Roméo</option>
                  </select>
                </Field>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-4 sm:p-5 flex flex-col gap-4">
              <h4 className="text-xs font-bold text-foreground uppercase tracking-wide">
                Liens techniques & Déploiement
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Field label="Landing page / Site web" htmlFor="saas-edit-url">
                  <Input
                    id="saas-edit-url"
                    placeholder="https://..."
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                  />
                </Field>

                <Field label="Dépôt GitHub / GitLab" htmlFor="saas-edit-git">
                  <Input
                    id="saas-edit-git"
                    placeholder="github.com/digitalvision/..."
                    value={depotGit}
                    onChange={(e) => setDepotGit(e.target.value)}
                  />
                </Field>

                <Field label="Lien ou package APK Android" htmlFor="saas-edit-apk">
                  <Input
                    id="saas-edit-apk"
                    placeholder="Lien de téléchargement APK"
                    value={apkUrl}
                    onChange={(e) => setApkUrl(e.target.value)}
                  />
                </Field>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-4 sm:p-5 flex flex-col gap-4">
              <h4 className="text-xs font-bold text-foreground uppercase tracking-wide">
                Métriques & Traction financière
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Field label="Utilisateurs inscrits" htmlFor="saas-edit-users">
                  <Input
                    id="saas-edit-users"
                    type="number"
                    min={0}
                    value={utilisateurs}
                    onChange={(e) =>
                      setUtilisateurs(e.target.value === "" ? "" : Number(e.target.value))
                    }
                    className="tabular-nums"
                  />
                </Field>

                <Field label="MRR actuel (FCFA)" htmlFor="saas-edit-mrr">
                  <Input
                    id="saas-edit-mrr"
                    type="number"
                    min={0}
                    step={1000}
                    value={mrrFCFA}
                    onChange={(e) =>
                      setMrrFCFA(e.target.value === "" ? "" : Number(e.target.value))
                    }
                    className="tabular-nums"
                  />
                </Field>

                <Field label="Objectif MRR (FCFA)" htmlFor="saas-edit-obj-mrr">
                  <Input
                    id="saas-edit-obj-mrr"
                    type="number"
                    min={0}
                    step={1000}
                    value={objectifMrrFCFA}
                    onChange={(e) =>
                      setObjectifMrrFCFA(e.target.value === "" ? "" : Number(e.target.value))
                    }
                    className="tabular-nums"
                  />
                </Field>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleSupprimerProjet}
                className="text-red-400 hover:text-red-300 hover:bg-red-500/10 gap-1.5 self-start sm:self-auto"
              >
                <Trash2 className="size-3.5" />
                Supprimer définitivement ce SaaS
              </Button>

              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={enregistrement}
                className="gap-1.5"
              >
                <Save className="size-3.5" />
                {enregistrement ? "Enregistrement…" : "Enregistrer toutes les modifications"}
              </Button>
            </div>
          </form>
        )}
      </div>

      <NouveauDocumentDialog
        saas={saas}
        open={modalDoc}
        onOpenChange={setModalDoc}
      />

      <DocumentPreviewModal
        document={docAVisualiser}
        open={!!docAVisualiser}
        onOpenChange={(op) => !op && setDocAVisualiser(null)}
      />
    </>
  );
}

export default function SaasDetailDialog({ saas, open, onOpenChange }: Props) {
  if (!saas) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[850px] max-h-[92dvh] flex flex-col p-0 overflow-hidden">
        <SaasDetailContent
          key={saas.id}
          saas={saas}
          onClose={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

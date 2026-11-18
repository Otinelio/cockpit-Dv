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
import { euros } from "@/lib/format";
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
} from "lucide-react";

interface Props {
  saas: SaasDV | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function SaasDetailDialog({ saas, open, onOpenChange }: Props) {
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

  const modifierSaas = useCockpit((s) => s.modifierSaas);
  const taches = useCockpit((s) => s.taches);
  const chargerTaches = useCockpit((s) => s.chargerTaches);
  const ajouterTache = useCockpit((s) => s.ajouterTache);
  const modifierTache = useCockpit((s) => s.modifierTache);
  const toast = useCockpit((s) => s.toast);

  useEffect(() => {
    if (open) chargerTaches();
  }, [open, chargerTaches]);

  if (!saas) return null;

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
    if (!saas || !nouvelObjTitre.trim()) return;

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
    if (!saas || !titreTache.trim()) return;

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
    if (!saas) return;
    const maj = (saas.jalons ?? []).map((j) => (j.id === jId ? { ...j, termine } : j));
    await modifierSaas(saas.id, { jalons: maj });
  }

  async function supprimerJalon(jId: string) {
    if (!saas) return;
    const maj = (saas.jalons ?? []).filter((j) => j.id !== jId);
    await modifierSaas(saas.id, { jalons: maj });
  }

  async function supprimerDoc(dId: string) {
    if (!saas) return;
    const maj = (saas.documents ?? []).filter((d) => d.id !== dId);
    await modifierSaas(saas.id, { documents: maj });
    toast({ ton: "info", titre: "Document supprimé", texte: "Le fichier a été retiré du dossier." });
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
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[850px] max-h-[92dvh] flex flex-col p-0 overflow-hidden">
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

                {/* Liens rapides du projet */}
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
                  Infos & Équipe
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

            {/* ONGLET 4 : INFOS TECHNIQUES & ÉQUIPE */}
            {onglet === "technique" && (
              <div className="flex flex-col gap-5">
                <div className="rounded-xl border border-border bg-card p-4 flex flex-col gap-3">
                  <h4 className="text-xs font-semibold text-foreground uppercase tracking-wide">
                    Statut du produit & Métriques
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="rounded-lg bg-secondary/50 p-3">
                      <span className="text-subtle text-[11px]">Statut</span>
                      <div className="mt-1">{statutBadge(saas.statut)}</div>
                    </div>
                    <div className="rounded-lg bg-secondary/50 p-3">
                      <span className="text-subtle text-[11px]">Utilisateurs</span>
                      <span className="block font-semibold text-foreground mt-1">
                        {saas.utilisateurs} inscrits
                      </span>
                    </div>
                    <div className="rounded-lg bg-secondary/50 p-3">
                      <span className="text-subtle text-[11px]">MRR actuel</span>
                      <span className="block font-semibold text-trend mt-1">
                        {euros(saas.mrrFCFA, true)}
                      </span>
                    </div>
                    <div className="rounded-lg bg-secondary/50 p-3">
                      <span className="text-subtle text-[11px]">Objectif MRR</span>
                      <span className="block font-semibold text-foreground mt-1">
                        {euros(saas.objectifMrrFCFA, true)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-border bg-card p-4 flex flex-col gap-3">
                  <h4 className="text-xs font-semibold text-foreground uppercase tracking-wide">
                    Répartition de l&apos;équipe
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div className="flex items-center gap-2.5 rounded-lg border border-border bg-secondary/30 p-3">
                      <Avatar nom={saas.leadTech} ton="purple" />
                      <div className="flex flex-col">
                        <span className="font-semibold text-foreground">{saas.leadTech}</span>
                        <span className="text-[11px] text-purple-400">Lead Tech & Architecture</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2.5 rounded-lg border border-border bg-secondary/30 p-3">
                      <Avatar nom={saas.leadMarketing} ton="blue" />
                      <div className="flex flex-col">
                        <span className="font-semibold text-foreground">{saas.leadMarketing}</span>
                        <span className="text-[11px] text-blue-400">Lead Marketing & Croissance</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2.5 rounded-lg border border-border bg-secondary/30 p-3">
                      <Avatar nom={saas.leadOps} ton="green" />
                      <div className="flex flex-col">
                        <span className="font-semibold text-foreground">{saas.leadOps}</span>
                        <span className="text-[11px] text-emerald-400">Lead Opérations & Partenariats</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-border bg-card p-4 flex flex-col gap-2">
                  <h4 className="text-xs font-semibold text-foreground uppercase tracking-wide">
                    Description & Proposition de valeur
                  </h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {saas.description}
                  </p>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

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

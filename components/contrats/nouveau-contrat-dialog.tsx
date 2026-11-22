"use client";

import { useState } from "react";
import Button from "@/components/_ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/_ui/dialog";
import { Input } from "@/components/_ui/input";
import Field from "@/components/_ui/field";
import { Checkbox } from "@/components/_ui/checkbox";
import { useCockpit } from "@/stores/cockpit-store";
import { euros } from "@/lib/format";
import { api } from "@/lib/api";
import type {
  ModeFacturationContrat,
  PrestationContratDV,
  StatutContratDV,
  TypeContratDV,
} from "@/server/dv-types";
import {
  CheckCircle2,
  FileCheck,
  FileText,
  Layers,
  ListTodo,
  Paperclip,
  Plus,
  Sparkles,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";

const TYPES: { code: TypeContratDV; libelle: string }[] = [
  { code: "app_mobile", libelle: "Application mobile (iOS / Android)" },
  { code: "creation_site", libelle: "Site web / Vitrine / Landing page" },
  { code: "logiciel", libelle: "Logiciel de gestion sur mesure" },
  { code: "maintenance", libelle: "Maintenance & Hébergement" },
  { code: "conseil", libelle: "Conseil & Accompagnement digital" },
];

const STATUTS: { code: StatutContratDV; libelle: string }[] = [
  { code: "actif", libelle: "Signé & Actif (Lancement direct)" },
  { code: "en_attente", libelle: "En attente de signature client" },
  { code: "brouillon", libelle: "Brouillon / En négociation" },
  { code: "termine", libelle: "Terminé / Livré" },
];

const MEMBRES = ["Othnelio", "Medard", "Roméo"] as const;

let compteurPrestation = 100;
function genererIdPrestation() {
  compteurPrestation += 1;
  return `p-${compteurPrestation}`;
}

const PRESTATION_DEFAUT: LignePrestationForm = {
  id: "p-1",
  type: "creation_site",
  libellePersonnalise: "Site web vitrine responsive",
  montantFCFA: "",
  responsable: "Othnelio",
  echeancePrestation: "",
};

interface LignePrestationForm {
  id: string;
  type: TypeContratDV;
  libellePersonnalise: string;
  montantFCFA: number | "";
  responsable: string;
  echeancePrestation: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entrepriseIdParDefaut?: string;
  nomEntrepriseParDefaut?: string;
}

export default function NouveauContratDialog({
  open,
  onOpenChange,
  entrepriseIdParDefaut,
  nomEntrepriseParDefaut,
}: Props) {
  const utilisateurActif = useCockpit((s) => s.utilisateurActif);
  const crm = useCockpit((s) => s.crm);
  const ajouterContrat = useCockpit((s) => s.ajouterContrat);

  const [titre, setTitre] = useState("");
  const [entrepriseId, setEntrepriseId] = useState(entrepriseIdParDefaut || "");
  const [nomEntrepriseLibre, setNomEntrepriseLibre] = useState(nomEntrepriseParDefaut || "");

  // Multi-prestations avec responsable et échéance
  const [prestations, setPrestations] = useState<LignePrestationForm[]>([
    {
      id: "p-1",
      type: "creation_site",
      libellePersonnalise: "Site web vitrine responsive",
      montantFCFA: "",
      responsable: utilisateurActif || "Othnelio",
      echeancePrestation: "",
    },
  ]);

  const [debutLe, setDebutLe] = useState(() => new Date().toISOString().slice(0, 10));
  const [finLe, setFinLe] = useState("");
  const [statut, setStatut] = useState<StatutContratDV>("actif");
  const [responsable, setResponsable] = useState(utilisateurActif || "Othnelio");
  const [tvaTaux, setTvaTaux] = useState<number>(0);
  const [fichierDoc, setFichierDoc] = useState<File | null>(null);
  const [mentionsLegales, setMentionsLegales] = useState(
    "Modalités de règlement : 50% d'acompte à la commande, 50% à la livraison finale. Garantie de bon fonctionnement de 30 jours après recette.",
  );
  const [notes, setNotes] = useState("");

  // Automatisations
  const [genererTaches, setGenererTaches] = useState(true);
  const [modeFacturation, setModeFacturation] = useState<ModeFacturationContrat>("acompte_50");
  const [montantAcompteCustom, setMontantAcompteCustom] = useState<number | "">("");

  const [chargement, setChargement] = useState(false);

  const clients = crm?.entreprises ?? [];

  // Total montant
  const montantTotalFCFA = prestations.reduce(
    (acc, p) => acc + (typeof p.montantFCFA === "number" ? p.montantFCFA : 0),
    0,
  );

  // Montant prévisionnel de la facture générée
  const montantFactureEstime =
    modeFacturation === "integral"
      ? montantTotalFCFA
      : modeFacturation === "acompte_50"
        ? Math.round(montantTotalFCFA * 0.5)
        : modeFacturation === "acompte_30"
          ? Math.round(montantTotalFCFA * 0.3)
          : modeFacturation === "sur_mesure"
            ? typeof montantAcompteCustom === "number"
              ? montantAcompteCustom
              : 0
            : 0;

  function ajouterPrestation() {
    setPrestations((actuelles) => [
      ...actuelles,
      {
        id: genererIdPrestation(),
        type: "app_mobile",
        libellePersonnalise: "Développement mobile ou fonctionnalité dédiée",
        montantFCFA: "",
        responsable,
        echeancePrestation: finLe || debutLe,
      },
    ]);
  }

  function modifierPrestation(id: string, modifs: Partial<LignePrestationForm>) {
    setPrestations((actuelles) =>
      actuelles.map((p) => (p.id === id ? { ...p, ...modifs } : p)),
    );
  }

  function supprimerPrestation(id: string) {
    if (prestations.length <= 1) return;
    setPrestations((actuelles) => actuelles.filter((p) => p.id !== id));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const clientTrouve = clients.find((c) => c.id === entrepriseId);
    const nomFinal = clientTrouve?.nom || nomEntrepriseLibre.trim();

    if (!titre.trim() || !nomFinal) return;

    setChargement(true);

    let documentId: string | undefined;
    let documentNom: string | undefined;
    let documentUrl: string | undefined;
    let documentTailleOctets: number | undefined;

    if (fichierDoc) {
      try {
        const doc = await api.hub.uploadFichier(
          fichierDoc,
          "dos-contrats",
          `Contrat signé / convention ${nomFinal} - ${titre.trim()}`,
          { clientCrmId: clientTrouve?.id },
        );
        documentId = doc.id;
        documentNom = doc.nomOriginal;
        documentUrl = `/api/hub/documents/fichiers/${doc.id}`;
        documentTailleOctets = doc.tailleOctets;
      } catch (err) {
        console.error("Erreur lors de l'upload du document de contrat:", err);
      }
    }

    const prestationsFormatees: PrestationContratDV[] = prestations.map((p) => ({
      id: p.id,
      type: p.type,
      libellePersonnalise: p.libellePersonnalise.trim() || undefined,
      montantFCFA: typeof p.montantFCFA === "number" ? p.montantFCFA : 0,
      responsable: p.responsable,
      echeancePrestation: p.echeancePrestation || finLe || debutLe,
    }));

    const typePrincipal = prestationsFormatees[0]?.type || "creation_site";

    const ok = await ajouterContrat({
      entrepriseId: clientTrouve?.id || "",
      nomEntreprise: nomFinal,
      titre: titre.trim(),
      type: typePrincipal,
      prestations: prestationsFormatees,
      montantFCFA: montantTotalFCFA,
      tvaTaux,
      documentId,
      documentNom,
      documentUrl,
      documentTailleOctets,
      debutLe,
      finLe: finLe || undefined,
      statut,
      responsable,
      mentionsLegales: mentionsLegales.trim() || undefined,
      notes: notes.trim() || undefined,
      estSigne: statut === "actif" || statut === "termine",
      signeLe: statut === "actif" || statut === "termine" ? debutLe : undefined,
      // Automatisations
      genererTaches,
      modeFacturation,
      montantAcompteFCFA: typeof montantAcompteCustom === "number" ? montantAcompteCustom : undefined,
    });

    setChargement(false);

    if (ok) {
      onOpenChange(false);
      setTitre("");
      setPrestations([PRESTATION_DEFAUT]);
      setNotes("");
      setFichierDoc(null);
      setTvaTaux(0);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileCheck className="size-5 text-trend" />
            Nouveau contrat ou convention client
          </DialogTitle>
          <DialogDescription>
            Enregistre le contrat, découpe les prestations en tâches d’équipe et génère
            automatiquement la facture correspondante.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 py-2">
          {/* 1. INFORMATIONS GÉNÉRALES */}
          <div className="space-y-4 rounded-xl border border-border bg-[#161616] p-4">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Layers className="size-3.5 text-primary" />
              1. Client & Objet du Contrat
            </span>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="Client du CRM" htmlFor="contrat-client">
                <select
                  id="contrat-client"
                  value={entrepriseId}
                  onChange={(e) => {
                    setEntrepriseId(e.target.value);
                    const trouvant = clients.find((c) => c.id === e.target.value);
                    if (trouvant) setNomEntrepriseLibre(trouvant.nom);
                  }}
                  className="border-line-strong bg-secondary text-foreground w-full rounded-lg border px-3 py-2 text-xs outline-none focus:border-primary"
                >
                  <option value="">Sélectionner un client du CRM...</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nom} ({c.etape})
                    </option>
                  ))}
                </select>
              </Field>

              <Field
                label="Ou Nom de l'entreprise"
                htmlFor="contrat-nom-libre"
                hint="S'il s'agit d'un nouveau client"
              >
                <Input
                  id="contrat-nom-libre"
                  value={nomEntrepriseLibre}
                  onChange={(e) => setNomEntrepriseLibre(e.target.value)}
                  placeholder="Ex : Restaurant Le Cauris"
                  required
                />
              </Field>
            </div>

            <Field label="Intitulé du contrat" htmlFor="contrat-titre">
              <Input
                id="contrat-titre"
                value={titre}
                onChange={(e) => setTitre(e.target.value)}
                placeholder="Ex : Conception & Déploiement Application Mobile de Commande"
                required
              />
            </Field>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Field label="Date de signature / début" htmlFor="contrat-debut">
                <Input
                  id="contrat-debut"
                  type="date"
                  value={debutLe}
                  onChange={(e) => setDebutLe(e.target.value)}
                  required
                />
              </Field>

              <Field label="Échéance de livraison" htmlFor="contrat-fin">
                <Input
                  id="contrat-fin"
                  type="date"
                  value={finLe}
                  onChange={(e) => setFinLe(e.target.value)}
                />
              </Field>

              <Field label="Pilote du contrat" htmlFor="contrat-resp">
                <select
                  id="contrat-resp"
                  value={responsable}
                  onChange={(e) => setResponsable(e.target.value)}
                  className="border-line-strong bg-secondary text-foreground w-full rounded-lg border px-3 py-2 text-xs outline-none"
                >
                  {MEMBRES.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <Field label="Statut initial du contrat" htmlFor="contrat-statut">
              <select
                id="contrat-statut"
                value={statut}
                onChange={(e) => setStatut(e.target.value as StatutContratDV)}
                className="border-line-strong bg-secondary text-foreground w-full rounded-lg border px-3 py-2 text-xs outline-none font-medium"
              >
                {STATUTS.map((s) => (
                  <option key={s.code} value={s.code}>
                    {s.libelle}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          {/* 2. DÉTAIL DES PRESTATIONS & LIVRABLES */}
          <div className="space-y-4 rounded-xl border border-border bg-[#161616] p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <ListTodo className="size-3.5 text-trend" />
                2. Prestations & Livrables Inclus
              </span>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={ajouterPrestation}
                className="gap-1 text-xs h-7"
              >
                <Plus className="size-3.5" />
                Ajouter une prestation
              </Button>
            </div>

            <div className="space-y-3">
              {prestations.map((presta, idx) => (
                <div
                  key={presta.id}
                  className="rounded-lg border border-border/80 bg-background/50 p-3 space-y-3 relative group"
                >
                  <div className="flex items-center justify-between gap-2 border-b border-border/40 pb-2">
                    <span className="text-xs font-semibold text-primary">
                      Prestation #{idx + 1}
                    </span>
                    {prestations.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => supprimerPrestation(presta.id)}
                        className="text-muted-foreground hover:text-red-400 size-6"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <Field label="Type de prestation" htmlFor={`presta-type-${presta.id}`}>
                      <select
                        id={`presta-type-${presta.id}`}
                        value={presta.type}
                        onChange={(e) =>
                          modifierPrestation(presta.id, {
                            type: e.target.value as TypeContratDV,
                          })
                        }
                        className="border-line-strong bg-secondary text-foreground w-full rounded-md border px-2.5 py-1.5 text-xs outline-none"
                      >
                        {TYPES.map((t) => (
                          <option key={t.code} value={t.code}>
                            {t.libelle}
                          </option>
                        ))}
                      </select>
                    </Field>

                    <Field label="Libellé personnalisé" htmlFor={`presta-nom-${presta.id}`}>
                      <Input
                        id={`presta-nom-${presta.id}`}
                        value={presta.libellePersonnalise}
                        onChange={(e) =>
                          modifierPrestation(presta.id, {
                            libellePersonnalise: e.target.value,
                          })
                        }
                        placeholder="Ex : Déploiement API backend & Webhooks"
                        required
                      />
                    </Field>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <Field label="Montant (FCFA)" htmlFor={`presta-montant-${presta.id}`}>
                      <Input
                        id={`presta-montant-${presta.id}`}
                        type="number"
                        min={0}
                        value={presta.montantFCFA}
                        onChange={(e) =>
                          modifierPrestation(presta.id, {
                            montantFCFA: e.target.value === "" ? "" : Number(e.target.value),
                          })
                        }
                        placeholder="Ex : 250000"
                        required
                      />
                    </Field>

                    <Field label="Assigné à" htmlFor={`presta-resp-${presta.id}`}>
                      <select
                        id={`presta-resp-${presta.id}`}
                        value={presta.responsable}
                        onChange={(e) =>
                          modifierPrestation(presta.id, {
                            responsable: e.target.value,
                          })
                        }
                        className="border-line-strong bg-secondary text-foreground w-full rounded-md border px-2.5 py-1.5 text-xs outline-none"
                      >
                        {MEMBRES.map((m) => (
                          <option key={m} value={m}>
                            {m}
                          </option>
                        ))}
                      </select>
                    </Field>

                    <Field label="Échéance du livrable" htmlFor={`presta-date-${presta.id}`}>
                      <Input
                        id={`presta-date-${presta.id}`}
                        type="date"
                        value={presta.echeancePrestation}
                        onChange={(e) =>
                          modifierPrestation(presta.id, {
                            echeancePrestation: e.target.value,
                          })
                        }
                      />
                    </Field>
                  </div>
                </div>
              ))}
            </div>

            {/* Total valorisation & TVA */}
            <div className="space-y-3 p-3 rounded-lg bg-card/60 border border-border">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-border/40">
                <span className="text-xs font-semibold text-muted-foreground">
                  Régime TVA applicable :
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setTvaTaux(0)}
                    className={`px-2.5 py-1 rounded text-xs transition-colors font-medium ${
                      tvaTaux === 0
                        ? "bg-primary text-primary-foreground font-bold"
                        : "bg-secondary text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Exonéré (0%)
                  </button>
                  <button
                    type="button"
                    onClick={() => setTvaTaux(18)}
                    className={`px-2.5 py-1 rounded text-xs transition-colors font-medium ${
                      tvaTaux === 18
                        ? "bg-primary text-primary-foreground font-bold"
                        : "bg-secondary text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    TVA Togo (18%)
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-muted-foreground block">
                    Montant total contrat HT :
                  </span>
                  {tvaTaux > 0 && (
                    <span className="text-[11px] text-muted-foreground">
                      TTC : {euros(Math.round(montantTotalFCFA * 1.18), true)} (TVA 18% : {euros(Math.round(montantTotalFCFA * 0.18), true)})
                    </span>
                  )}
                </div>
                <span className="text-base font-bold text-trend font-mono">
                  {euros(montantTotalFCFA, true)} HT
                </span>
              </div>
            </div>
          </div>

          {/* 3. AUTOMATISATIONS TÂCHES & FACTURATION */}
          <div className="space-y-4 rounded-xl border border-primary/30 bg-primary/5 p-4">
            <span className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
              <Sparkles className="size-3.5 text-primary" />
              3. Automatisations Cockpit DV (Tâches & Factures)
            </span>

            {/* A. Tâches */}
            <div className="flex items-start gap-3 p-3 rounded-lg bg-[#141414] border border-border/80">
              <Checkbox
                id="auto-taches"
                checked={genererTaches}
                onCheckedChange={(checked) => setGenererTaches(Boolean(checked))}
                className="mt-0.5"
              />
              <div className="space-y-1">
                <label
                  htmlFor="auto-taches"
                  className="text-xs font-semibold text-foreground cursor-pointer flex items-center gap-1.5"
                >
                  <ListTodo className="size-3.5 text-trend" />
                  Générer automatiquement une tâche de livraison pour chaque prestation
                </label>
                <p className="text-[11px] text-muted-foreground">
                  Chaque livrable apparaîtra instantanément dans le module Tâches de l’associé
                  assigné, lié à {nomEntrepriseLibre || "ce client"}.
                </p>
              </div>
            </div>

            {/* B. Facturation */}
            <div className="space-y-3 p-3 rounded-lg bg-[#141414] border border-border/80">
              <div className="space-y-1">
                <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <FileText className="size-3.5 text-amber-400" />
                  Génération de la facture client
                </span>
                <p className="text-[11px] text-muted-foreground">
                  Crée automatiquement la facture correspondante dans le module Finances & Factures.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setModeFacturation("acompte_50")}
                  className={`p-2.5 rounded-lg border text-left text-xs transition-all ${
                    modeFacturation === "acompte_50"
                      ? "border-primary bg-primary/10 text-primary font-semibold"
                      : "border-border bg-card/40 text-muted-foreground hover:bg-card"
                  }`}
                >
                  <div className="font-bold text-foreground">Acompte 50% (Recommandé)</div>
                  <div className="text-[10px] mt-0.5">50% à la commande, solde à la livraison</div>
                </button>

                <button
                  type="button"
                  onClick={() => setModeFacturation("integral")}
                  className={`p-2.5 rounded-lg border text-left text-xs transition-all ${
                    modeFacturation === "integral"
                      ? "border-primary bg-primary/10 text-primary font-semibold"
                      : "border-border bg-card/40 text-muted-foreground hover:bg-card"
                  }`}
                >
                  <div className="font-bold text-foreground">Totalité 100%</div>
                  <div className="text-[10px] mt-0.5">Facture intégrale émise immédiatement</div>
                </button>

                <button
                  type="button"
                  onClick={() => setModeFacturation("acompte_30")}
                  className={`p-2.5 rounded-lg border text-left text-xs transition-all ${
                    modeFacturation === "acompte_30"
                      ? "border-primary bg-primary/10 text-primary font-semibold"
                      : "border-border bg-card/40 text-muted-foreground hover:bg-card"
                  }`}
                >
                  <div className="font-bold text-foreground">Acompte 30%</div>
                  <div className="text-[10px] mt-0.5">Pour grands projets ou conventions</div>
                </button>

                <button
                  type="button"
                  onClick={() => setModeFacturation("sur_mesure")}
                  className={`p-2.5 rounded-lg border text-left text-xs transition-all ${
                    modeFacturation === "sur_mesure"
                      ? "border-primary bg-primary/10 text-primary font-semibold"
                      : "border-border bg-card/40 text-muted-foreground hover:bg-card"
                  }`}
                >
                  <div className="font-bold text-foreground">Acompte sur mesure</div>
                  <div className="text-[10px] mt-0.5">Montant spécifique personnalisé</div>
                </button>

                <button
                  type="button"
                  onClick={() => setModeFacturation("aucun")}
                  className={`p-2.5 rounded-lg border text-left text-xs transition-all ${
                    modeFacturation === "aucun"
                      ? "border-primary bg-primary/10 text-primary font-semibold"
                      : "border-border bg-card/40 text-muted-foreground hover:bg-card"
                  }`}
                >
                  <div className="font-bold text-foreground">Aucune facture directe</div>
                  <div className="text-[10px] mt-0.5">Facturation manuelle ultérieure</div>
                </button>
              </div>

              {modeFacturation === "sur_mesure" && (
                <Field label="Montant de l'acompte (FCFA HT)" htmlFor="fact-acompte-custom">
                  <Input
                    id="fact-acompte-custom"
                    type="number"
                    min={1}
                    value={montantAcompteCustom}
                    onChange={(e) =>
                      setMontantAcompteCustom(
                        e.target.value === "" ? "" : Number(e.target.value),
                      )
                    }
                    placeholder="Ex : 200000"
                    required
                  />
                </Field>
              )}

              {modeFacturation !== "aucun" && montantTotalFCFA > 0 && (
                <div className="flex items-center justify-between p-2.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-xs">
                  <span className="text-amber-200 flex items-center gap-1.5">
                    <CheckCircle2 className="size-3.5" />
                    Brouillon de facture prêt à émettre :
                  </span>
                  <span className="font-bold font-mono text-amber-300">
                    {euros(montantFactureEstime, true)} HT
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* 4. MENTIONS LÉGALES & NOTES */}
          <div className="space-y-3 rounded-xl border border-border bg-[#161616] p-4">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              4. Mentions Légales & Conditions de Règlement
            </span>

            <Field
              label="Clauses et mentions légales du contrat"
              htmlFor="contrat-mentions"
              hint="Conditions de paiement, garanties, révisions ou livrables"
            >
              <textarea
                id="contrat-mentions"
                value={mentionsLegales}
                onChange={(e) => setMentionsLegales(e.target.value)}
                rows={2}
                className="border-line-strong bg-secondary text-foreground w-full rounded-lg border px-3 py-2 text-xs outline-none"
              />
            </Field>

            <Field label="Notes internes (confidentiel équipe)" htmlFor="contrat-notes">
              <Input
                id="contrat-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Contexte client, historique de négociation..."
              />
            </Field>
          </div>

          {/* 5. DOCUMENT OFFICIEL DU CONTRAT */}
          <div className="space-y-3 rounded-xl border border-border bg-[#161616] p-4">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Paperclip className="size-3.5 text-primary" />
              5. Document officiel / Scan du contrat (optionnel)
            </span>
            <p className="text-[11px] text-muted-foreground">
              Le fichier sera stocké dans Neon S3 et automatiquement indexé dans le Hub DigitalVision (dossier &quot;Contrats &amp; Conventions&quot;).
            </p>

            {fichierDoc ? (
              <div className="flex items-center justify-between p-3 rounded-lg border border-primary/40 bg-primary/10">
                <div className="flex items-center gap-2.5 min-w-0">
                  <Paperclip className="size-4 text-primary shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">{fichierDoc.name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {(fichierDoc.size / 1024).toFixed(1)} Ko • Prêt pour archivage Hub
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setFichierDoc(null)}
                  className="text-muted-foreground hover:text-red-400 size-6"
                >
                  <X className="size-3.5" />
                </Button>
              </div>
            ) : (
              <label
                htmlFor="upload-contrat-file"
                className="flex flex-col items-center justify-center p-4 rounded-lg border border-dashed border-border hover:border-primary/50 bg-secondary/30 hover:bg-secondary/60 cursor-pointer transition-colors group"
              >
                <UploadCloud className="size-6 text-muted-foreground group-hover:text-primary mb-1.5 transition-colors" />
                <span className="text-xs font-medium text-foreground">
                  Cliquer pour joindre le contrat (PDF, DOCX, scan...)
                </span>
                <span className="text-[10px] text-muted-foreground mt-0.5">
                  Taille max recommandée : 20 Mo
                </span>
                <input
                  id="upload-contrat-file"
                  type="file"
                  accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                  className="sr-only"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) setFichierDoc(f);
                  }}
                />
              </label>
            )}
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => onOpenChange(false)}
              disabled={chargement}
            >
              Annuler
            </Button>
            <Button type="submit" variant="primary" disabled={chargement}>
              {chargement ? "Enregistrement..." : "Créer le contrat & automatiser"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

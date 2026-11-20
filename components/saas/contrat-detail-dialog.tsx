"use client";

import { useState } from "react";
import Button from "@/components/_ui/button";
import { Checkbox } from "@/components/_ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/_ui/dialog";
import { Input } from "@/components/_ui/input";
import Field from "@/components/_ui/field";
import { useCockpit } from "@/stores/cockpit-store";
import { euros, aujourdhui } from "@/lib/format";
import type {
  ContratDV,
  PrestationContratDV,
  StatutContratDV,
  TypeContratDV,
} from "@/server/dv-types";
import {
  Briefcase,
  CheckCircle2,
  Calendar,
  CreditCard,
  FileCheck,
  PackageCheck,
  Printer,
  Trash2,
  Sparkles,
  Plus,
  Layers,
} from "lucide-react";

const TYPES: { code: TypeContratDV; libelle: string }[] = [
  { code: "app_mobile", libelle: "Application mobile (iOS / Android)" },
  { code: "creation_site", libelle: "Site web vitrine / Landing page" },
  { code: "logiciel", libelle: "Logiciel de gestion sur mesure" },
  { code: "maintenance", libelle: "Contrat de maintenance & Hébergement" },
  { code: "conseil", libelle: "Conseil & Accompagnement digital" },
];

interface Props {
  contrat: ContratDV | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function typeLibelle(t: TypeContratDV) {
  switch (t) {
    case "creation_site":
      return "Création de site web";
    case "app_mobile":
      return "Application mobile (iOS / Android)";
    case "logiciel":
      return "Logiciel de gestion sur mesure";
    case "maintenance":
      return "Maintenance & Hébergement";
    default:
      return "Conseil & Accompagnement";
  }
}

interface ContentProps {
  contrat: ContratDV;
  onClose: () => void;
}

function ContratDetailContent({ contrat, onClose }: ContentProps) {
  const modifierContrat = useCockpit((s) => s.modifierContrat);
  const supprimerContrat = useCockpit((s) => s.supprimerContrat);
  const crm = useCockpit((s) => s.crm);
  const toast = useCockpit((s) => s.toast);

  // Informations modifiables du contrat
  const [titre, setTitre] = useState(() => contrat.titre);
  const [nomEntreprise, setNomEntreprise] = useState(() => contrat.nomEntreprise);
  const [responsable, setResponsable] = useState(() => contrat.responsable || "Othnelio");
  const [debutLe, setDebutLe] = useState(() => contrat.debutLe);
  const [finLe, setFinLe] = useState(() => contrat.finLe || "");

  // Prestations modifiables
  const [prestations, setPrestations] = useState<PrestationContratDV[]>(() =>
    contrat.prestations && contrat.prestations.length > 0
      ? contrat.prestations
      : [
          {
            id: "p-1",
            type: contrat.type,
            libellePersonnalise: typeLibelle(contrat.type),
            montantFCFA: contrat.montantFCFA,
          },
        ],
  );

  // Jalons opérationnels
  const [estSigne, setEstSigne] = useState(
    () => contrat.estSigne ?? (contrat.statut === "actif" || contrat.statut === "termine"),
  );
  const [signeLe, setSigneLe] = useState(
    () => contrat.signeLe || (contrat.estSigne ? contrat.debutLe : ""),
  );
  const [estLivre, setEstLivre] = useState(
    () => contrat.estLivre ?? (contrat.statut === "termine"),
  );
  const [livreLe, setLivreLe] = useState(
    () => contrat.livreLe || (contrat.estLivre ? contrat.finLe || aujourdhui() : ""),
  );
  const [estPaye, setEstPaye] = useState(() => contrat.estPaye ?? false);
  const [montantPayeFCFA, setMontantPayeFCFA] = useState<number | "">(
    () => contrat.montantPayeFCFA ?? (contrat.estPaye ? contrat.montantFCFA : ""),
  );
  const [statut, setStatut] = useState<StatutContratDV>(() => contrat.statut);
  const [notes, setNotes] = useState(() => contrat.notes || "");
  const [chargement, setChargement] = useState(false);

  // Recalcul automatique du total
  const montantTotalFCFA = prestations.reduce((acc, p) => acc + (p.montantFCFA || 0), 0);
  const soldeRestant = Math.max(0, montantTotalFCFA - (Number(montantPayeFCFA) || 0));

  function ajouterPrestation() {
    setPrestations((actuelles) => [
      ...actuelles,
      {
        id: `p-${Date.now()}`,
        type: "creation_site",
        libellePersonnalise: "Site web / Landing page",
        montantFCFA: 50000,
      },
    ]);
  }

  function modifierPrestation(id: string, modifs: Partial<PrestationContratDV>) {
    setPrestations((actuelles) =>
      actuelles.map((p) => (p.id === id ? { ...p, ...modifs } : p)),
    );
  }

  function supprimerPrestation(id: string) {
    if (prestations.length <= 1) return;
    setPrestations((actuelles) => actuelles.filter((p) => p.id !== id));
  }

  async function sauvegarder() {
    setChargement(true);

    const payeTotal = estPaye || (Number(montantPayeFCFA) >= montantTotalFCFA && montantTotalFCFA > 0);

    let nouveauStatut = statut;
    if (estLivre && payeTotal && statut !== "resilie") {
      nouveauStatut = "termine";
    } else if (estSigne && statut === "brouillon") {
      nouveauStatut = "actif";
    }

    const typePrincipal = prestations[0]?.type || "creation_site";

    await modifierContrat(contrat.id, {
      titre: titre.trim() || contrat.titre,
      nomEntreprise: nomEntreprise.trim() || contrat.nomEntreprise,
      responsable,
      debutLe,
      finLe: finLe || undefined,
      type: typePrincipal,
      prestations,
      montantFCFA: montantTotalFCFA,
      estSigne,
      signeLe: estSigne ? signeLe || aujourdhui() : undefined,
      estLivre,
      livreLe: estLivre ? livreLe || aujourdhui() : undefined,
      estPaye: payeTotal,
      montantPayeFCFA: montantPayeFCFA !== "" ? Number(montantPayeFCFA) : undefined,
      payeLe: payeTotal ? aujourdhui() : undefined,
      statut: nouveauStatut,
      notes: notes.trim() || undefined,
    });

    setChargement(false);
    toast({
      ton: "succes",
      titre: "Contrat mis à jour",
      texte: "Toutes les informations et prestations ont été modifiées.",
    });
    onClose();
  }

  function imprimerFiche() {
    window.print();
  }

  return (
    <>
      {/* Header Fiche Contrat */}
      <DialogHeader className="border-b border-border bg-card/60 p-5 sm:p-6 pb-4">
        <div className="flex flex-col gap-2">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 shadow-xs shrink-0">
                <Briefcase className="size-6" />
              </div>
              <div className="flex flex-col">
                <DialogTitle className="text-xl font-bold truncate max-w-md">
                  {titre || contrat.titre}
                </DialogTitle>
                <DialogDescription className="text-xs text-subtle mt-0.5">
                  Client : <strong className="text-foreground">{nomEntreprise || contrat.nomEntreprise}</strong> • Total : {euros(montantTotalFCFA, true)}
                </DialogDescription>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <Button
                variant="secondary"
                size="sm"
                onClick={imprimerFiche}
                className="gap-1.5 text-xs"
                title="Imprimer ou exporter en PDF"
              >
                <Printer className="size-3.5" />
                <span className="hidden sm:inline">Imprimer</span>
              </Button>

              <button
                type="button"
                onClick={async () => {
                  if (confirm(`Supprimer définitivement ce contrat "${contrat.titre}" ?`)) {
                    await supprimerContrat(contrat.id);
                    onClose();
                  }
                }}
                className="text-muted-foreground hover:text-red-400 p-1.5 rounded transition-colors"
                title="Supprimer ce contrat"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          </div>
        </div>
      </DialogHeader>

      {/* Corps avec édition complète du contrat */}
      <div className="flex-1 overflow-y-auto p-5 sm:p-6 flex flex-col gap-6">
        {/* 1. INFORMATIONS GÉNÉRALES ÉDITABLES */}
        <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4">
          <h4 className="text-xs font-bold text-foreground uppercase tracking-wide">
            Informations générales du contrat
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Intitulé du contrat" htmlFor="edit-ctr-titre">
              <Input
                id="edit-ctr-titre"
                value={titre}
                onChange={(e) => setTitre(e.target.value)}
                required
              />
            </Field>

            <Field label="Client / Entreprise" htmlFor="edit-ctr-client">
              <Input
                id="edit-ctr-client"
                value={nomEntreprise}
                onChange={(e) => setNomEntreprise(e.target.value)}
                required
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="Responsable du compte" htmlFor="edit-ctr-resp">
              <select
                id="edit-ctr-resp"
                value={responsable}
                onChange={(e) => setResponsable(e.target.value)}
                className="border-line-strong bg-secondary text-foreground rounded-lg border px-2.5 py-1.5 text-xs outline-none"
              >
                {(crm?.equipe ?? []).map((m) => (
                  <option key={m.nom} value={m.nom}>
                    {m.nom}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Date de début" htmlFor="edit-ctr-debut">
              <Input
                id="edit-ctr-debut"
                type="date"
                value={debutLe}
                onChange={(e) => setDebutLe(e.target.value)}
                required
              />
            </Field>

            <Field label="Date de fin / Livraison" htmlFor="edit-ctr-fin">
              <Input
                id="edit-ctr-fin"
                type="date"
                value={finLe}
                onChange={(e) => setFinLe(e.target.value)}
              />
            </Field>
          </div>
        </div>

        {/* 2. PRESTATIONS MULTI-LIGNES AVEC AJOUT / MODIFICATION / PRIX */}
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Layers className="size-3.5 text-purple-400" />
              <h4 className="text-xs font-bold text-foreground uppercase tracking-wide">
                Prestations & Tarifs ({prestations.length})
              </h4>
            </div>
            <span className="text-xs font-bold text-trend tabular-nums">
              Total : {euros(montantTotalFCFA, true)}
            </span>
          </div>

          <div className="flex flex-col gap-2.5">
            {prestations.map((p, idx) => (
              <div
                key={p.id || idx}
                className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 rounded-lg border border-border bg-secondary/40 p-2.5 text-xs"
              >
                <span className="flex size-5 items-center justify-center rounded-full bg-secondary text-[10px] font-bold text-subtle shrink-0">
                  {idx + 1}
                </span>

                <div className="flex-1">
                  <select
                    value={p.type}
                    onChange={(e) => {
                      const nouvType = e.target.value as TypeContratDV;
                      const defaultLib = TYPES.find((t) => t.code === nouvType)?.libelle || "";
                      modifierPrestation(p.id, {
                        type: nouvType,
                        libellePersonnalise: defaultLib.split("/")[0].trim(),
                      });
                    }}
                    className="w-full border-line-strong bg-card text-foreground rounded-md border px-2 py-1 text-xs outline-none"
                  >
                    {TYPES.map((t) => (
                      <option key={t.code} value={t.code}>
                        {t.libelle}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="w-full sm:w-36 shrink-0 relative">
                  <Input
                    type="number"
                    placeholder="Prix FCFA"
                    min={0}
                    step={1000}
                    value={p.montantFCFA}
                    onChange={(e) =>
                      modifierPrestation(p.id, {
                        montantFCFA: Math.max(0, Number(e.target.value) || 0),
                      })
                    }
                    className="h-7 text-xs pr-12 tabular-nums"
                  />
                  <span className="text-subtle text-[10px] pointer-events-none absolute right-2 top-1/2 -translate-y-1/2">
                    FCFA
                  </span>
                </div>

                {prestations.length > 1 && (
                  <button
                    type="button"
                    onClick={() => supprimerPrestation(p.id)}
                    className="text-muted-foreground hover:text-red-400 p-1 rounded shrink-0 self-end sm:self-auto"
                    title="Supprimer cette prestation"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>

          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={ajouterPrestation}
            className="gap-1.5 self-start text-xs h-7 mt-1"
          >
            <Plus className="size-3" />
            Ajouter une prestation
          </Button>
        </div>

        {/* 3. SUIVI OPÉRATIONNEL : SIGNATURE, LIVRAISON, PAIEMENT */}
        <div className="flex flex-col gap-3">
          <h4 className="text-xs font-semibold text-foreground uppercase tracking-wide flex items-center gap-1.5">
            <Sparkles className="size-3.5 text-purple-400" />
            Suivi et validations opérationnelles
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Signature */}
            <div
              className={`flex flex-col justify-between rounded-xl border p-4 transition-all ${
                estSigne
                  ? "border-emerald-500/40 bg-emerald-500/5"
                  : "border-border bg-card"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <FileCheck className={`size-4 ${estSigne ? "text-emerald-400" : "text-muted-foreground"}`} />
                  <span className="text-xs font-semibold text-foreground">Contrat signé</span>
                </div>
                <Checkbox
                  checked={estSigne}
                  onCheckedChange={(c) => {
                    setEstSigne(!!c);
                    if (c && !signeLe) setSigneLe(aujourdhui());
                  }}
                />
              </div>

              <div className="mt-3 flex flex-col gap-1">
                <span className="text-[11px] text-subtle">
                  {estSigne ? "Signé et validé par le client" : "En attente de signature"}
                </span>
                {estSigne && (
                  <Input
                    type="date"
                    value={signeLe}
                    onChange={(e) => setSigneLe(e.target.value)}
                    className="h-7 text-xs mt-1"
                  />
                )}
              </div>
            </div>

            {/* Livraison */}
            <div
              className={`flex flex-col justify-between rounded-xl border p-4 transition-all ${
                estLivre
                  ? "border-purple-500/40 bg-purple-500/5"
                  : "border-border bg-card"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <PackageCheck className={`size-4 ${estLivre ? "text-purple-400" : "text-muted-foreground"}`} />
                  <span className="text-xs font-semibold text-foreground">Produit livré</span>
                </div>
                <Checkbox
                  checked={estLivre}
                  onCheckedChange={(c) => {
                    setEstLivre(!!c);
                    if (c && !livreLe) setLivreLe(aujourdhui());
                  }}
                />
              </div>

              <div className="mt-3 flex flex-col gap-1">
                <span className="text-[11px] text-subtle">
                  {estLivre ? "Développement terminé & remis" : "En cours de production"}
                </span>
                {estLivre && (
                  <Input
                    type="date"
                    value={livreLe}
                    onChange={(e) => setLivreLe(e.target.value)}
                    className="h-7 text-xs mt-1"
                  />
                )}
              </div>
            </div>

            {/* Règlement */}
            <div
              className={`flex flex-col justify-between rounded-xl border p-4 transition-all ${
                estPaye
                  ? "border-trend/40 bg-trend/5"
                  : "border-border bg-card"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <CreditCard className={`size-4 ${estPaye ? "text-trend" : "text-muted-foreground"}`} />
                  <span className="text-xs font-semibold text-foreground">Règlement</span>
                </div>
                <Checkbox
                  checked={estPaye}
                  onCheckedChange={(c) => {
                    setEstPaye(!!c);
                    if (c) setMontantPayeFCFA(montantTotalFCFA);
                  }}
                />
              </div>

              <div className="mt-3 flex flex-col gap-1">
                <span className="text-[11px] text-subtle">
                  {estPaye ? "Soldé en totalité" : `Reste : ${euros(soldeRestant, true)}`}
                </span>
                <div className="flex items-center gap-1.5 mt-1">
                  <Input
                    type="number"
                    placeholder="Montant versé"
                    value={montantPayeFCFA}
                    onChange={(e) => {
                      const val = e.target.value === "" ? "" : Number(e.target.value);
                      setMontantPayeFCFA(val);
                      if (typeof val === "number" && val >= montantTotalFCFA) {
                        setEstPaye(true);
                      }
                    }}
                    className="h-7 text-xs tabular-nums"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 4. STATUT GLOBAL ET NOTES */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Statut global du contrat" htmlFor="ctr-statut-select">
            <select
              id="ctr-statut-select"
              value={statut}
              onChange={(e) => setStatut(e.target.value as StatutContratDV)}
              className="border-line-strong bg-secondary text-foreground rounded-lg border px-3 py-2 text-xs outline-none"
            >
              <option value="brouillon">Brouillon / En négociation</option>
              <option value="en_attente">Envoyé pour signature</option>
              <option value="actif">Signé & Actif</option>
              <option value="termine">Terminé / Livré</option>
              <option value="resilie">Résilié</option>
            </select>
          </Field>

          <Field label="Période contractuelle" htmlFor="ctr-periode">
            <div id="ctr-periode" className="flex items-center gap-2 text-xs text-subtle py-2">
              <Calendar className="size-3.5 text-muted-foreground" />
              <span>
                Du <strong>{debutLe.split("-").reverse().join("/")}</strong>
                {finLe ? ` au ${finLe.split("-").reverse().join("/")}` : " (durée indéterminée)"}
              </span>
            </div>
          </Field>
        </div>

        <Field label="Notes internes & Modalités particulières" htmlFor="ctr-notes-area">
          <textarea
            id="ctr-notes-area"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ex : Modalités de versement (50% à la commande, 50% à la livraison). Délais de 3 semaines."
            className="w-full rounded-lg border border-line-strong bg-secondary p-2.5 text-xs text-foreground outline-none"
          />
        </Field>
      </div>

      <DialogFooter className="border-t border-border bg-card/60 p-4 flex flex-row items-center justify-between gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={async () => {
            if (confirm(`Supprimer définitivement ce contrat "${contrat.titre}" ?`)) {
              await supprimerContrat(contrat.id);
              onClose();
            }
          }}
          className="text-red-400 hover:text-red-300 hover:bg-red-500/10 gap-1 text-xs h-8"
        >
          <Trash2 className="size-3.5" />
          Supprimer ce contrat
        </Button>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="subtle"
            size="sm"
            onClick={onClose}
          >
            Fermer
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={sauvegarder}
            disabled={chargement}
            className="gap-1.5"
          >
            <CheckCircle2 className="size-3.5" />
            {chargement ? "Enregistrement…" : "Enregistrer toutes les modifications"}
          </Button>
        </div>
      </DialogFooter>
    </>
  );
}

export default function ContratDetailDialog({ contrat, open, onOpenChange }: Props) {
  if (!contrat) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[750px] max-h-[92dvh] flex flex-col p-0 overflow-hidden">
        <ContratDetailContent
          key={contrat.id}
          contrat={contrat}
          onClose={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

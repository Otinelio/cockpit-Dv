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
import type { ContratDV, StatutContratDV, TypeContratDV } from "@/server/dv-types";
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
} from "lucide-react";

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
  const toast = useCockpit((s) => s.toast);

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

  async function sauvegarder() {
    setChargement(true);

    const payeTotal = estPaye || (Number(montantPayeFCFA) >= contrat.montantFCFA && contrat.montantFCFA > 0);

    let nouveauStatut = statut;
    if (estLivre && payeTotal && statut !== "resilie") {
      nouveauStatut = "termine";
    } else if (estSigne && statut === "brouillon") {
      nouveauStatut = "actif";
    }

    await modifierContrat(contrat.id, {
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
    toast({ ton: "succes", titre: "Contrat mis à jour", texte: "Les validations sont enregistrées." });
    onClose();
  }

  function imprimerFiche() {
    window.print();
  }

  const prestations = contrat.prestations && contrat.prestations.length > 0
    ? contrat.prestations
    : [{ id: "p-defaut", type: contrat.type, montantFCFA: contrat.montantFCFA }];

  const soldeRestant = Math.max(0, contrat.montantFCFA - (Number(montantPayeFCFA) || 0));

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
                <div className="flex flex-wrap items-center gap-2">
                  <DialogTitle className="text-xl font-bold">{contrat.titre}</DialogTitle>
                </div>
                <DialogDescription className="text-xs text-subtle mt-0.5">
                  Client : <strong className="text-foreground">{contrat.nomEntreprise}</strong> • Responsable : {contrat.responsable}
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
                  await supprimerContrat(contrat.id);
                  onClose();
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

      {/* Corps avec les détails et les 3 validations clés */}
      <div className="flex-1 overflow-y-auto p-5 sm:p-6 flex flex-col gap-6">
        {/* 1. LES 3 JALONS CLÉS : SIGNATURE, LIVRAISON, PAIEMENT */}
        <div className="flex flex-col gap-3">
          <h4 className="text-xs font-semibold text-foreground uppercase tracking-wide flex items-center gap-1.5">
            <Sparkles className="size-3.5 text-purple-400" />
            Suivi et validations opérationnelles
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Carte 1 : Signature */}
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

            {/* Carte 2 : Livraison produit */}
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

            {/* Carte 3 : Paiement et règlement */}
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
                    if (c) setMontantPayeFCFA(contrat.montantFCFA);
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
                      if (typeof val === "number" && val >= contrat.montantFCFA) {
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

        {/* 2. DÉTAIL DES PRESTATIONS INCLUSES DANS CE CONTRAT */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold text-foreground uppercase tracking-wide">
              Prestations & Tarification contractuelle
            </h4>
            <span className="text-xs font-bold text-trend tabular-nums">
              Total : {euros(contrat.montantFCFA, true)}
            </span>
          </div>

          <div className="divide-y divide-border rounded-xl border border-border bg-card overflow-hidden">
            {prestations.map((p, idx) => (
              <div key={p.id || idx} className="flex items-center justify-between p-3.5 text-xs">
                <div className="flex items-center gap-2.5">
                  <span className="flex size-5 items-center justify-center rounded-full bg-secondary text-[10px] font-bold text-subtle">
                    {idx + 1}
                  </span>
                  <div className="flex flex-col">
                    <span className="font-semibold text-foreground">
                      {p.libellePersonnalise || typeLibelle(p.type)}
                    </span>
                    <span className="text-[11px] text-subtle">
                      Catégorie : {typeLibelle(p.type)}
                    </span>
                  </div>
                </div>

                <span className="font-semibold text-foreground tabular-nums">
                  {euros(p.montantFCFA, true)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* 3. DATES, STATUT ET NOTES */}
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
                Du <strong>{contrat.debutLe.split("-").reverse().join("/")}</strong>
                {contrat.finLe ? ` au ${contrat.finLe.split("-").reverse().join("/")}` : " (durée indéterminée)"}
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

      <DialogFooter className="border-t border-border bg-card/60 p-4">
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
          {chargement ? "Enregistrement…" : "Enregistrer les modifications"}
        </Button>
      </DialogFooter>
    </>
  );
}

export default function ContratDetailDialog({ contrat, open, onOpenChange }: Props) {
  if (!contrat) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[700px] max-h-[92dvh] flex flex-col p-0 overflow-hidden">
        <ContratDetailContent
          key={contrat.id}
          contrat={contrat}
          onClose={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

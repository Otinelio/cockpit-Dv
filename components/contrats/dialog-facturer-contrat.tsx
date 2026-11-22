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
import Field from "@/components/_ui/field";
import { Input } from "@/components/_ui/input";
import { useCockpit } from "@/stores/cockpit-store";
import { euros } from "@/lib/format";
import type { ContratDV } from "@/server/dv-types";
import type { CodeTva } from "@/server/types";
import { Receipt, Sparkles } from "lucide-react";

interface Props {
  contrat: ContratDV | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function DialogFacturerContrat({ contrat, open, onOpenChange }: Props) {
  if (!contrat) return null;
  return <ContenuFacturerContrat contrat={contrat} open={open} onOpenChange={onOpenChange} />;
}

function ContenuFacturerContrat({
  contrat,
  open,
  onOpenChange,
}: {
  contrat: ContratDV;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const facturerContrat = useCockpit((s) => s.facturerContrat);
  const tableau = useCockpit((s) => s.tableau);
  const toast = useCockpit((s) => s.toast);

  // Factures déjà existantes liées à ce contrat
  const facturesLiees = (tableau?.factures ?? []).filter(
    (f) => f.contratId === contrat.id || (contrat.factureIds ?? []).includes(f.id),
  );
  const totalDejaFactureTTC = facturesLiees.reduce((acc, f) => acc + f.montant, 0);

  // Estimation du solde restant HT (en supposant TVA 18% par défaut : HT ~= TTC / 1.18)
  const montantContratTTC = contrat.montantFCFA;
  const soldeRestantTTC = Math.max(0, montantContratTTC - totalDejaFactureTTC);
  const soldeRestantEstimeHT = Math.round(soldeRestantTTC / 1.18);

  const [libelle, setLibelle] = useState(
    facturesLiees.length === 0
      ? `${contrat.titre} — Acompte initial`
      : `${contrat.titre} — Solde final`,
  );
  const [montantHT, setMontantHT] = useState<number | "">(
    soldeRestantEstimeHT > 0 ? soldeRestantEstimeHT : Math.round(contrat.montantFCFA / 1.18),
  );
  const [tva, setTva] = useState<CodeTva>("TG_180");
  const [echeanceJours, setEcheanceJours] = useState(15);
  const [chargement, setChargement] = useState(false);

  // Calcul temps réel TTC
  const tauxTva = tva === "TG_180" ? 0.18 : 0;
  const numHT = Number(montantHT) || 0;
  const montantTVA = Math.round(numHT * tauxTva);
  const montantTotalTTC = numHT + montantTVA;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!numHT || numHT <= 0) {
      toast({
        ton: "erreur",
        titre: "Montant invalide",
        texte: "Indique un montant HT valide supérieur à 0.",
      });
      return;
    }

    setChargement(true);
    try {
      const factureId = await facturerContrat(contrat.id, {
        libelle: libelle.trim() || `${contrat.titre} — Facture`,
        montantHT: numHT,
        tva,
        echeanceJours,
      });

      if (factureId) {
        toast({
          ton: "succes",
          titre: "Facture générée",
          texte: `Facture #${factureId} émise pour ${contrat.nomEntreprise}.`,
        });
        onOpenChange(false);
      } else {
        toast({
          ton: "erreur",
          titre: "Erreur",
          texte: "Impossible d'émettre la facture.",
        });
      }
    } catch (err) {
      toast({
        ton: "erreur",
        titre: "Erreur facturation",
        texte: err instanceof Error ? err.message : "Erreur inattendue.",
      });
    } finally {
      setChargement(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-[#161616] border-border text-foreground">
        <form onSubmit={handleSubmit} className="space-y-5">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <Receipt className="size-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold">
                  Émettre une facture pour ce contrat
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Génère automatiquement une facture rattachée à {contrat.nomEntreprise}.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* Synthèse financière du contrat */}
          <div className="rounded-xl border border-border bg-card/40 p-3.5 space-y-2 text-xs">
            <div className="flex items-center justify-between text-muted-foreground">
              <span>Valeur globale du contrat :</span>
              <span className="font-mono font-bold text-foreground">
                {euros(contrat.montantFCFA, true)}
              </span>
            </div>
            <div className="flex items-center justify-between text-muted-foreground">
              <span>Déjà facturé ({facturesLiees.length} facture{facturesLiees.length > 1 ? "s" : ""}) :</span>
              <span className="font-mono text-trend">{euros(totalDejaFactureTTC, true)}</span>
            </div>
            <div className="flex items-center justify-between border-t border-border/60 pt-2 font-semibold">
              <span className="text-foreground">Reste à facturer (TTC) :</span>
              <span className="font-mono text-primary">{euros(soldeRestantTTC, true)}</span>
            </div>

            {soldeRestantEstimeHT > 0 && (
              <button
                type="button"
                onClick={() => {
                  setMontantHT(soldeRestantEstimeHT);
                  setLibelle(`${contrat.titre} — Solde final`);
                }}
                className="mt-1 w-full flex items-center justify-center gap-1.5 py-1 px-2 rounded-lg bg-primary/10 text-primary text-[11px] font-medium hover:bg-primary/20 transition-colors"
              >
                <Sparkles className="size-3" />
                Facturer le solde restant ({euros(soldeRestantEstimeHT, true)} HT)
              </button>
            )}
          </div>

          <div className="space-y-4">
            <Field label="Libellé de la facture" htmlFor="facture-libelle">
              <Input
                id="facture-libelle"
                value={libelle}
                onChange={(e) => setLibelle(e.target.value)}
                placeholder="Ex : Refonte site web — Acompte 50%"
                required
                className="bg-card text-xs"
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Montant HT (FCFA)" htmlFor="facture-montant">
                <Input
                  id="facture-montant"
                  type="number"
                  min={1}
                  step={100}
                  value={montantHT}
                  onChange={(e) =>
                    setMontantHT(e.target.value === "" ? "" : Number(e.target.value))
                  }
                  placeholder="Ex : 250000"
                  required
                  className="bg-card text-xs font-mono font-semibold"
                />
              </Field>

              <Field label="TVA applicable" htmlFor="facture-tva">
                <select
                  id="facture-tva"
                  value={tva}
                  onChange={(e) => setTva(e.target.value as CodeTva)}
                  className="w-full h-9 rounded-lg border border-line-strong bg-card text-foreground px-3 text-xs outline-none focus:border-ring"
                >
                  <option value="TG_180">TVA Togo 18% (Standard)</option>
                  <option value="AUCUNE">Exonéré de TVA (0%)</option>
                </select>
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Délai de paiement (jours)" htmlFor="facture-echeance">
                <Input
                  id="facture-echeance"
                  type="number"
                  min={0}
                  max={90}
                  value={echeanceJours}
                  onChange={(e) => setEcheanceJours(Number(e.target.value) || 0)}
                  placeholder="15"
                  className="bg-card text-xs font-mono"
                />
              </Field>

              <div className="rounded-lg border border-border bg-card/60 p-2.5 flex flex-col justify-center">
                <span className="text-[10px] text-muted-foreground uppercase font-mono">
                  Total TTC calculé
                </span>
                <span className="text-sm font-bold font-mono text-trend">
                  {euros(montantTotalTTC, true)}
                </span>
              </div>
            </div>
          </div>

          <DialogFooter className="flex items-center justify-end gap-2 pt-2 border-t border-border">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={chargement}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={chargement}
              className="font-semibold"
            >
              {chargement ? "Génération..." : "Générer la facture"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

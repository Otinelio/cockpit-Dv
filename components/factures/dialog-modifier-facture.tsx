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
import { api } from "@/lib/api";
import { euros } from "@/lib/format";
import type { CodeTva, LigneFacture } from "@/server/types";
import { Edit3 } from "lucide-react";

interface Props {
  facture: LigneFacture | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function DialogModifierFacture({ facture, open, onOpenChange }: Props) {
  if (!facture) return null;
  return <ContenuModifierFacture facture={facture} open={open} onOpenChange={onOpenChange} />;
}

function ContenuModifierFacture({
  facture,
  open,
  onOpenChange,
}: {
  facture: LigneFacture;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const charger = useCockpit((s) => s.charger);
  const toast = useCockpit((s) => s.toast);

  const [libelle, setLibelle] = useState(() => facture.client ? `Facture ${facture.client}` : "");
  const [montantHT, setMontantHT] = useState<number | "">(() => Math.round(facture.montant));
  const [tva, setTva] = useState<CodeTva>("exempt");
  const [chargement, setChargement] = useState(false);

  const montantTotalTTC =
    typeof montantHT === "number"
      ? tva === "TG_180"
        ? Math.round(montantHT * 1.18)
        : montantHT
      : 0;

  async function handleSauvegarder(e: React.FormEvent) {
    e.preventDefault();
    if (montantHT === "" || montantHT < 0) return;

    setChargement(true);
    try {
      await api.modifierFacture(facture.id, {
        montantHT: Number(montantHT),
        tva,
        libelle: libelle.trim() || undefined,
      });
      await charger(true);
      toast({
        ton: "succes",
        titre: "Facture mise à jour",
        texte: `Montant réajusté à ${euros(montantTotalTTC, true)}`,
      });
      onOpenChange(false);
    } catch (err) {
      toast({
        ton: "erreur",
        titre: "Erreur de modification",
        texte: (err as Error).message,
      });
    } finally {
      setChargement(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit3 className="size-4 text-primary" />
            Modifier la facture #{facture.numero || facture.id}
          </DialogTitle>
          <DialogDescription>
            Ajuste le montant HT, le régime TVA ou le libellé. Le PDF se régénèrera automatiquement.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSauvegarder} className="space-y-4 py-2">
          <Field label="Libellé / Objet de la facture" htmlFor="mod-fact-libelle">
            <Input
              id="mod-fact-libelle"
              value={libelle}
              onChange={(e) => setLibelle(e.target.value)}
              placeholder="Ex : Prestation de développement web"
              required
            />
          </Field>

          <Field label="Montant HT (FCFA)" htmlFor="mod-fact-montant">
            <Input
              id="mod-fact-montant"
              type="number"
              min={0}
              value={montantHT}
              onChange={(e) =>
                setMontantHT(e.target.value === "" ? "" : Number(e.target.value))
              }
              required
            />
          </Field>

          <Field label="Régime TVA" htmlFor="mod-fact-tva">
            <div id="mod-fact-tva" className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setTva("exempt")}
                className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold transition-colors ${
                  tva === "exempt"
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                Exonéré (0%)
              </button>
              <button
                type="button"
                onClick={() => setTva("TG_180")}
                className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold transition-colors ${
                  tva === "TG_180"
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                TVA Togo (18%)
              </button>
            </div>
          </Field>

          <div className="flex items-center justify-between p-3 rounded-lg bg-card/60 border border-border text-xs">
            <span className="text-muted-foreground">Total TTC calculé :</span>
            <span className="font-mono font-bold text-trend text-sm">
              {euros(montantTotalTTC, true)}
              {tva === "TG_180" ? " TTC" : " HT (Exonéré)"}
            </span>
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
              {chargement ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

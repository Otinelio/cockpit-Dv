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
import type { ContratDV, StatutContratDV } from "@/server/dv-types";
import { FileEdit } from "lucide-react";

interface Props {
  contrat: ContratDV | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const STATUTS: { code: StatutContratDV; label: string }[] = [
  { code: "actif", label: "Signé & Actif" },
  { code: "en_attente", label: "En attente de signature" },
  { code: "brouillon", label: "Brouillon / En négociation" },
  { code: "termine", label: "Terminé / Livré" },
  { code: "resilie", label: "Résilié" },
];

const MEMBRES = ["Othnelio", "Medard", "Roméo"] as const;

export default function DialogModifierContrat({ contrat, open, onOpenChange }: Props) {
  if (!contrat) return null;
  return <ContenuModifierContrat contrat={contrat} open={open} onOpenChange={onOpenChange} />;
}

function ContenuModifierContrat({
  contrat,
  open,
  onOpenChange,
}: {
  contrat: ContratDV;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const modifierContrat = useCockpit((s) => s.modifierContrat);

  const [titre, setTitre] = useState(() => contrat.titre);
  const [statut, setStatut] = useState<StatutContratDV>(() => contrat.statut);
  const [responsable, setResponsable] = useState(() => contrat.responsable);
  const [debutLe, setDebutLe] = useState(() => contrat.debutLe);
  const [finLe, setFinLe] = useState(() => contrat.finLe || "");
  const [mentions, setMentions] = useState(() => contrat.mentionsLegales || "");
  const [notes, setNotes] = useState(() => contrat.notes || "");
  const [chargement, setChargement] = useState(false);

  async function handleSauvegarder(e: React.FormEvent) {
    e.preventDefault();
    if (!titre.trim()) return;
    setChargement(true);

    await modifierContrat(contrat.id, {
      titre: titre.trim(),
      statut,
      responsable,
      debutLe,
      finLe: finLe || undefined,
      mentionsLegales: mentions.trim() || undefined,
      notes: notes.trim() || undefined,
      estSigne: statut === "actif" || statut === "termine",
      signeLe: statut === "actif" || statut === "termine" ? contrat.signeLe || debutLe : undefined,
    });

    setChargement(false);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileEdit className="size-4 text-primary" />
            Modifier le contrat
          </DialogTitle>
          <DialogDescription>
            Met à jour les paramètres, dates, statut et mentions de ce contrat.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSauvegarder} className="space-y-4 py-2">
          <Field label="Intitulé du contrat" htmlFor="mod-ctr-titre">
            <Input
              id="mod-ctr-titre"
              value={titre}
              onChange={(e) => setTitre(e.target.value)}
              required
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Statut" htmlFor="mod-ctr-statut">
              <select
                id="mod-ctr-statut"
                value={statut}
                onChange={(e) => setStatut(e.target.value as StatutContratDV)}
                className="border-line-strong bg-secondary text-foreground w-full rounded-lg border px-3 py-2 text-xs outline-none"
              >
                {STATUTS.map((s) => (
                  <option key={s.code} value={s.code}>
                    {s.label}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Pilote" htmlFor="mod-ctr-resp">
              <select
                id="mod-ctr-resp"
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

          <div className="grid grid-cols-2 gap-3">
            <Field label="Date de début" htmlFor="mod-ctr-debut">
              <Input
                id="mod-ctr-debut"
                type="date"
                value={debutLe}
                onChange={(e) => setDebutLe(e.target.value)}
                required
              />
            </Field>

            <Field label="Échéance de livraison" htmlFor="mod-ctr-fin">
              <Input
                id="mod-ctr-fin"
                type="date"
                value={finLe}
                onChange={(e) => setFinLe(e.target.value)}
              />
            </Field>
          </div>

          <Field label="Clauses & Mentions légales" htmlFor="mod-ctr-mentions">
            <textarea
              id="mod-ctr-mentions"
              value={mentions}
              onChange={(e) => setMentions(e.target.value)}
              rows={3}
              placeholder="Conditions de règlement, garanties..."
              className="border-line-strong bg-secondary text-foreground w-full rounded-lg border px-3 py-2 text-xs outline-none"
            />
          </Field>

          <Field label="Notes internes" htmlFor="mod-ctr-notes">
            <Input
              id="mod-ctr-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notes confidentielles..."
            />
          </Field>

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
              {chargement ? "Enregistrement..." : "Enregistrer les modifications"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

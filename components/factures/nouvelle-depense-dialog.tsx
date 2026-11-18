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
import { useCockpit } from "@/stores/cockpit-store";
import type { CategorieDepenseDV } from "@/server/dv-types";

const CATEGORIES: { code: CategorieDepenseDV; libelle: string }[] = [
  { code: "tech", libelle: "Tech & Outils dév (Lovable, GitHub, AI...)" },
  { code: "hebergement", libelle: "Hébergement, VPS & Domaines (Hostinger, OVH...)" },
  { code: "marketing", libelle: "Marketing, Visibilité & Pub" },
  { code: "deplacements", libelle: "Déplacements & Rendez-vous terrain" },
  { code: "administratif", libelle: "Fibre Internet, Électricité, Bureau" },
  { code: "retraits", libelle: "Retrait / Avance associé" },
  { code: "autre", libelle: "Autre charge" },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function NouvelleDepenseDialog({ open, onOpenChange }: Props) {
  const utilisateurActif = useCockpit((s) => s.utilisateurActif);
  const ajouterDepense = useCockpit((s) => s.ajouterDepense);

  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [libelle, setLibelle] = useState("");
  const [montantFCFA, setMontantFCFA] = useState<number | "">("");
  const [categorie, setCategorie] = useState<CategorieDepenseDV>("tech");
  const [payePar, setPayePar] = useState(utilisateurActif || "Othnelio");
  const [note, setNote] = useState("");
  const [chargement, setChargement] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!libelle.trim() || !montantFCFA || montantFCFA <= 0) return;

    setChargement(true);
    const ok = await ajouterDepense({
      date,
      libelle: libelle.trim(),
      montantFCFA: Number(montantFCFA),
      categorie,
      payePar,
      note: note.trim() || undefined,
      creePar: utilisateurActif || "Othnelio",
    });

    setChargement(false);
    if (ok) {
      setLibelle("");
      setMontantFCFA("");
      setNote("");
      onOpenChange(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[460px]">
        <DialogHeader>
          <DialogTitle>Enregistrer une dépense</DialogTitle>
          <DialogDescription>
            Sortie d&apos;argent, abonnement tech ou frais de fonctionnement DigitalVision.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-6">
          <Field label="Libellé de la dépense" htmlFor="depense-libelle">
            <Input
              id="depense-libelle"
              autoFocus
              placeholder="Ex : Abonnement Lovable dév"
              value={libelle}
              onChange={(e) => setLibelle(e.target.value)}
              required
            />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Montant (FCFA)" htmlFor="depense-montant">
              <div className="relative">
                <Input
                  id="depense-montant"
                  type="number"
                  min={1}
                  step={1}
                  placeholder="15000"
                  value={montantFCFA}
                  onChange={(e) => setMontantFCFA(e.target.value ? Number(e.target.value) : "")}
                  className="pr-14 tabular-nums"
                  required
                />
                <span
                  aria-hidden
                  className="text-subtle pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs"
                >
                  FCFA
                </span>
              </div>
            </Field>

            <Field label="Date" htmlFor="depense-date">
              <Input
                id="depense-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Catégorie" htmlFor="depense-cat">
              <select
                id="depense-cat"
                value={categorie}
                onChange={(e) => setCategorie(e.target.value as CategorieDepenseDV)}
                className="border-line-strong bg-secondary text-foreground focus-visible:border-ring w-full rounded-lg border px-3 py-2 text-sm outline-none"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.libelle}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Payé par" htmlFor="depense-payeur">
              <select
                id="depense-payeur"
                value={payePar}
                onChange={(e) => setPayePar(e.target.value)}
                className="border-line-strong bg-secondary text-foreground focus-visible:border-ring w-full rounded-lg border px-3 py-2 text-sm outline-none"
              >
                <option value="Othnelio">Othnelio</option>
                <option value="Medard">Médard</option>
                <option value="Roméo">Roméo</option>
              </select>
            </Field>
          </div>

          <Field label="Note / Précision (optionnel)" htmlFor="depense-note">
            <Input
              id="depense-note"
              placeholder="Ex : Réglé par T-Money"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </Field>

          <DialogFooter className="mt-2 border-t border-border pt-4">
            <Button
              variant="secondary"
              type="button"
              onClick={() => onOpenChange(false)}
            >
              Annuler
            </Button>
            <Button
              variant="primary"
              type="submit"
              disabled={!libelle.trim() || !montantFCFA || chargement}
            >
              {chargement ? "Enregistrement..." : "Ajouter la dépense"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}


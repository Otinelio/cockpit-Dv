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
import { Checkbox } from "@/components/_ui/checkbox";
import { useCockpit } from "@/stores/cockpit-store";
import type { ContratDV, PrestationContratDV, TypeContratDV } from "@/server/dv-types";
import { ListTodo, Plus } from "lucide-react";

interface Props {
  contrat: ContratDV | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const TYPES: { code: TypeContratDV; libelle: string }[] = [
  { code: "app_mobile", libelle: "Application mobile" },
  { code: "creation_site", libelle: "Site web / Vitrine / Landing page" },
  { code: "logiciel", libelle: "Logiciel de gestion sur mesure" },
  { code: "maintenance", libelle: "Maintenance & Hébergement" },
  { code: "conseil", libelle: "Conseil & Accompagnement" },
];

const MEMBRES = ["Othnelio", "Medard", "Roméo"] as const;

export default function DialogAjouterPrestation({ contrat, open, onOpenChange }: Props) {
  if (!contrat) return null;
  return <ContenuAjouterPrestation contrat={contrat} open={open} onOpenChange={onOpenChange} />;
}

function ContenuAjouterPrestation({
  contrat,
  open,
  onOpenChange,
}: {
  contrat: ContratDV;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const modifierContrat = useCockpit((s) => s.modifierContrat);
  const ajouterTache = useCockpit((s) => s.ajouterTache);

  const [type, setType] = useState<TypeContratDV>("creation_site");
  const [libelle, setLibelle] = useState("");
  const [montant, setMontant] = useState<number | "">("");
  const [responsable, setResponsable] = useState(contrat.responsable);
  const [echeance, setEcheance] = useState(() => contrat.finLe || contrat.debutLe);
  const [creerTache, setCreerTache] = useState(true);
  const [chargement, setChargement] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!libelle.trim() || !montant || Number(montant) <= 0) return;
    setChargement(true);

    const mt = Number(montant);
    const idPresta = `p-${Date.now()}`;

    let tacheIdLiee: string | undefined;

    if (creerTache) {
      const tache = await ajouterTache({
        titre: `${libelle.trim()} — ${contrat.nomEntreprise}`,
        description: `Livrable ajouté au contrat "${contrat.titre}". Valorisation : ${mt.toLocaleString('fr-FR')} FCFA.`,
        type: "dev_client",
        assigneA: responsable,
        creePar: "Moi",
        statut: "a_faire",
        priorite: "haute",
        echeance: echeance || contrat.finLe || contrat.debutLe,
        entrepriseId: contrat.entrepriseId || undefined,
        nomEntreprise: contrat.nomEntreprise,
        contratId: contrat.id,
        prestationId: idPresta,
      });
      if (tache) {
        tacheIdLiee = tache.id;
      }
    }

    const nouvellePrestation: PrestationContratDV = {
      id: idPresta,
      type,
      libellePersonnalise: libelle.trim(),
      montantFCFA: mt,
      responsable,
      echeancePrestation: echeance || undefined,
      tacheIdLiee,
    };

    const prestationsActuelles = contrat.prestations ?? [];
    const tacheIdsActuelles = contrat.tacheIds ?? [];

    await modifierContrat(contrat.id, {
      prestations: [...prestationsActuelles, nouvellePrestation],
      montantFCFA: contrat.montantFCFA + mt,
      tacheIds: tacheIdLiee ? [...tacheIdsActuelles, tacheIdLiee] : tacheIdsActuelles,
    });

    setChargement(false);
    onOpenChange(false);
    setLibelle("");
    setMontant("");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="size-4 text-trend" />
            Ajouter une prestation au contrat
          </DialogTitle>
          <DialogDescription>
            Déclare un nouveau livrable pour {contrat.nomEntreprise} avec valorisation et tâche associée.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <Field label="Type de prestation" htmlFor="ajout-presta-type">
            <select
              id="ajout-presta-type"
              value={type}
              onChange={(e) => setType(e.target.value as TypeContratDV)}
              className="border-line-strong bg-secondary text-foreground w-full rounded-lg border px-3 py-2 text-xs outline-none"
            >
              {TYPES.map((t) => (
                <option key={t.code} value={t.code}>
                  {t.libelle}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Intitulé du livrable" htmlFor="ajout-presta-lib">
            <Input
              id="ajout-presta-lib"
              value={libelle}
              onChange={(e) => setLibelle(e.target.value)}
              placeholder="Ex : Intégration passerelle T-Money / Flooz"
              required
            />
          </Field>

          <Field label="Montant HT (FCFA)" htmlFor="ajout-presta-mt">
            <Input
              id="ajout-presta-mt"
              type="number"
              min={1}
              value={montant}
              onChange={(e) => setMontant(e.target.value === "" ? "" : Number(e.target.value))}
              placeholder="Ex : 150000"
              required
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Responsable du livrable" htmlFor="ajout-presta-resp">
              <select
                id="ajout-presta-resp"
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

            <Field label="Date d'échéance" htmlFor="ajout-presta-date">
              <Input
                id="ajout-presta-date"
                type="date"
                value={echeance}
                onChange={(e) => setEcheance(e.target.value)}
              />
            </Field>
          </div>

          <div className="flex items-start gap-2.5 p-3 rounded-lg bg-card/60 border border-border">
            <Checkbox
              id="ajout-presta-creer-tache"
              checked={creerTache}
              onCheckedChange={(checked) => setCreerTache(Boolean(checked))}
              className="mt-0.5"
            />
            <div className="space-y-0.5">
              <label
                htmlFor="ajout-presta-creer-tache"
                className="text-xs font-semibold text-foreground cursor-pointer flex items-center gap-1.5"
              >
                <ListTodo className="size-3 text-trend" />
                Créer la tâche d&apos;équipe associée dans /taches
              </label>
              <p className="text-[11px] text-muted-foreground">
                Sera assignée à {responsable} avec notification d’activité.
              </p>
            </div>
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
              {chargement ? "Ajout..." : "Ajouter la prestation"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

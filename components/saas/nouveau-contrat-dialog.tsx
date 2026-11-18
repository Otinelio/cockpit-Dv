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
import type { StatutContratDV, TypeContratDV } from "@/server/dv-types";

const TYPES: { code: TypeContratDV; libelle: string }[] = [
  { code: "creation_site", libelle: "Création de site web vitrine ou e-commerce" },
  { code: "app_mobile", libelle: "Application mobile (iOS / Android)" },
  { code: "logiciel", libelle: "Logiciel de gestion sur mesure" },
  { code: "maintenance", libelle: "Contrat de maintenance & Hébergement" },
  { code: "conseil", libelle: "Conseil & Accompagnement digital" },
];

const STATUTS: { code: StatutContratDV; libelle: string }[] = [
  { code: "brouillon", libelle: "Brouillon / En négociation" },
  { code: "en_attente", libelle: "Envoyé pour signature" },
  { code: "actif", libelle: "Signé & Actif" },
  { code: "termine", libelle: "Terminé / Livré" },
  { code: "resilie", libelle: "Résilié" },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function NouveauContratDialog({ open, onOpenChange }: Props) {
  const utilisateurActif = useCockpit((s) => s.utilisateurActif);
  const crm = useCockpit((s) => s.crm);
  const ajouterContrat = useCockpit((s) => s.ajouterContrat);

  const [titre, setTitre] = useState("");
  const [entrepriseId, setEntrepriseId] = useState("");
  const [nomEntrepriseLibre, setNomEntrepriseLibre] = useState("");
  const [type, setType] = useState<TypeContratDV>("creation_site");
  const [montantFCFA, setMontantFCFA] = useState<number | "">("");
  const [debutLe, setDebutLe] = useState(() => new Date().toISOString().slice(0, 10));
  const [finLe, setFinLe] = useState("");
  const [statut, setStatut] = useState<StatutContratDV>("actif");
  const [responsable, setResponsable] = useState(utilisateurActif || "Othnelio");
  const [notes, setNotes] = useState("");
  const [chargement, setChargement] = useState(false);

  const clients = crm?.entreprises ?? [];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const clientTrouve = clients.find((c) => c.id === entrepriseId);
    const nomFinal = clientTrouve?.nom || nomEntrepriseLibre.trim();

    if (!titre.trim() || !nomFinal) return;

    setChargement(true);
    const ok = await ajouterContrat({
      entrepriseId: clientTrouve?.id || "",
      nomEntreprise: nomFinal,
      titre: titre.trim(),
      type,
      montantFCFA: Number(montantFCFA) || 0,
      debutLe,
      finLe: finLe || undefined,
      statut,
      responsable,
      notes: notes.trim() || undefined,
    });

    setChargement(false);
    if (ok) {
      setTitre("");
      setNomEntrepriseLibre("");
      setMontantFCFA("");
      setNotes("");
      onOpenChange(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Enregistrer un contrat ou prestation</DialogTitle>
          <DialogDescription>
            Convention de développement de site, application mobile ou maintenance client.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-6">
          <Field label="Intitulé du contrat" htmlFor="ctr-titre">
            <Input
              id="ctr-titre"
              autoFocus
              placeholder="Ex : Création de la plateforme web et app mobile"
              value={titre}
              onChange={(e) => setTitre(e.target.value)}
              required
            />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Client du CRM" htmlFor="ctr-client-crm">
              <select
                id="ctr-client-crm"
                value={entrepriseId}
                onChange={(e) => {
                  setEntrepriseId(e.target.value);
                  const f = clients.find((c) => c.id === e.target.value);
                  if (f) setNomEntrepriseLibre(f.nom);
                }}
                className="border-line-strong bg-secondary text-foreground rounded-lg border px-2.5 py-1.5 text-xs outline-none"
              >
                <option value="">-- Sélectionner un client --</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nom}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Ou nom direct du client" htmlFor="ctr-client-libre">
              <Input
                id="ctr-client-libre"
                placeholder="Ex : Cabinet Alpha Lomé"
                value={nomEntrepriseLibre}
                onChange={(e) => setNomEntrepriseLibre(e.target.value)}
                required={!entrepriseId}
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Type de prestation" htmlFor="ctr-type">
              <select
                id="ctr-type"
                value={type}
                onChange={(e) => setType(e.target.value as TypeContratDV)}
                className="border-line-strong bg-secondary text-foreground rounded-lg border px-2.5 py-1.5 text-xs outline-none"
              >
                {TYPES.map((t) => (
                  <option key={t.code} value={t.code}>
                    {t.libelle}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Statut du contrat" htmlFor="ctr-statut">
              <select
                id="ctr-statut"
                value={statut}
                onChange={(e) => setStatut(e.target.value as StatutContratDV)}
                className="border-line-strong bg-secondary text-foreground rounded-lg border px-2.5 py-1.5 text-xs outline-none"
              >
                {STATUTS.map((s) => (
                  <option key={s.code} value={s.code}>
                    {s.libelle}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
            <Field label="Montant (FCFA)" htmlFor="ctr-montant">
              <Input
                id="ctr-montant"
                type="number"
                placeholder="1500000"
                value={montantFCFA}
                onChange={(e) => setMontantFCFA(e.target.value ? Number(e.target.value) : "")}
              />
            </Field>

            <Field label="Date début" htmlFor="ctr-debut">
              <Input
                id="ctr-debut"
                type="date"
                value={debutLe}
                onChange={(e) => setDebutLe(e.target.value)}
                required
              />
            </Field>

            <Field label="Date fin" htmlFor="ctr-fin">
              <Input
                id="ctr-fin"
                type="date"
                value={finLe}
                onChange={(e) => setFinLe(e.target.value)}
              />
            </Field>

            <Field label="Responsable" htmlFor="ctr-responsable">
              <select
                id="ctr-responsable"
                value={responsable}
                onChange={(e) => setResponsable(e.target.value)}
                className="border-line-strong bg-secondary text-foreground rounded-lg border px-2 py-1.5 text-xs outline-none"
              >
                <option value="Othnelio">Othnelio</option>
                <option value="Medard">Médard</option>
                <option value="Roméo">Roméo</option>
              </select>
            </Field>
          </div>

          <Field label="Clauses / Notes (modalités, paiements...)" htmlFor="ctr-notes">
            <Input
              id="ctr-notes"
              placeholder="Ex : 50% à la commande, 50% à la livraison avec 3 mois de maintenance offerte"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
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
              disabled={!titre.trim() || chargement}
            >
              {chargement ? "Enregistrement..." : "Créer le contrat"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}


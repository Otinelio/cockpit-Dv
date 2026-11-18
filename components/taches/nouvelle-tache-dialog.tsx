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
import type { PrioriteTacheDV, TypeTacheDV } from "@/server/dv-types";

const TYPES: { code: TypeTacheDV; libelle: string }[] = [
  { code: "appel", libelle: "Appel téléphonique" },
  { code: "prospection", libelle: "Prospection client / WhatsApp" },
  { code: "devis", libelle: "Devis / Proposition commerciale" },
  { code: "dev_client", libelle: "Chantier client (Site / App mobile)" },
  { code: "dev_saas", libelle: "Développement SaaS (MivaFid, MivaCouture)" },
  { code: "reunion", libelle: "Réunion d'équipe ou client" },
  { code: "administratif", libelle: "Administratif & Gestion" },
];

const PRIORITES: { code: PrioriteTacheDV; libelle: string; ton: string }[] = [
  { code: "urgente", libelle: "Urgente", ton: "text-red-400" },
  { code: "haute", libelle: "Haute", ton: "text-amber-400" },
  { code: "normale", libelle: "Normale", ton: "text-blue-400" },
  { code: "basse", libelle: "Basse", ton: "text-muted-foreground" },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function NouvelleTacheDialog({ open, onOpenChange }: Props) {
  const utilisateurActif = useCockpit((s) => s.utilisateurActif);
  const crm = useCockpit((s) => s.crm);
  const saas = useCockpit((s) => s.saas);
  const ajouterTache = useCockpit((s) => s.ajouterTache);

  const [titre, setTitre] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<TypeTacheDV>("appel");
  const [assigneA, setAssigneA] = useState(utilisateurActif || "Othnelio");
  const [priorite, setPriorite] = useState<PrioriteTacheDV>("normale");
  const [echeance, setEcheance] = useState(() => new Date().toISOString().slice(0, 10));
  const [heure, setHeure] = useState("10:00");
  const [entrepriseId, setEntrepriseId] = useState("");
  const [saasId, setSaasId] = useState("");
  const [chargement, setChargement] = useState(false);

  const clients = crm?.entreprises ?? [];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!titre.trim()) return;

    setChargement(true);
    const clientChoisi = clients.find((c) => c.id === entrepriseId);

    const ok = await ajouterTache({
      titre: titre.trim(),
      description: description.trim() || undefined,
      type,
      assigneA,
      creePar: utilisateurActif || "Othnelio",
      statut: "a_faire",
      priorite,
      echeance,
      heure: heure || undefined,
      entrepriseId: entrepriseId || undefined,
      nomEntreprise: clientChoisi?.nom || undefined,
      saasId: saasId || undefined,
    });

    setChargement(false);
    if (ok) {
      setTitre("");
      setDescription("");
      onOpenChange(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Programmer une action ou tâche</DialogTitle>
          <DialogDescription>
            Appel, prospection, développement client ou jalon SaaS pour l&apos;équipe DigitalVision.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-6">
          <Field label="Titre de la tâche" htmlFor="tache-titre">
            <Input
              id="tache-titre"
              autoFocus
              placeholder="Ex : Appel de relance pour la démo MivaFid"
              value={titre}
              onChange={(e) => setTitre(e.target.value)}
              required
            />
          </Field>

          <Field label="Description / Détails (optionnel)" htmlFor="tache-desc">
            <textarea
              id="tache-desc"
              rows={2}
              className="border-line-strong bg-secondary placeholder:text-muted-foreground focus-visible:border-ring w-full rounded-lg border px-3 py-2 text-sm outline-none"
              placeholder="Ex : Discuter de la personnalisation des points et du menu digital..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Type d'action" htmlFor="tache-type">
              <select
                id="tache-type"
                value={type}
                onChange={(e) => setType(e.target.value as TypeTacheDV)}
                className="border-line-strong bg-secondary text-foreground focus-visible:border-ring w-full rounded-lg border px-3 py-2 text-sm outline-none"
              >
                {TYPES.map((t) => (
                  <option key={t.code} value={t.code}>
                    {t.libelle}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Assigner à" htmlFor="tache-assigne">
              <select
                id="tache-assigne"
                value={assigneA}
                onChange={(e) => setAssigneA(e.target.value)}
                className="border-line-strong bg-secondary text-foreground focus-visible:border-ring w-full rounded-lg border px-3 py-2 text-sm outline-none"
              >
                <option value="Othnelio">Othnelio (CTO)</option>
                <option value="Medard">Médard (CMO)</option>
                <option value="Roméo">Roméo (COO)</option>
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Priorité" htmlFor="tache-prio">
              <select
                id="tache-prio"
                value={priorite}
                onChange={(e) => setPriorite(e.target.value as PrioriteTacheDV)}
                className="border-line-strong bg-secondary text-foreground focus-visible:border-ring w-full rounded-lg border px-3 py-2 text-sm outline-none"
              >
                {PRIORITES.map((p) => (
                  <option key={p.code} value={p.code}>
                    {p.libelle}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Date limite" htmlFor="tache-echeance">
              <Input
                id="tache-echeance"
                type="date"
                value={echeance}
                onChange={(e) => setEcheance(e.target.value)}
                required
              />
            </Field>

            <Field label="Heure" htmlFor="tache-heure">
              <Input
                id="tache-heure"
                type="time"
                value={heure}
                onChange={(e) => setHeure(e.target.value)}
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Client lié (optionnel)" htmlFor="tache-client">
              <select
                id="tache-client"
                value={entrepriseId}
                onChange={(e) => setEntrepriseId(e.target.value)}
                className="border-line-strong bg-secondary text-foreground focus-visible:border-ring w-full rounded-lg border px-3 py-2 text-sm outline-none"
              >
                <option value="">-- Aucun client lié --</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nom}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="SaaS lié (optionnel)" htmlFor="tache-saas">
              <select
                id="tache-saas"
                value={saasId}
                onChange={(e) => setSaasId(e.target.value)}
                className="border-line-strong bg-secondary text-foreground focus-visible:border-ring w-full rounded-lg border px-3 py-2 text-sm outline-none"
              >
                <option value="">-- Aucun SaaS --</option>
                {saas.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nom}
                  </option>
                ))}
              </select>
            </Field>
          </div>

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
              {chargement ? "Enregistrement..." : "Créer la tâche"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}


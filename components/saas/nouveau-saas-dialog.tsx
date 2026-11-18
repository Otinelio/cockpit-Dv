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
import type { StatutSaasDV } from "@/server/dv-types";

const STATUTS: { code: StatutSaasDV; libelle: string }[] = [
  { code: "ideation", libelle: "Idéation & Réflexion" },
  { code: "prototypage", libelle: "Prototypage & Architecture (MVP)" },
  { code: "beta", libelle: "Bêta privée / Testeurs" },
  { code: "production", libelle: "En ligne / Commercialisé" },
  { code: "en_pause", libelle: "En pause" },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function NouveauSaasDialog({ open, onOpenChange }: Props) {
  const ajouterSaas = useCockpit((s) => s.ajouterSaas);

  const [nom, setNom] = useState("");
  const [slogan, setSlogan] = useState("");
  const [description, setDescription] = useState("");
  const [statut, setStatut] = useState<StatutSaasDV>("prototypage");
  const [leadTech, setLeadTech] = useState("Othnelio");
  const [leadMarketing, setLeadMarketing] = useState("Medard");
  const [leadOps, setLeadOps] = useState("Roméo");
  const [url, setUrl] = useState("");
  const [depotGit, setDepotGit] = useState("");
  const [objectifMrrFCFA, setObjectifMrrFCFA] = useState<number | "">(500000);
  const [chargement, setChargement] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nom.trim() || !slogan.trim()) return;

    setChargement(true);
    const ok = await ajouterSaas({
      nom: nom.trim(),
      slogan: slogan.trim(),
      description: description.trim(),
      statut,
      leadTech,
      leadMarketing,
      leadOps,
      url: url.trim() || undefined,
      depotGit: depotGit.trim() || undefined,
      mrrFCFA: 0,
      objectifMrrFCFA: Number(objectifMrrFCFA) || 500000,
      utilisateurs: 0,
      jalons: [
        { id: `j-${Date.now()}-1`, titre: "Définition du MVP & Maquettes", termine: true },
        { id: `j-${Date.now()}-2`, titre: "Développement de la première version", termine: false },
        { id: `j-${Date.now()}-3`, titre: "Premiers tests utilisateurs", termine: false },
      ],
      documents: [],
    });

    setChargement(false);
    if (ok) {
      setNom("");
      setSlogan("");
      setDescription("");
      setUrl("");
      setDepotGit("");
      onOpenChange(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Lancer un nouveau produit SaaS</DialogTitle>
          <DialogDescription>
            Ajoute un produit au studio SaaStup de DigitalVision pour en piloter la roadmap et les revenus.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Nom du SaaS" htmlFor="saas-nom">
              <Input
                id="saas-nom"
                autoFocus
                placeholder="Ex : MivaPay"
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                required
              />
            </Field>

            <Field label="Statut actuel" htmlFor="saas-statut">
              <select
                id="saas-statut"
                value={statut}
                onChange={(e) => setStatut(e.target.value as StatutSaasDV)}
                className="border-line-strong bg-secondary text-foreground focus-visible:border-ring w-full rounded-lg border px-3 py-2 text-sm outline-none"
              >
                {STATUTS.map((s) => (
                  <option key={s.code} value={s.code}>
                    {s.libelle}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Slogan / Proposition de valeur" htmlFor="saas-slogan">
            <Input
              id="saas-slogan"
              placeholder="Ex : La solution de paiement mobile tout-en-un pour les commerces"
              value={slogan}
              onChange={(e) => setSlogan(e.target.value)}
              required
            />
          </Field>

          <Field label="Description détaillée" htmlFor="saas-desc">
            <textarea
              id="saas-desc"
              rows={3}
              className="border-line-strong bg-secondary placeholder:text-muted-foreground focus-visible:border-ring w-full rounded-lg border px-3 py-2 text-sm outline-none"
              placeholder="Fonctionnalités clés, cible (particuliers/entreprises), modèle économique..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Lead Tech" htmlFor="saas-lead-tech">
              <select
                id="saas-lead-tech"
                value={leadTech}
                onChange={(e) => setLeadTech(e.target.value)}
                className="border-line-strong bg-secondary text-foreground rounded-lg border px-2 py-1.5 text-xs outline-none"
              >
                <option value="Othnelio">Othnelio</option>
                <option value="Medard">Médard</option>
                <option value="Roméo">Roméo</option>
              </select>
            </Field>

            <Field label="Lead Marketing" htmlFor="saas-lead-mktg">
              <select
                id="saas-lead-mktg"
                value={leadMarketing}
                onChange={(e) => setLeadMarketing(e.target.value)}
                className="border-line-strong bg-secondary text-foreground rounded-lg border px-2 py-1.5 text-xs outline-none"
              >
                <option value="Medard">Médard</option>
                <option value="Othnelio">Othnelio</option>
                <option value="Roméo">Roméo</option>
              </select>
            </Field>

            <Field label="Lead Ops" htmlFor="saas-lead-ops">
              <select
                id="saas-lead-ops"
                value={leadOps}
                onChange={(e) => setLeadOps(e.target.value)}
                className="border-line-strong bg-secondary text-foreground rounded-lg border px-2 py-1.5 text-xs outline-none"
              >
                <option value="Roméo">Roméo</option>
                <option value="Othnelio">Othnelio</option>
                <option value="Medard">Médard</option>
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Objectif MRR (FCFA/mois)" htmlFor="saas-mrr">
              <Input
                id="saas-mrr"
                type="number"
                placeholder="500000"
                value={objectifMrrFCFA}
                onChange={(e) => setObjectifMrrFCFA(e.target.value ? Number(e.target.value) : "")}
              />
            </Field>

            <Field label="Site web / URL publique (optionnel)" htmlFor="saas-url">
              <Input
                id="saas-url"
                placeholder="https://..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
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
              disabled={!nom.trim() || !slogan.trim() || chargement}
            >
              {chargement ? "Création..." : "Ajouter le SaaS"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}


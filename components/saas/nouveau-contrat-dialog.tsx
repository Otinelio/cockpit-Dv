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
import { euros } from "@/lib/format";
import type { PrestationContratDV, StatutContratDV, TypeContratDV } from "@/server/dv-types";
import { Plus, Trash2, Layers } from "lucide-react";

const TYPES: { code: TypeContratDV; libelle: string }[] = [
  { code: "app_mobile", libelle: "Application mobile (iOS / Android)" },
  { code: "creation_site", libelle: "Site web vitrine ou e-commerce / Landing page" },
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

interface LignePrestation {
  id: string;
  type: TypeContratDV;
  libellePersonnalise: string;
  montantFCFA: number | "";
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entrepriseIdParDefaut?: string;
  nomEntrepriseParDefaut?: string;
}

export default function NouveauContratDialog({
  open,
  onOpenChange,
  entrepriseIdParDefaut,
  nomEntrepriseParDefaut,
}: Props) {
  const utilisateurActif = useCockpit((s) => s.utilisateurActif);
  const crm = useCockpit((s) => s.crm);
  const ajouterContrat = useCockpit((s) => s.ajouterContrat);

  const [titre, setTitre] = useState("");
  const [entrepriseId, setEntrepriseId] = useState(entrepriseIdParDefaut || "");
  const [nomEntrepriseLibre, setNomEntrepriseLibre] = useState(nomEntrepriseParDefaut || "");

  // Gestion multi-prestations
  const [prestations, setPrestations] = useState<LignePrestation[]>([
    {
      id: "p-1",
      type: "app_mobile",
      libellePersonnalise: "Application mobile",
      montantFCFA: "",
    },
  ]);

  const [debutLe, setDebutLe] = useState(() => new Date().toISOString().slice(0, 10));
  const [finLe, setFinLe] = useState("");
  const [statut, setStatut] = useState<StatutContratDV>("actif");
  const [responsable, setResponsable] = useState(utilisateurActif || "Othnelio");
  const [notes, setNotes] = useState("");
  const [chargement, setChargement] = useState(false);

  const clients = crm?.entreprises ?? [];

  // Somme totale dynamique
  const montantTotalFCFA = prestations.reduce(
    (acc, p) => acc + (typeof p.montantFCFA === "number" ? p.montantFCFA : 0),
    0,
  );

  function ajouterLignePrestation() {
    setPrestations((actuelles) => [
      ...actuelles,
      {
        id: `p-${Date.now()}`,
        type: "creation_site",
        libellePersonnalise: "Site web / Landing page",
        montantFCFA: "",
      },
    ]);
  }

  function modifierPrestation(id: string, modifs: Partial<LignePrestation>) {
    setPrestations((actuelles) =>
      actuelles.map((p) => (p.id === id ? { ...p, ...modifs } : p)),
    );
  }

  function supprimerLignePrestation(id: string) {
    if (prestations.length <= 1) return;
    setPrestations((actuelles) => actuelles.filter((p) => p.id !== id));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const clientTrouve = clients.find((c) => c.id === entrepriseId);
    const nomFinal = clientTrouve?.nom || nomEntrepriseLibre.trim();

    if (!titre.trim() || !nomFinal) return;

    setChargement(true);

    const prestationsFormatees: PrestationContratDV[] = prestations.map((p) => ({
      id: p.id,
      type: p.type,
      libellePersonnalise: p.libellePersonnalise.trim() || undefined,
      montantFCFA: typeof p.montantFCFA === "number" ? p.montantFCFA : 0,
    }));

    const typePrincipal = prestationsFormatees[0]?.type || "creation_site";

    const ok = await ajouterContrat({
      entrepriseId: clientTrouve?.id || "",
      nomEntreprise: nomFinal,
      titre: titre.trim(),
      type: typePrincipal,
      prestations: prestationsFormatees,
      montantFCFA: montantTotalFCFA,
      debutLe,
      finLe: finLe || undefined,
      statut,
      responsable,
      notes: notes.trim() || undefined,
      estSigne: statut === "actif" || statut === "termine",
      signeLe: statut === "actif" || statut === "termine" ? debutLe : undefined,
    });

    setChargement(false);
    if (ok) {
      setTitre("");
      setNomEntrepriseLibre("");
      setPrestations([
        {
          id: "p-1",
          type: "app_mobile",
          libellePersonnalise: "Application mobile",
          montantFCFA: "",
        },
      ]);
      setNotes("");
      onOpenChange(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-[560px] max-h-[92dvh] flex flex-col p-0 overflow-hidden"
        onOpenAutoFocus={() => {
          if (entrepriseIdParDefaut) setEntrepriseId(entrepriseIdParDefaut);
          if (nomEntrepriseParDefaut) setNomEntrepriseLibre(nomEntrepriseParDefaut);
        }}
      >
        <DialogHeader className="border-b border-border bg-card/60 p-5 pb-4">
          <DialogTitle>Enregistrer un contrat client</DialogTitle>
          <DialogDescription>
            Convention multi-prestations : combine plusieurs services (ex: App mobile + Landing page) dans un contrat unique.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 flex flex-col gap-5">
          <Field label="Intitulé du contrat" htmlFor="ctr-titre">
            <Input
              id="ctr-titre"
              autoFocus
              placeholder="Ex : Digitalisation complète : App mobile + Landing page"
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
                placeholder="Ex : Restaurant Le Jardin Lomé"
                value={nomEntrepriseLibre}
                onChange={(e) => setNomEntrepriseLibre(e.target.value)}
                required={!entrepriseId}
              />
            </Field>
          </div>

          {/* SECTION MULTI-PRESTATIONS */}
          <div className="flex flex-col gap-3 rounded-xl border border-border bg-card/60 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Layers className="size-3.5 text-purple-400" />
                <span className="text-xs font-semibold text-foreground">
                  Prestations incluses ({prestations.length})
                </span>
              </div>
              <span className="text-xs font-bold text-trend tabular-nums">
                Total : {euros(montantTotalFCFA, true)}
              </span>
            </div>

            <div className="flex flex-col gap-2.5">
              {prestations.map((p, idx) => (
                <div
                  key={p.id}
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
                          montantFCFA: e.target.value === "" ? "" : Number(e.target.value),
                        })
                      }
                      className="h-7 text-xs pr-12 tabular-nums"
                      required
                    />
                    <span className="text-subtle text-[10px] pointer-events-none absolute right-2 top-1/2 -translate-y-1/2">
                      FCFA
                    </span>
                  </div>

                  {prestations.length > 1 && (
                    <button
                      type="button"
                      onClick={() => supprimerLignePrestation(p.id)}
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
              onClick={ajouterLignePrestation}
              className="gap-1.5 self-start text-xs h-7"
            >
              <Plus className="size-3" />
              Ajouter une prestation (ex: Landing page, Maintenance...)
            </Button>
          </div>

          {/* DATES ET STATUT */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Date de démarrage" htmlFor="ctr-debut">
              <Input
                id="ctr-debut"
                type="date"
                value={debutLe}
                onChange={(e) => setDebutLe(e.target.value)}
                required
              />
            </Field>

            <Field label="Date d'échéance ou livraison" htmlFor="ctr-fin">
              <Input
                id="ctr-fin"
                type="date"
                value={finLe}
                onChange={(e) => setFinLe(e.target.value)}
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Statut initial" htmlFor="ctr-statut">
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

            <Field label="Responsable DigitalVision" htmlFor="ctr-resp">
              <select
                id="ctr-resp"
                value={responsable}
                onChange={(e) => setResponsable(e.target.value)}
                className="border-line-strong bg-secondary text-foreground rounded-lg border px-2.5 py-1.5 text-xs outline-none"
              >
                <option value="Othnelio">Othnelio</option>
                <option value="Medard">Medard</option>
                <option value="Roméo">Roméo</option>
              </select>
            </Field>
          </div>

          <Field label="Notes ou modalités de paiement" htmlFor="ctr-notes">
            <textarea
              id="ctr-notes"
              rows={2}
              placeholder="Ex : Acompte de 50% au lancement, 50% à la livraison finale."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-lg border border-line-strong bg-secondary p-2.5 text-xs text-foreground outline-none"
            />
          </Field>

          <DialogFooter className="mt-2">
            <Button
              type="button"
              variant="subtle"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={chargement || montantTotalFCFA <= 0}
            >
              {chargement ? "Création…" : `Créer le contrat (${euros(montantTotalFCFA, true)})`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

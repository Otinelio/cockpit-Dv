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
import type { ContratDV, StatutContratDV } from "@/server/dv-types";
import { FileEdit, Paperclip, UploadCloud, X } from "lucide-react";

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
  const [montantFCFA, setMontantFCFA] = useState<number | "">(() => contrat.montantFCFA);
  const [tvaTaux, setTvaTaux] = useState<number>(() => contrat.tvaTaux ?? 0);
  const [statut, setStatut] = useState<StatutContratDV>(() => contrat.statut);
  const [responsable, setResponsable] = useState(() => contrat.responsable);
  const [debutLe, setDebutLe] = useState(() => contrat.debutLe);
  const [finLe, setFinLe] = useState(() => contrat.finLe || "");
  const [mentions, setMentions] = useState(() => contrat.mentionsLegales || "");
  const [modalitesPaiement, setModalitesPaiement] = useState(() => contrat.modalitesPaiement || "");
  const [notes, setNotes] = useState(() => contrat.notes || "");
  const [fichierDoc, setFichierDoc] = useState<File | null>(null);
  const [supprimerDocExistant, setSupprimerDocExistant] = useState(false);
  const [chargement, setChargement] = useState(false);

  async function handleSauvegarder(e: React.FormEvent) {
    e.preventDefault();
    if (!titre.trim()) return;
    setChargement(true);

    let documentId = supprimerDocExistant ? undefined : contrat.documentId;
    let documentNom = supprimerDocExistant ? undefined : contrat.documentNom;
    let documentUrl = supprimerDocExistant ? undefined : contrat.documentUrl;
    let documentTailleOctets = supprimerDocExistant ? undefined : contrat.documentTailleOctets;

    if (fichierDoc) {
      try {
        const doc = await api.hub.uploadFichier(
          fichierDoc,
          "dos-contrats",
          `Contrat signé / convention ${contrat.nomEntreprise} - ${titre.trim()}`,
          { clientCrmId: contrat.entrepriseId, contratId: contrat.id },
        );
        documentId = doc.id;
        documentNom = doc.nomOriginal;
        documentUrl = `/api/hub/documents/fichiers/${doc.id}`;
        documentTailleOctets = doc.tailleOctets;
      } catch (err) {
        console.error("Erreur lors de l'upload du document de contrat:", err);
      }
    }

    const nouveauMontant = typeof montantFCFA === "number" ? montantFCFA : 0;

    await modifierContrat(contrat.id, {
      titre: titre.trim(),
      montantFCFA: nouveauMontant,
      tvaTaux,
      statut,
      responsable,
      debutLe,
      finLe: finLe || undefined,
      mentionsLegales: mentions.trim() || undefined,
      modalitesPaiement: modalitesPaiement.trim() || undefined,
      notes: notes.trim() || undefined,
      documentId,
      documentNom,
      documentUrl,
      documentTailleOctets,
      estSigne: statut === "actif" || statut === "termine",
      signeLe: statut === "actif" || statut === "termine" ? contrat.signeLe || debutLe : undefined,
    });

    setChargement(false);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileEdit className="size-4 text-primary" />
            Modifier le contrat
          </DialogTitle>
          <DialogDescription>
            Met à jour les montants, la TVA, les clauses, le document et le statut de ce contrat.
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

          {/* Montant & TVA */}
          <div className="rounded-xl border border-border bg-[#161616] p-3 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Montant total HT (FCFA)" htmlFor="mod-ctr-montant">
                <Input
                  id="mod-ctr-montant"
                  type="number"
                  min={0}
                  value={montantFCFA}
                  onChange={(e) =>
                    setMontantFCFA(e.target.value === "" ? "" : Number(e.target.value))
                  }
                  required
                />
              </Field>

              <Field label="Régime TVA" htmlFor="mod-ctr-tva">
                <div id="mod-ctr-tva" className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setTvaTaux(0)}
                    className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold transition-colors ${
                      tvaTaux === 0
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Exonéré (0%)
                  </button>
                  <button
                    type="button"
                    onClick={() => setTvaTaux(18)}
                    className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold transition-colors ${
                      tvaTaux === 18
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    TVA Togo (18%)
                  </button>
                </div>
              </Field>
            </div>

            <div className="flex items-center justify-between text-xs pt-2 border-t border-border/40">
              <span className="text-muted-foreground">Total TTC calculé :</span>
              <span className="font-mono font-bold text-trend">
                {euros(
                  Math.round(
                    (typeof montantFCFA === "number" ? montantFCFA : 0) *
                      (1 + (tvaTaux === 18 ? 0.18 : 0)),
                  ),
                  true,
                )}
                {tvaTaux > 0 ? " TTC" : " HT (Exonéré)"}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Note : toute modification du montant ou de la TVA mettra automatiquement à jour la facture liée non payée.
            </p>
          </div>

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

          <Field label="Modalités de règlement" htmlFor="mod-ctr-modalites">
            <Input
              id="mod-ctr-modalites"
              value={modalitesPaiement}
              onChange={(e) => setModalitesPaiement(e.target.value)}
              placeholder="Ex : 50% à la signature, 50% à la livraison finale"
            />
          </Field>

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

          {/* Document officiel du contrat */}
          <div className="rounded-xl border border-border bg-[#161616] p-3 space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Paperclip className="size-3.5 text-primary" />
              Document officiel / Convention signée
            </span>

            {contrat.documentNom && !supprimerDocExistant && !fichierDoc && (
              <div className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-card/60">
                <div className="flex items-center gap-2 min-w-0">
                  <Paperclip className="size-4 text-primary shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">{contrat.documentNom}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {contrat.documentTailleOctets
                        ? `${(contrat.documentTailleOctets / 1024).toFixed(1)} Ko • `
                        : ""}
                      Archivé dans le Hub
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {contrat.documentUrl && (
                    <a
                      href={contrat.documentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2 py-1 text-xs rounded bg-secondary hover:bg-secondary/80 text-foreground transition-colors"
                    >
                      Voir
                    </a>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setSupprimerDocExistant(true)}
                    className="text-muted-foreground hover:text-red-400 size-6"
                    title="Supprimer ou remplacer"
                  >
                    <X className="size-3.5" />
                  </Button>
                </div>
              </div>
            )}

            {fichierDoc ? (
              <div className="flex items-center justify-between p-2.5 rounded-lg border border-primary/40 bg-primary/10">
                <div className="flex items-center gap-2 min-w-0">
                  <Paperclip className="size-4 text-primary shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">{fichierDoc.name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {(fichierDoc.size / 1024).toFixed(1)} Ko • Nouveau fichier à uploader
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setFichierDoc(null)}
                  className="text-muted-foreground hover:text-red-400 size-6"
                >
                  <X className="size-3.5" />
                </Button>
              </div>
            ) : (
              (!contrat.documentNom || supprimerDocExistant) && (
                <label
                  htmlFor="mod-ctr-file"
                  className="flex flex-col items-center justify-center p-3 rounded-lg border border-dashed border-border hover:border-primary/50 bg-secondary/30 hover:bg-secondary/60 cursor-pointer transition-colors group"
                >
                  <UploadCloud className="size-5 text-muted-foreground group-hover:text-primary mb-1 transition-colors" />
                  <span className="text-xs font-medium text-foreground">
                    {supprimerDocExistant
                      ? "Remplacer par un nouveau fichier"
                      : "Joindre le document du contrat"}
                  </span>
                  <input
                    id="mod-ctr-file"
                    type="file"
                    accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                    className="sr-only"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) setFichierDoc(f);
                    }}
                  />
                </label>
              )
            )}
          </div>

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

"use client";

import { useState } from "react";
import Button from "@/components/_ui/button";
import { Checkbox } from "@/components/_ui/checkbox";
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
import Tag from "@/components/_ui/tag";
import { useCockpit } from "@/stores/cockpit-store";
import { euros } from "@/lib/format";
import type {
  ContratDV,
  StatutContratDV,
} from "@/server/dv-types";
import {
  Building2,
  Clock,
  ExternalLink,
  FileCheck,
  FileText,
  ListTodo,
  Plus,
  Trash2,
  Wallet,
  Sparkles,
} from "lucide-react";

interface Props {
  contrat: ContratDV | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const STATUTS: { code: StatutContratDV; label: string; tone: "green" | "purple" | "blue" | "neutral" | "red" }[] = [
  { code: "actif", label: "Signé & Actif", tone: "green" },
  { code: "en_attente", label: "En attente", tone: "blue" },
  { code: "brouillon", label: "Brouillon", tone: "neutral" },
  { code: "termine", label: "Terminé / Livré", tone: "purple" },
  { code: "resilie", label: "Résilié", tone: "red" },
];

export default function ContratDetailDialog({ contrat, open, onOpenChange }: Props) {
  if (!contrat) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <ContratDetailInterieur contrat={contrat} onFermer={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

function ContratDetailInterieur({
  contrat,
  onFermer,
}: {
  contrat: ContratDV;
  onFermer: () => void;
}) {
  const crm = useCockpit((s) => s.crm);
  const tableau = useCockpit((s) => s.tableau);
  const taches = useCockpit((s) => s.taches);
  const modifierTache = useCockpit((s) => s.modifierTache);
  const modifierContrat = useCockpit((s) => s.modifierContrat);
  const supprimerContrat = useCockpit((s) => s.supprimerContrat);
  const facturerContrat = useCockpit((s) => s.facturerContrat);
  const openDetail = useCockpit((s) => s.openDetail);

  const [onglet, setOnglet] = useState<"prestations" | "factures" | "mentions">("prestations");

  // Formulaire d'émission de facture complémentaire
  const [modalFacture, setModalFacture] = useState(false);
  const [libelleFacture, setLibelleFacture] = useState("");
  const [montantFacture, setMontantFacture] = useState<number | "">("");
  const [facturationEnCours, setFacturationEnCours] = useState(false);

  // Édition des mentions
  const [mentions, setMentions] = useState(() => contrat.mentionsLegales || "");
  const [statut, setStatut] = useState<StatutContratDV>(() => contrat.statut);
  const [sauvegardeEnCours, setSauvegardeEnCours] = useState(false);

  // Factures associées (filtrées par contratId ou liste des IDs)
  const facturesLiees = (tableau?.factures ?? []).filter(
    (f) => f.contratId === contrat.id || (contrat.factureIds ?? []).includes(f.id),
  );

  // Total facturé TTC
  const totalFactureTTC = facturesLiees.reduce((acc, f) => acc + f.montant, 0);
  const totalEncaisseTTC = facturesLiees
    .filter((f) => f.statut === "payee")
    .reduce((acc, f) => acc + f.montant, 0);

  // Tâches associées à ce contrat
  const tachesLiees = (taches ?? []).filter(
    (t) =>
      t.contratId === contrat.id ||
      (contrat.tacheIds ?? []).includes(t.id) ||
      (contrat.prestations ?? []).some((p) => p.tacheIdLiee === t.id),
  );

  const tachesTerminees = tachesLiees.filter((t) => t.statut === "terminee").length;
  const progressionLivrables =
    tachesLiees.length > 0 ? Math.round((tachesTerminees / tachesLiees.length) * 100) : 0;

  async function handleSauvegarderModifs() {
    setSauvegardeEnCours(true);
    await modifierContrat(contrat.id, {
      statut,
      mentionsLegales: mentions.trim() || undefined,
    });
    setSauvegardeEnCours(false);
  }

  async function handleCreerFactureComplementaire(e: React.FormEvent) {
    e.preventDefault();
    if (!montantFacture || Number(montantFacture) <= 0) return;
    setFacturationEnCours(true);

    await facturerContrat(contrat.id, {
      libelle: libelleFacture.trim() || `${contrat.titre} — Solde`,
      montantHT: Number(montantFacture),
      tva: "TG_180",
    });

    setFacturationEnCours(false);
    setModalFacture(false);
    setLibelleFacture("");
    setMontantFacture("");
  }

  async function handleSupprimer() {
    if (confirm(`Supprimer définitivement le contrat "${contrat.titre}" ?`)) {
      await supprimerContrat(contrat.id);
      onFermer();
    }
  }

  const clientCrm = crm?.entreprises.find(
    (c) => c.id === contrat.entrepriseId || c.nom.toLowerCase() === contrat.nomEntreprise.toLowerCase(),
  );

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <DialogHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <FileCheck className="size-5 text-trend" />
              <DialogTitle className="text-lg font-bold">{contrat.titre}</DialogTitle>
            </div>
            <DialogDescription className="flex items-center gap-2 text-xs">
              <span>Client :</span>
              <button
                type="button"
                onClick={() => {
                  if (clientCrm) {
                    onFermer();
                    openDetail(clientCrm.id);
                  }
                }}
                className="font-semibold text-primary hover:underline inline-flex items-center gap-1"
              >
                <Building2 className="size-3" />
                {contrat.nomEntreprise}
              </button>
              <span>•</span>
              <span>Pilote : {contrat.responsable}</span>
            </DialogDescription>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={statut}
              onChange={(e) => setStatut(e.target.value as StatutContratDV)}
              className="border-line-strong bg-secondary text-foreground text-xs rounded-lg border px-2.5 py-1.5 font-medium outline-none"
            >
              {STATUTS.map((s) => (
                <option key={s.code} value={s.code}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </DialogHeader>

      {/* Résumé Métriques */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-xl border border-border bg-[#161616] p-3 space-y-1">
          <span className="text-[11px] text-muted-foreground uppercase tracking-wider block">
            Valeur du Contrat
          </span>
          <span className="text-lg font-bold text-trend font-mono">
            {euros(contrat.montantFCFA, true)}
          </span>
          <span className="text-[10px] text-subtle block">
            Début : {contrat.debutLe.split("-").reverse().join("/")}
            {contrat.finLe ? ` • Fin : ${contrat.finLe.split("-").reverse().join("/")}` : ""}
          </span>
        </div>

        <div className="rounded-xl border border-border bg-[#161616] p-3 space-y-1">
          <span className="text-[11px] text-muted-foreground uppercase tracking-wider block">
            Facturation & Règlements
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-base font-bold text-foreground font-mono">
              {euros(totalFactureTTC, true)}
            </span>
            <span className="text-xs text-muted-foreground font-normal">émis</span>
          </div>
          <span className="text-[10px] text-trend block">
            Encaissé : {euros(totalEncaisseTTC, true)} TTC
          </span>
        </div>

        <div className="rounded-xl border border-border bg-[#161616] p-3 space-y-1">
          <span className="text-[11px] text-muted-foreground uppercase tracking-wider block">
            Livrables & Tâches
          </span>
          <div className="flex items-center justify-between text-xs font-semibold">
            <span>
              {tachesTerminees} / {tachesLiees.length} terminées
            </span>
            <span className="font-mono text-primary">{progressionLivrables} %</span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-border overflow-hidden mt-1.5">
            <div
              className="h-full bg-trend transition-all duration-300 rounded-full"
              style={{ width: `${progressionLivrables}%` }}
            />
          </div>
        </div>
      </div>

      {/* Navigation Onglets Détails */}
      <div className="flex items-center gap-2 border-b border-border pb-1">
        <button
          type="button"
          onClick={() => setOnglet("prestations")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            onglet === "prestations"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-card hover:text-foreground"
          }`}
        >
          <ListTodo className="size-3.5" />
          Prestations & Tâches ({contrat.prestations?.length ?? 0})
        </button>

        <button
          type="button"
          onClick={() => setOnglet("factures")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            onglet === "factures"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-card hover:text-foreground"
          }`}
        >
          <Wallet className="size-3.5" />
          Factures & Paiements ({facturesLiees.length})
        </button>

        <button
          type="button"
          onClick={() => setOnglet("mentions")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            onglet === "mentions"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-card hover:text-foreground"
          }`}
        >
          <FileText className="size-3.5" />
          Clauses & Mentions
        </button>
      </div>

      {/* CONTENU ONGLET 1 : PRESTATIONS & TÂCHES */}
      {onglet === "prestations" && (
        <div className="space-y-4">
          <div className="space-y-2">
            {(contrat.prestations ?? []).map((presta, idx) => {
              const tache = tachesLiees.find(
                (t) => t.id === presta.tacheIdLiee || t.prestationId === presta.id,
              );
              const estFaite = tache?.statut === "terminee";

              return (
                <div
                  key={presta.id || idx}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-border bg-[#161616] text-xs hover:border-border/80 transition-colors"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    {tache ? (
                      <Checkbox
                        checked={estFaite}
                        onCheckedChange={(checked) => {
                          modifierTache(tache.id, {
                            statut: checked ? "terminee" : "a_faire",
                            termineeLe: checked ? new Date().toISOString() : undefined,
                          });
                        }}
                        className="mt-0.5"
                      />
                    ) : (
                      <span className="size-2 rounded-full bg-primary shrink-0 mt-1" />
                    )}

                    <div className="space-y-0.5 min-w-0">
                      <div className="font-semibold text-foreground truncate">
                        {presta.libellePersonnalise || presta.type}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                        <span>Assigné à : <strong className="text-foreground">{presta.responsable || contrat.responsable}</strong></span>
                        {presta.echeancePrestation && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Clock className="size-3" />
                              {presta.echeancePrestation.split("-").reverse().join("/")}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="font-bold text-trend font-mono">
                      {euros(presta.montantFCFA, true)}
                    </span>
                    {tache && (
                      <Tag tone={estFaite ? "green" : "purple"} size="sm">
                        {estFaite ? "Livré" : "En cours"}
                      </Tag>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* CONTENU ONGLET 2 : FACTURES & ENCAISSEMENTS */}
      {onglet === "factures" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">
              Factures rattachées à ce contrat ({facturesLiees.length})
            </span>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => {
                setLibelleFacture(`${contrat.titre} — Solde`);
                const reste = Math.max(0, contrat.montantFCFA - Math.round(totalFactureTTC / 1.18));
                setMontantFacture(reste || "");
                setModalFacture(true);
              }}
              className="gap-1.5 text-xs h-7"
            >
              <Plus className="size-3.5" />
              Émettre une facture liée
            </Button>
          </div>

          {facturesLiees.length === 0 ? (
            <div className="text-center py-8 rounded-xl border border-dashed border-border p-6 space-y-2">
              <FileText className="size-6 text-muted-foreground mx-auto" />
              <p className="text-xs text-muted-foreground">
                Aucune facture n&apos;a encore été rattachée à ce contrat.
              </p>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setModalFacture(true)}
              >
                Générer la première facture
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-border rounded-xl border border-border bg-[#161616] overflow-hidden">
              {facturesLiees.map((f) => (
                <div
                  key={f.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 text-xs hover:bg-secondary/30 transition-colors"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-foreground">
                        {f.numero || `Brouillon #${f.id}`}
                      </span>
                      <Tag
                        tone={
                          f.statut === "payee"
                            ? "green"
                            : f.statut === "brouillon"
                              ? "neutral"
                              : "blue"
                        }
                        size="sm"
                      >
                        {f.statut === "payee" ? "Payée" : f.statut}
                      </Tag>
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      Émise le {f.date ? f.date.split("-").reverse().join("/") : "Date à définir"}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="font-bold text-foreground font-mono">
                      {euros(f.montant, true)} TTC
                    </span>
                    {f.numero && (
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => window.open(`/api/factures/${f.id}/pdf`, "_blank")}
                        className="gap-1 text-[11px] h-7 px-2"
                      >
                        <ExternalLink className="size-3" />
                        PDF
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* CONTENU ONGLET 3 : MENTIONS & CLAUSES */}
      {onglet === "mentions" && (
        <div className="space-y-4">
          <Field
            label="Clauses particulières & Mentions légales"
            htmlFor="contrat-mentions-edit"
            hint="Conditions de recette, acompte, pénalités de retard ou clauses de propriété"
          >
            <textarea
              id="contrat-mentions-edit"
              value={mentions}
              onChange={(e) => setMentions(e.target.value)}
              rows={4}
              className="border-line-strong bg-secondary text-foreground w-full rounded-lg border px-3 py-2 text-xs outline-none"
            />
          </Field>

          {contrat.notes && (
            <div className="rounded-lg bg-card/40 border border-border/60 p-3 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Notes internes
              </span>
              <p className="text-xs text-foreground/90">{contrat.notes}</p>
            </div>
          )}
        </div>
      )}

      {/* Modal Facturation Complémentaire */}
      {modalFacture && (
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Sparkles className="size-3.5 text-primary" />
              Émettre une facture pour {contrat.nomEntreprise}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setModalFacture(false)}
              className="text-xs h-6"
            >
              Fermer
            </Button>
          </div>

          <form onSubmit={handleCreerFactureComplementaire} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Libellé de la facture" htmlFor="fact-compl-lib">
                <Input
                  id="fact-compl-lib"
                  value={libelleFacture}
                  onChange={(e) => setLibelleFacture(e.target.value)}
                  placeholder="Ex : Facture de solde 50%"
                  required
                />
              </Field>

              <Field label="Montant HT (FCFA)" htmlFor="fact-compl-mt">
                <Input
                  id="fact-compl-mt"
                  type="number"
                  min={1}
                  value={montantFacture}
                  onChange={(e) =>
                    setMontantFacture(e.target.value === "" ? "" : Number(e.target.value))
                  }
                  placeholder="Ex : 250000"
                  required
                />
              </Field>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={facturationEnCours}
              >
                {facturationEnCours ? "Génération..." : "Créer le brouillon de facture"}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Pied de page Actions */}
      <DialogFooter className="border-t border-border pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleSupprimer}
          className="text-red-400 hover:text-red-300 hover:bg-red-500/10 gap-1.5 text-xs"
        >
          <Trash2 className="size-3.5" />
          Supprimer ce contrat
        </Button>

        <div className="flex items-center gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={onFermer}>
            Fermer
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={handleSauvegarderModifs}
            disabled={sauvegardeEnCours}
          >
            {sauvegardeEnCours ? "Sauvegarde..." : "Enregistrer les modifications"}
          </Button>
        </div>
      </DialogFooter>
    </div>
  );
}

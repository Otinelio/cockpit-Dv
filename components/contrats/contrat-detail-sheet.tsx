"use client";

import { useState } from "react";
import Button from "@/components/_ui/button";
import { Checkbox } from "@/components/_ui/checkbox";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/_ui/sheet";
import { ScrollArea } from "@/components/_ui/scroll-area";
import Tag from "@/components/_ui/tag";
import { useCockpit } from "@/stores/cockpit-store";
import { euros, jourCourt } from "@/lib/format";
import { STATUTS as STATUTS_FACTURES } from "@/lib/factures";
import type { ContratDV, StatutContratDV } from "@/server/dv-types";
import {
  Building2,
  Clock,
  Download,
  Edit3,
  ExternalLink,
  FileCheck,
  FileText,
  ListTodo,
  Paperclip,
  Plus,
  Receipt,
  Trash2,
  Wallet,
  X,
} from "lucide-react";
import DialogModifierContrat from "./dialog-modifier-contrat";
import DialogAjouterPrestation from "./dialog-ajouter-prestation";
import DialogFacturerContrat from "./dialog-facturer-contrat";

interface Props {
  contrat: ContratDV | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const STATUTS: Record<
  StatutContratDV,
  { label: string; tone: "green" | "purple" | "blue" | "neutral" | "red" }
> = {
  actif: { label: "Signé & Actif", tone: "green" },
  en_attente: { label: "En attente de signature", tone: "blue" },
  brouillon: { label: "Brouillon / Négociation", tone: "neutral" },
  termine: { label: "Terminé / Livré", tone: "purple" },
  resilie: { label: "Résilié", tone: "red" },
};

export default function ContratDetailSheet({ contrat, open, onOpenChange }: Props) {
  if (!contrat) return null;
  return <ContenuContratDetail contrat={contrat} open={open} onOpenChange={onOpenChange} />;
}

function ContenuContratDetail({
  contrat,
  open,
  onOpenChange,
}: {
  contrat: ContratDV;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const crm = useCockpit((s) => s.crm);
  const tableau = useCockpit((s) => s.tableau);
  const taches = useCockpit((s) => s.taches);
  const modifierTache = useCockpit((s) => s.modifierTache);
  const supprimerContrat = useCockpit((s) => s.supprimerContrat);
  const openDetail = useCockpit((s) => s.openDetail);
  const toast = useCockpit((s) => s.toast);

  // États des Popups modulaires
  const [modalModifier, setModalModifier] = useState(false);
  const [modalPrestation, setModalPrestation] = useState(false);
  const [modalFacture, setModalFacture] = useState(false);

  // Factures liées
  const facturesLiees = (tableau?.factures ?? []).filter(
    (f) => f.contratId === contrat.id || (contrat.factureIds ?? []).includes(f.id),
  );
  const totalFactureTTC = facturesLiees.reduce((acc, f) => acc + f.montant, 0);
  const totalEncaisseTTC = facturesLiees
    .filter((f) => f.statut === "payee")
    .reduce((acc, f) => acc + f.montant, 0);

  // Tâches liées
  const tachesLiees = (taches ?? []).filter(
    (t) =>
      t.contratId === contrat.id ||
      (contrat.tacheIds ?? []).includes(t.id) ||
      (contrat.prestations ?? []).some((p) => p.tacheIdLiee === t.id),
  );
  const tachesTerminees = tachesLiees.filter((t) => t.statut === "terminee").length;
  const progressionLivrables =
    tachesLiees.length > 0 ? Math.round((tachesTerminees / tachesLiees.length) * 100) : 0;

  const clientCrm = crm?.entreprises.find(
    (c) =>
      c.id === contrat.entrepriseId ||
      c.nom.toLowerCase() === contrat.nomEntreprise.toLowerCase(),
  );

  async function handleToggleTache(tacheId: string, fini: boolean) {
    try {
      await modifierTache(tacheId, {
        statut: fini ? "terminee" : "a_faire",
      });
      toast({
        ton: "succes",
        titre: fini ? "Livrable terminé" : "Livrable réouvert",
      });
    } catch {
      toast({
        ton: "erreur",
        titre: "Erreur",
        texte: "Impossible de modifier la tâche synchronisée.",
      });
    }
  }

  async function handleSupprimer() {
    if (confirm(`Es-tu sûr de vouloir supprimer définitivement le contrat "${contrat.titre}" ?`)) {
      await supprimerContrat(contrat.id);
      toast({
        ton: "info",
        titre: "Contrat supprimé",
      });
      onOpenChange(false);
    }
  }

  const statutInfo = STATUTS[contrat.statut] ?? STATUTS.brouillon;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          className="w-full sm:w-[620px] sm:max-w-[620px] flex flex-col p-0 bg-[#161616] border-l border-border text-foreground"
        >
          {/* 1. EN-TÊTE DU TIROIR */}
          <SheetHeader className="border-b border-border bg-card/60 p-5 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 shrink-0">
                  <FileCheck className="size-5" />
                </div>
                <div className="min-w-0 space-y-0.5">
                  <SheetTitle className="text-base font-bold truncate">
                    {contrat.titre}
                  </SheetTitle>
                  <SheetDescription className="text-xs text-muted-foreground flex items-center gap-2">
                    <span>Client :</span>
                    <button
                      type="button"
                      onClick={() => {
                        if (clientCrm) {
                          onOpenChange(false);
                          openDetail(clientCrm.id);
                        }
                      }}
                      className="font-semibold text-primary hover:underline inline-flex items-center gap-1"
                    >
                      <Building2 className="size-3" />
                      {contrat.nomEntreprise}
                    </button>
                  </SheetDescription>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setModalModifier(true)}
                  className="h-8 gap-1.5 text-xs border-border"
                >
                  <Edit3 className="size-3.5" />
                  Modifier
                </Button>
                <SheetClose asChild>
                  <Button variant="ghost" size="icon-sm" aria-label="Fermer">
                    <X className="size-4" />
                  </Button>
                </SheetClose>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1.5">
              <Tag tone={statutInfo.tone} size="sm">
                {statutInfo.label}
              </Tag>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-secondary/60 border border-border/80 text-[11px] text-muted-foreground">
                <span className="text-muted-foreground/70">Pilote :</span>
                <span className="font-semibold text-foreground">{contrat.responsable}</span>
              </div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-secondary/60 border border-border/80 text-[11px] text-muted-foreground">
                <Clock className="size-3 text-muted-foreground/70" />
                <span>
                  {contrat.debutLe.split("-").reverse().join("/")}
                  {contrat.finLe ? ` → ${contrat.finLe.split("-").reverse().join("/")}` : ""}
                </span>
              </div>
            </div>
          </SheetHeader>

          {/* 2. CORPS DÉFILANT */}
          <ScrollArea className="min-h-0 flex-1 p-5 space-y-6">
            {/* Métriques Clés */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-xl border border-border bg-card/40 p-3.5 space-y-1">
                <span className="text-[11px] text-muted-foreground uppercase font-mono block">
                  Valeur totale
                </span>
                <span className="text-lg font-bold text-trend font-mono">
                  {euros(contrat.montantFCFA, true)}
                </span>
                <span className="text-[10px] text-muted-foreground block truncate">
                  Modalité : {contrat.modalitesPaiement || "Non spécifié"}
                </span>
              </div>

              <div className="rounded-xl border border-border bg-card/40 p-3.5 space-y-1">
                <span className="text-[11px] text-muted-foreground uppercase font-mono block">
                  Facturé / Encaissé
                </span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-base font-bold text-foreground font-mono">
                    {euros(totalFactureTTC, true)}
                  </span>
                  <span className="text-[10px] text-muted-foreground">émis</span>
                </div>
                <span className="text-[10px] text-trend block font-mono">
                  Encaissé : {euros(totalEncaisseTTC, true)}
                </span>
              </div>

              <div className="rounded-xl border border-border bg-card/40 p-3.5 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground uppercase font-mono">
                    Livrables
                  </span>
                  <span className="text-xs font-bold font-mono text-primary">
                    {progressionLivrables}%
                  </span>
                </div>
                <span className="text-sm font-bold text-foreground block">
                  {tachesTerminees} / {tachesLiees.length} finis
                </span>
                <div className="w-full h-1.5 rounded-full bg-border overflow-hidden mt-1.5">
                  <div
                    className="h-full bg-trend transition-all duration-300 rounded-full"
                    style={{ width: `${progressionLivrables}%` }}
                  />
                </div>
              </div>
            </div>

            {/* SECTION A : PRESTATIONS & TÂCHES LIVRABLES */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ListTodo className="size-4 text-purple-400" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Prestations & Livrables ({contrat.prestations?.length ?? 0})
                  </h3>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setModalPrestation(true)}
                  className="h-7 gap-1 text-[11px] border-border text-foreground"
                >
                  <Plus className="size-3" />
                  Ajouter une prestation
                </Button>
              </div>

              {(!contrat.prestations || contrat.prestations.length === 0) ? (
                <div className="p-4 rounded-xl border border-dashed border-border text-center text-xs text-muted-foreground space-y-2">
                  <p>Aucune prestation détaillée dans ce contrat.</p>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setModalPrestation(true)}
                    className="h-7 text-xs"
                  >
                    <Plus className="size-3 mr-1" />
                    Ajouter le premier livrable
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {contrat.prestations.map((presta, idx) => {
                    const tache = tachesLiees.find(
                      (t) => t.id === presta.tacheIdLiee || t.prestationId === presta.id,
                    );
                    const estFaite = tache?.statut === "terminee";

                    return (
                      <div
                        key={presta.id || idx}
                        className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border transition-colors ${
                          estFaite
                            ? "border-trend/30 bg-trend/5"
                            : "border-border bg-card/30 hover:border-border/80"
                        }`}
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          {tache ? (
                            <div className="pt-0.5">
                              <Checkbox
                                checked={estFaite}
                                onCheckedChange={(val) => handleToggleTache(tache.id, Boolean(val))}
                                aria-label="Marquer le livrable comme terminé"
                              />
                            </div>
                          ) : (
                            <div className="pt-0.5 text-muted-foreground">
                              <Clock className="size-4" />
                            </div>
                          )}

                          <div className="min-w-0 space-y-1">
                            <div className="flex items-center gap-2">
                              <span
                                className={`text-xs font-semibold ${
                                  estFaite ? "line-through text-muted-foreground" : "text-foreground"
                                }`}
                              >
                                {presta.libellePersonnalise || presta.type}
                              </span>
                              {estFaite && (
                                <Tag tone="green" size="sm">
                                  Livré
                                </Tag>
                              )}
                            </div>

                            <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                              <span>Resp : {presta.responsable || contrat.responsable}</span>
                              {presta.echeancePrestation && (
                                <>
                                  <span>•</span>
                                  <span>
                                    Échéance :{" "}
                                    {presta.echeancePrestation.split("-").reverse().join("/")}
                                  </span>
                                </>
                              )}
                              {tache && (
                                <>
                                  <span>•</span>
                                  <span className="text-primary font-mono text-[10px]">
                                    Tâche synchronisée
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                          <span className="font-mono font-bold text-xs text-trend">
                            {euros(presta.montantFCFA, true)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* SECTION B : FACTURES & RÈGLEMENTS */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wallet className="size-4 text-trend" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Factures & Règlements ({facturesLiees.length})
                  </h3>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setModalFacture(true)}
                  className="h-7 gap-1 text-[11px] border-border text-foreground"
                >
                  <Receipt className="size-3" />
                  Émettre une facture
                </Button>
              </div>

              {facturesLiees.length === 0 ? (
                <div className="p-4 rounded-xl border border-dashed border-border text-center text-xs text-muted-foreground space-y-2">
                  <p>Aucune facture émise pour le moment sur ce contrat.</p>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setModalFacture(true)}
                    className="h-7 text-xs"
                  >
                    <Receipt className="size-3 mr-1" />
                    Créer la facture d&apos;acompte
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {facturesLiees.map((f) => (
                    <div
                      key={f.id}
                      className="flex items-center justify-between p-3.5 rounded-xl border border-border bg-card/30 hover:border-border/80 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="p-2 rounded-lg bg-secondary text-foreground shrink-0">
                          <FileText className="size-4" />
                        </div>
                        <div className="min-w-0 space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-xs text-foreground">
                              #{f.numero || f.id}
                            </span>
                            <span className="text-xs font-medium text-foreground truncate">
                              {f.client}
                            </span>
                          </div>
                          <span className="text-[11px] text-muted-foreground block">
                            Émise le {f.date ? jourCourt(f.date) : "—"}
                            {f.echeance ? ` • Échéance : ${jourCourt(f.echeance)}` : ""}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 shrink-0">
                        <Tag
                          tone={STATUTS_FACTURES[f.statut]?.ton || "neutral"}
                          size="sm"
                        >
                          {STATUTS_FACTURES[f.statut]?.libelle || f.statut}
                        </Tag>
                        <span className="font-mono font-bold text-xs text-foreground">
                          {euros(f.montant, true)}
                        </span>
                        <a
                          href={`/api/factures/${f.id}/pdf`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-lg border border-border bg-card hover:bg-card/80 text-muted-foreground hover:text-foreground transition-colors"
                          title="Télécharger le PDF"
                        >
                          <Download className="size-3.5" />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* SECTION DOC : DOCUMENT OFFICIEL & HUB */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Paperclip className="size-4 text-primary" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Document officiel &amp; Convention
                  </h3>
                </div>
                {contrat.documentUrl ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setModalModifier(true)}
                    className="h-7 text-[11px] text-muted-foreground hover:text-foreground"
                  >
                    <Edit3 className="size-3 mr-1" />
                    Remplacer
                  </Button>
                ) : (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setModalModifier(true)}
                    className="h-7 gap-1 text-[11px] border-border text-foreground"
                  >
                    <Plus className="size-3" />
                    Joindre un document
                  </Button>
                )}
              </div>

              {contrat.documentUrl ? (
                <div className="p-3.5 rounded-xl border border-primary/30 bg-primary/5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 rounded-lg bg-primary/20 text-primary shrink-0">
                      <Paperclip className="size-4" />
                    </div>
                    <div className="min-w-0 space-y-0.5">
                      <p className="text-xs font-bold text-foreground truncate">
                        {contrat.documentNom || "Document contractuel"}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {contrat.documentTailleOctets
                          ? `${(contrat.documentTailleOctets / 1024).toFixed(1)} Ko • `
                          : ""}
                        Stocké dans Neon S3 • Archivé dans le Hub DigitalVision
                      </p>
                    </div>
                  </div>

                  <a
                    href={contrat.documentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs shrink-0 transition-colors"
                  >
                    <ExternalLink className="size-3.5" />
                    Ouvrir
                  </a>
                </div>
              ) : (
                <div className="p-4 rounded-xl border border-dashed border-border text-center text-xs text-muted-foreground space-y-2">
                  <p>Aucun document ou scan n&apos;est actuellement attaché à ce contrat.</p>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setModalModifier(true)}
                    className="h-7 text-xs"
                  >
                    <Plus className="size-3 mr-1" />
                    Ajouter le PDF ou scan du contrat
                  </Button>
                </div>
              )}
            </div>

            {/* SECTION C : CLAUSES & MENTIONS CONTRACTUELLES */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="size-4 text-blue-400" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Clauses & Mentions contractuelles
                  </h3>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setModalModifier(true)}
                  className="h-7 text-[11px] text-muted-foreground hover:text-foreground"
                >
                  <Edit3 className="size-3 mr-1" />
                  Modifier les mentions
                </Button>
              </div>

              <div className="p-4 rounded-xl border border-border bg-card/30 space-y-3 text-xs">
                <div>
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase font-mono block mb-1">
                    Modalités de facturation
                  </span>
                  <p className="text-foreground">
                    {contrat.modalitesPaiement || "Non spécifiées"}
                  </p>
                </div>

                <div className="border-t border-border/60 pt-3">
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase font-mono block mb-1">
                    Clauses juridiques & Engagement
                  </span>
                  {contrat.mentionsLegales ? (
                    <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">
                      {contrat.mentionsLegales}
                    </p>
                  ) : (
                    <p className="text-muted-foreground italic">
                      Aucune clause spécifique saisie pour ce contrat.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </ScrollArea>

          {/* 3. PIED DE PAGE DU TIROIR */}
          <SheetFooter className="border-t border-border bg-card/60 p-4 flex flex-row items-center justify-between gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleSupprimer}
              className="gap-1.5 text-xs text-rose-400 hover:text-rose-300 border-rose-500/20"
            >
              <Trash2 className="size-3.5" />
              Supprimer le contrat
            </Button>

            <SheetClose asChild>
              <Button variant="primary" size="sm" className="text-xs">
                Fermer
              </Button>
            </SheetClose>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* POPUPS MODALES DÉDIÉES */}
      <DialogModifierContrat
        contrat={contrat}
        open={modalModifier}
        onOpenChange={setModalModifier}
      />

      <DialogAjouterPrestation
        contrat={contrat}
        open={modalPrestation}
        onOpenChange={setModalPrestation}
      />

      <DialogFacturerContrat
        contrat={contrat}
        open={modalFacture}
        onOpenChange={setModalFacture}
      />
    </>
  );
}

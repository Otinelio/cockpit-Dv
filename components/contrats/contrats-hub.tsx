"use client";

import { useEffect, useMemo, useState } from "react";
import Button from "@/components/_ui/button";
import { ScrollArea } from "@/components/_ui/scroll-area";
import Tag from "@/components/_ui/tag";
import PageHeader from "@/components/_common/page-header";
import NouveauContratDialog from "@/components/contrats/nouveau-contrat-dialog";
import ContratDetailDialog from "@/components/contrats/contrat-detail-dialog";
import { useCockpit } from "@/stores/cockpit-store";
import { euros } from "@/lib/format";
import type { ContratDV, StatutContratDV } from "@/server/dv-types";
import {
  Building2,
  Clock,
  FileCheck,
  FileText,
  ListTodo,
  Plus,
  Search,
  TrendingUp,
  Wallet,
} from "lucide-react";

const ONGLETS = [
  { value: "tous", label: "Tous les contrats" },
  { value: "actif", label: "Signés & Actifs" },
  { value: "en_attente", label: "En attente" },
  { value: "brouillon", label: "Brouillons" },
  { value: "termine", label: "Terminés" },
];

function statutBadge(s: StatutContratDV) {
  switch (s) {
    case "actif":
      return <Tag tone="green">Actif</Tag>;
    case "en_attente":
      return <Tag tone="blue">En attente</Tag>;
    case "termine":
      return <Tag tone="purple">Terminé</Tag>;
    case "resilie":
      return <Tag tone="red">Résilié</Tag>;
    default:
      return <Tag tone="neutral">Brouillon</Tag>;
  }
}

export default function ContratsHub() {
  const contrats = useCockpit((s) => s.contrats);
  const chargerContrats = useCockpit((s) => s.chargerContrats);
  const taches = useCockpit((s) => s.taches);
  const chargerTaches = useCockpit((s) => s.chargerTaches);
  const tableau = useCockpit((s) => s.tableau);
  const charger = useCockpit((s) => s.charger);

  const [filtreStatut, setFiltreStatut] = useState("tous");
  const [recherche, setRecherche] = useState("");
  const [modalNouveau, setModalNouveau] = useState(false);
  const [contratSelectionne, setContratSelectionne] = useState<ContratDV | null>(null);

  useEffect(() => {
    chargerContrats();
    chargerTaches();
    charger();
  }, [chargerContrats, chargerTaches, charger]);

  // Synchronisation réactive si le contrat sélectionné est modifié dans le store
  const contratActuel = contratSelectionne
    ? contrats.find((c) => c.id === contratSelectionne.id) ?? null
    : null;

  // Filtrage
  const contratsFiltres = useMemo(() => {
    return contrats
      .filter((c) => (filtreStatut === "tous" ? true : c.statut === filtreStatut))
      .filter((c) => {
        if (!recherche.trim()) return true;
        const q = recherche.toLowerCase();
        return (
          c.titre.toLowerCase().includes(q) ||
          c.nomEntreprise.toLowerCase().includes(q) ||
          c.responsable.toLowerCase().includes(q)
        );
      });
  }, [contrats, filtreStatut, recherche]);

  // KPIs
  const volumeTotalFCFA = contrats.reduce((acc, c) => acc + (c.montantFCFA || 0), 0);
  const contratsActifs = contrats.filter((c) => c.statut === "actif").length;

  // Calcul du montant facturé sur tous les contrats
  const totalFacturesLiees = (tableau?.factures ?? []).filter((f) => Boolean(f.contratId));
  const montantFactureCumule = totalFacturesLiees.reduce((acc, f) => acc + f.montant, 0);

  return (
    <section className="flex min-h-0 min-w-0 flex-1 flex-col bg-[#121212]">
      <PageHeader
        title="Contrats & Conventions"
        tabs={ONGLETS}
        tab={filtreStatut}
        onTab={setFiltreStatut}
        pill={
          <span className="caption-style bg-muted inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border px-2.5 py-0.5 text-xs text-trend font-medium">
            <FileCheck className="size-3 text-trend" />
            {contratsActifs} contrat{contratsActifs > 1 ? "s" : ""} actif{contratsActifs > 1 ? "s" : ""}
          </span>
        }
      />

      <ScrollArea className="min-h-0 flex-1">
        <div className="px-4 sm:px-6 lg:px-8 py-6 pb-24 lg:pb-12 max-w-7xl w-full mx-auto space-y-6">
          {/* BARRE D'INDICATEURS */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="rounded-xl border border-border bg-[#161616] p-4 space-y-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <FileText className="size-3.5 text-primary" />
                Volume Engagé Total
              </span>
              <span className="text-xl font-bold text-foreground font-mono">
                {euros(volumeTotalFCFA, true)}
              </span>
              <span className="text-[11px] text-subtle block">
                {contrats.length} contrat{contrats.length > 1 ? "s" : ""} au carnet
              </span>
            </div>

            <div className="rounded-xl border border-border bg-[#161616] p-4 space-y-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <FileCheck className="size-3.5 text-trend" />
                Contrats Actifs
              </span>
              <span className="text-xl font-bold text-trend font-mono">
                {contratsActifs}
              </span>
              <span className="text-[11px] text-subtle block">
                En cours de réalisation
              </span>
            </div>

            <div className="rounded-xl border border-border bg-[#161616] p-4 space-y-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Wallet className="size-3.5 text-amber-400" />
                Montant Facturé
              </span>
              <span className="text-xl font-bold text-foreground font-mono">
                {euros(montantFactureCumule, true)}
              </span>
              <span className="text-[11px] text-subtle block">
                {totalFacturesLiees.length} facture{totalFacturesLiees.length > 1 ? "s" : ""} liée{totalFacturesLiees.length > 1 ? "s" : ""}
              </span>
            </div>

            <div className="rounded-xl border border-border bg-[#161616] p-4 space-y-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <TrendingUp className="size-3.5 text-purple-400" />
                Reste à Facturer
              </span>
              <span className="text-xl font-bold text-purple-300 font-mono">
                {euros(Math.max(0, volumeTotalFCFA - Math.round(montantFactureCumule / 1.18)), true)}
              </span>
              <span className="text-[11px] text-subtle block">
                Soldes et jalons restants
              </span>
            </div>
          </div>

          {/* BARRE D'OUTILS ET RECHERCHE */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-y border-border/60 py-3">
            <div className="relative flex-1 max-w-md">
              <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={recherche}
                onChange={(e) => setRecherche(e.target.value)}
                placeholder="Rechercher par client, titre de contrat ou pilote..."
                className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-border bg-card/60 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-primary"
              />
            </div>

            <Button
              variant="primary"
              size="sm"
              onClick={() => setModalNouveau(true)}
              className="gap-1.5 shrink-0"
            >
              <Plus className="size-4" />
              Nouveau contrat
            </Button>
          </div>

          {/* GRILLE DES CONTRATS */}
          {contratsFiltres.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-border rounded-2xl p-8 space-y-3">
              <FileCheck className="size-8 text-muted-foreground mx-auto" />
              <h3 className="text-sm font-semibold text-foreground">
                Aucun contrat ne correspond à ce filtre
              </h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Enregistre un contrat pour un client du CRM afin d’automatiser immédiatement
                ses tâches de livraison et sa facturation.
              </p>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setModalNouveau(true)}
                className="gap-1 mt-2"
              >
                <Plus className="size-3.5" />
                Créer un contrat
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {contratsFiltres.map((c) => {
                // Tâches liées à ce contrat
                const tachesDuContrat = (taches ?? []).filter(
                  (t) =>
                    t.contratId === c.id ||
                    (c.tacheIds ?? []).includes(t.id) ||
                    (c.prestations ?? []).some((p) => p.tacheIdLiee === t.id),
                );
                const tachesFaits = tachesDuContrat.filter((t) => t.statut === "terminee").length;
                const totalTaches = tachesDuContrat.length;
                const pctLivrables = totalTaches > 0 ? Math.round((tachesFaits / totalTaches) * 100) : 0;

                // Factures liées
                const facturesDuContrat = (tableau?.factures ?? []).filter(
                  (f) => f.contratId === c.id || (c.factureIds ?? []).includes(f.id),
                );
                const montantFacture = facturesDuContrat.reduce((acc, f) => acc + f.montant, 0);

                return (
                  <div
                    key={c.id}
                    onClick={() => setContratSelectionne(c)}
                    className="rounded-2xl border border-border bg-[#161616] p-5 space-y-4 hover:border-border/80 hover:bg-[#181818] transition-all cursor-pointer group shadow-sm flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      {/* En-tête de carte */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-primary flex items-center gap-1">
                              <Building2 className="size-3" />
                              {c.nomEntreprise}
                            </span>
                            {statutBadge(c.statut)}
                          </div>
                          <h4 className="text-base font-bold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                            {c.titre}
                          </h4>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-base font-bold text-trend font-mono block">
                            {euros(c.montantFCFA, true)}
                          </span>
                          <span className="text-[11px] text-muted-foreground">
                            Resp : {c.responsable}
                          </span>
                        </div>
                      </div>

                      {/* Barre d'avancement des livrables */}
                      <div className="rounded-lg bg-background/50 border border-border/50 p-2.5 space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground flex items-center gap-1">
                            <ListTodo className="size-3.5 text-trend" />
                            Livrables : {tachesFaits}/{totalTaches} tâches
                          </span>
                          <span className="font-mono font-bold text-foreground">
                            {pctLivrables} %
                          </span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-border overflow-hidden">
                          <div
                            className="h-full bg-trend transition-all duration-300 rounded-full"
                            style={{ width: `${pctLivrables}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Pied de carte avec statut de facturation et dates */}
                    <div className="flex items-center justify-between pt-2 border-t border-border/40 text-xs text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Wallet className="size-3 text-amber-400" />
                        <span>
                          {facturesDuContrat.length > 0 ? (
                            <span className="text-foreground font-medium">
                              {facturesDuContrat.length} facture{facturesDuContrat.length > 1 ? "s" : ""} ({euros(montantFacture, true)} TTC)
                            </span>
                          ) : (
                            <span className="italic text-subtle">Aucune facture émise</span>
                          )}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 text-[11px] text-subtle">
                        <Clock className="size-3" />
                        <span>{c.debutLe.split("-").reverse().join("/")}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Modal Création Contrat */}
      <NouveauContratDialog open={modalNouveau} onOpenChange={setModalNouveau} />

      {/* Sheet Détail Contrat */}
      <ContratDetailDialog
        contrat={contratActuel}
        open={contratActuel !== null}
        onOpenChange={(open) => !open && setContratSelectionne(null)}
      />
    </section>
  );
}

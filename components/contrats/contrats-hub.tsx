"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Button from "@/components/_ui/button";
import { ScrollArea } from "@/components/_ui/scroll-area";
import Tag from "@/components/_ui/tag";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/_ui/table";
import PageHeader from "@/components/_common/page-header";
import NouveauContratDialog from "@/components/contrats/nouveau-contrat-dialog";
import ContratDetailSheet from "@/components/contrats/contrat-detail-sheet";
import { useCockpit } from "@/stores/cockpit-store";
import { euros } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ContratDV, StatutContratDV } from "@/server/dv-types";
import {
  Building2,
  ChevronRight,
  FileCheck,
  FileText,
  ListTodo,
  Plus,
  Receipt,
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
  { value: "supprime", label: "Corbeille" },
];

function statutBadge(s: StatutContratDV) {
  switch (s) {
    case "actif":
      return <Tag tone="green" size="sm">Actif</Tag>;
    case "en_attente":
      return <Tag tone="blue" size="sm">En attente</Tag>;
    case "termine":
      return <Tag tone="purple" size="sm">Terminé</Tag>;
    case "resilie":
      return <Tag tone="red" size="sm">Résilié</Tag>;
    case "supprime":
      return <Tag tone="red" size="sm">Supprimé</Tag>;
    default:
      return <Tag tone="neutral" size="sm">Brouillon</Tag>;
  }
}

function ContratDeepLinkWatcher({
  contrats,
  onSelect,
  onSetFiltre,
}: {
  contrats: ContratDV[];
  onSelect: (c: ContratDV) => void;
  onSetFiltre: (f: string) => void;
}) {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");

  useEffect(() => {
    if (!id || contrats.length === 0) return;
    const cible = contrats.find((c) => c.id === id);
    if (cible) {
      if (cible.estSupprime || cible.statut === "supprime") {
        onSetFiltre("supprime");
      }
      onSelect(cible);
    }
  }, [id, contrats, onSelect, onSetFiltre]);

  return null;
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
      .filter((c) => {
        if (filtreStatut === "supprime") return c.estSupprime || c.statut === "supprime";
        if (filtreStatut === "tous") return !c.estSupprime && c.statut !== "supprime";
        return c.statut === filtreStatut && !c.estSupprime;
      })
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

  // Métriques globales
  const volumeTotalFCFA = contrats
    .filter((c) => !c.estSupprime && c.statut !== "supprime")
    .reduce((acc, c) => acc + (c.montantFCFA || 0), 0);
  const contratsActifs = contrats.filter((c) => !c.estSupprime && c.statut === "actif").length;
  const totalFacturesLiees = (tableau?.factures ?? []).filter(
    (f) => Boolean(f.contratId) && !f.estSupprime && f.statut !== "supprimee",
  );
  const montantFactureCumule = totalFacturesLiees.reduce((acc, f) => acc + f.montant, 0);

  return (
    <section className="flex min-h-0 min-w-0 flex-1 flex-col bg-[#121212] text-foreground">
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

      <Suspense fallback={null}>
        <ContratDeepLinkWatcher
          contrats={contrats}
          onSelect={setContratSelectionne}
          onSetFiltre={setFiltreStatut}
        />
      </Suspense>

      <ScrollArea className="min-h-0 flex-1">
        <div className="px-4 sm:px-6 lg:px-8 py-6 pb-24 lg:pb-12 max-w-7xl w-full mx-auto space-y-6">
          {/* 1. INDICATEURS FINANCIERS DU CARNET */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="rounded-xl border border-border bg-[#161616] p-4 space-y-1 shadow-xs">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <FileText className="size-3.5 text-primary" />
                Volume Global Engagé
              </span>
              <span className="text-xl font-bold text-foreground font-mono">
                {euros(volumeTotalFCFA, true)}
              </span>
              <span className="text-[11px] text-muted-foreground block">
                {contrats.length} contrat{contrats.length > 1 ? "s" : ""} signés ou en négo
              </span>
            </div>

            <div className="rounded-xl border border-border bg-[#161616] p-4 space-y-1 shadow-xs">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <FileCheck className="size-3.5 text-trend" />
                Contrats Actifs
              </span>
              <span className="text-xl font-bold text-trend font-mono">
                {contratsActifs}
              </span>
              <span className="text-[11px] text-muted-foreground block">
                En phase active de dev & livraison
              </span>
            </div>

            <div className="rounded-xl border border-border bg-[#161616] p-4 space-y-1 shadow-xs">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Wallet className="size-3.5 text-amber-400" />
                Montant Facturé
              </span>
              <span className="text-xl font-bold text-foreground font-mono">
                {euros(montantFactureCumule, true)}
              </span>
              <span className="text-[11px] text-muted-foreground block">
                {totalFacturesLiees.length} facture{totalFacturesLiees.length > 1 ? "s" : ""} liée{totalFacturesLiees.length > 1 ? "s" : ""}
              </span>
            </div>

            <div className="rounded-xl border border-border bg-[#161616] p-4 space-y-1 shadow-xs">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <TrendingUp className="size-3.5 text-purple-400" />
                Reste à Facturer (HT)
              </span>
              <span className="text-xl font-bold text-purple-300 font-mono">
                {euros(Math.max(0, volumeTotalFCFA - Math.round(montantFactureCumule / 1.18)), true)}
              </span>
              <span className="text-[11px] text-muted-foreground block">
                Jalons de solde à émettre
              </span>
            </div>
          </div>

          {/* 2. BARRE DE RECHERCHE ET NOUVEAU CONTRAT */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-y border-border/60 py-3">
            <div className="relative flex-1 max-w-md">
              <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={recherche}
                onChange={(e) => setRecherche(e.target.value)}
                placeholder="Rechercher par client, titre de contrat ou pilote..."
                className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-border bg-[#161616] text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-primary transition-colors"
              />
            </div>

            <Button
              variant="primary"
              size="sm"
              onClick={() => setModalNouveau(true)}
              className="gap-1.5 shrink-0 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-xs"
            >
              <Plus className="size-4" />
              Nouveau contrat
            </Button>
          </div>

          {/* 3. TABLEAU DES CONTRATS (STYLE COCKPIT DV) */}
          {contratsFiltres.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-border rounded-2xl p-8 space-y-3 bg-[#161616]/40">
              <FileCheck className="size-8 text-muted-foreground mx-auto" />
              <h3 className="text-sm font-semibold text-foreground">
                Aucun contrat trouvé pour ce filtre
              </h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Ajoute un contrat pour un client afin de déclencher automatiquement les
                tâches de dev et la facturation d&apos;acompte.
              </p>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setModalNouveau(true)}
                className="gap-1 mt-2 bg-primary text-primary-foreground font-medium"
              >
                <Plus className="size-3.5" />
                Créer un contrat
              </Button>
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-[#161616] overflow-hidden shadow-xs">
              <Table>
                <TableHeader className="bg-secondary/40 border-b border-border">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-xs font-semibold text-muted-foreground py-3">
                      Contrat & Client
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-muted-foreground py-3">
                      Statut
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-muted-foreground py-3">
                      Pilote
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-muted-foreground py-3">
                      Livrables
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-muted-foreground py-3">
                      Facturation
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-muted-foreground py-3 text-right">
                      Montant Total
                    </TableHead>
                    <TableHead className="w-10 py-3" />
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-border">
                  {contratsFiltres.map((c) => {
                    // Tâches rattachées
                    const tachesDuContrat = (taches ?? []).filter(
                      (t) =>
                        t.contratId === c.id ||
                        (c.tacheIds ?? []).includes(t.id) ||
                        (c.prestations ?? []).some((p) => p.tacheIdLiee === t.id),
                    );
                    const tachesFaits = tachesDuContrat.filter((t) => t.statut === "terminee").length;
                    const totalTaches = tachesDuContrat.length;
                    const pctLivrables =
                      totalTaches > 0 ? Math.round((tachesFaits / totalTaches) * 100) : 0;

                    // Factures rattachées
                    const facturesDuContrat = (tableau?.factures ?? []).filter(
                      (f) => f.contratId === c.id || (c.factureIds ?? []).includes(f.id),
                    );
                    const montantFacture = facturesDuContrat.reduce((acc, f) => acc + f.montant, 0);

                    const estSupprime = Boolean(c.estSupprime || c.statut === "supprime");

                    return (
                      <TableRow
                        key={c.id}
                        onClick={() => setContratSelectionne(c)}
                        className={cn(
                          "cursor-pointer hover:bg-secondary/40 transition-colors group",
                          estSupprime && "opacity-60 line-through bg-red-950/10 hover:bg-red-950/20",
                        )}
                      >
                        {/* Contrat & Client */}
                        <TableCell className="py-3.5">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-xs text-foreground group-hover:text-primary transition-colors">
                                {c.titre}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <Building2 className="size-3 text-primary shrink-0" />
                              <span className="font-medium text-primary hover:underline">
                                {c.nomEntreprise}
                              </span>
                              <span>•</span>
                              <span className="text-[11px] text-subtle">
                                Début {c.debutLe.split("-").reverse().join("/")}
                              </span>
                            </div>
                          </div>
                        </TableCell>

                        {/* Statut */}
                        <TableCell className="py-3.5">
                          {statutBadge(c.statut)}
                        </TableCell>

                        {/* Pilote */}
                        <TableCell className="py-3.5 text-xs font-medium text-foreground">
                          {c.responsable}
                        </TableCell>

                        {/* Livrables & Progression */}
                        <TableCell className="py-3.5">
                          <div className="w-36 space-y-1.5">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="text-muted-foreground flex items-center gap-1">
                                <ListTodo className="size-3 text-trend" />
                                {tachesFaits}/{totalTaches} livrables
                              </span>
                              <span className="font-mono font-semibold text-foreground">
                                {pctLivrables}%
                              </span>
                            </div>
                            <div className="w-full h-1.5 rounded-full bg-border overflow-hidden">
                              <div
                                className="h-full bg-trend transition-all duration-300 rounded-full"
                                style={{ width: `${pctLivrables}%` }}
                              />
                            </div>
                          </div>
                        </TableCell>

                        {/* Facturation */}
                        <TableCell className="py-3.5">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5 text-xs">
                              <Receipt className="size-3.5 text-amber-400 shrink-0" />
                              <span className="font-medium font-mono text-foreground">
                                {euros(montantFacture, true)}
                              </span>
                            </div>
                            <span className="text-[10px] text-muted-foreground block">
                              {facturesDuContrat.length} facture{facturesDuContrat.length > 1 ? "s" : ""} émise{facturesDuContrat.length > 1 ? "s" : ""}
                            </span>
                          </div>
                        </TableCell>

                        {/* Montant Total FCFA */}
                        <TableCell className="py-3.5 text-right font-mono font-bold text-xs text-trend">
                          {euros(c.montantFCFA, true)}
                        </TableCell>

                        {/* Chevron d'ouverture */}
                        <TableCell className="py-3.5 text-right text-muted-foreground group-hover:text-foreground">
                          <ChevronRight className="size-4 inline-block group-hover:translate-x-0.5 transition-transform" />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* MODAL CRÉATION CONTRAT (POPUP MODALE) */}
      <NouveauContratDialog open={modalNouveau} onOpenChange={setModalNouveau} />

      {/* SHEET LATÉRAL DÉTAIL DU CONTRAT */}
      <ContratDetailSheet
        contrat={contratActuel}
        open={contratActuel !== null}
        onOpenChange={(open) => !open && setContratSelectionne(null)}
      />
    </section>
  );
}

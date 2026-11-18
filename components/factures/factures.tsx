"use client";

import { useEffect, useMemo, useState, type MouseEvent } from "react";
import { Check, Copy, ExternalLink, FileText, Send, Stamp, ArrowDownCircle, ArrowUpCircle } from "lucide-react";
import Button from "@/components/_ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/_ui/dropdown-menu";
import { ScrollArea } from "@/components/_ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/_ui/table";
import Tag from "@/components/_ui/tag";
import FilterMenu from "@/components/_common/filter-menu";
import PageHeader from "@/components/_common/page-header";
import DepensesTable from "@/components/factures/depenses-table";
import { api } from "@/lib/api";
import { STATUTS, enRetard, lignesCsvFactures } from "@/lib/factures";
import { downloadCsv } from "@/lib/csv";
import { aujourdhui, euros, joursAvant, jourCourt, pluriel } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { LigneFacture } from "@/server/types";
import { useCockpit } from "@/stores/cockpit-store";
import ShareIcon from "@/public/assets/images/companies/toolbar/share.svg";
import WalletIcon from "@/public/assets/images/companies/sidebar/wallet.svg";
import DotsIcon from "@/public/assets/images/companies/table/dots-horizontal.svg";

const VIDE: LigneFacture[] = [];

type VueFinances = "factures" | "depenses";
type Onglet = "toutes" | "a-encaisser" | "en-retard" | "payees" | "brouillons";

const ONGLETS_FACTURES = [
  { value: "toutes", label: "Toutes" },
  { value: "a-encaisser", label: "À encaisser" },
  { value: "en-retard", label: "En retard" },
  { value: "payees", label: "Payées" },
  { value: "brouillons", label: "Brouillons" },
];

const TRIS = [
  { value: "date", label: "Date d'émission" },
  { value: "echeance", label: "Échéance" },
  { value: "montant", label: "Montant" },
  { value: "client", label: "Client" },
];

const PERIODES = [
  { value: "30", label: "30 jours" },
  { value: "90", label: "3 mois" },
  { value: "365", label: "12 mois" },
  { value: "0", label: "Tout" },
];

const COLONNES =
  "grid min-w-max grid-cols-[repeat(8,max-content)] justify-between";
const LIGNE = "col-span-full grid grid-cols-subgrid";

function stop(event: MouseEvent) {
  event.stopPropagation();
}

function Echeance({ f }: { f: LigneFacture }) {
  if (!f.echeance) return <span className="text-subtle">—</span>;
  const j = joursAvant(f.echeance) ?? 0;
  const ouverte = f.statut !== "payee" && f.statut !== "brouillon";
  return (
    <span className="flex items-center gap-1">
      {f.statut === "payee" ? (
        <span className="text-subtle">{jourCourt(f.echeance)}</span>
      ) : j < 0 ? (
        <span className="text-danger flex items-center gap-1">
          {jourCourt(f.echeance)}
          <span className="caption-style text-danger">({pluriel(-j, "j de retard")})</span>
        </span>
      ) : j === 0 ? (
        <span className="text-trend">Aujourd&apos;hui</span>
      ) : j <= 5 ? (
        <span className="text-trend">Dans {pluriel(j, "jour")}</span>
      ) : (
        <span>{jourCourt(f.echeance)}</span>
      )}
      {ouverte && j < 0 && <span aria-hidden className="bg-danger size-1.5 rounded-full" />}
    </span>
  );
}

export default function Factures() {
  const [vue, setVue] = useState<VueFinances>("factures");
  const [onglet, setOnglet] = useState<Onglet>("toutes");
  const [tri, setTri] = useState("date");
  const [client, setClient] = useState("tous");
  const [periode, setPeriode] = useState("0");
  const [limite, setLimite] = useState<string | null>(null);

  const tableau = useCockpit((state) => state.tableau);
  const factures = useCockpit((state) => state.tableau?.factures) ?? VIDE;
  const tableauClients = useCockpit((state) => state.tableau?.clients);
  const crm = useCockpit((state) => state.crm);
  const toast = useCockpit((state) => state.toast);
  const charger = useCockpit((state) => state.charger);
  const openDetail = useCockpit((state) => state.openDetail);
  const ouvrirFacture = useCockpit((state) => state.ouvrirFacture);
  const depenses = useCockpit((state) => state.depenses);
  const chargerDepenses = useCockpit((state) => state.chargerDepenses);

  function ouvrirClient(f: LigneFacture) {
    const c = crm?.entreprises.find((e) => e.pennylaneId === f.clientId);
    if (c) openDetail(c.id);
  }

  useEffect(() => {
    chargerDepenses();
  }, [chargerDepenses]);

  const clients = useMemo(
    () => [
      { value: "tous", label: "Tous les clients" },
      ...(tableauClients ?? []).map((c) => ({
        value: String(c.id),
        label: c.nom,
      })),
    ],
    [tableauClients],
  );

  const visibles = useMemo(() => {
    return factures
      .filter((f) => {
        if (onglet === "a-encaisser") return f.statut !== "payee" && f.statut !== "brouillon";
        if (onglet === "en-retard") return enRetard(f);
        if (onglet === "payees") return f.statut === "payee";
        if (onglet === "brouillons") return f.statut === "brouillon";
        return true;
      })
      .filter((f) => {
        if (client !== "tous" && String(f.clientId) !== client) return false;
        return !limite || (f.date ?? aujourdhui()) >= limite;
      })
      .sort((a, b) => {
        if (tri === "montant") return b.montant - a.montant;
        if (tri === "client") return a.client.localeCompare(b.client, "fr");
        if (tri === "echeance") return (a.echeance ?? "").localeCompare(b.echeance ?? "");
        return (b.date ?? "9999").localeCompare(a.date ?? "9999") || b.id - a.id;
      });
  }, [factures, onglet, tri, client, limite]);

  const totalEncaisse = useMemo(
    () => factures.filter((f) => f.statut === "payee").reduce((s, f) => s + f.montant, 0),
    [factures],
  );

  const total = useMemo(
    () => visibles.reduce((s, f) => s + f.montant, 0),
    [visibles],
  );

  const restant = useMemo(
    () => visibles.reduce((s, f) => s + f.restant, 0),
    [visibles],
  );

  const retard = useMemo(
    () =>
      visibles
        .filter((f) => enRetard(f))
        .reduce((s, f) => s + f.restant, 0),
    [visibles],
  );

  const totalDepenses = useMemo(
    () => depenses.reduce((s, d) => s + d.montantFCFA, 0),
    [depenses],
  );

  const beneficeNet = totalEncaisse - totalDepenses;

  async function renvoyer(f: LigneFacture) {
    try {
      await api.envoyer(f.id);
      toast({ ton: "succes", titre: `Facture ${f.numero} renvoyée`, texte: `${f.client} la reçoit à nouveau par e-mail.` });
    } catch (e) {
      toast({ ton: "erreur", titre: "Envoi impossible", texte: (e as Error).message });
    }
  }

  async function finaliser(f: LigneFacture) {
    try {
      const { numero } = await api.finaliser(f.id);
      await charger(true);
      toast({ ton: "succes", titre: `Facture ${numero} finalisée`, texte: `${f.client} : elle est prête à être envoyée.` });
    } catch (e) {
      toast({ ton: "erreur", titre: "Finalisation impossible", texte: (e as Error).message });
    }
  }

  const local = tableau?.mode === "local";

  async function payer(f: LigneFacture) {
    try {
      await api.marquerPayee(f.id);
      await charger(true);
      toast({ ton: "succes", titre: `Facture ${f.numero} payée`, texte: `${f.client} : le règlement est enregistré aujourd'hui.` });
    } catch (e) {
      toast({ ton: "erreur", titre: "Enregistrement impossible", texte: (e as Error).message });
    }
  }

  async function lien(f: LigneFacture, action: "ouvrir" | "copier") {
    try {
      const { url } = await api.lienPaiement(f.id);
      if (action === "ouvrir") {
        window.open(url, "_blank", "noopener");
      } else {
        await navigator.clipboard.writeText(url);
        toast({ ton: "succes", titre: "Lien copié", texte: url });
      }
    } catch (e) {
      toast({ ton: "erreur", titre: "Lien indisponible", texte: (e as Error).message });
    }
  }

  const entetes = ["Numéro", "Client", "Statut", "Date", "Échéance", "Montant", "Reste dû", ""];

  return (
    <section className="flex min-h-0 min-w-0 flex-1 flex-col">
      <PageHeader
        title="Finances & Factures"
        tabs={
          vue === "factures"
            ? ONGLETS_FACTURES
            : undefined
        }
        tab={onglet}
        onTab={(v) => setOnglet(v as Onglet)}
        pill={
          <span className="caption-style bg-muted inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border px-2.5 py-0.5 text-xs">
            Net :{" "}
            <strong className={beneficeNet >= 0 ? "text-trend font-medium" : "text-danger font-medium"}>
              {euros(beneficeNet, true)}
            </strong>
          </span>
        }
      />

      {/* Switcher vue Factures vs Dépenses */}
      <div className="border-border bg-card/60 flex items-center justify-between border-b px-4 py-2.5">
        <div className="flex items-center gap-1 rounded-lg border border-border bg-secondary p-0.5">
          <button
            type="button"
            onClick={() => setVue("factures")}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-colors",
              vue === "factures"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <ArrowUpCircle className="size-3.5" />
            Factures clients ({factures.length})
          </button>
          <button
            type="button"
            onClick={() => setVue("depenses")}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-colors",
              vue === "depenses"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <ArrowDownCircle className="size-3.5" />
            Dépenses agence ({depenses.length})
          </button>
        </div>

        {vue === "factures" && (
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => downloadCsv(`factures-${aujourdhui()}.csv`, lignesCsvFactures(visibles))}
            >
              <ShareIcon aria-hidden className="size-3" />
              Exporter
            </Button>
            <Button variant="primary" size="sm" onClick={() => ouvrirFacture()}>
              <WalletIcon aria-hidden className="size-3" />
              Générer une facture
            </Button>
          </div>
        )}
      </div>

      {vue === "depenses" ? (
        <DepensesTable />
      ) : (
        <>
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 px-4 py-3">
            <div className="flex min-w-0 flex-wrap gap-2">
              <FilterMenu label="Trier par" value={tri} options={TRIS} onChange={setTri} />
              <FilterMenu label="Client" value={client} options={clients} onChange={setClient} className="max-w-[260px]" />
              <FilterMenu
                label="Période"
                value={periode}
                options={PERIODES}
                onChange={(v) => {
                  setPeriode(v);
                  setLimite(v === "0" ? null : new Date(Date.now() - Number(v) * 86_400_000).toLocaleDateString("sv-SE"));
                }}
              />
            </div>
          </div>

          <div className="border-border flex min-h-0 flex-1 flex-col border-t">
            <ScrollArea orientation="both" className="min-h-0 flex-1">
              <Table role="table" className={cn(COLONNES, "w-full")}>
                <TableHeader role="rowgroup" className="contents">
                  <TableRow role="row" className={LIGNE}>
                    {entetes.map((h, i) => (
                      <TableHead
                        key={h}
                        role="columnheader"
                        className={cn("flex items-center", i >= 5 && i < 7 && "justify-end", i === 7 && "justify-center")}
                      >
                        {h}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody role="rowgroup" className="contents">
                  {visibles.map((f) => (
                    <TableRow
                      key={f.id}
                      role="row"
                      onClick={() => ouvrirClient(f)}
                      className={cn(LIGNE, "hover:bg-card/60 cursor-pointer")}
                    >
                      <TableCell role="cell" className="flex items-center tabular-nums">
                        {f.numero || <span className="text-subtle">Brouillon</span>}
                      </TableCell>
                      <TableCell role="cell" className="flex items-center">
                        {f.client}
                      </TableCell>
                      <TableCell role="cell" className="flex items-center">
                        <Tag tone={STATUTS[f.statut].ton}>{STATUTS[f.statut].libelle}</Tag>
                      </TableCell>
                      <TableCell role="cell" className="flex items-center tabular-nums">
                        {jourCourt(f.date)}
                      </TableCell>
                      <TableCell role="cell" className="flex items-center">
                        <Echeance f={f} />
                      </TableCell>
                      <TableCell role="cell" className="flex items-center justify-end tabular-nums">
                        {euros(f.montant, true)}
                      </TableCell>
                      <TableCell role="cell" className="flex items-center justify-end tabular-nums">
                        {f.statut === "payee" ? <span className="text-subtle">—</span> : euros(f.restant, true)}
                      </TableCell>
                      <TableCell role="cell" className="flex items-center justify-center" onClick={stop}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon-sm" className="text-foreground data-[state=open]:bg-white/6" aria-label={`Actions de la facture ${f.numero || "brouillon"}`}>
                              <DotsIcon aria-hidden className="size-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {f.statut === "brouillon" ? (
                              <DropdownMenuItem onSelect={() => finaliser(f)}>
                                <Stamp aria-hidden className="size-3.5" />
                                Finaliser
                              </DropdownMenuItem>
                            ) : (
                              <>
                                <DropdownMenuItem onSelect={() => window.open(api.urlPdf(f.id), "_blank", "noopener")}>
                                  <FileText aria-hidden className="size-3.5" />
                                  Voir le PDF
                                </DropdownMenuItem>
                                {f.statut !== "payee" && local && (
                                  <DropdownMenuItem onSelect={() => payer(f)}>
                                    <Check aria-hidden className="size-3.5" />
                                    Marquer comme payée
                                  </DropdownMenuItem>
                                )}
                                {f.statut !== "payee" && !local && (
                                  <>
                                    <DropdownMenuItem onSelect={() => lien(f, "ouvrir")}>
                                      <ExternalLink aria-hidden className="size-3.5" />
                                      Ouvrir le lien de paiement
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onSelect={() => lien(f, "copier")}>
                                      <Copy aria-hidden className="size-3.5" />
                                      Copier le lien de paiement
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onSelect={() => renvoyer(f)}>
                                      <Send aria-hidden className="size-3.5" />
                                      Renvoyer par e-mail
                                    </DropdownMenuItem>
                                  </>
                                )}
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                  {visibles.length === 0 && (
                    <TableRow role="row" className={LIGNE}>
                      <td role="cell" className="caption-style text-muted-foreground col-span-full flex h-[120px] items-center justify-center">
                        {tableau ? "Aucune facture ne correspond à ces filtres." : "Chargement des factures…"}
                      </td>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
            <div className="caption-style grid shrink-0 grid-cols-2 gap-px border-b border-border bg-background p-px sm:grid-cols-4">
              <div className="flex items-center gap-2 p-3 outline-1 outline-border">
                <span className="text-foreground tabular-nums">{visibles.length}</span>
                <span className="text-muted-foreground">{visibles.length > 1 ? "factures affichées" : "facture affichée"}</span>
              </div>
              <div className="flex items-center gap-2 p-3 outline-1 outline-border">
                <span className="text-foreground tabular-nums">{euros(total)}</span>
                <span className="text-muted-foreground">facturés TTC</span>
              </div>
              <div className="flex items-center gap-2 p-3 outline-1 outline-border">
                <span className="text-foreground tabular-nums">{euros(restant)}</span>
                <span className="text-muted-foreground">à encaisser</span>
              </div>
              <div className="flex items-center gap-2 p-3 outline-1 outline-border">
                <span className={cn("tabular-nums", retard > 0 ? "text-(--tag-red-text)" : "text-foreground")}>{euros(retard)}</span>
                <span className="text-muted-foreground">en retard</span>
              </div>
            </div>
          </div>
        </>
      )}
      <span className="sr-only">{pluriel(visibles.length, "facture")}</span>
    </section>
  );
}

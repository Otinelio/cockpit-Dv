"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Avatar from "@/components/_ui/avatar";
import Button from "@/components/_ui/button";
import Tag from "@/components/_ui/tag";
import { ScrollArea } from "@/components/_ui/scroll-area";
import PageHeader from "@/components/_common/page-header";
import NouveauSaasDialog from "@/components/saas/nouveau-saas-dialog";
import NouveauContratDialog from "@/components/contrats/nouveau-contrat-dialog";
import SaasDetailDialog from "@/components/saas/saas-detail-dialog";
import ContratDetailSheet from "@/components/contrats/contrat-detail-sheet";
import { useCockpit } from "@/stores/cockpit-store";
import { euros } from "@/lib/format";
import type {
  StatutSaasDV,
  StatutContratDV,
  TypeContratDV,
} from "@/server/dv-types";
import {
  Layers,
  Plus,
  FileText,
  Briefcase,
  Users,
  TrendingUp,
  FolderOpen,
  Folder,
  ArrowRight,
  Smartphone,
  CheckCircle2,
  PackageCheck,
  CreditCard,
  FileCheck,
} from "lucide-react";

const ONGLETS = [
  { value: "produits", label: "Dossiers SaaS (SaaStup)" },
  { value: "contrats", label: "Contrats & Conventions" },
];

function statutBadge(s: StatutSaasDV) {
  switch (s) {
    case "production":
      return <Tag tone="green">En production</Tag>;
    case "beta":
      return <Tag tone="purple">Bêta privée</Tag>;
    case "prototypage":
      return <Tag tone="amber">Prototypage / MVP</Tag>;
    case "ideation":
      return <Tag tone="blue">Idéation</Tag>;
    default:
      return <Tag tone="neutral">En pause</Tag>;
  }
}

function statutContratBadge(s: StatutContratDV) {
  switch (s) {
    case "actif":
      return <Tag tone="green">Signé & Actif</Tag>;
    case "en_attente":
      return <Tag tone="amber">En attente signature</Tag>;
    case "brouillon":
      return <Tag tone="blue">Brouillon</Tag>;
    case "termine":
      return <Tag tone="neutral">Terminé / Livré</Tag>;
    default:
      return <Tag tone="red">Résilié</Tag>;
  }
}

function typeContratLibelle(t: TypeContratDV) {
  switch (t) {
    case "creation_site":
      return "Site web / Landing";
    case "app_mobile":
      return "App mobile";
    case "logiciel":
      return "Logiciel sur mesure";
    case "maintenance":
      return "Maintenance";
    default:
      return "Conseil";
  }
}

function SaasDeepLinkWatcher({
  saas,
  onSelectSaas,
  onSetOnglet,
}: {
  saas: { id: string }[];
  onSelectSaas: (id: string | null) => void;
  onSetOnglet: (o: string) => void;
}) {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");

  useEffect(() => {
    if (!id || saas.length === 0) return;
    const existe = saas.some((s) => s.id === id);
    if (existe) {
      onSelectSaas(id);
      onSetOnglet("produits");
    }
  }, [id, saas, onSelectSaas, onSetOnglet]);

  return null;
}

export default function SaasHub() {
  const [onglet, setOnglet] = useState("produits");
  const [modalSaas, setModalSaas] = useState(false);
  const [modalContrat, setModalContrat] = useState(false);

  // Fiches détails sélectionnées par ID (dérivées réactivement du store)
  const [saasIdSelectionne, setSaasIdSelectionne] = useState<string | null>(null);
  const [contratIdSelectionne, setContratIdSelectionne] = useState<string | null>(null);

  const saas = useCockpit((s) => s.saas);
  const chargerSaas = useCockpit((s) => s.chargerSaas);
  const contrats = useCockpit((s) => s.contrats);
  const chargerContrats = useCockpit((s) => s.chargerContrats);
  const taches = useCockpit((s) => s.taches);
  const chargerTaches = useCockpit((s) => s.chargerTaches);

  useEffect(() => {
    chargerSaas();
    chargerContrats();
    chargerTaches();
  }, [chargerSaas, chargerContrats, chargerTaches]);

  const saasSelectionne = saasIdSelectionne ? saas.find((s) => s.id === saasIdSelectionne) ?? null : null;
  const contratSelectionne = contratIdSelectionne ? contrats.find((c) => c.id === contratIdSelectionne) ?? null : null;

  const objectifMrrCumule = saas.reduce((acc, s) => acc + (s.objectifMrrFCFA || 0), 0);
  const mrrActuelCumule = saas.reduce((acc, s) => acc + (s.mrrFCFA || 0), 0);
  const contratsActifs = contrats.filter((c) => c.statut === "actif").length;

  return (
    <section className="flex min-h-0 min-w-0 flex-1 flex-col">
      <Suspense fallback={null}>
        <SaasDeepLinkWatcher
          saas={saas}
          onSelectSaas={setSaasIdSelectionne}
          onSetOnglet={setOnglet}
        />
      </Suspense>
      <PageHeader
        title="SaaStup & Contrats DV"
        tabs={ONGLETS}
        tab={onglet}
        onTab={setOnglet}
        pill={
          <span className="caption-style bg-muted inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border px-2.5 py-0.5 text-xs text-purple-400">
            <FolderOpen className="size-3" />
            Lab & Projets DigitalVision
          </span>
        }
      />

      {/* Résumé des métriques SaaStup - ULTRA COMPACT SUR MOBILE */}
      <div className="grid grid-cols-3 divide-x divide-border border-y border-border bg-card px-2 py-2 sm:px-4 sm:py-3">
        <div className="flex flex-col items-center sm:items-start px-1 sm:px-3">
          <span className="text-[10px] sm:text-xs text-muted-foreground flex items-center gap-1 truncate">
            <Layers className="size-3 text-purple-400 shrink-0" />
            <span className="hidden sm:inline">Produits SaaS incubés</span>
            <span className="sm:hidden">SaaS</span>
          </span>
          <span className="text-xs sm:text-base font-semibold text-foreground mt-0.5 tabular-nums">
            {saas.length} <span className="hidden sm:inline text-xs font-normal text-subtle">projets</span>
          </span>
        </div>

        <div className="flex flex-col items-center sm:items-start px-1 sm:px-3">
          <span className="text-[10px] sm:text-xs text-muted-foreground flex items-center gap-1 truncate">
            <TrendingUp className="size-3 text-trend shrink-0" />
            <span className="hidden sm:inline">Objectif MRR</span>
            <span className="sm:hidden">Obj. MRR</span>
          </span>
          <span className="text-xs sm:text-base font-semibold text-foreground mt-0.5 tabular-nums truncate max-w-full">
            {euros(objectifMrrCumule, true)}
            <span className="hidden lg:inline text-xs font-normal text-muted-foreground ml-1">
              ({euros(mrrActuelCumule, true)})
            </span>
          </span>
        </div>

        <div className="flex flex-col items-center sm:items-start px-1 sm:px-3">
          <span className="text-[10px] sm:text-xs text-muted-foreground flex items-center gap-1 truncate">
            <Briefcase className="size-3 text-blue-400 shrink-0" />
            <span className="hidden sm:inline">Contrats clients actifs</span>
            <span className="sm:hidden">Contrats</span>
          </span>
          <span className="text-xs sm:text-base font-semibold text-foreground mt-0.5 tabular-nums">
            {contratsActifs} <span className="hidden sm:inline text-xs font-normal text-subtle">actifs</span>
          </span>
        </div>
      </div>

      {onglet === "produits" ? (
        <div className="flex min-h-0 flex-1 flex-col">
          {/* Barre d'actions compacte */}
          <div className="border-border bg-card/40 flex items-center justify-between gap-2 border-b px-3 sm:px-4 py-2 sm:py-2.5">
            <span className="text-subtle text-xs truncate">
              Clique sur un projet pour entrer dans son dossier complet
            </span>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setModalSaas(true)}
              className="gap-1.5 shrink-0 text-xs h-8"
            >
              <Plus className="size-3.5" />
              Nouveau SaaS
            </Button>
          </div>

          <ScrollArea className="min-h-0 flex-1 p-3 sm:p-5">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {saas.map((s) => {
                const jalonsFaits = (s.jalons ?? []).filter((j) => j.termine).length;
                const totalJalons = (s.jalons ?? []).length;
                const pctJalons = totalJalons > 0 ? Math.round((jalonsFaits / totalJalons) * 100) : 0;

                const tachesDuProjet = (taches ?? []).filter(
                  (t) =>
                    t.saasId === s.id ||
                    t.titre.toLowerCase().includes(s.nom.toLowerCase()),
                );

                const aApk = (s.documents ?? []).some((d) => d.type === "apk") || !!s.apkUrl;

                return (
                  <div
                    key={s.id}
                    onClick={() => setSaasIdSelectionne(s.id)}
                    className="border-line-strong bg-card hover:bg-secondary/30 flex flex-col justify-between rounded-xl border p-4 sm:p-5 shadow-xs transition-all cursor-pointer hover:border-purple-500/40 group"
                  >
                    <div>
                      {/* En-tête Dossier */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="flex size-10 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 shrink-0 group-hover:scale-105 transition-transform">
                            <Folder className="size-5" />
                          </div>
                          <div className="flex flex-col min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-base font-bold text-foreground group-hover:text-purple-300 transition-colors">
                                {s.nom}
                              </h3>
                              {statutBadge(s.statut)}
                              {aApk && (
                                <span className="inline-flex items-center gap-1 rounded bg-purple-500/20 px-1.5 py-0.5 text-[10px] font-medium text-purple-300">
                                  <Smartphone className="size-2.5" />
                                  APK dispo
                                </span>
                              )}
                            </div>
                            <p className="text-subtle text-xs mt-0.5 truncate">
                              {s.slogan}
                            </p>
                          </div>
                        </div>

                        <span className="text-purple-400 opacity-60 group-hover:opacity-100 group-hover:translate-x-1 transition-all">
                          <ArrowRight className="size-4" />
                        </span>
                      </div>

                      {/* Description courte */}
                      <p className="text-muted-foreground mt-3 text-xs leading-relaxed line-clamp-2">
                        {s.description}
                      </p>

                      {/* Équipe Leads */}
                      <div className="border-border bg-secondary/40 mt-3.5 flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2 text-xs">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1.5" title={`Tech: ${s.leadTech}`}>
                            <Avatar nom={s.leadTech} ton="purple" className="size-4 text-[7px]" />
                            <span className="text-subtle">{s.leadTech}</span>
                          </div>
                          <div className="flex items-center gap-1.5" title={`Mktg: ${s.leadMarketing}`}>
                            <Avatar nom={s.leadMarketing} ton="blue" className="size-4 text-[7px]" />
                            <span className="text-subtle">{s.leadMarketing}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Users className="size-3" />
                          <span className="font-semibold text-foreground">{s.utilisateurs}</span> users
                        </div>
                      </div>

                      {/* Avancement Roadmap */}
                      <div className="mt-3.5 flex flex-col gap-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-subtle flex items-center gap-1 text-[11px]">
                            <CheckCircle2 className="size-3 text-purple-400" />
                            Roadmap : {jalonsFaits}/{totalJalons} jalons
                          </span>
                          <span className="text-xs font-semibold text-foreground">{pctJalons}%</span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                          <div
                            className="h-full bg-purple-500 transition-all duration-300"
                            style={{ width: `${pctJalons}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Footer de la carte */}
                    <div className="border-border/60 mt-4 flex items-center justify-between border-t pt-3 text-xs">
                      <div className="flex items-center gap-3 text-subtle text-[11px]">
                        <span className="flex items-center gap-1">
                          <FileText className="size-3" />
                          {(s.documents ?? []).length} doc{(s.documents ?? []).length > 1 ? "s" : ""}
                        </span>
                        <span>•</span>
                        <span>
                          {tachesDuProjet.length} tâche{tachesDuProjet.length > 1 ? "s" : ""}
                        </span>
                      </div>

                      <div className="inline-flex items-center gap-1 text-xs font-medium text-purple-400 group-hover:underline">
                        <span>Ouvrir le dossier</span>
                        <ArrowRight className="size-3" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col">
          {/* Barre d'actions Contrats */}
          <div className="border-border bg-card/40 flex items-center justify-between gap-2 border-b px-3 sm:px-4 py-2 sm:py-2.5">
            <span className="text-subtle text-xs truncate">
              Clique sur un contrat pour suivre sa signature, livraison et paiements
            </span>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setModalContrat(true)}
              className="gap-1.5 shrink-0 text-xs h-8"
            >
              <Plus className="size-3.5" />
              Nouveau contrat
            </Button>
          </div>

          <ScrollArea className="min-h-0 flex-1 p-3 sm:p-5">
            {contrats.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-center">
                <Briefcase className="text-muted-foreground size-10 stroke-1" />
                <p className="text-muted-foreground mt-3 text-sm">
                  Aucun contrat client enregistré pour l&apos;instant.
                </p>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setModalContrat(true)}
                  className="mt-3 gap-1.5"
                >
                  <Plus className="size-3.5" />
                  Créer un premier contrat
                </Button>
              </div>
            ) : (
              <div className="divide-border flex flex-col divide-y rounded-xl border border-border bg-card overflow-hidden">
                {contrats.map((c) => {
                  const estSigne = c.estSigne ?? (c.statut === "actif" || c.statut === "termine");
                  const estLivre = c.estLivre ?? (c.statut === "termine");
                  const estPaye = c.estPaye ?? false;

                  const nbPrestations = (c.prestations ?? []).length;

                  return (
                    <div
                      key={c.id}
                      onClick={() => setContratIdSelectionne(c.id)}
                      className="hover:bg-secondary/40 flex flex-col gap-3 p-4 transition-colors cursor-pointer sm:flex-row sm:items-center sm:justify-between group"
                    >
                      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                            {c.titre}
                          </span>
                          <span className="bg-secondary text-subtle rounded px-2 py-0.5 text-xs font-medium">
                            {nbPrestations > 1
                              ? `${nbPrestations} prestations`
                              : typeContratLibelle(c.type)}
                          </span>
                          {statutContratBadge(c.statut)}
                        </div>

                        {/* Prestations multi-lignes si présentes */}
                        {c.prestations && c.prestations.length > 1 && (
                          <div className="flex flex-wrap gap-1.5 mt-0.5">
                            {c.prestations.map((p, idx) => (
                              <span
                                key={p.id || idx}
                                className="text-[11px] text-muted-foreground bg-secondary/80 rounded px-1.5 py-0.5"
                              >
                                {p.libellePersonnalise || typeContratLibelle(p.type)} ({euros(p.montantFCFA, true)})
                              </span>
                            ))}
                          </div>
                        )}

                        <div className="text-subtle flex flex-wrap items-center gap-3 text-xs">
                          <span>
                            Client : <strong className="text-foreground">{c.nomEntreprise}</strong>
                          </span>
                          <span>
                            Début : {c.debutLe.split("-").reverse().join("/")}
                          </span>
                          {c.finLe && (
                            <span>
                              Fin : {c.finLe.split("-").reverse().join("/")}
                            </span>
                          )}
                          <span>Resp. : {c.responsable}</span>
                        </div>

                        {/* Badges de suivi opérationnel */}
                        <div className="flex items-center gap-3 mt-1 text-[11px]">
                          <span
                            className={`flex items-center gap-1 ${
                              estSigne ? "text-emerald-400 font-medium" : "text-subtle"
                            }`}
                          >
                            <FileCheck className="size-3" />
                            {estSigne ? "Signé" : "Non signé"}
                          </span>

                          <span
                            className={`flex items-center gap-1 ${
                              estLivre ? "text-purple-400 font-medium" : "text-subtle"
                            }`}
                          >
                            <PackageCheck className="size-3" />
                            {estLivre ? "Livré" : "En cours"}
                          </span>

                          <span
                            className={`flex items-center gap-1 ${
                              estPaye ? "text-trend font-medium" : "text-subtle"
                            }`}
                          >
                            <CreditCard className="size-3" />
                            {estPaye ? "Soldé" : "Paiement en attente"}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-4 sm:justify-end border-t border-border/50 pt-2 sm:border-0 sm:pt-0">
                        <span className="lead-style font-semibold text-trend tabular-nums">
                          {euros(c.montantFCFA, true)}
                        </span>

                        <span className="text-subtle group-hover:text-foreground group-hover:translate-x-1 transition-all">
                          <ArrowRight className="size-4" />
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>
      )}

      {/* Modale Nouveau SaaS */}
      <NouveauSaasDialog
        open={modalSaas}
        onOpenChange={setModalSaas}
      />

      {/* Modale Nouveau Contrat */}
      <NouveauContratDialog
        open={modalContrat}
        onOpenChange={setModalContrat}
      />

      {/* Dossier de Projet SaaS */}
      <SaasDetailDialog
        saas={saasSelectionne}
        open={!!saasSelectionne}
        onOpenChange={(op) => !op && setSaasIdSelectionne(null)}
      />

      {/* Fiche Détail Contrat en Sheet latéral */}
      <ContratDetailSheet
        contrat={contratSelectionne}
        open={!!contratSelectionne}
        onOpenChange={(op) => !op && setContratIdSelectionne(null)}
      />
    </section>
  );
}

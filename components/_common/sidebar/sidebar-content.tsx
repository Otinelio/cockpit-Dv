"use client";

import { useEffect, useRef, type ComponentType } from "react";
import { usePathname, useRouter } from "next/navigation";
import Avatar from "@/components/_ui/avatar";
import Button from "@/components/_ui/button";
import { ScrollArea } from "@/components/_ui/scroll-area";
import SegmentBar from "@/components/_common/segment-bar";
import SidebarNavItem from "@/components/_common/sidebar/sidebar-nav-item";
import SidebarSection from "@/components/_common/sidebar/sidebar-section";
import { api } from "@/lib/api";
import { ETAPES_PIPELINE, ETAPE_POINTS } from "@/lib/cockpit";
import { euros } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useCockpit } from "@/stores/cockpit-store";
import Logo from "@/public/assets/images/_common/logo.svg";
import BuildingIcon from "@/public/assets/images/companies/sidebar/building.svg";
import BarChartIcon from "@/public/assets/images/companies/sidebar/bar-chart-10.svg";
import ListIcon from "@/public/assets/images/companies/sidebar/list.svg";
import WalletIcon from "@/public/assets/images/companies/sidebar/wallet.svg";
import { Briefcase, Layers, X } from "lucide-react";
import PwaInstallBanner from "@/components/_common/pwa-install-banner";

const LIENS: { href: string; label: string; icon: ComponentType<{ className?: string }> }[] = [
  { href: "/", label: "Tableau de bord", icon: BarChartIcon },
  { href: "/hub", label: "DigitalVision Hub", icon: Briefcase },
  { href: "/saas", label: "SaaStup & Lab", icon: Layers },
  { href: "/entreprises", label: "CRM", icon: BuildingIcon },
  { href: "/factures", label: "Finances & Factures", icon: WalletIcon },
  { href: "/taches", label: "Tâches", icon: ListIcon },
];

export default function SidebarContent() {
  const pathname = usePathname();
  const router = useRouter();
  const tableau = useCockpit((state) => state.tableau);
  const crm = useCockpit((state) => state.crm);
  const charger = useCockpit((state) => state.charger);
  const toast = useCockpit((state) => state.toast);
  const openProfile = useCockpit((state) => state.openProfile);
  const setFiltres = useCockpit((state) => state.setFiltres);
  const setVue = useCockpit((state) => state.setVue);
  const ouvrirFacture = useCockpit((state) => state.ouvrirFacture);
  const setSidebarOpen = useCockpit((state) => state.setSidebarOpen);
  const filtres = useCockpit((state) => state.filtres);
  const taches = useCockpit((state) => state.taches);
  const saas = useCockpit((state) => state.saas);

  const dernierPathname = useRef(pathname);
  useEffect(() => {
    if (dernierPathname.current !== pathname) {
      dernierPathname.current = pathname;
      setSidebarOpen(false);
    }
  }, [pathname, setSidebarOpen]);

  const entreprises = crm?.entreprises ?? [];
  const retards = (tableau?.factures ?? []).filter(
    (f) => f.statut === "en_retard",
  ).length;
  const counts: Record<string, number | undefined> = {
    "/saas": saas.length > 0 ? saas.length : undefined,
    "/entreprises": crm ? entreprises.length : undefined,
    "/factures": tableau && retards > 0 ? retards : undefined,
    "/taches": taches.filter((t) => t.statut !== "terminee").length,
  };

  const objectif = tableau?.objectif;
  const atteint =
    objectif && objectif.cible > 0
      ? Math.round((objectif.montant / objectif.cible) * 100)
      : null;

  async function reinitialiser() {
    await api.reinitialiserDemo();
    await charger(true);
    router.push("/");
    toast({
      ton: "info",
      titre: "Démo réinitialisée",
      texte: "Maison Orée repart de ses factures et de son CRM de départ.",
    });
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-sidebar-border bg-sidebar-accent flex shrink-0 items-center justify-between gap-2 border-b p-3">
        <div className="flex min-w-0 items-center gap-2">
          <Logo aria-hidden className="size-8 shrink-0 overflow-visible" />
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="lead-style block truncate font-semibold tracking-[-0.01em]">
              Cockpit DV
            </span>
            <span className="caption-style text-subtle block truncate text-[11px]">
              {tableau?.entreprise ?? "DigitalVision Lomé"}
            </span>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          className="lg:hidden text-muted-foreground hover:text-foreground"
          onClick={() => setSidebarOpen(false)}
          aria-label="Fermer le menu"
        >
          <X className="size-4" />
        </Button>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <nav aria-label="Pages">
          <SidebarSection className="border-sidebar-border border-b">
            {LIENS.map((lien) => (
              <SidebarNavItem
                key={lien.href}
                icon={lien.icon}
                label={lien.label}
                href={lien.href}
                count={counts[lien.href]}
                active={
                  lien.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(lien.href)
                }
                onClick={() => setSidebarOpen(false)}
              />
            ))}
          </SidebarSection>

          {crm && (
            <SidebarSection
              title="Équipe DV"
              className="border-sidebar-border border-b"
            >
              {crm.equipe.map((m) => (
                <SidebarNavItem
                  key={m.nom}
                  mark={<Avatar nom={m.nom} ton={m.ton} className="size-3.5 text-[6.5px]" />}
                  label={m.nom}
                  onClick={() => {
                    setSidebarOpen(false);
                    openProfile(m.nom);
                  }}
                />
              ))}
            </SidebarSection>
          )}

          <SidebarSection title="Pipeline">
            {ETAPES_PIPELINE.map((etape) => (
              <SidebarNavItem
                key={etape}
                mark={
                  <span
                    aria-hidden
                    className="flex size-3.5 shrink-0 items-center justify-center"
                  >
                    <span className={cn("size-1.5 rounded-full", ETAPE_POINTS[etape])} />
                  </span>
                }
                label={etape}
                count={crm ? entreprises.filter((e) => e.etape === etape).length : undefined}
                active={pathname.startsWith("/entreprises") && filtres.etape === etape}
                onClick={() => {
                  setSidebarOpen(false);
                  setVue("prospects");
                  setFiltres({ etape, fenetre: 0 });
                  router.push("/entreprises");
                }}
              />
            ))}
          </SidebarSection>
        </nav>
      </ScrollArea>

      <SidebarSection className="border-sidebar-border shrink-0 border-t border-b">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="caption-style text-subtle">Objectif annuel</span>
            {atteint !== null && (
              <span className="caption-style font-medium tabular-nums">
                {atteint} %
              </span>
            )}
          </div>
          {atteint !== null && (
            <SegmentBar
              percent={atteint}
              segments={20}
              className="w-full"
              anime={{ delai: 300, pas: 20 }}
            />
          )}
          {objectif && (
            <span className="caption-style text-subtle truncate tabular-nums">
              {euros(objectif.montant)} / {euros(objectif.cible)}
            </span>
          )}
        </div>
      </SidebarSection>

      <PwaInstallBanner />

      <div className="border-sidebar-border bg-sidebar-accent flex shrink-0 items-center justify-between gap-1 border-t p-2">
        <Button
          variant="secondary"
          size="sm"
          className="caption-style flex-1 justify-center"
          onClick={() => ouvrirFacture()}
        >
          Facturer
        </Button>
        {tableau?.mode === "demo" ? (
          <Button
            variant="ghost"
            size="sm"
            className="caption-style text-subtle hover:text-foreground"
            onClick={reinitialiser}
          >
            Réinitialiser
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="caption-style text-subtle hover:text-foreground"
            onClick={async () => {
              await charger(true);
              toast({
                ton: "info",
                titre: "Chiffres à jour",
                texte: `Les chiffres et le CRM sont relus à ${new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}.`,
              });
            }}
          >
            Actualiser
          </Button>
        )}
      </div>
    </div>
  );
}

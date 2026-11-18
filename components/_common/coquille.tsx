"use client";

import { useEffect, type ReactNode } from "react";
import Sidebar from "@/components/_common/sidebar/sidebar";
import Toasts from "@/components/_common/toasts";
import CommandMenu from "@/components/entreprises/command-menu/command-menu";
import CompanyDetail from "@/components/entreprises/detail/company-detail";
import NewCompanyDialog from "@/components/entreprises/new-company/new-company-dialog";
import Profile from "@/components/entreprises/profile/profile";
import NouvelleFacture from "@/components/factures/nouvelle-facture";
import EcranConnexion from "@/components/_common/auth/ecran-connexion";
import MobileNav from "@/components/_common/mobile-nav";
import { useCockpit } from "@/stores/cockpit-store";

export default function Coquille({ children }: { children: ReactNode }) {
  const charger = useCockpit((state) => state.charger);
  const estAuthentifie = useCockpit((state) => state.estAuthentifie);
  const chargementSession = useCockpit((state) => state.chargementSession);
  const initialiserSession = useCockpit((state) => state.initialiserSession);

  useEffect(() => {
    initialiserSession();
  }, [initialiserSession]);

  useEffect(() => {
    if (!estAuthentifie) return;
    charger();
    let dernier = 0;
    const rafraichir = () => {
      if (document.visibilityState !== "visible" || Date.now() - dernier < 1500)
        return;
      dernier = Date.now();
      charger();
    };
    window.addEventListener("focus", rafraichir);
    document.addEventListener("visibilitychange", rafraichir);
    return () => {
      window.removeEventListener("focus", rafraichir);
      document.removeEventListener("visibilitychange", rafraichir);
    };
  }, [charger, estAuthentifie]);

  // En cours d'initialisation de la session locale
  if (chargementSession) {
    return (
      <main className="flex h-dvh max-w-full items-center justify-center bg-[#121212] overflow-hidden">
        <div className="flex flex-col items-center gap-3">
          <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span className="caption-style text-xs text-muted-foreground">
            Démarrage de Cockpit DV...
          </span>
        </div>
      </main>
    );
  }

  // Si non connecté : afficher l'écran de verrouillage avec sélecteur et mot de passe
  if (!estAuthentifie) {
    return (
      <main className="flex min-h-dvh max-w-full overflow-hidden bg-[#121212]">
        <EcranConnexion />
        <Toasts />
      </main>
    );
  }

  return (
    <main className="flex h-dvh max-w-full overflow-hidden">
      <Sidebar />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col pb-14 lg:pb-0">{children}</div>
      <MobileNav />
      <CompanyDetail />
      <Profile />
      <NewCompanyDialog />
      <NouvelleFacture />
      <CommandMenu />
      <Toasts />
    </main>
  );
}

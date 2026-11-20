"use client";

import { useEffect } from "react";
import PageHeader from "@/components/_common/page-header";
import TabIdentite from "@/components/hub/tab-identite";
import TabCoffre from "@/components/hub/tab-coffre";
import TabStrategie from "@/components/hub/tab-strategie";
import TabAssocies from "@/components/hub/tab-associes";
import TabReunions from "@/components/hub/tab-reunions";
import TabDocuments from "@/components/hub/tab-documents";
import { type OngletHub, useHub } from "@/stores/hub-store";
import {
  Building2,
  Calendar,
  Compass,
  FolderOpen,
  KeyRound,
  Users,
} from "lucide-react";

const ONGLETS: {
  id: OngletHub;
  label: string;
  icon: typeof Building2;
}[] = [
  { id: "identite", label: "Identité Entreprise", icon: Building2 },
  { id: "coffre", label: "Coffre-fort Sécurisé", icon: KeyRound },
  { id: "strategie", label: "Vision & Stratégie", icon: Compass },
  { id: "associes", label: "Associés & Pouvoirs", icon: Users },
  { id: "reunions", label: "Réunions & Décisions", icon: Calendar },
  { id: "documents", label: "Documents & Archives", icon: FolderOpen },
];

export default function HubPrincipal() {
  const ongletActif = useHub((s) => s.ongletActif);
  const setOngletActif = useHub((s) => s.setOngletActif);
  const chargerTout = useHub((s) => s.chargerTout);
  const entreesCoffre = useHub((s) => s.entreesCoffre);
  const strategie = useHub((s) => s.strategie);
  const reunions = useHub((s) => s.reunions);
  const documents = useHub((s) => s.documents);

  useEffect(() => {
    chargerTout();
  }, [chargerTout]);

  const badges: Record<OngletHub, number | undefined> = {
    identite: undefined,
    coffre: entreesCoffre.length > 0 ? entreesCoffre.length : undefined,
    strategie: strategie?.objectifsMensuels.length || undefined,
    associes: 3,
    reunions: reunions.length > 0 ? reunions.length : undefined,
    documents: documents.length > 0 ? documents.length : undefined,
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#121212] pb-24 lg:pb-12">
      <PageHeader
        title="DigitalVision Hub"
        pill={
          <span className="caption-style bg-muted inline-flex shrink-0 items-center gap-1 rounded-full border border-[#363636] px-2.5 py-0.5 text-primary text-xs">
            Espace Entreprise
          </span>
        }
      />

      <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 max-w-7xl w-full mx-auto space-y-6">
        {/* Navigation des 6 sous-modules */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-border/80 scrollbar-none">
          {ONGLETS.map((onglet) => {
            const Icon = onglet.icon;
            const estActif = ongletActif === onglet.id;
            const count = badges[onglet.id];

            return (
              <button
                key={onglet.id}
                type="button"
                onClick={() => setOngletActif(onglet.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  estActif
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-card hover:text-foreground"
                }`}
              >
                <Icon className="size-4 shrink-0" />
                <span>{onglet.label}</span>
                {count !== undefined && (
                  <span
                    className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold tabular-nums ${
                      estActif
                        ? "bg-primary-foreground/20 text-primary-foreground"
                        : "bg-card border border-border/60 text-muted-foreground"
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Contenu du sous-module actif */}
        <div>
          {ongletActif === "identite" && <TabIdentite />}
          {ongletActif === "coffre" && <TabCoffre />}
          {ongletActif === "strategie" && <TabStrategie />}
          {ongletActif === "associes" && <TabAssocies />}
          {ongletActif === "reunions" && <TabReunions />}
          {ongletActif === "documents" && <TabDocuments />}
        </div>
      </main>
    </div>
  );
}

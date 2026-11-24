"use client";

import { Suspense, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import PageHeader from "@/components/_common/page-header";
import CompaniesToolbar from "./toolbar/toolbar";
import CompaniesTable from "./table/companies-table";
import PipelineKanban from "./kanban/pipeline-kanban";
import { filtrer, type Vue } from "@/lib/cockpit";
import { useCockpit } from "@/stores/cockpit-store";

const ONGLETS = [
  { value: "toutes", label: "Toutes" },
  { value: "prospects", label: "Prospects" },
  { value: "clients", label: "Clients" },
  { value: "pipeline", label: "Pipeline" },
];

function EntrepriseDeepLinkWatcher() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const openDetail = useCockpit((state) => state.openDetail);
  const crm = useCockpit((state) => state.crm);

  useEffect(() => {
    if (!id || !crm) return;
    const existe = crm.entreprises.some((e) => e.id === id);
    if (existe) {
      openDetail(id);
    }
  }, [id, crm, openDetail]);

  return null;
}

export default function Entreprises() {
  const crm = useCockpit((state) => state.crm);
  const filtres = useCockpit((state) => state.filtres);
  const vue = useCockpit((state) => state.vue);
  const setVue = useCockpit((state) => state.setVue);

  const visibles = useMemo(
    () => (vue === "pipeline" ? [] : filtrer(crm?.entreprises ?? [], filtres, vue)),
    [crm, filtres, vue],
  );

  return (
    <section id="entreprises" className="flex min-h-0 min-w-0 flex-1 flex-col">
      <Suspense fallback={null}>
        <EntrepriseDeepLinkWatcher />
      </Suspense>
      <PageHeader
        title="CRM & Pipeline"
        tabs={ONGLETS}
        tab={vue}
        onTab={(v) => setVue(v as Vue)}
      />
      {vue === "pipeline" ? (
        <PipelineKanban />
      ) : (
        <>
          <CompaniesToolbar />
          <CompaniesTable
            entreprises={visibles}
            empty={crm ? undefined : "Chargement du CRM…"}
          />
        </>
      )}
    </section>
  );
}

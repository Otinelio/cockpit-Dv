"use client";

import { useEffect, useState } from "react";
import Avatar from "@/components/_ui/avatar";
import Button from "@/components/_ui/button";
import Tag from "@/components/_ui/tag";
import { Checkbox } from "@/components/_ui/checkbox";
import { ScrollArea } from "@/components/_ui/scroll-area";
import PageHeader from "@/components/_common/page-header";
import NouveauSaasDialog from "@/components/saas/nouveau-saas-dialog";
import NouveauContratDialog from "@/components/saas/nouveau-contrat-dialog";
import NouveauDocumentDialog from "@/components/saas/nouveau-document-dialog";
import { useCockpit } from "@/stores/cockpit-store";
import { euros } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { SaasDV, StatutSaasDV, StatutContratDV, TypeContratDV } from "@/server/dv-types";
import {
  Layers,
  Plus,
  ExternalLink,
  FileText,
  CheckCircle2,
  Sparkles,
  Briefcase,
  Users,
  TrendingUp,
  Trash2,
} from "lucide-react";

const ONGLETS = [
  { value: "produits", label: "Produits SaaS (SaaStup)" },
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
      return "Site web";
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

export default function SaasHub() {
  const [onglet, setOnglet] = useState("produits");
  const [modalSaas, setModalSaas] = useState(false);
  const [modalContrat, setModalContrat] = useState(false);
  const [saasPourDoc, setSaasPourDoc] = useState<SaasDV | null>(null);

  const saas = useCockpit((s) => s.saas);
  const chargerSaas = useCockpit((s) => s.chargerSaas);
  const modifierSaas = useCockpit((s) => s.modifierSaas);
  const supprimerSaas = useCockpit((s) => s.supprimerSaas);

  const contrats = useCockpit((s) => s.contrats);
  const chargerContrats = useCockpit((s) => s.chargerContrats);
  const supprimerContrat = useCockpit((s) => s.supprimerContrat);

  useEffect(() => {
    chargerSaas();
    chargerContrats();
  }, [chargerSaas, chargerContrats]);

  const objectifMrrCumule = saas.reduce((acc, s) => acc + (s.objectifMrrFCFA || 0), 0);
  const mrrActuelCumule = saas.reduce((acc, s) => acc + (s.mrrFCFA || 0), 0);
  const contratsActifs = contrats.filter((c) => c.statut === "actif").length;

  return (
    <section className="flex min-h-0 min-w-0 flex-1 flex-col">
      <PageHeader
        title="SaaStup & Contrats DV"
        tabs={ONGLETS}
        tab={onglet}
        onTab={setOnglet}
        pill={
          <span className="caption-style bg-muted inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border px-2.5 py-0.5 text-xs text-purple-400">
            <Sparkles className="size-3" />
            Lab DigitalVision
          </span>
        }
      />

      {/* Résumé des métriques SaaStup */}
      <div className="grid grid-cols-1 gap-px border-y border-border bg-border sm:grid-cols-3">
        <div className="bg-card p-4">
          <span className="caption-style text-muted-foreground flex items-center gap-1.5">
            <Layers className="size-3.5 text-purple-400" />
            Produits SaaS incubés
          </span>
          <span className="lead-style mt-1 block font-semibold text-foreground">
            {saas.length} solution{saas.length > 1 ? "s" : ""}
          </span>
        </div>

        <div className="bg-card p-4">
          <span className="caption-style text-muted-foreground flex items-center gap-1.5">
            <TrendingUp className="size-3.5 text-trend" />
            Objectif MRR SaaStup
          </span>
          <span className="lead-style mt-1 block font-semibold text-foreground">
            {euros(objectifMrrCumule, true)}{" "}
            <span className="text-muted-foreground text-xs font-normal">
              (actuel : {euros(mrrActuelCumule, true)})
            </span>
          </span>
        </div>

        <div className="bg-card p-4">
          <span className="caption-style text-muted-foreground flex items-center gap-1.5">
            <Briefcase className="size-3.5 text-blue-400" />
            Contrats clients actifs
          </span>
          <span className="lead-style mt-1 block font-semibold text-foreground">
            {contratsActifs} contrat{contratsActifs > 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {onglet === "produits" ? (
        <div className="flex min-h-0 flex-1 flex-col">
          {/* Barre d'actions */}
          <div className="border-border bg-card/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b px-3 sm:px-4 py-2.5 sm:py-3">
            <span className="text-subtle text-xs">
              Nos solutions SaaS propriétaires créées par DigitalVision
            </span>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setModalSaas(true)}
              className="gap-1.5 w-full sm:w-auto justify-center"
            >
              <Plus className="size-3.5" />
              Nouveau SaaS
            </Button>
          </div>

          <ScrollArea className="min-h-0 flex-1 p-4">
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              {saas.map((s) => {
                const jalonsFaits = (s.jalons ?? []).filter((j) => j.termine).length;
                const totalJalons = (s.jalons ?? []).length;
                const pctJalons = totalJalons > 0 ? Math.round((jalonsFaits / totalJalons) * 100) : 0;

                return (
                  <div
                    key={s.id}
                    className="border-line-strong bg-card flex flex-col rounded-xl border p-5 shadow-xs transition-all hover:border-border"
                  >
                    {/* Header carte */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 flex-col gap-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-semibold text-foreground">
                            {s.nom}
                          </h3>
                          {statutBadge(s.statut)}
                        </div>
                        <p className="text-subtle text-xs font-medium">
                          {s.slogan}
                        </p>
                      </div>

                      <div className="flex items-center gap-1">
                        {s.url && (
                          <a
                            href={s.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-muted-foreground hover:text-foreground rounded p-1"
                            title="Ouvrir le site / l'app"
                          >
                            <ExternalLink className="size-4" />
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={() => supprimerSaas(s.id)}
                          className="text-muted-foreground hover:text-red-400 rounded p-1 transition-colors"
                          title="Supprimer ce SaaS"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </div>

                    {/* Description */}
                    <p className="text-muted-foreground mt-3 text-xs leading-relaxed">
                      {s.description}
                    </p>

                    {/* Équipe & Leads */}
                    <div className="border-border bg-secondary/50 mt-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border p-2.5">
                      <div className="flex items-center gap-4 text-xs">
                        <div className="flex items-center gap-1.5" title="Lead Tech">
                          <Avatar nom={s.leadTech} ton="purple" className="size-4 text-[7px]" />
                          <span className="text-subtle">Tech : <strong className="text-foreground">{s.leadTech}</strong></span>
                        </div>
                        <div className="flex items-center gap-1.5" title="Lead Marketing">
                          <Avatar nom={s.leadMarketing} ton="blue" className="size-4 text-[7px]" />
                          <span className="text-subtle">Mktg : <strong className="text-foreground">{s.leadMarketing}</strong></span>
                        </div>
                        <div className="flex items-center gap-1.5" title="Lead Ops">
                          <Avatar nom={s.leadOps} ton="green" className="size-4 text-[7px]" />
                          <span className="text-subtle">Ops : <strong className="text-foreground">{s.leadOps}</strong></span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-xs">
                        <Users className="text-muted-foreground size-3.5" />
                        <span className="font-medium text-foreground">{s.utilisateurs} utilisateurs</span>
                      </div>
                    </div>

                    {/* Roadmap / Jalons */}
                    <div className="mt-4 flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <span className="caption-style text-muted-foreground flex items-center gap-1.5">
                          <CheckCircle2 className="size-3.5 text-purple-400" />
                          Roadmap & Jalons ({jalonsFaits}/{totalJalons})
                        </span>
                        <span className="text-muted-foreground text-xs font-semibold">{pctJalons}%</span>
                      </div>

                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                        <div
                          className="h-full bg-purple-500 transition-all duration-300"
                          style={{ width: `${pctJalons}%` }}
                        />
                      </div>

                      <div className="divide-border mt-1 flex flex-col divide-y rounded-lg border border-border bg-secondary/30">
                        {(s.jalons ?? []).map((j) => (
                          <label
                            key={j.id}
                            className="hover:bg-secondary/60 flex cursor-pointer items-start gap-2.5 p-2 text-xs transition-colors"
                          >
                            <Checkbox
                              checked={j.termine}
                              onCheckedChange={(checked) => {
                                const nouveauxJalons = s.jalons.map((x) =>
                                  x.id === j.id ? { ...x, termine: !!checked } : x,
                                );
                                modifierSaas(s.id, { jalons: nouveauxJalons });
                              }}
                              className="mt-0.5"
                            />
                            <div className="flex min-w-0 flex-1 flex-col">
                              <span className={cn(j.termine && "line-through text-muted-foreground")}>
                                {j.titre}
                              </span>
                              {j.description && (
                                <span className="text-subtle text-[11px]">{j.description}</span>
                              )}
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Documents & Fiches */}
                    <div className="mt-4 flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <span className="caption-style text-muted-foreground flex items-center gap-1.5">
                          <FileText className="size-3.5 text-blue-400" />
                          Documents & Fiches techniques ({(s.documents ?? []).length})
                        </span>
                        <button
                          type="button"
                          onClick={() => setSaasPourDoc(s)}
                          className="text-primary hover:underline flex items-center gap-1 text-xs"
                        >
                          <Plus className="size-3" />
                          Ajouter un document
                        </button>
                      </div>

                      {(s.documents ?? []).length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {s.documents.map((doc) => (
                            <a
                              key={doc.id}
                              href={doc.urlOuContenu.startsWith("http") ? doc.urlOuContenu : "#"}
                              target={doc.urlOuContenu.startsWith("http") ? "_blank" : "_self"}
                              rel="noopener noreferrer"
                              className="border-border bg-secondary/70 hover:border-line-strong flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs transition-colors"
                              title={doc.urlOuContenu}
                            >
                              <FileText className="text-muted-foreground size-3" />
                              <span className="font-medium text-foreground">{doc.titre}</span>
                            </a>
                          ))}
                        </div>
                      ) : (
                        <span className="text-subtle text-xs italic">
                          Aucun document rattaché pour l&apos;instant.
                        </span>
                      )}
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
          <div className="border-border bg-card/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b px-3 sm:px-4 py-2.5 sm:py-3">
            <span className="text-subtle text-xs">
              Conventions, prestations de développement et maintenances DigitalVision
            </span>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setModalContrat(true)}
              className="gap-1.5 w-full sm:w-auto justify-center"
            >
              <Plus className="size-3.5" />
              Nouveau contrat
            </Button>
          </div>

          <ScrollArea className="min-h-0 flex-1 p-4">
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
              <div className="divide-border flex flex-col divide-y rounded-xl border border-border bg-card">
                {contrats.map((c) => (
                  <div
                    key={c.id}
                    className="hover:bg-secondary/40 flex flex-col gap-2 p-4 transition-colors sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-foreground">
                          {c.titre}
                        </span>
                        <span className="bg-secondary text-subtle rounded px-2 py-0.5 text-xs">
                          {typeContratLibelle(c.type)}
                        </span>
                        {statutContratBadge(c.statut)}
                      </div>

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
                        <span>
                          Resp. : {c.responsable}
                        </span>
                      </div>

                      {c.notes && (
                        <p className="text-muted-foreground mt-0.5 text-xs italic">
                          {c.notes}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-4 sm:justify-end">
                      <span className="lead-style font-semibold text-trend tabular-nums">
                        {euros(c.montantFCFA, true)}
                      </span>

                      <button
                        type="button"
                        onClick={() => supprimerContrat(c.id)}
                        className="text-muted-foreground hover:text-red-400 rounded p-1 transition-colors"
                        title="Supprimer ce contrat"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      )}

      <NouveauSaasDialog
        open={modalSaas}
        onOpenChange={setModalSaas}
      />

      <NouveauContratDialog
        open={modalContrat}
        onOpenChange={setModalContrat}
      />

      <NouveauDocumentDialog
        saas={saasPourDoc}
        open={!!saasPourDoc}
        onOpenChange={(open) => !open && setSaasPourDoc(null)}
      />
    </section>
  );
}


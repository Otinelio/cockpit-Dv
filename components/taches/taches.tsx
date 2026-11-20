"use client";

import { useEffect, useMemo, useState } from "react";
import Avatar from "@/components/_ui/avatar";
import Button from "@/components/_ui/button";
import { Checkbox } from "@/components/_ui/checkbox";
import { ScrollArea } from "@/components/_ui/scroll-area";
import Tag from "@/components/_ui/tag";
import CountBadge from "@/components/_ui/count-badge";
import PageHeader from "@/components/_common/page-header";
import NouvelleTacheDialog from "@/components/taches/nouvelle-tache-dialog";
import { useCockpit } from "@/stores/cockpit-store";
import { cn } from "@/lib/utils";
import type { MembreDV, TypeTacheDV } from "@/server/dv-types";
import type { Ton } from "@/server/crm-types";
import { RDV, TYPES_RDV, jourOuvre, type Couleur } from "@/data/agenda";
import {
  Phone,
  MessageCircle,
  FileText,
  Globe,
  Layers,
  Users,
  Briefcase,
  Plus,
  Trash2,
} from "lucide-react";

const ONGLETS = [
  { value: "toutes", label: "Toutes" },
  { value: "a_faire", label: "À faire" },
  { value: "en_cours", label: "En cours" },
  { value: "terminee", label: "Terminées" },
  { value: "agenda", label: "Agenda" },
];

const MEMBRES_EQUIPE: { nom: MembreDV; ton: "purple" | "blue" | "green" }[] = [
  { nom: "Othnelio", ton: "purple" },
  { nom: "Medard", ton: "blue" },
  { nom: "Roméo", ton: "green" },
];

const TONS: Record<Couleur, Ton> = {
  bleu: "blue",
  ambre: "amber",
  vert: "green",
  gris: "neutral",
};
const JOURS = [-2, -1, 0, 1, 2];

function iconeType(type: TypeTacheDV) {
  switch (type) {
    case "appel":
      return <Phone className="size-3.5 text-green-400" />;
    case "prospection":
      return <MessageCircle className="size-3.5 text-emerald-400" />;
    case "devis":
      return <FileText className="size-3.5 text-amber-400" />;
    case "dev_client":
      return <Globe className="size-3.5 text-blue-400" />;
    case "dev_saas":
      return <Layers className="size-3.5 text-purple-400" />;
    case "reunion":
      return <Users className="size-3.5 text-teal-400" />;
    default:
      return <Briefcase className="size-3.5 text-muted-foreground" />;
  }
}

function libelleType(type: TypeTacheDV) {
  switch (type) {
    case "appel":
      return "Appel";
    case "prospection":
      return "Prospection";
    case "devis":
      return "Devis";
    case "dev_client":
      return "Dév Client";
    case "dev_saas":
      return "SaaS";
    case "reunion":
      return "Réunion";
    default:
      return "Gestion";
  }
}

export default function Taches() {
  const [onglet, setOnglet] = useState("toutes");
  const [filtreMembre, setFiltreMembre] = useState<string>("tous");
  const [modalOuverte, setModalOuverte] = useState(false);

  const crm = useCockpit((s) => s.crm);
  const openDetail = useCockpit((s) => s.openDetail);
  const taches = useCockpit((s) => s.taches);
  const chargerTaches = useCockpit((s) => s.chargerTaches);
  const modifierTache = useCockpit((s) => s.modifierTache);
  const supprimerTache = useCockpit((s) => s.supprimerTache);
  const saas = useCockpit((s) => s.saas);
  const chargerSaas = useCockpit((s) => s.chargerSaas);

  useEffect(() => {
    chargerTaches();
    chargerSaas();
  }, [chargerTaches, chargerSaas]);

  const liste = useMemo(() => {
    return taches
      .filter((t) => (onglet === "toutes" ? true : t.statut === onglet))
      .filter((t) => (filtreMembre === "tous" ? true : t.assigneA === filtreMembre))
      .sort((a, b) => {
        if (a.statut === "terminee" && b.statut !== "terminee") return 1;
        if (a.statut !== "terminee" && b.statut === "terminee") return -1;
        return a.echeance.localeCompare(b.echeance);
      });
  }, [taches, onglet, filtreMembre]);

  return (
    <section className="flex min-h-0 min-w-0 flex-1 flex-col">
      <PageHeader
        title="Tâches & Agenda"
        tabs={ONGLETS}
        tab={onglet}
        onTab={setOnglet}
        pill={
          <span className="caption-style bg-muted inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border px-2.5 py-0.5 text-xs text-muted-foreground">
            {taches.filter((t) => t.statut !== "terminee").length} en attente
          </span>
        }
      />

      {onglet === "agenda" ? (
        <ScrollArea orientation="both" className="border-border min-h-0 flex-1 border-t">
          <div className="grid min-h-[calc(100dvh-120px)] min-w-[980px] grid-cols-5 gap-px bg-background p-px">
            {JOURS.map((j) => {
              const date = jourOuvre(j);
              const rdv = RDV.filter((r) => r.j === j).sort((a, b) => a.debut.localeCompare(b.debut));
              return (
                <div
                  key={j}
                  className={cn("flex min-w-0 flex-col outline-1 outline-border", j === 0 && "bg-white/2")}
                >
                  <div className="flex items-center justify-between gap-2 px-4 py-3">
                    <span className="flex items-baseline gap-2">
                      <span className="lead-style font-medium capitalize">
                        {date.toLocaleDateString("fr-FR", { weekday: "long" })}
                      </span>
                      <span className="caption-style text-subtle tabular-nums">
                        {date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                      </span>
                    </span>
                    {j === 0 ? (
                      <Tag tone="green" size="sm">Aujourd&apos;hui</Tag>
                    ) : (
                      <CountBadge>{rdv.length}</CountBadge>
                    )}
                  </div>
                  <div className="flex flex-col gap-2 px-3 pb-3">
                    {rdv.map((r) => {
                      const type = TYPES_RDV[r.type];
                      const e = r.avec ? crm?.entreprises.find((x) => x.nom === r.avec) : undefined;
                      return (
                        <article
                          key={`${r.debut}-${r.titre}`}
                          onClick={() => e && openDetail(e.id)}
                          className={cn(
                            "bg-card flex flex-col gap-2.5 rounded-lg p-3 shadow-[0px_4px_4px_0px_rgba(42,42,42,0.32),0px_0px_0px_1px_#0e0e0e,inset_0px_1px_0px_0px_rgba(255,255,255,0.08),inset_0px_0px_0px_1px_rgba(255,255,255,0.08)] transition-colors duration-150",
                            e && "cursor-pointer hover:bg-[#252525]",
                          )}
                        >
                          <span className="caption-style text-soft tabular-nums">
                            {r.debut} – {r.fin}
                          </span>
                          <span className="flex flex-col gap-1">
                            <span className="leading-[1.25]">{r.titre}</span>
                            {r.avec && <span className="caption-style text-subtle truncate">{r.avec}</span>}
                          </span>
                          <Tag tone={TONS[type.couleur]} size="sm" className="self-start">
                            {type.libelle}
                          </Tag>
                        </article>
                      );
                    })}
                    {rdv.length === 0 && (
                      <span className="caption-style text-subtle border-line-strong flex h-24 items-center justify-center rounded-lg border border-dashed text-xs">
                        Aucun créneau
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      ) : (
        <>
          <div className="border-border bg-card/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-y px-3 sm:px-4 py-2.5 sm:py-3">
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-none w-full sm:w-auto pb-1 sm:pb-0">
              <span className="text-muted-foreground text-xs shrink-0">Assigné à :</span>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => setFiltreMembre("tous")}
                  className={cn(
                    "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                    filtreMembre === "tous"
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-muted-foreground hover:text-foreground",
                  )}
                >
                  Tous
                </button>
                {MEMBRES_EQUIPE.map((m) => (
                  <button
                    key={m.nom}
                    type="button"
                    onClick={() => setFiltreMembre(m.nom)}
                    className={cn(
                      "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                      filtreMembre === m.nom
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <Avatar nom={m.nom} ton={m.ton} className="size-3.5 text-[7px]" />
                    {m.nom}
                  </button>
                ))}
              </div>
            </div>

            <Button
              variant="primary"
              size="sm"
              onClick={() => setModalOuverte(true)}
              className="gap-1.5 w-full sm:w-auto justify-center"
            >
              <Plus className="size-3.5" />
              Nouvelle tâche
            </Button>
          </div>

          <ScrollArea className="min-h-0 flex-1">
            {liste.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-center">
                <p className="text-muted-foreground text-sm">
                  Aucune tâche ne correspond à ce filtre.
                </p>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setModalOuverte(true)}
                  className="mt-3 gap-1.5"
                >
                  <Plus className="size-3.5" />
                  Créer une première tâche
                </Button>
              </div>
            ) : (
              <div className="divide-border flex flex-col divide-y">
                {liste.map((t) => {
                  const estFaite = t.statut === "terminee";
                  const membreObj = MEMBRES_EQUIPE.find((m) => m.nom === t.assigneA);
                  const saasAssocie = saas.find((s) => s.id === t.saasId);

                  return (
                    <div
                      key={t.id}
                      className={cn(
                        "hover:bg-secondary/40 flex flex-col gap-2 p-4 transition-colors sm:flex-row sm:items-center sm:justify-between sm:gap-4",
                        estFaite && "opacity-60",
                      )}
                    >
                      <div className="flex min-w-0 items-start gap-3">
                        <div className="mt-0.5">
                          <Checkbox
                            checked={estFaite}
                            onCheckedChange={(checked) =>
                              modifierTache(t.id, {
                                statut: checked ? "terminee" : "a_faire",
                              })
                            }
                            aria-label={`Marquer ${t.titre} comme terminée`}
                          />
                        </div>

                        <div className="flex min-w-0 flex-1 flex-col gap-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={cn(
                                "text-sm font-medium",
                                estFaite && "line-through text-muted-foreground",
                              )}
                            >
                              {t.titre}
                            </span>

                            <div className="flex items-center gap-1.5">
                              <span
                                className="bg-secondary text-subtle inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px]"
                                title={t.type}
                              >
                                {iconeType(t.type)}
                                {libelleType(t.type)}
                              </span>

                              {t.priorite === "urgente" && (
                                <Tag tone="red">Urgente</Tag>
                              )}
                              {t.priorite === "haute" && (
                                <Tag tone="amber">Haute</Tag>
                              )}
                            </div>
                          </div>

                          {t.description && (
                            <p className="text-muted-foreground line-clamp-2 text-xs">
                              {t.description}
                            </p>
                          )}

                          <div className="text-subtle flex flex-wrap items-center gap-3 text-xs">
                            <span>
                              Échéance :{" "}
                              <strong className="font-medium text-foreground">
                                {t.echeance.split("-").reverse().join("/")}
                              </strong>
                              {t.heure ? ` à ${t.heure}` : ""}
                            </span>

                            {t.nomEntreprise && (
                              <span className="text-primary font-medium">
                                Client : {t.nomEntreprise}
                              </span>
                            )}

                            {saasAssocie && (
                              <span className="text-purple-400 font-medium">
                                SaaS : {saasAssocie.nom}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-3 sm:justify-end">
                        <div
                          className="flex items-center gap-1.5"
                          title={`Assigné à ${t.assigneA}`}
                        >
                          <Avatar
                            nom={t.assigneA}
                            ton={membreObj?.ton ?? "purple"}
                            className="size-6 text-[8px]"
                          />
                          <span className="text-xs font-medium text-soft sm:hidden">
                            {t.assigneA}
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() =>
                              modifierTache(t.id, {
                                statut:
                                  t.statut === "a_faire"
                                    ? "en_cours"
                                    : t.statut === "en_cours"
                                      ? "terminee"
                                      : "a_faire",
                              })
                            }
                            className="text-subtle hover:text-foreground rounded p-1 text-xs"
                          >
                            {t.statut === "a_faire" ? (
                              <span className="text-blue-400">Démarrer</span>
                            ) : t.statut === "en_cours" ? (
                              <span className="text-amber-400">En cours</span>
                            ) : (
                              <span className="text-muted-foreground">Rouvrir</span>
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => supprimerTache(t.id)}
                            className="text-muted-foreground hover:text-red-400 rounded p-1 transition-colors"
                            title="Supprimer la tâche"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>

          <NouvelleTacheDialog
            open={modalOuverte}
            onOpenChange={setModalOuverte}
          />
        </>
      )}
    </section>
  );
}

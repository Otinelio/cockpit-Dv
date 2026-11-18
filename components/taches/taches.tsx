"use client";

import { useEffect, useMemo, useState } from "react";
import Avatar from "@/components/_ui/avatar";
import Button from "@/components/_ui/button";
import { Checkbox } from "@/components/_ui/checkbox";
import { ScrollArea } from "@/components/_ui/scroll-area";
import Tag from "@/components/_ui/tag";
import PageHeader from "@/components/_common/page-header";
import NouvelleTacheDialog from "@/components/taches/nouvelle-tache-dialog";
import { useCockpit } from "@/stores/cockpit-store";
import { cn } from "@/lib/utils";
import type { MembreDV, TypeTacheDV } from "@/server/dv-types";
import { Phone, MessageCircle, FileText, Globe, Layers, Users, Briefcase, Plus, Trash2 } from "lucide-react";

const ONGLETS = [
  { value: "toutes", label: "Toutes" },
  { value: "a_faire", label: "À faire" },
  { value: "en_cours", label: "En cours" },
  { value: "terminee", label: "Terminées" },
];

const MEMBRES_EQUIPE: { nom: MembreDV; ton: "purple" | "blue" | "green" }[] = [
  { nom: "Othnelio", ton: "purple" },
  { nom: "Medard", ton: "blue" },
  { nom: "Roméo", ton: "green" },
];

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
        title="Tâches & Prospections"
        tabs={ONGLETS}
        tab={onglet}
        onTab={setOnglet}
        pill={
          <span className="caption-style bg-muted inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border px-2.5 py-0.5 text-xs text-muted-foreground">
            {taches.filter((t) => t.statut !== "terminee").length} en attente
          </span>
        }
      />

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
              const membre = MEMBRES_EQUIPE.find((m) => m.nom === t.assigneA);
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
                        ton={membre?.ton ?? "purple"}
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
    </section>
  );
}

"use client";

import { useMemo, useState } from "react";
import Button from "@/components/_ui/button";
import { ScrollArea } from "@/components/_ui/scroll-area";
import Tag from "@/components/_ui/tag";
import Avatar from "@/components/_ui/avatar";
import NouvelleDepenseDialog from "@/components/factures/nouvelle-depense-dialog";
import { useCockpit } from "@/stores/cockpit-store";
import { euros } from "@/lib/format";
import type { CategorieDepenseDV } from "@/server/dv-types";
import { Plus, Trash2, TrendingDown, Layers, Server } from "lucide-react";

function libelleCategorie(c: CategorieDepenseDV): { nom: string; ton: "purple" | "blue" | "teal" | "amber" | "red" | "neutral" } {
  switch (c) {
    case "tech":
      return { nom: "Tech & Outils", ton: "purple" };
    case "hebergement":
      return { nom: "VPS & Domaines", ton: "blue" };
    case "marketing":
      return { nom: "Marketing & Pub", ton: "teal" };
    case "deplacements":
      return { nom: "Déplacements", ton: "amber" };
    case "administratif":
      return { nom: "Bureau & Fibre", ton: "neutral" };
    case "retraits":
      return { nom: "Retraits associés", ton: "red" };
    default:
      return { nom: "Autre", ton: "neutral" };
  }
}

export default function DepensesTable() {
  const [modalOuverte, setModalOuverte] = useState(false);
  const [filtreCat, setFiltreCat] = useState<string>("toutes");

  const depenses = useCockpit((s) => s.depenses);
  const supprimerDepense = useCockpit((s) => s.supprimerDepense);

  const total = useMemo(
    () => depenses.reduce((sum, d) => sum + d.montantFCFA, 0),
    [depenses],
  );

  const moisEnCours = new Date().toISOString().slice(0, 7);
  const totalMois = useMemo(
    () =>
      depenses
        .filter((d) => d.date.startsWith(moisEnCours))
        .reduce((sum, d) => sum + d.montantFCFA, 0),
    [depenses, moisEnCours],
  );

  const totalTech = useMemo(
    () =>
      depenses
        .filter((d) => d.categorie === "tech" || d.categorie === "hebergement")
        .reduce((sum, d) => sum + d.montantFCFA, 0),
    [depenses],
  );

  const liste = useMemo(() => {
    return depenses
      .filter((d) => (filtreCat === "toutes" ? true : d.categorie === filtreCat))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [depenses, filtreCat]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Résumé des dépenses */}
      <div className="grid grid-cols-1 gap-px border-b border-border bg-border sm:grid-cols-3">
        <div className="bg-card p-4">
          <span className="caption-style text-muted-foreground flex items-center gap-1.5">
            <TrendingDown className="size-3.5 text-red-400" />
            Total dépenses engagées
          </span>
          <span className="lead-style mt-1 block font-semibold text-foreground">
            {euros(total, true)}
          </span>
        </div>

        <div className="bg-card p-4">
          <span className="caption-style text-muted-foreground flex items-center gap-1.5">
            <Layers className="size-3.5 text-purple-400" />
            Dépenses ce mois
          </span>
          <span className="lead-style mt-1 block font-semibold text-foreground">
            {euros(totalMois, true)}
          </span>
        </div>

        <div className="bg-card p-4">
          <span className="caption-style text-muted-foreground flex items-center gap-1.5">
            <Server className="size-3.5 text-blue-400" />
            Outils tech & Hébergement
          </span>
          <span className="lead-style mt-1 block font-semibold text-foreground">
            {euros(totalTech, true)}
          </span>
        </div>
      </div>

      {/* Barre d'outils */}
      <div className="border-border bg-card/40 flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-xs">Catégorie :</span>
          <select
            value={filtreCat}
            onChange={(e) => setFiltreCat(e.target.value)}
            className="border-line-strong bg-secondary text-foreground rounded-lg border px-2.5 py-1 text-xs outline-none"
          >
            <option value="toutes">Toutes les catégories</option>
            <option value="tech">Tech & Outils dév</option>
            <option value="hebergement">VPS & Domaines</option>
            <option value="marketing">Marketing & Pub</option>
            <option value="deplacements">Déplacements</option>
            <option value="administratif">Bureau & Fibre</option>
            <option value="retraits">Retraits associés</option>
          </select>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => setModalOuverte(true)}
          className="gap-1.5"
        >
          <Plus className="size-3.5" />
          Nouvelle dépense
        </Button>
      </div>

      {/* Liste des dépenses */}
      <ScrollArea className="min-h-0 flex-1">
        {liste.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <p className="text-muted-foreground text-sm">
              Aucune dépense enregistrée dans cette catégorie.
            </p>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setModalOuverte(true)}
              className="mt-3 gap-1.5"
            >
              <Plus className="size-3.5" />
              Ajouter une dépense
            </Button>
          </div>
        ) : (
          <div className="divide-border flex flex-col divide-y">
            {liste.map((d) => {
              const cat = libelleCategorie(d.categorie);
              return (
                <div
                  key={d.id}
                  className="hover:bg-secondary/40 flex flex-col gap-2 p-4 transition-colors sm:flex-row sm:items-center sm:justify-between sm:gap-4"
                >
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium text-foreground">
                        {d.libelle}
                      </span>
                      <Tag tone={cat.ton}>{cat.nom}</Tag>
                    </div>

                    <div className="text-subtle flex flex-wrap items-center gap-3 text-xs">
                      <span>
                        Date :{" "}
                        <strong className="font-medium text-foreground">
                          {d.date.split("-").reverse().join("/")}
                        </strong>
                      </span>
                      {d.note && <span>Note : {d.note}</span>}
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-4 sm:justify-end">
                    <div className="flex items-center gap-1.5" title={`Payé par ${d.payePar}`}>
                      <Avatar
                        nom={d.payePar}
                        ton={d.payePar === "Othnelio" ? "purple" : d.payePar === "Medard" ? "blue" : "green"}
                        className="size-5 text-[8px]"
                      />
                      <span className="text-muted-foreground text-xs">{d.payePar}</span>
                    </div>

                    <span className="lead-style font-semibold text-red-400 tabular-nums">
                      - {euros(d.montantFCFA, true)}
                    </span>

                    <button
                      type="button"
                      onClick={() => supprimerDepense(d.id)}
                      className="text-muted-foreground hover:text-red-400 rounded p-1 transition-colors"
                      title="Supprimer la dépense"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>

      <NouvelleDepenseDialog
        open={modalOuverte}
        onOpenChange={setModalOuverte}
      />
    </div>
  );
}


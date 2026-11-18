"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Avatar from "@/components/_ui/avatar";
import Button from "@/components/_ui/button";
import CountBadge from "@/components/_ui/count-badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/_ui/popover";
import { ScrollArea } from "@/components/_ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/_ui/tabs";
import { api } from "@/lib/api";
import { membre } from "@/lib/cockpit";
import { euros, ilYaJours, joursAvant, joursDepuis, pluriel } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Entreprise } from "@/server/crm-types";
import { useCockpit } from "@/stores/cockpit-store";
import BellIcon from "@/public/assets/images/companies/header/bell.svg";

type Filtre = "toutes" | "non-lues";

type Notif = {
  id: string;
  acteur?: string;
  entreprise?: Entreprise;
  message: string;
  citation?: string;
  quand: string;
  factureId?: number;
};

function Marque({
  entreprise,
  className,
}: {
  entreprise?: Entreprise;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "bg-muted flex shrink-0 items-center justify-center overflow-hidden shadow-[0px_0px_0px_1px_#232323]",
        className,
      )}
    >
      <span className="caption-style text-soft">
        {entreprise?.nom.slice(0, 1) ?? "F"}
      </span>
    </span>
  );
}

export default function Notifications() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [filtre, setFiltre] = useState<Filtre>("toutes");
  const [relance, setRelance] = useState<number | null>(null);
  const navigue = useRef(false);
  const tableau = useCockpit((state) => state.tableau);
  const crm = useCockpit((state) => state.crm);
  const lues = useCockpit((state) => state.lues);
  const marquerLue = useCockpit((state) => state.marquerLue);
  const toutMarquerLu = useCockpit((state) => state.toutMarquerLu);
  const openDetail = useCockpit((state) => state.openDetail);
  const toast = useCockpit((state) => state.toast);
  const charger = useCockpit((state) => state.charger);
  const activites = useCockpit((state) => state.activites);
  const chargerActivites = useCockpit((state) => state.chargerActivites);

  useEffect(() => {
    chargerActivites();
  }, [chargerActivites]);

  const retards = useMemo(
    () =>
      (tableau?.factures ?? [])
        .filter((f) => f.statut === "en_retard")
        .sort((a, b) => (a.echeance ?? "").localeCompare(b.echeance ?? "")),
    [tableau],
  );

  const notifs = useMemo<Notif[]>(() => {
    const liste: Notif[] = [];

    // 1. Activités réelles de l'équipe (Audit Trail)
    for (const a of activites.slice(0, 25)) {
      liste.push({
        id: `act-${a.id}`,
        acteur: a.auteur,
        message: a.titre,
        citation: a.details,
        quand: new Date(a.date).toLocaleDateString("fr-FR", {
          day: "numeric",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        }),
      });
    }

    // 2. Factures en retard
    if (crm) {
      const parPennylane = (id: number | null) =>
        crm.entreprises.find((e) => e.pennylaneId === id);
      for (const f of retards) {
        const retard = -(joursAvant(f.echeance) ?? 0);
        liste.push({
          id: `retard-${f.id}`,
          entreprise: parPennylane(f.clientId),
          message: `Facture ${f.numero} de ${f.client} en retard (${pluriel(retard, "jour")})`,
          quand: `${euros(f.restant)} restant`,
          factureId: f.id,
        });
      }

      // 3. Opportunités gagnées & devis
      for (const e of crm.entreprises) {
        if (e.etape === "Gagné") {
          liste.push({
            id: `gagne-${e.id}`,
            acteur: e.responsable,
            entreprise: e,
            message: `Contrat signé avec ${e.nom}`,
            quand: ilYaJours(e.dernierEchange.date),
          });
        }
        if (e.etape === "Nouveau" && joursDepuis(e.creeLe) <= 14) {
          liste.push({
            id: `nouveau-${e.id}`,
            entreprise: e,
            message: `Nouveau lead : ${e.nom}`,
            citation: e.suite || undefined,
            quand: ilYaJours(e.dernierEchange.date),
          });
        }
      }
    }

    return liste;
  }, [activites, crm, retards]);

  const nonLues = notifs.filter((n) => !lues.includes(n.id));
  const visibles = filtre === "toutes" ? notifs : nonLues;

  function choisir(n: Notif) {
    marquerLue(n.id);
    navigue.current = true;
    setOpen(false);
    if (n.entreprise) openDetail(n.entreprise.id);
    else if (n.factureId) router.push("/factures");
  }

  async function relancerTout() {
    let envoyees = 0;
    setRelance(0);
    for (const f of retards) {
      try {
        await api.envoyer(f.id);
        envoyees++;
      } catch {}
      setRelance(envoyees);
    }
    setRelance(null);
    toutMarquerLu(retards.map((f) => `retard-${f.id}`));
    await charger(true);
    toast({
      ton: envoyees === retards.length ? "succes" : "erreur",
      titre: `${pluriel(envoyees, "relance envoyée", "relances envoyées")}`,
      texte:
        envoyees === retards.length
          ? `${retards.length} clients relancés avec leur lien de paiement.`
          : `${envoyees} / ${retards.length} relances envoyées.`,
    });
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        if (navigue.current) {
          navigue.current = false;
          return;
        }
        setOpen(next);
      }}
    >
      <PopoverTrigger asChild>
        <Button
          variant="secondary"
          size="icon"
          className="relative"
          aria-label={
            nonLues.length
              ? `${nonLues.length} notifications non lues`
              : "Notifications"
          }
        >
          <BellIcon aria-hidden className="size-3.5" />
          {nonLues.length > 0 && (
            <span
              aria-hidden
              className="bg-primary absolute top-1 right-1 size-1.5 rounded-full"
            />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={6}
        className="w-[360px] p-0 sm:w-[400px]"
      >
        <div className="border-border flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="lead-style font-medium">Activités & Alertes</span>
            {nonLues.length > 0 && <CountBadge>{nonLues.length}</CountBadge>}
          </div>
          {nonLues.length > 0 && (
            <button
              type="button"
              onClick={() => toutMarquerLu(notifs.map((n) => n.id))}
              className="caption-style text-primary hover:underline"
            >
              Tout marquer comme lu
            </button>
          )}
        </div>

        <Tabs
          value={filtre}
          onValueChange={(v) => setFiltre(v as Filtre)}
          className="w-full"
        >
          <div className="border-border border-b px-4 pt-2">
            <TabsList className="bg-transparent p-0">
              <TabsTrigger value="toutes" className="relative px-3 py-1.5 text-xs">
                Toutes ({notifs.length})
              </TabsTrigger>
              <TabsTrigger value="non-lues" className="relative px-3 py-1.5 text-xs">
                Non lues ({nonLues.length})
              </TabsTrigger>
            </TabsList>
          </div>

          <ScrollArea className="max-h-[380px]">
            {visibles.length === 0 ? (
              <div className="text-subtle p-8 text-center text-sm">
                Aucune notification pour le moment.
              </div>
            ) : (
              <div className="divide-border flex flex-col divide-y">
                {visibles.map((n) => {
                  const nonLue = !lues.includes(n.id);
                  const m = crm && n.acteur ? membre(crm.equipe, n.acteur) : null;
                  return (
                    <button
                      key={n.id}
                      type="button"
                      onClick={() => choisir(n)}
                      className={cn(
                        "hover:bg-secondary/60 flex items-start gap-3 p-3 text-left transition-colors",
                        nonLue && "bg-secondary/30",
                      )}
                    >
                      {m ? (
                        <Avatar
                          nom={m.nom}
                          ton={m.ton}
                          className="mt-0.5 size-7 text-[9px]"
                        />
                      ) : n.entreprise ? (
                        <Marque
                          entreprise={n.entreprise}
                          className="mt-0.5 size-7 rounded-lg"
                        />
                      ) : (
                        <span className="bg-primary/20 text-primary mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg text-xs font-semibold">
                          DV
                        </span>
                      )}

                      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <div className="flex items-center justify-between gap-1">
                          <span className="truncate text-xs font-medium">
                            {n.acteur ? `${n.acteur} : ` : ""}
                            {n.message}
                          </span>
                          {nonLue && (
                            <span className="bg-primary size-1.5 shrink-0 rounded-full" />
                          )}
                        </div>
                        {n.citation && (
                          <p className="text-subtle line-clamp-2 text-[11px] leading-snug">
                            {n.citation}
                          </p>
                        )}
                        <span className="text-subtle text-[10px]">{n.quand}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </Tabs>

        {retards.length > 0 && (
          <div className="border-border bg-secondary/50 flex items-center justify-between border-t p-3">
            <span className="caption-style text-subtle">
              {retards.length} facture{retards.length > 1 ? "s" : ""} en retard
            </span>
            <Button
              variant="secondary"
              size="sm"
              onClick={relancerTout}
              disabled={relance !== null}
            >
              {relance !== null ? "Envoi..." : "Relancer tout"}
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

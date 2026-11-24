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
import { Tabs, TabsList, TabsTrigger } from "@/components/_ui/tabs";
import { api } from "@/lib/api";
import { membre } from "@/lib/cockpit";
import { euros, ilYaJours, joursAvant, joursDepuis, pluriel } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Entreprise } from "@/server/crm-types";
import { useCockpit } from "@/stores/cockpit-store";
import BellIcon from "@/public/assets/images/companies/header/bell.svg";
import {
  CheckSquare,
  FileSignature,
  Receipt,
  Rocket,
  Trash2,
  RotateCcw,
  Building2,
  CreditCard,
  ChevronRight,
  AlertTriangle,
} from "lucide-react";

type Filtre = "toutes" | "non-lues";

type Notif = {
  id: string;
  acteur?: string;
  entreprise?: Entreprise;
  message: string;
  citation?: string;
  quand: string;
  factureId?: number;
  type?: string;
  categorie?: string;
  action?: string;
  cibleId?: string | number;
  url?: string;
};

function getNotifConfig(n: Notif) {
  const isSuppr = n.action === "suppression" || n.type === "suppression";
  const isRestaur = n.action === "restauration";
  const cat = n.categorie || n.type;

  if (isSuppr) {
    return {
      borderLeft: "border-l-rose-500",
      bgIcon: "bg-rose-500/15 text-rose-400 border border-rose-500/30",
      badgeClass: "bg-rose-500/20 text-rose-300 border-rose-500/30",
      badgeText: "CORBEILLE",
      Icon: Trash2,
    };
  }
  if (isRestaur) {
    return {
      borderLeft: "border-l-cyan-500",
      bgIcon: "bg-cyan-500/15 text-cyan-400 border border-cyan-500/30",
      badgeClass: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
      badgeText: "RESTAURÉ",
      Icon: RotateCcw,
    };
  }

  switch (cat) {
    case "tache":
    case "appel":
      return {
        borderLeft: "border-l-emerald-500",
        bgIcon: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30",
        badgeClass: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
        badgeText: "TÂCHE",
        Icon: CheckSquare,
      };
    case "contrat":
      return {
        borderLeft: "border-l-teal-500",
        bgIcon: "bg-teal-500/15 text-teal-400 border border-teal-500/30",
        badgeClass: "bg-teal-500/20 text-teal-300 border-teal-500/30",
        badgeText: "CONTRAT",
        Icon: FileSignature,
      };
    case "facture":
      return {
        borderLeft: "border-l-amber-500",
        bgIcon: "bg-amber-500/15 text-amber-400 border border-amber-500/30",
        badgeClass: "bg-amber-500/20 text-amber-300 border-amber-500/30",
        badgeText: "FACTURE",
        Icon: Receipt,
      };
    case "saas":
      return {
        borderLeft: "border-l-indigo-500",
        bgIcon: "bg-indigo-500/15 text-indigo-400 border border-indigo-500/30",
        badgeClass: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30",
        badgeText: "SAAS",
        Icon: Rocket,
      };
    case "depense":
      return {
        borderLeft: "border-l-pink-500",
        bgIcon: "bg-pink-500/15 text-pink-400 border border-pink-500/30",
        badgeClass: "bg-pink-500/20 text-pink-300 border-pink-500/30",
        badgeText: "DÉPENSE",
        Icon: CreditCard,
      };
    case "client":
    case "etape":
      return {
        borderLeft: "border-l-blue-500",
        bgIcon: "bg-blue-500/15 text-blue-400 border border-blue-500/30",
        badgeClass: "bg-blue-500/20 text-blue-300 border-blue-500/30",
        badgeText: "CRM",
        Icon: Building2,
      };
    default:
      return {
        borderLeft: "border-l-primary",
        bgIcon: "bg-primary/15 text-primary border border-primary/30",
        badgeClass: "bg-primary/20 text-primary border-primary/30",
        badgeText: "ACTIVITÉ",
        Icon: BellIcon,
      };
  }
}

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

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default function Notifications() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [filtre, setFiltre] = useState<Filtre>("toutes");
  const [relance, setRelance] = useState<number | null>(null);
  const [pushSupporte, setPushSupporte] = useState(false);
  const [pushSouscrit, setPushSouscrit] = useState(false);
  const [pushChargement, setPushChargement] = useState(false);

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

  // Initialisation et statut des notifications Push PWA
  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window
    ) {
      navigator.serviceWorker.ready
        .then(async (reg) => {
          setPushSupporte(true);
          const sub = await reg.pushManager.getSubscription();
          setPushSouscrit(Boolean(sub));
        })
        .catch(() => {});
    }
  }, []);

  async function basculerPush() {
    if (!pushSupporte) return;
    setPushChargement(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      if (pushSouscrit) {
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          await api.notifications.desinscrire(sub.endpoint).catch(() => {});
          await sub.unsubscribe();
        }
        setPushSouscrit(false);
        toast({
          ton: "info",
          titre: "Push PWA désactivé",
          texte: "Vous ne recevrez plus de notifications push sur cet appareil.",
        });
      } else {
        const perm = await Notification.requestPermission();
        if (perm !== "granted") {
          toast({
            ton: "erreur",
            titre: "Permission refusée",
            texte: "Veuillez autoriser les notifications dans les paramètres du navigateur.",
          });
          return;
        }
        const { clePublique } = await api.notifications.clePublique();
        const applicationServerKey = urlBase64ToUint8Array(clePublique);
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey,
        });
        const subJson = sub.toJSON();
        await api.notifications.souscrire({
          endpoint: sub.endpoint,
          keys: {
            p256dh: subJson.keys?.p256dh || "",
            auth: subJson.keys?.auth || "",
          },
          userAgent: navigator.userAgent,
        });
        setPushSouscrit(true);
        toast({
          ton: "succes",
          titre: "Notifications Push activées !",
          texte: "Vous recevrez les alertes instantanées même lorsque Cockpit est en arrière-plan.",
        });
      }
    } catch (err) {
      toast({
        ton: "erreur",
        titre: "Erreur Push",
        texte: (err as Error).message,
      });
    } finally {
      setPushChargement(false);
    }
  }

  async function testerPush() {
    setPushChargement(true);
    try {
      const res = await api.notifications.tester();
      if (res.envoyes > 0) {
        toast({
          ton: "succes",
          titre: "Push de test envoyé !",
          texte: "Regardez les notifications natives de votre appareil.",
        });
      } else {
        toast({
          ton: "info",
          titre: "Aucun appareil abonné",
          texte: "Activez d'abord le bouton Push sur cet appareil.",
        });
      }
    } catch (err) {
      toast({
        ton: "erreur",
        titre: "Erreur de test",
        texte: (err as Error).message,
      });
    } finally {
      setPushChargement(false);
    }
  }

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
    for (const a of activites.slice(0, 40)) {
      let url = a.url;
      if (!url) {
        if (a.type === "contrat") url = a.cibleId ? `/contrats?id=${a.cibleId}` : "/contrats";
        else if (a.type === "facture") url = a.cibleId ? `/factures?id=${a.cibleId}` : "/factures";
        else if (a.type === "client" || a.type === "etape") url = a.cibleId ? `/entreprises?id=${a.cibleId}` : "/entreprises";
        else if (a.type === "tache" || a.type === "appel") url = a.cibleId ? `/taches?id=${a.cibleId}` : "/taches";
        else if (a.type === "depense") url = "/factures";
        else if (a.type === "saas") url = a.cibleId ? `/saas?id=${a.cibleId}` : "/saas";
        else url = "/";
      }

      liste.push({
        id: `act-${a.id}`,
        acteur: a.auteur,
        message: a.titre,
        citation: a.details,
        type: a.type,
        categorie: a.categorie || a.type,
        action: a.action,
        cibleId: a.cibleId,
        url,
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
          type: "facture",
          categorie: "facture",
          action: "relance",
          url: `/factures?id=${f.id}`,
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
            type: "contrat",
            categorie: "contrat",
            action: "validation",
            url: `/entreprises?id=${e.id}`,
          });
        }
        if (e.etape === "Nouveau" && joursDepuis(e.creeLe) <= 14) {
          liste.push({
            id: `nouveau-${e.id}`,
            entreprise: e,
            message: `Nouveau lead : ${e.nom}`,
            citation: e.suite || undefined,
            quand: ilYaJours(e.dernierEchange.date),
            type: "client",
            categorie: "client",
            action: "creation",
            url: `/entreprises?id=${e.id}`,
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

    if (n.url) {
      router.push(n.url);
      if ((n.type === "client" || n.type === "etape" || n.categorie === "client") && (n.cibleId || n.entreprise?.id)) {
        openDetail(String(n.cibleId || n.entreprise?.id));
      }
    } else if (n.entreprise) {
      router.push(`/entreprises?id=${n.entreprise.id}`);
      openDetail(n.entreprise.id);
    } else if (n.factureId) {
      router.push(`/factures?id=${n.factureId}`);
    }
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
        className="w-[calc(100vw-24px)] max-w-[420px] p-0 sm:w-[420px]"
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

        {/* Section Notifications Push PWA */}
        {pushSupporte && (
          <div className="border-border bg-secondary/30 flex items-center justify-between border-b px-4 py-2 text-xs">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "size-2 rounded-full",
                  pushSouscrit ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground/50",
                )}
              />
              <span className="text-foreground font-medium">
                {pushSouscrit ? "Push PWA actif" : "Notifications Push PWA"}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              {pushSouscrit && (
                <button
                  type="button"
                  onClick={testerPush}
                  disabled={pushChargement}
                  className="caption-style text-primary hover:underline px-1 py-0.5"
                >
                  Tester
                </button>
              )}
              <button
                type="button"
                onClick={basculerPush}
                disabled={pushChargement}
                className={cn(
                  "rounded px-2.5 py-1 text-[11px] font-medium transition-colors",
                  pushSouscrit
                    ? "bg-secondary text-subtle hover:text-foreground"
                    : "bg-primary text-primary-foreground hover:bg-primary/90",
                )}
              >
                {pushChargement ? "..." : pushSouscrit ? "Désactiver" : "Activer"}
              </button>
            </div>
          </div>
        )}

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

          {/* Conteneur de défilement fluide et natif */}
          <div className="max-h-[60vh] sm:max-h-[400px] overflow-y-auto overscroll-contain divide-border divide-y pr-0.5">
            {visibles.length === 0 ? (
              <div className="text-subtle p-8 text-center text-sm">
                Aucune notification pour le moment.
              </div>
            ) : (
              <div className="divide-border flex flex-col divide-y">
                {visibles.map((n) => {
                  const nonLue = !lues.includes(n.id);
                  const m = crm && n.acteur ? membre(crm.equipe, n.acteur) : null;
                  const config = getNotifConfig(n);
                  const Icon = config.Icon;

                  return (
                    <button
                      key={n.id}
                      type="button"
                      onClick={() => choisir(n)}
                      className={cn(
                        "group hover:bg-[#1a1a1a] flex items-start gap-3 p-3 text-left transition-colors cursor-pointer border-l-4",
                        config.borderLeft,
                        nonLue ? "bg-[#181818]" : "bg-transparent",
                      )}
                    >
                      {/* Icône thématique ou Avatar avec badge */}
                      <div className="relative mt-0.5 shrink-0">
                        <div
                          className={cn(
                            "flex size-8 shrink-0 items-center justify-center rounded-lg shadow-sm transition-transform group-hover:scale-105",
                            config.bgIcon,
                          )}
                        >
                          <Icon className="size-4" />
                        </div>
                        {m && (
                          <div className="absolute -bottom-1 -right-1 ring-1 ring-[#121212] rounded-full overflow-hidden">
                            <Avatar
                              nom={m.nom}
                              ton={m.ton}
                              className="size-3.5 text-[7px]"
                            />
                          </div>
                        )}
                      </div>

                      <div className="flex min-w-0 flex-1 flex-col gap-1">
                        <div className="flex items-center justify-between gap-1.5">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span
                              className={cn(
                                "text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border leading-none shrink-0",
                                config.badgeClass,
                              )}
                            >
                              {config.badgeText}
                            </span>
                            <span className="truncate text-xs font-semibold text-foreground">
                              {n.acteur ? `${n.acteur} : ` : ""}
                              {n.message}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            {nonLue && (
                              <span className="bg-primary size-1.5 shrink-0 rounded-full animate-pulse" />
                            )}
                            <ChevronRight className="size-3 text-muted-foreground/40 group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
                          </div>
                        </div>

                        {n.citation && (
                          <p className="text-muted-foreground line-clamp-2 text-[11px] leading-snug">
                            {n.citation}
                          </p>
                        )}
                        <span className="text-[10px] text-muted-foreground/70 font-mono">
                          {n.quand}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
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

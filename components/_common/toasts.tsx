"use client";

import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useCockpit, type Toast } from "@/stores/cockpit-store";
import XIcon from "@/public/assets/images/companies/detail/x.svg";
import {
  CheckSquare,
  FileSignature,
  Receipt,
  Rocket,
  Trash2,
  RotateCcw,
  Check,
  AlertTriangle,
  Bell,
  ExternalLink,
  CreditCard,
  Building2,
} from "lucide-react";

type StyleToast = {
  border: string;
  bgIcon: string;
  textIcon: string;
  badgeBg: string;
  badgeText: string;
  label: string;
  icon: typeof Check;
};

function getStyle(t: Toast): StyleToast {
  const cat = t.categorie || t.ton;
  switch (cat) {
    case "tache":
      return {
        border: "border-emerald-500/50 shadow-emerald-950/20",
        bgIcon: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30",
        textIcon: "text-emerald-400",
        badgeBg: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
        badgeText: "TÂCHE",
        label: "Tâche",
        icon: CheckSquare,
      };
    case "contrat":
      return {
        border: "border-teal-500/50 shadow-teal-950/20",
        bgIcon: "bg-teal-500/15 text-teal-400 border border-teal-500/30",
        textIcon: "text-teal-400",
        badgeBg: "bg-teal-500/20 text-teal-300 border-teal-500/30",
        badgeText: "CONTRAT",
        label: "Contrat",
        icon: FileSignature,
      };
    case "facture":
      return {
        border: "border-amber-500/50 shadow-amber-950/20",
        bgIcon: "bg-amber-500/15 text-amber-400 border border-amber-500/30",
        textIcon: "text-amber-400",
        badgeBg: "bg-amber-500/20 text-amber-300 border-amber-500/30",
        badgeText: "FINANCE",
        label: "Facture",
        icon: Receipt,
      };
    case "saas":
      return {
        border: "border-indigo-500/50 shadow-indigo-950/20",
        bgIcon: "bg-indigo-500/15 text-indigo-400 border border-indigo-500/30",
        textIcon: "text-indigo-400",
        badgeBg: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30",
        badgeText: "SAAS",
        label: "SaaS",
        icon: Rocket,
      };
    case "depense":
      return {
        border: "border-pink-500/50 shadow-pink-950/20",
        bgIcon: "bg-pink-500/15 text-pink-400 border border-pink-500/30",
        textIcon: "text-pink-400",
        badgeBg: "bg-pink-500/20 text-pink-300 border-pink-500/30",
        badgeText: "DÉPENSE",
        label: "Dépense",
        icon: CreditCard,
      };
    case "suppression":
      return {
        border: "border-rose-500/60 shadow-rose-950/30",
        bgIcon: "bg-rose-500/15 text-rose-400 border border-rose-500/30",
        textIcon: "text-rose-400",
        badgeBg: "bg-rose-500/20 text-rose-300 border-rose-500/30",
        badgeText: "SUPPRESSION",
        label: "Corbeille",
        icon: Trash2,
      };
    case "restauration":
      return {
        border: "border-cyan-500/50 shadow-cyan-950/20",
        bgIcon: "bg-cyan-500/15 text-cyan-400 border border-cyan-500/30",
        textIcon: "text-cyan-400",
        badgeBg: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
        badgeText: "RESTAURÉ",
        label: "Restauré",
        icon: RotateCcw,
      };
    case "client":
      return {
        border: "border-blue-500/50 shadow-blue-950/20",
        bgIcon: "bg-blue-500/15 text-blue-400 border border-blue-500/30",
        textIcon: "text-blue-400",
        badgeBg: "bg-blue-500/20 text-blue-300 border-blue-500/30",
        badgeText: "CLIENT",
        label: "Client",
        icon: Building2,
      };
    case "erreur":
      return {
        border: "border-red-500/60 shadow-red-950/30",
        bgIcon: "bg-red-500/15 text-red-400 border border-red-500/30",
        textIcon: "text-red-400",
        badgeBg: "bg-red-500/20 text-red-300 border-red-500/30",
        badgeText: "ERREUR",
        label: "Erreur",
        icon: AlertTriangle,
      };
    case "succes":
      return {
        border: "border-emerald-500/40 shadow-emerald-950/20",
        bgIcon: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30",
        textIcon: "text-emerald-400",
        badgeBg: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
        badgeText: "SUCCÈS",
        label: "Succès",
        icon: Check,
      };
    default:
      return {
        border: "border-[#333] shadow-black/40",
        bgIcon: "bg-primary/10 text-primary border border-primary/20",
        textIcon: "text-primary",
        badgeBg: "bg-primary/20 text-primary border-primary/30",
        badgeText: "INFO",
        label: "Info",
        icon: Bell,
      };
  }
}

export default function Toasts() {
  const router = useRouter();
  const toasts = useCockpit((state) => state.toasts);
  const retirer = useCockpit((state) => state.retirerToast);

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed right-4 bottom-4 z-[99] flex w-[min(380px,calc(100vw-2rem))] flex-col gap-2.5"
    >
      {toasts.map((t) => {
        const style = getStyle(t);
        const Icon = style.icon;

        return (
          <div
            key={t.id}
            role={t.ton === "erreur" || t.ton === "suppression" ? "alert" : "status"}
            onClick={() => {
              if (t.url) {
                router.push(t.url);
                retirer(t.id);
              }
            }}
            className={cn(
              "bg-[#161616]/95 backdrop-blur-md shadow-2xl animate-in fade-in-0 slide-in-from-bottom-2 ease-power3-out pointer-events-auto flex items-start gap-3 rounded-xl border p-3.5 duration-300 transition-all",
              style.border,
              t.url && "cursor-pointer hover:bg-[#1a1a1a]",
            )}
          >
            {/* Icône thématique */}
            <div
              className={cn(
                "flex size-8 shrink-0 items-center justify-center rounded-lg mt-0.5",
                style.bgIcon,
              )}
            >
              <Icon className="size-4" />
            </div>

            {/* Contenu textuel & Badge */}
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span
                  className={cn(
                    "text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border leading-none",
                    style.badgeBg,
                  )}
                >
                  {style.badgeText}
                </span>
                <span className="text-xs font-semibold text-foreground truncate">
                  {t.titre}
                </span>
              </div>
              {t.texte && (
                <span className="text-[11px] text-muted-foreground leading-snug line-clamp-2">
                  {t.texte}
                </span>
              )}
              {t.url && (
                <span className="inline-flex items-center gap-1 text-[10px] text-primary/80 hover:text-primary font-medium mt-0.5">
                  Voir le détail <ExternalLink className="size-2.5" />
                </span>
              )}
            </div>

            {/* Bouton de fermeture */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                retirer(t.id);
              }}
              aria-label="Fermer"
              className="text-muted-foreground hover:text-foreground -mt-0.5 -mr-1 cursor-pointer rounded-full p-1 transition-colors hover:bg-white/10"
            >
              <XIcon aria-hidden className="size-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

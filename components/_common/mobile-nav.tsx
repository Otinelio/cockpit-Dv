"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCockpit } from "@/stores/cockpit-store";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Building2,
  FileCheck,
  Wallet,
  CheckSquare,
  Briefcase,
} from "lucide-react";

export default function MobileNav() {
  const pathname = usePathname();
  const taches = useCockpit((s) => s.taches);
  const contrats = useCockpit((s) => s.contrats);

  const tachesEnAttente = taches.filter((t) => t.statut !== "terminee").length;
  const contratsActifs = contrats.filter((c) => c.statut === "actif").length;

  const ONGLETS = [
    {
      href: "/",
      label: "Cockpit",
      icon: LayoutDashboard,
      actif: pathname === "/",
    },
    {
      href: "/hub",
      label: "Hub",
      icon: Briefcase,
      actif: pathname.startsWith("/hub"),
    },
    {
      href: "/entreprises",
      label: "CRM",
      icon: Building2,
      actif: pathname.startsWith("/entreprises"),
    },
    {
      href: "/contrats",
      label: "Contrats",
      icon: FileCheck,
      count: contratsActifs > 0 ? contratsActifs : undefined,
      actif: pathname.startsWith("/contrats"),
    },
    {
      href: "/factures",
      label: "Finances",
      icon: Wallet,
      actif: pathname.startsWith("/factures"),
    },
    {
      href: "/taches",
      label: "Tâches",
      icon: CheckSquare,
      count: tachesEnAttente > 0 ? tachesEnAttente : undefined,
      actif: pathname.startsWith("/taches"),
    },
  ];

  return (
    <nav
      aria-label="Navigation mobile principale"
      className="fixed bottom-0 inset-x-0 z-40 flex items-center justify-around border-t border-border bg-[#141414]/95 pb-[max(env(safe-area-inset-bottom),8px)] pt-2 backdrop-blur-lg lg:hidden"
    >
      {ONGLETS.map((item) => {
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "relative flex flex-1 flex-col items-center gap-1 py-1 text-center transition-colors",
              item.actif
                ? "text-primary font-medium"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <div className="relative">
              <Icon
                className={cn(
                  "size-5 transition-transform",
                  item.actif ? "scale-110 text-primary" : "text-subtle",
                )}
              />
              {item.count !== undefined && (
                <span className="bg-primary text-primary-foreground absolute -top-1.5 -right-2.5 flex size-4 items-center justify-center rounded-full text-[9px] font-bold">
                  {item.count > 99 ? "99+" : item.count}
                </span>
              )}
            </div>
            <span className="text-[10px] tracking-tight">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}


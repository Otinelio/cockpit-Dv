"use client";

import { useMemo } from "react";
import SegmentBar from "@/components/_common/segment-bar";
import { euros, pluriel } from "@/lib/format";
import type { ClientResume } from "@/server/types";

// Mode local : la carte de France ne sert à rien à Lomé, on classe les clients facturés par ville.
export default function ClientsParVille({ clients }: { clients: ClientResume[] | null }) {
  const villes = useMemo(() => {
    const par = new Map<string, { ville: string; montant: number; clients: number }>();
    for (const c of clients ?? []) {
      if (c.ca12 <= 0) continue;
      const ville = c.ville || "Ville non renseignée";
      const v = par.get(ville) ?? { ville, montant: 0, clients: 0 };
      v.montant += c.ca12;
      v.clients += 1;
      par.set(ville, v);
    }
    return [...par.values()].sort((a, b) => b.montant - a.montant).slice(0, 6);
  }, [clients]);
  const max = villes[0]?.montant ?? 1;
  const actifs = villes.reduce((s, v) => s + v.clients, 0);

  return (
    <section className="flex min-w-0 flex-col gap-5 p-4 outline-1 outline-border">
      <div className="flex h-[30px] items-center justify-between gap-2">
        <h2 className="eyebrow-style font-normal">Clients par ville</h2>
      </div>
      <div className="flex flex-col gap-1.5">
        <span className="block text-[28px] leading-none font-semibold tracking-[-0.01em] tabular-nums">
          {clients ? pluriel(actifs, "client") : "—"}
        </span>
        <span className="caption-style text-soft block">facturés sur 12 mois</span>
      </div>
      <ul className="flex flex-col gap-3">
        {villes.map((v) => (
          <li key={v.ville} className="flex flex-col gap-1.5">
            <span className="flex items-baseline justify-between gap-2">
              <span>{v.ville}</span>
              <span className="caption-style text-soft tabular-nums">
                {euros(v.montant)} · {pluriel(v.clients, "client")}
              </span>
            </span>
            <SegmentBar
              percent={(v.montant / max) * 100}
              segments={48}
              className="h-3 w-full border border-white/4 px-px"
              segmentClassName="h-2"
              trackClassName="bg-white/8"
            />
          </li>
        ))}
        {clients && villes.length === 0 && (
          <li className="caption-style text-subtle">Aucun client facturé sur 12 mois.</li>
        )}
      </ul>
    </section>
  );
}

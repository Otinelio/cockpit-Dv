import type { ComponentType, SVGProps } from "react";
import Sparkline from "@/components/_common/sparkline";
import { activite } from "@/lib/cockpit";
import { ilYaJours } from "@/lib/format";
import type { Entreprise } from "@/server/crm-types";
import CursorClickIcon from "@/public/assets/images/companies/detail/cursor-click.svg";
import MailIcon from "@/public/assets/images/companies/detail/mail-03.svg";
import CalendarIcon from "@/public/assets/images/companies/detail/calendar.svg";
import PhoneCallIcon from "@/public/assets/images/companies/detail/phone-call.svg";

type ActivityTrendProps = {
  company: Entreprise;
};

type Stat = {
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  label: string;
  value: number;
};

export default function ActivityTrend({ company }: ActivityTrendProps) {
  const a = activite(company);
  const stats: Stat[] = [
    { icon: CursorClickIcon, label: "Échanges", value: a.total },
    { icon: MailIcon, label: "E-mails", value: a.emails },
    { icon: CalendarIcon, label: "Rendez-vous", value: a.rendezVous },
    { icon: PhoneCallIcon, label: "Appels", value: a.appels },
  ];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <div className="flex items-baseline gap-[3px]">
          <span className="block text-[24px] leading-none font-bold tabular-nums">
            {a.total}
          </span>
          <span className="text-xs text-subtle ml-1">
            {a.total <= 1 ? "interaction enregistrée" : "interactions enregistrées"}
          </span>
          {a.total > 1 && (
            <Sparkline
              values={company.tendance}
              className="h-[22px] ml-auto"
              anime={{ delai: 250, pas: 25 }}
            />
          )}
        </div>
        <span className="caption-style block text-soft">
          Dernier échange {ilYaJours(company.dernierEchange.date)} :{" "}
          <strong className="text-foreground">{company.dernierEchange.libelle}</strong>
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="flex flex-col gap-2 rounded-lg border border-border bg-card p-2.5"
          >
            <span className="caption-style flex items-center gap-1 text-subtle text-[11px]">
              <stat.icon aria-hidden className="size-3 shrink-0" />
              {stat.label}
            </span>
            <span className="text-base font-semibold block tabular-nums text-foreground">
              {stat.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

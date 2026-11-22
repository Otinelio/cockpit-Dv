import SegmentBar from "@/components/_common/segment-bar";
import Tag from "@/components/_ui/tag";
import { euros, ilYaJours, joursDepuis } from "@/lib/format";
import type { Entreprise } from "@/server/crm-types";
import { AlertTriangle, CheckCircle2, Clock } from "lucide-react";

type PipelineHealthProps = {
  company: Entreprise;
};

export default function PipelineHealth({ company }: PipelineHealthProps) {
  // 1. Calcul de la fraîcheur relationnelle (jours depuis le dernier contact)
  const joursSansEchange = company.dernierEchange?.date
    ? joursDepuis(company.dernierEchange.date)
    : 999;

  let fraicheur = 100;
  let fraicheurTon: "success" | "warning" | "danger" = "success";
  if (joursSansEchange <= 3) {
    fraicheur = 100;
    fraicheurTon = "success";
  } else if (joursSansEchange <= 7) {
    fraicheur = 80;
    fraicheurTon = "success";
  } else if (joursSansEchange <= 14) {
    fraicheur = 55;
    fraicheurTon = "warning";
  } else if (joursSansEchange <= 30) {
    fraicheur = 30;
    fraicheurTon = "danger";
  } else {
    fraicheur = 10;
    fraicheurTon = "danger";
  }

  // 2. Complétude des coordonnées & qualification
  let scoreContact = 0;
  if (company.contact?.telephone) scoreContact += 40;
  if (company.contact?.email) scoreContact += 30;
  if (company.contact?.nom) scoreContact += 15;
  if (company.ville) scoreContact += 15;
  const contactTon: "success" | "warning" | "danger" =
    scoreContact >= 70 ? "success" : scoreContact >= 40 ? "warning" : "danger";

  // 3. Probabilité réelle de conversion & maturité
  const proba = company.chances;
  const probaTon: "success" | "warning" | "danger" =
    proba >= 70 ? "success" : proba >= 40 ? "warning" : "danger";

  // 4. Score Global de Santé Commerciale (0 à 100)
  let scoreGlobal = Math.round(fraicheur * 0.4 + scoreContact * 0.3 + proba * 0.3);
  if (company.etape === "Gagné" || company.etape === "Client") scoreGlobal = 100;
  if (company.etape === "Perdu") scoreGlobal = 0;

  const etatSante =
    scoreGlobal >= 75
      ? { label: "Santé excellente", ton: "green" as const, desc: "Deal actif, coordonnées complètes et contact régulier." }
      : scoreGlobal >= 45
        ? { label: "Santé moyenne", ton: "amber" as const, desc: "Opportunité en cours mais à relancer ou à qualifier." }
        : { label: "Deal à risque", ton: "red" as const, desc: "Stagnation ou manque d'actions de contact récentes." };

  const valeurPonderee = Math.round((company.pipeline * company.chances) / 100);

  const piliers = [
    {
      label: "Fraîcheur des échanges",
      valeur: fraicheur,
      texte: `${joursSansEchange === 0 ? "Aujourd'hui" : `Il y a ${joursSansEchange} j`} (${company.dernierEchange?.libelle ?? "Création"})`,
      ton: fraicheurTon,
    },
    {
      label: "Complétude & Qualification",
      valeur: scoreContact,
      texte: `${scoreContact}% des données clés renseignées`,
      ton: contactTon,
    },
    {
      label: "Chances de signature",
      valeur: proba,
      texte: `${company.chances}% • Étape : ${company.etape}`,
      ton: probaTon,
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* En-tête Score Réel */}
      <div className="flex items-start justify-between gap-3 rounded-xl border border-border bg-card p-3.5">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold tabular-nums text-foreground">
              {scoreGlobal} / 100
            </span>
            <Tag tone={etatSante.ton} size="sm">
              {etatSante.label}
            </Tag>
          </div>
          <span className="text-xs text-subtle">{etatSante.desc}</span>
        </div>

        {company.pipeline > 0 && (
          <div className="flex flex-col items-end gap-0.5 text-right">
            <span className="text-[11px] font-medium text-subtle">Valeur pondérée</span>
            <span className="text-sm font-bold text-trend tabular-nums">
              {euros(valeurPonderee, true)}
            </span>
            <span className="text-[10px] text-muted-foreground">
              sur {euros(company.pipeline, true)} espérés
            </span>
          </div>
        )}
      </div>

      {/* Piliers de santé réels avec barres */}
      <div className="flex flex-col gap-3">
        {piliers.map((p, i) => (
          <div key={p.label} className="flex flex-col gap-1.5">
            <div className="caption-style flex items-center justify-between text-xs">
              <span className="font-medium text-foreground">{p.label}</span>
              <span className="text-subtle tabular-nums">{p.texte}</span>
            </div>
            <SegmentBar
              percent={p.valeur}
              segments={48}
              tone={p.ton}
              className="h-2.5 w-full border border-white/4 px-px"
              segmentClassName="h-1.5"
              trackClassName="bg-white/8"
              anime={{ delai: 150 + i * 100, pas: 6 }}
            />
          </div>
        ))}
      </div>

      {/* Recommandation concrète */}
      <div className="flex items-start gap-2 rounded-lg border border-border/80 bg-secondary/40 p-2.5 text-xs text-soft">
        {scoreGlobal >= 75 ? (
          <CheckCircle2 className="size-4 shrink-0 text-emerald-400 mt-0.5" />
        ) : scoreGlobal >= 45 ? (
          <Clock className="size-4 shrink-0 text-amber-400 mt-0.5" />
        ) : (
          <AlertTriangle className="size-4 shrink-0 text-rose-400 mt-0.5" />
        )}
        <div>
          {joursSansEchange > 7 ? (
            <span>
              <strong className="text-foreground">Relance nécessaire :</strong> Aucun échange n&apos;a eu lieu depuis {ilYaJours(company.dernierEchange.date)}.
            </span>
          ) : company.suite ? (
            <span>
              <strong className="text-foreground">Prochaine action :</strong> {company.suite}
            </span>
          ) : (
            <span>
              <strong className="text-foreground">Conseil :</strong> Définis une action concrète dans &quot;Ce qu&apos;il reste à faire&quot; pour garder le rythme.
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

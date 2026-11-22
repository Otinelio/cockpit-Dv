import {
  ETAPES,
  type Entreprise,
  type Etape,
  type Membre,
  type Segment,
  type Ton,
} from "@/server/crm-types";
import { joursDepuis } from "@/lib/format";

export const SEGMENT_TONS: Record<Segment, Ton> = {
  Restaurant: "orange",
  Hôtel: "blue",
  Particulier: "teal",
  PME: "moss",
  TPE: "yellow",
  "Boutique & Commerce": "amber",
  "Atelier & Artisanat": "purple",
  "Santé & Clinique": "green",
  "École & Formation": "blue",
  "Grand compte": "blue",
  Indépendant: "purple",
  Autre: "neutral",
};

export const ETAPE_TONS: Record<Etape, Ton> = {
  Nouveau: "teal",
  Contacté: "neutral",
  "Rendez-vous": "orange",
  "Devis envoyé": "amber",
  Gagné: "green",
  Client: "green",
  Perdu: "red",
};

const ETIQUETTE_TONS: Record<string, Ton> = {
  "Prospection terrain": "teal",
  WhatsApp: "green",
  "Recommandation / Réseau": "blue",
  Recommandation: "blue",
  "Appel téléphonique": "green",
  Instagram: "red",
  TikTok: "purple",
  Facebook: "blue",
  LinkedIn: "blue",
  "Site web / Formulaire": "neutral",
  "Site web": "neutral",
  "Bouche-à-oreille": "amber",
  "Événement / Salon": "orange",
  Salon: "orange",
  Récurrent: "purple",
  Upsell: "purple",
  Autre: "neutral",
};

export const ETAPES_PIPELINE: Etape[] = [
  "Nouveau",
  "Contacté",
  "Rendez-vous",
  "Devis envoyé",
  "Gagné",
];

export const ETAPE_POINTS: Record<Etape, string> = {
  Nouveau: "bg-(--tag-teal-text)",
  Contacté: "bg-chip",
  "Rendez-vous": "bg-(--tag-orange-text)",
  "Devis envoyé": "bg-(--tag-amber-text)",
  Gagné: "bg-success",
  Client: "bg-success",
  Perdu: "bg-danger",
};

export type Etiquette = { libelle: string; ton: Ton };

export function etiquettes(e: Entreprise): Etiquette[] {
  return [
    { libelle: e.segment, ton: SEGMENT_TONS[e.segment] ?? ("neutral" as Ton) },
    { libelle: e.etape, ton: ETAPE_TONS[e.etape] ?? ("neutral" as Ton) },
    ...e.etiquettes.map((libelle) => ({
      libelle,
      ton: ETIQUETTE_TONS[libelle] ?? ("neutral" as Ton),
    })),
  ];
}

const BUDGET_CARACTERES = 22;

export function partagerEtiquettes(liste: Etiquette[]) {
  let pris = 0;
  const visibles: Etiquette[] = [];
  for (const e of liste) {
    if (visibles.length === 2 || pris + e.libelle.length > BUDGET_CARACTERES)
      break;
    visibles.push(e);
    pris += e.libelle.length;
  }
  if (visibles.length === 0 && liste.length > 0) visibles.push(liste[0]);
  return { visibles, cachees: liste.length - visibles.length };
}

export type Tri = "pipeline" | "nom" | "echange" | "affaires" | "chances";
export type Vue = "toutes" | "prospects" | "clients" | "pipeline";

export const TOUS = "tous";
export const TOUTES = "toutes";

export type FiltresCrm = {
  tri: Tri;
  responsable: string;
  etape: string;
  fenetre: number;
};

export const FILTRES_DEFAUT: FiltresCrm = {
  tri: "pipeline",
  responsable: TOUS,
  etape: TOUTES,
  fenetre: 90,
};

export function nombreFiltres({ responsable, etape, fenetre }: FiltresCrm) {
  return [
    responsable !== FILTRES_DEFAUT.responsable,
    etape !== FILTRES_DEFAUT.etape,
    fenetre !== FILTRES_DEFAUT.fenetre,
  ].filter(Boolean).length;
}

export function estProspect(e: Entreprise) {
  return e.etape !== "Client";
}

export function filtrer(
  entreprises: Entreprise[],
  { tri, responsable, etape, fenetre }: FiltresCrm,
  vue: Vue = "toutes",
): Entreprise[] {
  const liste = entreprises.filter((e) => {
    if (vue === "prospects" && !estProspect(e)) return false;
    if (vue === "clients" && estProspect(e)) return false;
    if (responsable !== TOUS && e.responsable !== responsable) return false;
    if (etape !== TOUTES && e.etape !== etape) return false;
    return fenetre === 0 || joursDepuis(e.dernierEchange.date) <= fenetre;
  });
  return liste.sort((a, b) => {
    switch (tri) {
      case "nom":
        return a.nom.localeCompare(b.nom, "fr");
      case "echange":
        return b.dernierEchange.date.localeCompare(a.dernierEchange.date);
      case "affaires":
        return b.affaires - a.affaires;
      case "chances":
        return b.chances - a.chances;
      default:
        return b.pipeline - a.pipeline;
    }
  });
}

export function lignesCsv(entreprises: Entreprise[]) {
  return [
    [
      "Entreprise",
      "Segment",
      "Étape",
      "Étiquettes",
      "Responsable",
      "Ville",
      "Contact",
      "E-mail",
      "Affaires",
      "Pipeline (FCFA HT)",
      "Chances de signer (%)",
      "Dernier échange",
      "Date du dernier échange",
      "Suite",
    ],
    ...entreprises.map((e) => [
      e.nom,
      e.segment,
      e.etape,
      e.etiquettes.join("; "),
      e.responsable,
      e.ville ?? "",
      e.contact?.nom ?? "",
      e.contact?.email ?? "",
      e.affaires,
      e.pipeline,
      e.chances,
      e.dernierEchange.libelle,
      e.dernierEchange.date,
      e.suite,
    ]),
  ];
}

export function avancement(e: Entreprise) {
  const rang = ETAPES.indexOf(e.etape);
  if (e.etape === "Perdu") return { decouverte: 0, proposition: 0, signature: 0 };
  const decouverte = rang >= 2 ? 100 : rang === 1 ? 60 : 20;
  const proposition = rang >= 4 ? 100 : rang === 3 ? 70 : rang === 2 ? 35 : 0;
  const signature = rang >= 4 ? 100 : rang === 3 ? e.chances : 0;
  return { decouverte, proposition, signature };
}

export function activite(e: Entreprise) {
  const total = (e.tendance ?? []).reduce((s, v) => s + v, 0);
  if (total <= 0) {
    return { total: 0, emails: 0, rendezVous: 0, appels: 0 };
  }
  const lib = (e.dernierEchange?.libelle ?? "").toLowerCase();
  const estEmail = lib.includes("mail");
  const estRdv = lib.includes("rendez-vous") || lib.includes("réunion") || lib.includes("visite") || lib.includes("rdv");
  const estAppel = lib.includes("appel") || lib.includes("téléphone");

  if (total === 1) {
    return {
      total: 1,
      emails: estEmail ? 1 : 0,
      rendezVous: estRdv ? 1 : 0,
      appels: estAppel ? 1 : 0,
    };
  }

  return {
    total,
    emails: Math.min(total, (estEmail ? 1 : 0) + Math.max(0, Math.floor((total - 1) * 0.4))),
    rendezVous: Math.min(total, (estRdv ? 1 : 0) + Math.max(0, Math.floor((total - 1) * 0.2))),
    appels: Math.min(total, (estAppel ? 1 : 0) + Math.max(0, Math.floor((total - 1) * 0.3))),
  };
}

export function membre(equipe: Membre[], nom: string): Membre {
  return (
    equipe.find((m) => m.nom === nom) ?? {
      nom,
      role: "",
      email: "",
      telephone: "",
      ton: "neutral",
    }
  );
}

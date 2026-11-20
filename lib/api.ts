import type { Crm, Entreprise } from "@/server/crm-types";
import type {
  ActiviteDV,
  ContratDV,
  DepenseDV,
  SaasDV,
  TacheDV,
} from "@/server/dv-types";
import type { NouvelleFacture, Tableau } from "@/server/types";

function getAuteur(): string {
  if (typeof window !== "undefined") {
    return localStorage.getItem("cockpit_dv_user") || "Othnelio";
  }
  return "Othnelio";
}

async function appel<T>(chemin: string, init?: RequestInit): Promise<T> {
  const auteur = getAuteur();
  const res = await fetch(chemin, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "x-auteur": encodeURIComponent(auteur),
      ...init?.headers,
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      (data as { erreur?: string }).erreur ?? `Erreur ${res.status}`,
    );
  }
  return data as T;
}

const poster = <T>(chemin: string, corps?: unknown) =>
  appel<T>(chemin, { method: "POST", body: JSON.stringify(corps ?? {}) });

const modifier = <T>(chemin: string, corps?: unknown) =>
  appel<T>(chemin, { method: "PUT", body: JSON.stringify(corps ?? {}) });

const supprimer = <T>(chemin: string) =>
  appel<T>(chemin, { method: "DELETE" });

export type ModifEntreprise = Partial<
  Omit<Entreprise, "id" | "pennylaneId" | "creeLe" | "tendance">
>;

export const api = {
  // Auth
  connexion: (nom: string, motDePasse: string) =>
    poster<{ ok: boolean; nom: string }>("/api/auth/connexion", { nom, motDePasse }),
  changerMotDePasse: (nom: string, ancien: string, nouveau: string) =>
    poster<{ ok: boolean }>("/api/auth/changer-mot-de-passe", { nom, ancien, nouveau }),

  // Activité / Audit Trail
  activites: () => appel<ActiviteDV[]>("/api/activite"),
  enregistrerActivite: (act: { type: string; titre: string; details?: string; cibleId?: string | number }) =>
    poster<ActiviteDV>("/api/activite", act),

  // Tâches & Prospections
  taches: () => appel<TacheDV[]>("/api/taches"),
  ajouterTache: (t: Omit<TacheDV, "id" | "creeeLe">) => poster<TacheDV>("/api/taches", t),
  modifierTache: (id: string, modifs: Partial<TacheDV>) => modifier<TacheDV>(`/api/taches/${id}`, modifs),
  supprimerTache: (id: string) => supprimer<{ ok: true }>(`/api/taches/${id}`),

  // Dépenses
  depenses: () => appel<DepenseDV[]>("/api/depenses"),
  ajouterDepense: (d: Omit<DepenseDV, "id" | "creeeLe">) => poster<DepenseDV>("/api/depenses", d),
  supprimerDepense: (id: string) => supprimer<{ ok: true }>(`/api/depenses/${id}`),

  // SaaS
  saas: () => appel<SaasDV[]>("/api/saas"),
  ajouterSaas: (s: Omit<SaasDV, "id" | "creeLe" | "misAJourLe">) => poster<SaasDV>("/api/saas", s),
  modifierSaas: (id: string, modifs: Partial<SaasDV>) => modifier<SaasDV>(`/api/saas/${id}`, modifs),
  supprimerSaas: (id: string) => supprimer<{ ok: true }>(`/api/saas/${id}`),

  // Contrats
  contrats: () => appel<ContratDV[]>("/api/contrats"),
  ajouterContrat: (c: Omit<ContratDV, "id" | "creeLe">) => poster<ContratDV>("/api/contrats", c),
  modifierContrat: (id: string, modifs: Partial<ContratDV>) => modifier<ContratDV>(`/api/contrats/${id}`, modifs),
  supprimerContrat: (id: string) => supprimer<{ ok: true }>(`/api/contrats/${id}`),

  // CRM & Tableau
  tableau: (frais = false) =>
    appel<Tableau>(`/api/tableau${frais ? "?frais=1" : ""}`),
  crm: () => appel<Crm>("/api/crm"),
  ajouterEntreprise: (e: ModifEntreprise) =>
    poster<Entreprise>("/api/crm/entreprises", e),
  modifierEntreprise: (id: string, e: ModifEntreprise) =>
    poster<Entreprise>(`/api/crm/entreprises/${id}`, e),
  supprimerEntreprise: (id: string) =>
    supprimer<{ ok: true }>(`/api/crm/entreprises/${id}`),

  // Factures
  creerBrouillon: (f: NouvelleFacture) => poster<{ id: number }>("/api/factures", f),
  finaliser: (id: number) =>
    poster<{ id: number; numero: string }>(`/api/factures/${id}/finaliser`),
  envoyer: (id: number) => poster<{ ok: true }>(`/api/factures/${id}/envoyer`),
  marquerPayee: (id: number) => poster<{ ok: true }>(`/api/factures/${id}/payer`),
  reinitialiserDemo: () => poster<{ ok: true }>("/api/demo/reinitialiser"),
  urlPdf: (id: number) => `/api/factures/${id}/pdf`,
  lienPaiement: async (id: number) => {
    const r = await appel<{ url: string; simule: boolean }>(
      `/api/factures/${id}/paiement`,
    );
    return { ...r, url: new URL(r.url, location.origin).href };
  },
};

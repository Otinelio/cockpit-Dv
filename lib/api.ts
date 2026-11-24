import type { Crm, Entreprise } from "@/server/crm-types";
import type {
  ActiviteDV,
  ContratDV,
  DepenseDV,
  OptionsCreationContrat,
  SaasDV,
  TacheDV,
} from "@/server/dv-types";
import type {
  AssocieDV,
  AuditAccesCoffre,
  CategorieCoffre,
  DocumentDV,
  DossierDV,
  EntreeCoffreVue,
  IdentiteEntreprise,
  ReunionDV,
  VisionStrategique,
} from "@/server/hub-types";
import type { CodeTva, NouvelleFacture, Tableau } from "@/server/types";

function getAuteur(): string {
  if (typeof window !== "undefined") {
    return localStorage.getItem("cockpit_dv_user") || "Othnelio";
  }
  return "Othnelio";
}

async function appel<T>(chemin: string, init?: RequestInit): Promise<T> {
  const auteur = getAuteur();
  const res = await fetch(chemin, {
    cache: "no-store",
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
  statutAuth: () => appel<Record<string, { motDePasseDefini: boolean }>>("/api/auth/statut"),
  connexion: (nom: string, motDePasse: string) =>
    poster<{ ok: boolean; nom: string }>("/api/auth/connexion", { nom, motDePasse }),
  premierMotDePasse: (nom: string, motDePasse: string) =>
    poster<{ ok: boolean; nom: string }>("/api/auth/premier-mot-de-passe", { nom, motDePasse }),
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
  obtenirContrat: (id: string) => appel<ContratDV>(`/api/contrats/${id}`),
  ajouterContrat: (c: Omit<ContratDV, "id" | "creeLe"> & OptionsCreationContrat) =>
    poster<ContratDV>("/api/contrats", c),
  modifierContrat: (id: string, modifs: Partial<ContratDV>) =>
    modifier<ContratDV>(`/api/contrats/${id}`, modifs),
  supprimerContrat: (id: string, mode?: 'soft' | 'hard') =>
    supprimer<{ ok: true; mode: string }>(`/api/contrats/${id}${mode ? `?mode=${mode}` : ''}`),
  restaurerContrat: (id: string) => poster<{ ok: true; contrat: ContratDV }>(`/api/contrats/${id}/restaurer`, {}),
  facturerContrat: (
    id: string,
    facture: { libelle?: string; montantHT: number; tva?: CodeTva; echeanceJours?: number },
  ) => poster<{ id: number }>(`/api/contrats/${id}/facturer`, facture),
  facturerJalon: (contratId: string, jalonId: string) =>
    poster<{ id: number; jalon: unknown }>(`/api/contrats/${contratId}/jalons/${jalonId}/facturer`),
  margeContrat: (id: string) =>
    appel<{
      contratId: string;
      montantTotalHT: number;
      totalFactureTTC: number;
      totalEncaisseTTC: number;
      totalEncaisseHT: number;
      totalDepenses: number;
      depenses: DepenseDV[];
      margeEstimeeFCFA: number;
      margeReelleEncaisseeFCFA: number;
      tauxMargePourcent: number;
    }>(`/api/contrats/${id}/marge`),
  obtenirContratPourSignature: (jeton: string) =>
    appel<ContratDV>(`/api/contrats/signer/${jeton}`),
  signerContratEnLigne: (
    jeton: string,
    donnee: { nomSignataire: string; fonctionSignataire?: string; signatureBase64?: string },
  ) => poster<{ ok: boolean; contrat: ContratDV }>(`/api/contrats/signer/${jeton}`, donnee),

  // Hub DigitalVision (Espace Entreprise)
  hub: {
    // 1. Identité
    identite: () => appel<IdentiteEntreprise>("/api/hub/identite"),
    mettreAJourIdentite: (modifs: Partial<IdentiteEntreprise>) =>
      modifier<IdentiteEntreprise>("/api/hub/identite", modifs),

    // 2. Coffre-fort
    coffre: () =>
      appel<{ entrees: EntreeCoffreVue[]; audits: AuditAccesCoffre[] }>(
        "/api/hub/coffre",
      ),
    ajouterEntreeCoffre: (entree: {
      nomService: string;
      categorie: CategorieCoffre;
      url?: string;
      identifiant: string;
      emailAssocie?: string;
      secret: string;
      notes?: string;
      responsable: string;
    }) => poster<EntreeCoffreVue>("/api/hub/coffre", entree),
    modifierEntreeCoffre: (
      id: string,
      modifs: {
        nomService?: string;
        categorie?: CategorieCoffre;
        url?: string;
        identifiant?: string;
        emailAssocie?: string;
        secret?: string;
        notes?: string;
        responsable?: string;
      },
    ) => modifier<EntreeCoffreVue>(`/api/hub/coffre/${id}`, modifs),
    revelerSecretCoffre: (
      id: string,
      action: "consultation" | "copie" = "consultation",
      motDePasse?: string,
    ) =>
      poster<{ secret: string }>(`/api/hub/coffre/${id}/reveler`, {
        action,
        motDePasse,
      }),
    supprimerEntreeCoffre: (id: string) =>
      supprimer<{ ok: boolean }>(`/api/hub/coffre/${id}`),

    // 3. Vision et Stratégie
    strategie: () => appel<VisionStrategique>("/api/hub/strategie"),
    mettreAJourStrategie: (modifs: Partial<VisionStrategique>) =>
      modifier<VisionStrategique>("/api/hub/strategie", modifs),

    // 4. Associés
    associes: () => appel<AssocieDV[]>("/api/hub/associes"),
    modifierAssocie: (id: string, modifs: Partial<AssocieDV>) =>
      modifier<AssocieDV>(`/api/hub/associes/${id}`, modifs),

    // 5. Réunions
    reunions: () => appel<ReunionDV[]>("/api/hub/reunions"),
    ajouterReunion: (reu: Omit<ReunionDV, "id" | "creeLe">) =>
      poster<ReunionDV>("/api/hub/reunions", reu),
    modifierReunion: (id: string, modifs: Partial<ReunionDV>) =>
      modifier<ReunionDV>(`/api/hub/reunions/${id}`, modifs),
    supprimerReunion: (id: string) =>
      supprimer<{ ok: boolean }>(`/api/hub/reunions/${id}`),

    // 6. Documents
    documents: () =>
      appel<{ dossiers: DossierDV[]; documents: DocumentDV[] }>(
        "/api/hub/documents",
      ),
    creerDossier: (nom: string, parentId?: string | null) =>
      poster<DossierDV>("/api/hub/documents/dossiers", { nom, parentId }),
    renommerDossier: (id: string, nom: string) =>
      modifier<{ ok: boolean }>(`/api/hub/documents/dossiers/${id}`, { nom }),
    supprimerDossier: (id: string) =>
      supprimer<{ ok: boolean }>(`/api/hub/documents/dossiers/${id}`),
    uploadFichier: async (
      fichier: File,
      dossierId: string,
      description?: string,
      liaisons?: {
        projetSaasId?: string;
        clientCrmId?: string;
        reunionId?: string;
        contratId?: string;
      },
    ) => {
      const formData = new FormData();
      formData.append("fichier", fichier);
      formData.append("dossierId", dossierId);
      if (description) formData.append("description", description);
      if (liaisons?.projetSaasId)
        formData.append("projetSaasId", liaisons.projetSaasId);
      if (liaisons?.clientCrmId)
        formData.append("clientCrmId", liaisons.clientCrmId);
      if (liaisons?.reunionId)
        formData.append("reunionId", liaisons.reunionId);
      if (liaisons?.contratId)
        formData.append("contratId", liaisons.contratId);

      const auteur = getAuteur();
      const res = await fetch("/api/hub/documents/fichiers/upload", {
        method: "POST",
        headers: {
          "x-auteur": encodeURIComponent(auteur),
        },
        body: formData,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          (data as { erreur?: string }).erreur ?? `Erreur ${res.status}`,
        );
      }
      return data as DocumentDV;
    },
    urlFichier: (id: string) => `/api/hub/documents/fichiers/${id}`,
    renommerDocument: (id: string, nom: string) =>
      modifier<{ ok: boolean }>(`/api/hub/documents/fichiers/${id}`, { nom }),
    deplacerDocument: (id: string, dossierId: string) =>
      modifier<{ ok: boolean }>(`/api/hub/documents/fichiers/${id}`, {
        dossierId,
      }),
    supprimerDocument: (id: string) =>
      supprimer<{ ok: boolean }>(`/api/hub/documents/fichiers/${id}`),
  },

  // CRM & Tableau
  tableau: (frais = false) =>
    appel<Tableau>(`/api/tableau${frais ? "?frais=1" : ""}`),
  crm: () => appel<Crm>("/api/crm"),
  ajouterEntreprise: (e: ModifEntreprise) =>
    poster<Entreprise>("/api/crm/entreprises", e),
  modifierEntreprise: (id: string, e: ModifEntreprise) =>
    poster<Entreprise>(`/api/crm/entreprises/${id}`, e),
  supprimerEntreprise: (id: string, mode?: 'soft' | 'hard') =>
    supprimer<{ ok: true; mode: string }>(`/api/crm/entreprises/${id}${mode ? `?mode=${mode}` : ''}`),
  restaurerEntreprise: (id: string) => poster<{ ok: true }>(`/api/crm/entreprises/${id}/restaurer`, {}),

  // Factures
  creerBrouillon: (f: NouvelleFacture) => poster<{ id: number }>("/api/factures", f),
  modifierFacture: (id: number, modifs: { montantHT?: number; tva?: CodeTva; libelle?: string }) =>
    modifier<unknown>(`/api/factures/${id}`, modifs),
  supprimerFacture: (id: number, mode?: 'soft' | 'hard') =>
    supprimer<{ ok: true; mode: string }>(`/api/factures/${id}${mode ? `?mode=${mode}` : ''}`),
  restaurerFacture: (id: number) => poster<{ ok: true }>(`/api/factures/${id}/restaurer`, {}),
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

  // Notifications Push PWA
  notifications: {
    clePublique: () => appel<{ clePublique: string }>("/api/notifications/cle-publique"),
    souscrire: (data: { endpoint: string; keys: { p256dh: string; auth: string }; userAgent?: string }) =>
      poster<{ id: string }>("/api/notifications/souscrire", data),
    desinscrire: (endpoint: string) =>
      poster<{ ok: boolean }>("/api/notifications/desinscrire", { endpoint }),
    tester: () => poster<{ envoyes: number; echecs: number }>("/api/notifications/tester", {}),
  },
};

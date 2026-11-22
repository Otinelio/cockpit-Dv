import { create } from "zustand";
import { api, type ModifEntreprise } from "@/lib/api";
import { FILTRES_DEFAUT, type FiltresCrm, type Vue } from "@/lib/cockpit";
import { euros } from "@/lib/format";
import type { Crm, Entreprise } from "@/server/crm-types";
import type {
  ActiviteDV,
  ContratDV,
  DepenseDV,
  OptionsCreationContrat,
  SaasDV,
  TacheDV,
} from "@/server/dv-types";
import type { CodeTva, Tableau } from "@/server/types";

export type Toast = {
  id: number;
  ton: "succes" | "erreur" | "info";
  titre: string;
  texte?: string;
};

type CockpitState = {
  // Données de base
  tableau: Tableau | null;
  crm: Crm | null;
  erreur: string | null;
  charger: (frais?: boolean) => Promise<void>;
  modifierEntreprise: (id: string, modif: ModifEntreprise) => Promise<void>;
  ajouterEntreprise: (modif: ModifEntreprise) => Promise<Entreprise | null>;
  supprimerEntreprise: (id: string) => Promise<boolean>;

  // Authentification & Session DV
  utilisateurActif: string;
  estAuthentifie: boolean;
  chargementSession: boolean;
  initialiserSession: () => void;
  dialogueConnexionOuvert: boolean;
  setDialogueConnexionOuvert: (open: boolean) => void;
  connecter: (nom: string, motDePasse: string) => Promise<boolean>;
  definirPremierMotDePasse: (nom: string, motDePasse: string) => Promise<boolean>;
  deconnecter: () => void;

  // Activités & Audit Trail
  activites: ActiviteDV[];
  chargerActivites: () => Promise<void>;

  // Tâches
  taches: TacheDV[];
  chargerTaches: () => Promise<void>;
  ajouterTache: (t: Omit<TacheDV, "id" | "creeeLe">) => Promise<TacheDV | null>;
  modifierTache: (id: string, modifs: Partial<TacheDV>) => Promise<void>;
  supprimerTache: (id: string) => Promise<void>;

  // Dépenses
  depenses: DepenseDV[];
  chargerDepenses: () => Promise<void>;
  ajouterDepense: (d: Omit<DepenseDV, "id" | "creeeLe">) => Promise<DepenseDV | null>;
  supprimerDepense: (id: string) => Promise<void>;

  // SaaS
  saas: SaasDV[];
  chargerSaas: () => Promise<void>;
  ajouterSaas: (s: Omit<SaasDV, "id" | "creeLe" | "misAJourLe">) => Promise<SaasDV | null>;
  modifierSaas: (id: string, modifs: Partial<SaasDV>) => Promise<void>;
  supprimerSaas: (id: string) => Promise<void>;

  // Contrats
  contrats: ContratDV[];
  chargerContrats: () => Promise<void>;
  ajouterContrat: (
    c: Omit<ContratDV, "id" | "creeLe"> & OptionsCreationContrat,
  ) => Promise<ContratDV | null>;
  modifierContrat: (id: string, modifs: Partial<ContratDV>) => Promise<void>;
  supprimerContrat: (id: string) => Promise<void>;
  facturerContrat: (
    id: string,
    facture: { libelle?: string; montantHT: number; tva?: CodeTva; echeanceJours?: number },
  ) => Promise<number | null>;

  // Suivi factures
  suivis: number[];
  suivrePaiement: (id: number) => void;

  // Toasts
  toasts: Toast[];
  toast: (t: Omit<Toast, "id">) => void;
  retirerToast: (id: number) => void;

  // UI & Tiroirs
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  searchOpen: boolean;
  setSearchOpen: (open: boolean) => void;
  detailId: string | null;
  detailOpen: boolean;
  openDetail: (id: string) => void;
  closeDetail: () => void;
  profileName: string | null;
  profileOpen: boolean;
  openProfile: (nom: string) => void;
  closeProfile: () => void;
  newCompanyOpen: boolean;
  setNewCompanyOpen: (open: boolean) => void;
  factureOpen: boolean;
  factureClientId: number | null;
  ouvrirFacture: (clientId?: number | null) => void;
  fermerFacture: () => void;

  // Filtres CRM
  filtres: FiltresCrm;
  setFiltres: (f: Partial<FiltresCrm>) => void;
  resetFiltres: () => void;
  vue: Vue;
  setVue: (vue: Vue) => void;
  selectedIds: string[];
  toggleSelected: (id: string) => void;
  setSelected: (ids: string[]) => void;

  // Notifications lues
  lues: string[];
  marquerLue: (id: string) => void;
  toutMarquerLu: (ids: string[]) => void;
};

let prochainToast = 1;
const CLE_SESSION_VERSION = "cockpit_dv_session_v4";

function initialUser(): string {
  if (typeof window !== "undefined") {
    if (localStorage.getItem("cockpit_dv_session_version") !== CLE_SESSION_VERSION) {
      return "";
    }
    return localStorage.getItem("cockpit_dv_user") || "";
  }
  return "";
}

export const useCockpit = create<CockpitState>((set, get) => ({
  tableau: null,
  crm: null,
  erreur: null,

  utilisateurActif: initialUser(),
  estAuthentifie: false,
  chargementSession: true,
  initialiserSession() {
    if (typeof window !== "undefined") {
      const version = localStorage.getItem("cockpit_dv_session_version");
      if (version !== CLE_SESSION_VERSION) {
        localStorage.removeItem("cockpit_dv_session");
        localStorage.removeItem("cockpit_dv_user");
        localStorage.setItem("cockpit_dv_session_version", CLE_SESSION_VERSION);
        set({ estAuthentifie: false, utilisateurActif: "", chargementSession: false });
        return;
      }
      const active = localStorage.getItem("cockpit_dv_session") === "true";
      const user = localStorage.getItem("cockpit_dv_user") || "";
      set({ estAuthentifie: active && Boolean(user), utilisateurActif: active ? user : "", chargementSession: false });
    } else {
      set({ chargementSession: false });
    }
  },
  dialogueConnexionOuvert: false,
  setDialogueConnexionOuvert: (open) => set({ dialogueConnexionOuvert: open }),

  async connecter(nom, motDePasse) {
    try {
      const res = await api.connexion(nom, motDePasse);
      if (res.ok) {
        if (typeof window !== "undefined") {
          localStorage.setItem("cockpit_dv_session_version", CLE_SESSION_VERSION);
          localStorage.setItem("cockpit_dv_session", "true");
          localStorage.setItem("cockpit_dv_user", nom);
        }
        set({ estAuthentifie: true, utilisateurActif: nom, dialogueConnexionOuvert: false });
        get().toast({
          ton: "succes",
          titre: `Bienvenue ${nom} !`,
          texte: "Tu es maintenant connecté(e) sur Cockpit DV.",
        });
        await get().chargerActivites();
        return true;
      }
      return false;
    } catch (err) {
      get().toast({
        ton: "erreur",
        titre: "Échec de connexion",
        texte: (err as Error).message,
      });
      return false;
    }
  },

  async definirPremierMotDePasse(nom, motDePasse) {
    try {
      const res = await api.premierMotDePasse(nom, motDePasse);
      if (res.ok) {
        if (typeof window !== "undefined") {
          localStorage.setItem("cockpit_dv_session_version", CLE_SESSION_VERSION);
          localStorage.setItem("cockpit_dv_session", "true");
          localStorage.setItem("cockpit_dv_user", nom);
        }
        set({ estAuthentifie: true, utilisateurActif: nom, dialogueConnexionOuvert: false });
        get().toast({
          ton: "succes",
          titre: `Bienvenue ${nom} !`,
          texte: "Ton mot de passe personnel a été enregistré avec succès.",
        });
        await get().chargerActivites();
        return true;
      }
      return false;
    } catch (err) {
      get().toast({
        ton: "erreur",
        titre: "Erreur",
        texte: (err as Error).message,
      });
      return false;
    }
  },

  deconnecter() {
    if (typeof window !== "undefined") {
      localStorage.removeItem("cockpit_dv_session");
      localStorage.removeItem("cockpit_dv_user");
    }
    set({ estAuthentifie: false, utilisateurActif: "", dialogueConnexionOuvert: false });
    get().toast({
      ton: "info",
      titre: "Session verrouillée",
      texte: "Connecte-toi à nouveau pour accéder à Cockpit DV.",
    });
  },

  activites: [],
  async chargerActivites() {
    try {
      const activites = await api.activites();
      set({ activites });
    } catch {
      // Silencieux pour ne pas bloquer l'UI
    }
  },

  taches: [],
  async chargerTaches() {
    try {
      const taches = await api.taches();
      set({ taches });
    } catch (e) {
      console.error(e);
    }
  },

  async ajouterTache(t) {
    try {
      const nouv = await api.ajouterTache(t);
      set((s) => ({ taches: [nouv, ...s.taches] }));
      get().toast({
        ton: "succes",
        titre: "Tâche programmée",
        texte: `${nouv.titre} pour ${nouv.assigneA}`,
      });
      await get().chargerActivites();
      return nouv;
    } catch (e) {
      get().toast({
        ton: "erreur",
        titre: "Impossible d'ajouter la tâche",
        texte: (e as Error).message,
      });
      return null;
    }
  },

  async modifierTache(id, modifs) {
    try {
      const maj = await api.modifierTache(id, modifs);
      set((s) => ({
        taches: s.taches.map((t) => (t.id === id ? maj : t)),
      }));
      await get().chargerActivites();
    } catch (e) {
      get().toast({
        ton: "erreur",
        titre: "Erreur de mise à jour",
        texte: (e as Error).message,
      });
    }
  },

  async supprimerTache(id) {
    try {
      await api.supprimerTache(id);
      set((s) => ({ taches: s.taches.filter((t) => t.id !== id) }));
      get().toast({ ton: "info", titre: "Tâche supprimée" });
    } catch (e) {
      get().toast({ ton: "erreur", titre: "Erreur", texte: (e as Error).message });
    }
  },

  depenses: [],
  async chargerDepenses() {
    try {
      const depenses = await api.depenses();
      set({ depenses });
    } catch (e) {
      console.error(e);
    }
  },

  async ajouterDepense(d) {
    try {
      const nouv = await api.ajouterDepense(d);
      set((s) => ({ depenses: [nouv, ...s.depenses] }));
      get().toast({
        ton: "succes",
        titre: "Dépense enregistrée",
        texte: `${nouv.libelle} (${nouv.montantFCFA.toLocaleString("fr-FR")} FCFA)`,
      });
      await get().chargerActivites();
      return nouv;
    } catch (e) {
      get().toast({ ton: "erreur", titre: "Erreur dépense", texte: (e as Error).message });
      return null;
    }
  },

  async supprimerDepense(id) {
    try {
      await api.supprimerDepense(id);
      set((s) => ({ depenses: s.depenses.filter((d) => d.id !== id) }));
      get().toast({ ton: "info", titre: "Dépense retirée" });
    } catch (e) {
      get().toast({ ton: "erreur", titre: "Erreur", texte: (e as Error).message });
    }
  },

  saas: [],
  async chargerSaas() {
    try {
      const saas = await api.saas();
      set({ saas });
    } catch (e) {
      console.error(e);
    }
  },

  async ajouterSaas(s) {
    try {
      const nouv = await api.ajouterSaas(s);
      set((state) => ({ saas: [...state.saas, nouv] }));
      get().toast({
        ton: "succes",
        titre: `SaaS ${nouv.nom} créé`,
        texte: "Ajouté au pôle SaaStup de DigitalVision.",
      });
      await get().chargerActivites();
      return nouv;
    } catch (e) {
      get().toast({ ton: "erreur", titre: "Erreur SaaS", texte: (e as Error).message });
      return null;
    }
  },

  async modifierSaas(id, modifs) {
    try {
      const maj = await api.modifierSaas(id, modifs);
      set((state) => ({
        saas: state.saas.map((s) => (s.id === id ? maj : s)),
      }));
      get().toast({ ton: "succes", titre: `SaaS ${maj.nom} actualisé` });
      await get().chargerActivites();
    } catch (e) {
      get().toast({ ton: "erreur", titre: "Erreur", texte: (e as Error).message });
    }
  },

  async supprimerSaas(id) {
    try {
      await api.supprimerSaas(id);
      set((state) => ({ saas: state.saas.filter((s) => s.id !== id) }));
      get().toast({ ton: "info", titre: "SaaS supprimé" });
    } catch (e) {
      get().toast({ ton: "erreur", titre: "Erreur", texte: (e as Error).message });
    }
  },

  contrats: [],
  async chargerContrats() {
    try {
      const contrats = await api.contrats();
      set({ contrats });
    } catch (e) {
      console.error(e);
    }
  },

  async ajouterContrat(c) {
    try {
      const nouv = await api.ajouterContrat(c);
      set((state) => ({ contrats: [nouv, ...state.contrats] }));
      get().toast({
        ton: "succes",
        titre: `Contrat enregistré`,
        texte: `${nouv.titre} pour ${nouv.nomEntreprise}`,
      });
      // Recharger tâches, CRM et factures qui ont pu être générées automatiquement
      await Promise.all([
        get().chargerActivites(),
        get().chargerTaches(),
        get().charger(true),
      ]);
      return nouv;
    } catch (e) {
      get().toast({ ton: "erreur", titre: "Erreur contrat", texte: (e as Error).message });
      return null;
    }
  },

  async modifierContrat(id, modifs) {
    try {
      const maj = await api.modifierContrat(id, modifs);
      set((state) => ({
        contrats: state.contrats.map((c) => (c.id === id ? maj : c)),
      }));
      await Promise.all([
        get().chargerActivites(),
        get().chargerTaches(),
        get().charger(true),
      ]);
    } catch (e) {
      get().toast({ ton: "erreur", titre: "Erreur", texte: (e as Error).message });
    }
  },

  async supprimerContrat(id) {
    try {
      await api.supprimerContrat(id);
      set((state) => ({ contrats: state.contrats.filter((c) => c.id !== id) }));
      get().toast({ ton: "info", titre: "Contrat supprimé" });
    } catch (e) {
      get().toast({ ton: "erreur", titre: "Erreur", texte: (e as Error).message });
    }
  },

  async facturerContrat(id, facture) {
    try {
      const res = await api.facturerContrat(id, facture);
      get().toast({
        ton: "succes",
        titre: "Facture contrat créée",
        texte: `Brouillon de facture #${res.id} prêt à finaliser dans le module Finances.`,
      });
      await Promise.all([
        get().chargerContrats(),
        get().charger(true),
        get().chargerActivites(),
      ]);
      return res.id;
    } catch (e) {
      get().toast({ ton: "erreur", titre: "Erreur facturation", texte: (e as Error).message });
      return null;
    }
  },

  async charger(frais = false) {
    try {
      const [tableau, crm] = await Promise.all([api.tableau(frais), api.crm()]);
      const avant = get().tableau;
      const suivis = get().suivis;
      const payees = suivis.filter(
        (id) =>
          avant?.factures.find((f) => f.id === id)?.statut !== "payee" &&
          tableau.factures.find((f) => f.id === id)?.statut === "payee",
      );
      set({
        tableau,
        crm,
        erreur: null,
        suivis: suivis.filter((id) => !payees.includes(id)),
      });
      for (const id of payees) {
        const f = tableau.factures.find((x) => x.id === id)!;
        get().toast({
          ton: "succes",
          titre: "Paiement reçu",
          texte: `${f.client} a réglé la facture ${f.numero} : ${euros(f.montant, true)}.`,
        });
      }
    } catch (e) {
      set({ erreur: (e as Error).message });
    }
  },

  async modifierEntreprise(id, modif) {
    const crm = get().crm;
    if (!crm) return;
    const avant = crm.entreprises.find((e) => e.id === id);
    if (!avant) return;
    set({
      crm: {
        ...crm,
        entreprises: crm.entreprises.map((e) =>
          e.id === id ? { ...e, ...modif } : e,
        ),
      },
    });
    try {
      const maj = await api.modifierEntreprise(id, modif);
      const actuel = get().crm!;
      set({
        crm: {
          ...actuel,
          entreprises: actuel.entreprises.map((e) => (e.id === id ? maj : e)),
        },
      });
      await get().chargerActivites();
    } catch (e) {
      const actuel = get().crm!;
      set({
        crm: {
          ...actuel,
          entreprises: actuel.entreprises.map((x) => (x.id === id ? avant : x)),
        },
      });
      get().toast({
        ton: "erreur",
        titre: "Modification impossible",
        texte: (e as Error).message,
      });
    }
  },

  async ajouterEntreprise(modif) {
    try {
      const e = await api.ajouterEntreprise(modif);
      const crm = get().crm;
      if (crm) set({ crm: { ...crm, entreprises: [e, ...crm.entreprises] } });
      await get().chargerActivites();
      return e;
    } catch (err) {
      get().toast({
        ton: "erreur",
        titre: "Entreprise non créée",
        texte: (err as Error).message,
      });
      return null;
    }
  },

  async supprimerEntreprise(id) {
    try {
      await api.supprimerEntreprise(id);
      const crm = get().crm;
      if (crm) {
        set({
          crm: {
            ...crm,
            entreprises: crm.entreprises.filter((e) => e.id !== id),
          },
        });
      }
      await get().chargerActivites();
      get().toast({
        ton: "succes",
        titre: "Entreprise supprimée",
        texte: "L'entreprise a bien été retirée de ton CRM.",
      });
      return true;
    } catch (err) {
      get().toast({
        ton: "erreur",
        titre: "Erreur de suppression",
        texte: (err as Error).message,
      });
      return false;
    }
  },

  suivis: [],
  suivrePaiement: (id) =>
    set((s) => ({ suivis: s.suivis.includes(id) ? s.suivis : [...s.suivis, id] })),

  toasts: [],
  toast: (t) => {
    const id = prochainToast++;
    set((s) => ({ toasts: [...s.toasts.slice(-3), { ...t, id }] }));
    setTimeout(() => get().retirerToast(id), t.ton === "erreur" ? 7000 : 4500);
  },
  retirerToast: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

  sidebarOpen: false,
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  searchOpen: false,
  setSearchOpen: (searchOpen) => set({ searchOpen }),
  detailId: null,
  detailOpen: false,
  openDetail: (detailId) =>
    set({ detailId, detailOpen: true, profileOpen: false, searchOpen: false }),
  closeDetail: () => set({ detailOpen: false }),
  profileName: null,
  profileOpen: false,
  openProfile: (profileName) =>
    set({ profileName, profileOpen: true, detailOpen: false }),
  closeProfile: () => set({ profileOpen: false }),
  newCompanyOpen: false,
  setNewCompanyOpen: (newCompanyOpen) => set({ newCompanyOpen }),
  factureOpen: false,
  factureClientId: null,
  ouvrirFacture: (clientId = null) =>
    set({ factureOpen: true, factureClientId: clientId, detailOpen: false }),
  fermerFacture: () => set({ factureOpen: false }),

  filtres: FILTRES_DEFAUT,
  setFiltres: (f) => set((s) => ({ filtres: { ...s.filtres, ...f } })),
  resetFiltres: () => set({ filtres: FILTRES_DEFAUT }),
  vue: "toutes",
  setVue: (vue) => set({ vue }),
  selectedIds: [],
  toggleSelected: (id) =>
    set((s) => ({
      selectedIds: s.selectedIds.includes(id)
        ? s.selectedIds.filter((x) => x !== id)
        : [...s.selectedIds, id],
    })),
  setSelected: (selectedIds) => set({ selectedIds }),

  lues: [],
  marquerLue: (id) =>
    set((s) => ({ lues: s.lues.includes(id) ? s.lues : [...s.lues, id] })),
  toutMarquerLu: (ids) =>
    set((s) => ({ lues: [...new Set([...s.lues, ...ids])] })),
}));

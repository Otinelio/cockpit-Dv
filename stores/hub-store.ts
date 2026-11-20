import { create } from 'zustand'
import { api } from '@/lib/api'
import { useCockpit } from '@/stores/cockpit-store'
import type {
  ActionStrategique,
  AssocieDV,
  AuditAccesCoffre,
  CategorieCoffre,
  DocumentDV,
  DossierDV,
  EntreeCoffreVue,
  IdentiteEntreprise,
  ResolutionReunion,
  ReunionDV,
  VisionStrategique,
} from '@/server/hub-types'

export type OngletHub =
  | 'identite'
  | 'coffre'
  | 'strategie'
  | 'associes'
  | 'reunions'
  | 'documents'

interface HubState {
  ongletActif: OngletHub
  setOngletActif: (onglet: OngletHub) => void
  chargement: boolean

  // 1. Identité
  identite: IdentiteEntreprise | null
  chargerIdentite: () => Promise<void>
  mettreAJourIdentite: (modifs: Partial<IdentiteEntreprise>) => Promise<boolean>

  // 2. Coffre-fort
  entreesCoffre: EntreeCoffreVue[]
  auditsCoffre: AuditAccesCoffre[]
  coffreDeverrouille: boolean
  motDePasseSession: string
  deverrouillerCoffre: (motDePasse: string) => Promise<boolean>
  verrouillerCoffre: () => void
  chargerCoffre: () => Promise<void>
  ajouterEntreeCoffre: (entree: {
    nomService: string
    categorie: CategorieCoffre
    url?: string
    identifiant: string
    emailAssocie?: string
    secret: string
    notes?: string
    responsable: string
  }) => Promise<boolean>
  modifierEntreeCoffre: (
    id: string,
    modifs: {
      nomService?: string
      categorie?: CategorieCoffre
      url?: string
      identifiant?: string
      emailAssocie?: string
      secret?: string
      notes?: string
      responsable?: string
    },
  ) => Promise<boolean>
  revelerSecret: (id: string, action?: 'consultation' | 'copie') => Promise<string | null>
  supprimerEntreeCoffre: (id: string) => Promise<boolean>

  // 3. Vision & Stratégie
  strategie: VisionStrategique | null
  chargerStrategie: () => Promise<void>
  mettreAJourStrategie: (modifs: Partial<VisionStrategique>) => Promise<boolean>
  transformerActionEnTache: (action: ActionStrategique, objectifTitre: string) => Promise<boolean>

  // 4. Associés & Gouvernance
  associes: AssocieDV[]
  chargerAssocies: () => Promise<void>
  modifierAssocie: (id: string, modifs: Partial<AssocieDV>) => Promise<boolean>

  // 5. Réunions & Décisions
  reunions: ReunionDV[]
  chargerReunions: () => Promise<void>
  ajouterReunion: (reu: Omit<ReunionDV, 'id' | 'creeLe'>) => Promise<boolean>
  modifierReunion: (id: string, modifs: Partial<ReunionDV>) => Promise<boolean>
  supprimerReunion: (id: string) => Promise<boolean>
  transformerResolutionEnTache: (resolution: ResolutionReunion, reunionTitre: string) => Promise<boolean>

  // 6. Documents & Archives
  dossiers: DossierDV[]
  documents: DocumentDV[]
  chargerDocuments: () => Promise<void>
  creerDossier: (nom: string, parentId?: string | null) => Promise<boolean>
  renommerDossier: (id: string, nom: string) => Promise<boolean>
  supprimerDossier: (id: string) => Promise<boolean>
  uploadFichier: (
    fichier: File,
    dossierId: string,
    description?: string,
    liaisons?: { projetSaasId?: string; clientCrmId?: string; reunionId?: string },
  ) => Promise<DocumentDV | null>
  renommerDocument: (id: string, nom: string) => Promise<boolean>
  deplacerDocument: (id: string, dossierId: string) => Promise<boolean>
  supprimerDocument: (id: string) => Promise<boolean>

  // Tout charger
  chargerTout: () => Promise<void>
}

export const useHub = create<HubState>((set, get) => ({
  ongletActif: 'identite',
  setOngletActif: (onglet) => set({ ongletActif: onglet }),
  chargement: false,

  identite: null,
  entreesCoffre: [],
  auditsCoffre: [],
  coffreDeverrouille: false,
  motDePasseSession: '',
  strategie: null,
  associes: [],
  reunions: [],
  dossiers: [],
  documents: [],

  // --- CHARGEMENT GLOBAL ---
  chargerTout: async () => {
    set({ chargement: true })
    try {
      const [identite, coffre, strategie, associes, reunions, docs] = await Promise.all([
        api.hub.identite().catch(() => null),
        api.hub.coffre().catch(() => ({ entrees: [], audits: [] })),
        api.hub.strategie().catch(() => null),
        api.hub.associes().catch(() => []),
        api.hub.reunions().catch(() => []),
        api.hub.documents().catch(() => ({ dossiers: [], documents: [] })),
      ])
      set({
        identite,
        entreesCoffre: coffre.entrees,
        auditsCoffre: coffre.audits,
        strategie,
        associes,
        reunions,
        dossiers: docs.dossiers,
        documents: docs.documents,
        chargement: false,
      })
    } catch {
      set({ chargement: false })
    }
  },

  // --- 1. IDENTITÉ ---
  chargerIdentite: async () => {
    try {
      const identite = await api.hub.identite()
      set({ identite })
    } catch {}
  },
  mettreAJourIdentite: async (modifs) => {
    try {
      const mis = await api.hub.mettreAJourIdentite(modifs)
      set({ identite: mis })
      useCockpit.getState().toast({
        ton: 'succes',
        titre: 'Identité mise à jour',
        texte: 'Les informations officielles de DigitalVision ont été enregistrées.',
      })
      return true
    } catch (err) {
      useCockpit.getState().toast({
        ton: 'erreur',
        titre: 'Erreur d’enregistrement',
        texte: (err as Error).message,
      })
      return false
    }
  },

  // --- 2. COFFRE-FORT ---
  chargerCoffre: async () => {
    try {
      const data = await api.hub.coffre()
      set({ entreesCoffre: data.entrees, auditsCoffre: data.audits })
    } catch {}
  },
  deverrouillerCoffre: async (motDePasse) => {
    const toast = useCockpit.getState().toast
    const utilisateur = useCockpit.getState().utilisateurActif || 'Othnelio'
    try {
      const ok = await api.connexion(utilisateur, motDePasse)
      if (ok.ok) {
        set({ coffreDeverrouille: true, motDePasseSession: motDePasse })
        toast({
          ton: 'succes',
          titre: 'Coffre-fort déverrouillé',
          texte: `Accès sécurisé accordé à ${utilisateur}.`,
        })
        return true
      }
      return false
    } catch {
      toast({
        ton: 'erreur',
        titre: 'Mot de passe incorrect',
        texte: 'Le mot de passe de session est invalide.',
      })
      return false
    }
  },
  verrouillerCoffre: () => {
    set({ coffreDeverrouille: false, motDePasseSession: '' })
    useCockpit.getState().toast({
      ton: 'info',
      titre: 'Coffre-fort verrouillé',
      texte: 'Les accès et clés sont à nouveau masqués et protégés.',
    })
  },
  ajouterEntreeCoffre: async (entree) => {
    const toast = useCockpit.getState().toast
    try {
      const nouv = await api.hub.ajouterEntreeCoffre(entree)
      set((s) => ({ entreesCoffre: [nouv, ...s.entreesCoffre] }))
      await get().chargerCoffre()
      toast({
        ton: 'succes',
        titre: 'Identifiant sécurisé',
        texte: `${nouv.nomService} a été chiffré et ajouté au coffre.`,
      })
      return true
    } catch (err) {
      toast({
        ton: 'erreur',
        titre: 'Erreur',
        texte: (err as Error).message,
      })
      return false
    }
  },
  modifierEntreeCoffre: async (id, modifs) => {
    const toast = useCockpit.getState().toast
    try {
      const mis = await api.hub.modifierEntreeCoffre(id, modifs)
      set((s) => ({
        entreesCoffre: s.entreesCoffre.map((e) => (e.id === id ? mis : e)),
      }))
      await get().chargerCoffre()
      toast({
        ton: 'succes',
        titre: 'Entrée mise à jour',
        texte: 'Les modifications ont été chiffrées et enregistrées.',
      })
      return true
    } catch (err) {
      toast({
        ton: 'erreur',
        titre: 'Erreur',
        texte: (err as Error).message,
      })
      return false
    }
  },
  revelerSecret: async (id, action = 'consultation') => {
    const mdp = get().motDePasseSession
    try {
      const res = await api.hub.revelerSecretCoffre(id, action, mdp || undefined)
      await get().chargerCoffre()
      return res.secret
    } catch {
      return null
    }
  },
  supprimerEntreeCoffre: async (id) => {
    const toast = useCockpit.getState().toast
    try {
      await api.hub.supprimerEntreeCoffre(id)
      set((s) => ({ entreesCoffre: s.entreesCoffre.filter((e) => e.id !== id) }))
      await get().chargerCoffre()
      toast({
        ton: 'info',
        titre: 'Entrée supprimée',
        texte: 'L’identifiant a été retiré du coffre-fort.',
      })
      return true
    } catch (err) {
      toast({
        ton: 'erreur',
        titre: 'Erreur',
        texte: (err as Error).message,
      })
      return false
    }
  },

  // --- 3. VISION & STRATÉGIE ---
  chargerStrategie: async () => {
    try {
      const strategie = await api.hub.strategie()
      set({ strategie })
    } catch {}
  },
  mettreAJourStrategie: async (modifs) => {
    const toast = useCockpit.getState().toast
    try {
      const strat = await api.hub.mettreAJourStrategie(modifs)
      set({ strategie: strat })
      toast({
        ton: 'succes',
        titre: 'Stratégie mise à jour',
        texte: 'La vision et les objectifs ont été enregistrés.',
      })
      return true
    } catch (err) {
      toast({
        ton: 'erreur',
        titre: 'Erreur',
        texte: (err as Error).message,
      })
      return false
    }
  },
  transformerActionEnTache: async (action, objectifTitre) => {
    const toast = useCockpit.getState().toast
    try {
      const tache = await api.ajouterTache({
        titre: `[Stratégie] ${action.titre}`,
        description: `Lié à l’objectif stratégique : ${objectifTitre}`,
        type: 'dev_saas',
        assigneA: action.responsable || 'Othnelio',
        creePar: useCockpit.getState().utilisateurActif || 'Othnelio',
        statut: 'a_faire',
        priorite: 'haute',
        echeance: action.echeance || new Date().toISOString().slice(0, 10),
      })

      // Met à jour l'action avec l'ID de la tâche
      const strat = get().strategie
      if (strat) {
        const nouvObj = strat.objectifsMensuels.map((obj) => ({
          ...obj,
          actions: obj.actions.map((act) =>
            act.id === action.id ? { ...act, tacheIdLiee: tache.id, statut: 'en_cours' as const } : act,
          ),
        }))
        await get().mettreAJourStrategie({ objectifsMensuels: nouvObj })
      }

      await useCockpit.getState().chargerTaches()
      toast({
        ton: 'succes',
        titre: 'Tâche créée',
        texte: `L’action a été insérée dans le module Tâches pour ${action.responsable}.`,
      })
      return true
    } catch (err) {
      toast({
        ton: 'erreur',
        titre: 'Erreur',
        texte: (err as Error).message,
      })
      return false
    }
  },

  // --- 4. ASSOCIÉS ---
  chargerAssocies: async () => {
    try {
      const associes = await api.hub.associes()
      set({ associes })
    } catch {}
  },
  modifierAssocie: async (id, modifs) => {
    const toast = useCockpit.getState().toast
    try {
      const mis = await api.hub.modifierAssocie(id, modifs)
      set((s) => ({
        associes: s.associes.map((a) => (a.id === id ? mis : a)),
      }))
      toast({
        ton: 'succes',
        titre: 'Fiche mise à jour',
        texte: `Informations de ${mis.nom} enregistrées.`,
      })
      return true
    } catch (err) {
      toast({
        ton: 'erreur',
        titre: 'Erreur',
        texte: (err as Error).message,
      })
      return false
    }
  },

  // --- 5. RÉUNIONS ---
  chargerReunions: async () => {
    try {
      const reunions = await api.hub.reunions()
      set({ reunions })
    } catch {}
  },
  ajouterReunion: async (reu) => {
    const toast = useCockpit.getState().toast
    try {
      const nouv = await api.hub.ajouterReunion(reu)
      set((s) => ({ reunions: [nouv, ...s.reunions] }))
      toast({
        ton: 'succes',
        titre: 'Réunion consignée',
        texte: `La réunion « ${nouv.titre} » a été enregistrée.`,
      })
      return true
    } catch (err) {
      toast({
        ton: 'erreur',
        titre: 'Erreur',
        texte: (err as Error).message,
      })
      return false
    }
  },
  modifierReunion: async (id, modifs) => {
    const toast = useCockpit.getState().toast
    try {
      const mis = await api.hub.modifierReunion(id, modifs)
      set((s) => ({
        reunions: s.reunions.map((r) => (r.id === id ? mis : r)),
      }))
      toast({
        ton: 'succes',
        titre: 'Réunion mise à jour',
        texte: 'Les décisions et résolutions ont été modifiées.',
      })
      return true
    } catch (err) {
      toast({
        ton: 'erreur',
        titre: 'Erreur',
        texte: (err as Error).message,
      })
      return false
    }
  },
  supprimerReunion: async (id) => {
    const toast = useCockpit.getState().toast
    try {
      await api.hub.supprimerReunion(id)
      set((s) => ({ reunions: s.reunions.filter((r) => r.id !== id) }))
      toast({
        ton: 'info',
        titre: 'Réunion supprimée',
        texte: 'L’entrée a été retirée du registre.',
      })
      return true
    } catch (err) {
      toast({
        ton: 'erreur',
        titre: 'Erreur',
        texte: (err as Error).message,
      })
      return false
    }
  },
  transformerResolutionEnTache: async (resolution, reunionTitre) => {
    const toast = useCockpit.getState().toast
    try {
      const tache = await api.ajouterTache({
        titre: `[Résolution] ${resolution.titre}`,
        description: `Résolution issue de la réunion : ${reunionTitre}`,
        type: 'reunion',
        assigneA: resolution.responsable || 'Othnelio',
        creePar: useCockpit.getState().utilisateurActif || 'Othnelio',
        statut: 'a_faire',
        priorite: 'haute',
        echeance: resolution.echeance || new Date().toISOString().slice(0, 10),
      })

      // Met à jour la réunion avec l'ID de tâche
      const meetings = get().reunions
      for (const reu of meetings) {
        const found = reu.resolutions.find((r) => r.id === resolution.id)
        if (found) {
          const modifs = {
            ...reu,
            resolutions: reu.resolutions.map((r) =>
              r.id === resolution.id ? { ...r, tacheIdLiee: tache.id, statut: 'en_cours' as const } : r,
            ),
          }
          await get().modifierReunion(reu.id, modifs)
          break
        }
      }

      await useCockpit.getState().chargerTaches()
      toast({
        ton: 'succes',
        titre: 'Tâche créée',
        texte: `La résolution a été transformée en tâche pour ${resolution.responsable}.`,
      })
      return true
    } catch (err) {
      toast({
        ton: 'erreur',
        titre: 'Erreur',
        texte: (err as Error).message,
      })
      return false
    }
  },

  // --- 6. DOCUMENTS ---
  chargerDocuments: async () => {
    try {
      const data = await api.hub.documents()
      set({ dossiers: data.dossiers, documents: data.documents })
    } catch {}
  },
  creerDossier: async (nom, parentId = null) => {
    const toast = useCockpit.getState().toast
    try {
      const dos = await api.hub.creerDossier(nom, parentId)
      set((s) => ({ dossiers: [...s.dossiers, dos] }))
      toast({
        ton: 'succes',
        titre: 'Dossier créé',
        texte: `Le dossier « ${dos.nom} » a été ajouté.`,
      })
      return true
    } catch (err) {
      toast({
        ton: 'erreur',
        titre: 'Erreur',
        texte: (err as Error).message,
      })
      return false
    }
  },
  renommerDossier: async (id, nom) => {
    const toast = useCockpit.getState().toast
    try {
      await api.hub.renommerDossier(id, nom)
      set((s) => ({
        dossiers: s.dossiers.map((d) => (d.id === id ? { ...d, nom } : d)),
      }))
      toast({
        ton: 'succes',
        titre: 'Dossier renommé',
        texte: `Le dossier est maintenant nommé « ${nom} ».`,
      })
      return true
    } catch (err) {
      toast({
        ton: 'erreur',
        titre: 'Erreur',
        texte: (err as Error).message,
      })
      return false
    }
  },
  supprimerDossier: async (id) => {
    const toast = useCockpit.getState().toast
    try {
      await api.hub.supprimerDossier(id)
      set((s) => ({
        dossiers: s.dossiers.filter((d) => d.id !== id),
        documents: s.documents.filter((doc) => doc.dossierId !== id),
      }))
      toast({
        ton: 'info',
        titre: 'Dossier supprimé',
        texte: 'Le dossier et ses archives associées ont été nettoyés.',
      })
      return true
    } catch (err) {
      toast({
        ton: 'erreur',
        titre: 'Erreur',
        texte: (err as Error).message,
      })
      return false
    }
  },
  uploadFichier: async (fichier, dossierId, description, liaisons) => {
    const toast = useCockpit.getState().toast
    try {
      const doc = await api.hub.uploadFichier(fichier, dossierId, description, liaisons)
      set((s) => ({ documents: [doc, ...s.documents] }))
      toast({
        ton: 'succes',
        titre: 'Fichier archivé sur disque',
        texte: `${doc.nomOriginal} (${(doc.tailleOctets / 1024).toFixed(0)} Ko) enregistré dans .cockpit.`,
      })
      return doc
    } catch (err) {
      toast({
        ton: 'erreur',
        titre: 'Erreur d’upload',
        texte: (err as Error).message,
      })
      return null
    }
  },
  renommerDocument: async (id, nom) => {
    const toast = useCockpit.getState().toast
    try {
      await api.hub.renommerDocument(id, nom)
      set((s) => ({
        documents: s.documents.map((d) => (d.id === id ? { ...d, nomOriginal: nom } : d)),
      }))
      toast({
        ton: 'succes',
        titre: 'Document renommé',
        texte: `Nouveau nom : ${nom}`,
      })
      return true
    } catch (err) {
      toast({
        ton: 'erreur',
        titre: 'Erreur',
        texte: (err as Error).message,
      })
      return false
    }
  },
  deplacerDocument: async (id, dossierId) => {
    const toast = useCockpit.getState().toast
    try {
      await api.hub.deplacerDocument(id, dossierId)
      set((s) => ({
        documents: s.documents.map((d) => (d.id === id ? { ...d, dossierId } : d)),
      }))
      toast({
        ton: 'succes',
        titre: 'Document déplacé',
        texte: 'Le fichier a été classé dans son nouveau dossier.',
      })
      return true
    } catch (err) {
      toast({
        ton: 'erreur',
        titre: 'Erreur',
        texte: (err as Error).message,
      })
      return false
    }
  },
  supprimerDocument: async (id) => {
    const toast = useCockpit.getState().toast
    try {
      await api.hub.supprimerDocument(id)
      set((s) => ({ documents: s.documents.filter((d) => d.id !== id) }))
      toast({
        ton: 'info',
        titre: 'Fichier supprimé',
        texte: 'Le document a été retiré du disque local.',
      })
      return true
    } catch (err) {
      toast({
        ton: 'erreur',
        titre: 'Erreur',
        texte: (err as Error).message,
      })
      return false
    }
  },
}))

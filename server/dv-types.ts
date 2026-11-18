// Les types de données spécifiques au mode Cockpit DV (DigitalVision).

export type MembreDV = 'Othnelio' | 'Medard' | 'Roméo'

export interface ActiviteDV {
  id: string
  auteur: string
  date: string // ISO string
  type: 'connexion' | 'client' | 'etape' | 'appel' | 'tache' | 'facture' | 'depense' | 'saas' | 'contrat'
  titre: string
  details?: string
  cibleId?: string | number
}

export type TypeTacheDV =
  | 'appel'
  | 'prospection'
  | 'devis'
  | 'dev_client'
  | 'dev_saas'
  | 'reunion'
  | 'administratif'

export type PrioriteTacheDV = 'urgente' | 'haute' | 'normale' | 'basse'
export type StatutTacheDV = 'a_faire' | 'en_cours' | 'terminee'

export interface TacheDV {
  id: string
  titre: string
  description?: string
  type: TypeTacheDV
  assigneA: string
  creePar: string
  statut: StatutTacheDV
  priorite: PrioriteTacheDV
  echeance: string // YYYY-MM-DD
  heure?: string // HH:mm
  entrepriseId?: string
  nomEntreprise?: string
  saasId?: string
  creeeLe: string
  termineeLe?: string
}

export type CategorieDepenseDV =
  | 'tech'
  | 'hebergement'
  | 'marketing'
  | 'deplacements'
  | 'administratif'
  | 'retraits'
  | 'autre'

export interface DepenseDV {
  id: string
  date: string // YYYY-MM-DD
  libelle: string
  montantFCFA: number
  categorie: CategorieDepenseDV
  payePar: string
  note?: string
  creePar: string
  creeeLe: string
}

export interface JalonSaas {
  id: string
  titre: string
  description?: string
  echeance?: string
  termine: boolean
}

export interface DocumentSaas {
  id: string
  titre: string
  type: 'cahier_charges' | 'contrat' | 'fiche_technique' | 'maquette' | 'autre'
  urlOuContenu: string
  date: string
}

export type StatutSaasDV = 'ideation' | 'prototypage' | 'beta' | 'production' | 'en_pause'

export interface SaasDV {
  id: string
  nom: string
  slogan: string
  description: string
  statut: StatutSaasDV
  leadTech: string
  leadMarketing: string
  leadOps: string
  url?: string
  depotGit?: string
  mrrFCFA: number
  objectifMrrFCFA: number
  utilisateurs: number
  jalons: JalonSaas[]
  documents: DocumentSaas[]
  creeLe: string
  misAJourLe: string
}

export type TypeContratDV = 'creation_site' | 'app_mobile' | 'logiciel' | 'maintenance' | 'conseil'
export type StatutContratDV = 'brouillon' | 'en_attente' | 'actif' | 'termine' | 'resilie'

export interface ContratDV {
  id: string
  entrepriseId: string
  nomEntreprise: string
  titre: string
  type: TypeContratDV
  montantFCFA: number
  signeLe?: string
  debutLe: string
  finLe?: string
  statut: StatutContratDV
  responsable: string
  notes?: string
  creeLe: string
}


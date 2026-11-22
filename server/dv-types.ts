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
  contratId?: string
  prestationId?: string
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
  contratId?: string
  creePar: string
  creeeLe: string
}

export interface JalonSaas {
  id: string
  titre: string
  description?: string
  attentes?: string
  echeance?: string
  dateLimite?: string
  termine: boolean
}

export interface DocumentSaas {
  id: string
  titre: string
  type: 'cahier_charges' | 'contrat' | 'fiche_technique' | 'maquette' | 'apk' | 'autre'
  urlOuContenu: string
  nomFichier?: string
  tailleOctets?: number
  mimeType?: string
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
  apkUrl?: string
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

export type ModeFacturationContrat = 'aucun' | 'integral' | 'acompte_50' | 'acompte_30' | 'sur_mesure' | 'jalons'

export interface JalonFacturationDV {
  id: string
  titre: string
  pourcentage: number
  montantFCFA: number
  statut: 'en_attente' | 'pret' | 'facture' | 'paye'
  factureId?: number
  echeance?: string
  tacheDeclencheurId?: string
}

export interface OptionsCreationContrat {
  genererTaches?: boolean
  modeFacturation?: ModeFacturationContrat
  pourcentageAcompte?: number
  montantAcompteFCFA?: number
  jalons?: JalonFacturationDV[]
}

export interface PrestationContratDV {
  id: string
  type: TypeContratDV
  libellePersonnalise?: string
  montantFCFA: number
  responsable?: string
  echeancePrestation?: string
  tacheIdLiee?: string
}

export interface ContratDV {
  id: string
  entrepriseId: string
  nomEntreprise: string
  titre: string
  type: TypeContratDV
  prestations?: PrestationContratDV[]
  montantFCFA: number
  signeLe?: string
  debutLe: string
  finLe?: string
  statut: StatutContratDV
  responsable: string
  notes?: string
  mentionsLegales?: string
  modalitesPaiement?: string
  factureIds?: number[]
  tacheIds?: string[]
  jalonsFacturation?: JalonFacturationDV[]
  creeLe: string
  estSigne?: boolean
  estLivre?: boolean
  livreLe?: string
  estPaye?: boolean
  montantPayeFCFA?: number
  payeLe?: string
  documentId?: string
  documentNom?: string
  documentTailleOctets?: number
  documentUrl?: string
  tvaTaux?: number
  jetonSignature?: string
}


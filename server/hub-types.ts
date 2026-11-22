// Types pour le module DigitalVision Hub (Espace Entreprise)

export interface IdentiteEntreprise {
  nomCommercial: string
  slogan: string
  description: string
  mission: string
  vision: string
  valeurs: string[]
  logoPrincipal?: string // Chemin relatif ou url servie par l'API
  logoVariantes: { id: string; libelle: string; url: string }[]
  telephones: string[]
  emails: string[]
  adressePhysique: string
  siteWeb: string
  reseauxSociaux: {
    plateforme: 'linkedin' | 'x' | 'facebook' | 'instagram' | 'github' | 'autre'
    url: string
  }[]
  nif: string
  rccm: string
  coordonneesPaiement: {
    banque?: string
    ibanOuRib?: string
    tMoney?: string
    flooz?: string
    mentions?: string
  }
  modifieLe: string
  modifiePar: string
}

export type CategorieCoffre =
  | 'reseaux_sociaux'
  | 'messagerie'
  | 'hebergement_domaines'
  | 'developpement'
  | 'services_professionnels'
  | 'comptes_financiers'
  | 'api_cles'
  | 'autre'

export interface EntreeCoffreStockee {
  id: string
  nomService: string
  categorie: CategorieCoffre
  url?: string
  identifiant: string
  emailAssocie?: string
  secretChiffre: string // hex AES-256-GCM
  iv: string // hex 12 bytes
  authTag: string // hex 16 bytes
  notes?: string
  responsable: string
  creeLe: string
  modifieLe: string
  modifiePar: string
}

export interface EntreeCoffreVue extends Omit<EntreeCoffreStockee, 'secretChiffre' | 'iv' | 'authTag'> {
  aUnSecret: boolean
}

export interface AuditAccesCoffre {
  id: string
  entreeId: string
  nomService: string
  auteur: string
  action: 'creation' | 'consultation' | 'copie' | 'modification' | 'suppression'
  date: string
}

export type StatutStrategique =
  | 'a_definir'
  | 'a_faire'
  | 'en_cours'
  | 'atteint'
  | 'non_atteint'
  | 'abandonne'

export interface ActionStrategique {
  id: string
  titre: string
  responsable: string
  echeance?: string
  statut: StatutStrategique
  tacheIdLiee?: string
}

export interface ObjectifMensuel {
  id: string
  mois: string // YYYY-MM
  titre: string
  indicateur: string // ex: "5 restaurants pilotes signés"
  cible: number
  actuel: number
  unite?: string
  responsable: string
  echeance: string // YYYY-MM-DD
  statut: StatutStrategique
  progression: number // 0-100%
  actions: ActionStrategique[]
}

export interface ResolutionAnnuelle {
  id: string
  annee: number
  titre: string
  description?: string
  resultatsAttendus: string[]
  responsable: string
  statut: StatutStrategique
}

export interface VisionStrategique {
  horizon: string // ex: "2026 - 2031"
  ambitions: string[]
  positionnement: string
  marchesVises: string[]
  piliersStrategiques: { id: string; titre: string; description: string }[]
  resolutionsAnnuelles: ResolutionAnnuelle[]
  objectifsMensuels: ObjectifMensuel[]
  misAJourLe: string
}

export interface AssocieDV {
  id: string
  nom: string
  photo?: string
  fonction: string
  roleDetaille: string
  email: string
  telephone: string
  adresse?: string
  pourcentageCapital?: number
  partsSociales?: number
  responsabilites: string[]
  competences: string[]
  objectifsIndividuels: string[]
  ordre: number
}

export type StatutDecision = 'proposee' | 'validee' | 'en_cours' | 'executee' | 'abandonnee'
export type StatutResolution = 'a_faire' | 'en_cours' | 'terminee' | 'annulee'

export interface DecisionReunion {
  id: string
  titre: string
  description?: string
  statut: StatutDecision
}

export interface ResolutionReunion {
  id: string
  titre: string
  responsable: string
  echeance: string
  statut: StatutResolution
  tacheIdLiee?: string
}

export interface ReunionDV {
  id: string
  titre: string
  dateHeure: string // ISO
  lieu: string // "Bureau", "Google Meet", "Téléphone", etc.
  participants: string[] // ex: ["Othnelio", "Medard", "Roméo"]
  ordreDuJour: string[]
  notes: string
  decisions: DecisionReunion[]
  resolutions: ResolutionReunion[]
  creePar: string
  creeLe: string
}

export interface DossierDV {
  id: string
  nom: string
  parentId: string | null // null = à la racine
  creeLe: string
}

export interface DocumentDV {
  id: string
  dossierId: string // id du dossier parent
  nomFichier: string
  nomOriginal: string
  extension: string
  mimeType: string
  tailleOctets: number
  cheminStockage: string // chemin relatif dans le dossier documents
  auteur: string
  creeLe: string
  misAJourLe: string
  description?: string
  // Liaisons transversales
  projetSaasId?: string
  clientCrmId?: string
  reunionId?: string
}

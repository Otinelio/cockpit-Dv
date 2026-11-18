// Ce que fait ton entreprise, à quel moment et avec quel outil : la vue « Mission control » se remplit
// avec ce fichier. Ici, c'est la journée de DigitalVision (Lomé).
// Les heures sont indicatives : change-les librement. Aucune automatisation n'est branchée pour l'instant.

import type { LucideIcon } from 'lucide-react'
import { Camera, GitBranch, MessageCircle, Video, WandSparkles } from 'lucide-react'

export type Outil = { id: string; nom: string; role: string; icone: LucideIcon }

export type Tache = {
  heure: string
  titre: string
  outil: Outil['id']
  /** faite : cochée aujourd'hui ; auto : une automatisation s'en charge ; a_faire : reste à faire. */
  etat: 'faite' | 'auto' | 'a_faire'
}

export type Automatisation = {
  nom: string
  quand: string
  outil: Outil['id']
  /** Minutes gagnées à chaque passage, pour le calcul du temps gagné. */
  minutes: number
  /** Passages par semaine. */
  parSemaine: number
  /** Taux de réussite sur les 30 derniers jours, de 0 à 1. */
  reussite: number
  derniere: string
}

export const OUTILS: Outil[] = [
  { id: 'whatsapp', nom: 'WhatsApp', role: 'Échanges, relances et devis clients', icone: MessageCircle },
  { id: 'meet', nom: 'Meet', role: 'Rendez-vous et réunions', icone: Video },
  { id: 'github', nom: 'GitHub', role: 'Code et suivi des projets', icone: GitBranch },
  { id: 'lovable', nom: 'Lovable', role: 'Développement des apps', icone: WandSparkles },
  { id: 'instagram', nom: 'Instagram', role: 'Prospection et visibilité', icone: Camera },
]

export const TACHES: Tache[] = [
  { heure: '09:00', titre: 'Répondre aux clients', outil: 'whatsapp', etat: 'a_faire' },
  { heure: '10:00', titre: 'Rendez-vous avec les clients', outil: 'meet', etat: 'a_faire' },
  { heure: '11:00', titre: 'Relancer les clients', outil: 'whatsapp', etat: 'a_faire' },
  { heure: '12:00', titre: 'Prospecter de nouveaux clients', outil: 'instagram', etat: 'a_faire' },
  { heure: '14:00', titre: 'Préparer et envoyer les devis', outil: 'whatsapp', etat: 'a_faire' },
  { heure: '15:00', titre: 'Développer les apps', outil: 'lovable', etat: 'a_faire' },
  { heure: '16:30', titre: "Suivre l'avancement des projets", outil: 'github', etat: 'a_faire' },
  { heure: '17:30', titre: 'Point des apps (chaque semaine)', outil: 'github', etat: 'a_faire' },
  { heure: '21:00', titre: "Point d'équipe (chaque mois)", outil: 'meet', etat: 'a_faire' },
  { heure: '22:00', titre: 'Réunion interne', outil: 'meet', etat: 'a_faire' },
]

// Rien ne tourne tout seul pour l'instant : ajoute une ligne ici le jour où une automatisation existe.
export const AUTOMATISATIONS: Automatisation[] = []

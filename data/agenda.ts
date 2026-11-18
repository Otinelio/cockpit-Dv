// L'agenda et les tâches de la semaine de DigitalVision : les pages « Agenda » et « Tâches » se remplissent avec ce fichier.
// `j` compte en jours ouvrés depuis aujourd'hui : 0 = aujourd'hui, -1 = le jour ouvré d'avant, 1 = le suivant.
// Les tâches d'aujourd'hui sont celles de « Ta journée » (mission.ts), pour que les pages se répondent.
// Aucun rendez-vous n'est inventé : ajoute les tiens dans RDV (exemple en commentaire ci-dessous).

import { TACHES, type Tache } from './mission'

export type TypeRdv = 'client' | 'demo' | 'appel' | 'interne'
export type Couleur = 'bleu' | 'ambre' | 'vert' | 'gris'

export const TYPES_RDV: Record<TypeRdv, { libelle: string; couleur: Couleur }> = {
  client: { libelle: 'Rendez-vous client', couleur: 'bleu' },
  demo: { libelle: 'Démo ou présentation', couleur: 'ambre' },
  appel: { libelle: 'Appel', couleur: 'vert' },
  interne: { libelle: 'Équipe', couleur: 'gris' },
}

export type Rdv = { j: number; debut: string; fin: string; titre: string; avec?: string; type: TypeRdv }

// Exemple : { j: 1, debut: '10:00', fin: '11:00', titre: 'Présentation du site', avec: 'Nom du client', type: 'demo' },
export const RDV: Rdv[] = []

export type TacheSemaine = Tache & { j: number }

// Les tâches de la semaine : celles d'aujourd'hui, plus celles que tu ajoutes avec `j` (1 = demain, 2 = après-demain…).
export const TACHES_SEMAINE: TacheSemaine[] = [...TACHES.map((t) => ({ ...t, j: 0 }))]

/** Le jour ouvré situé `j` jours ouvrés après aujourd'hui (un samedi ou un dimanche, on part du lundi suivant). */
export function jourOuvre(j: number, depuis = new Date()): Date {
  const d = new Date(depuis)
  d.setHours(12, 0, 0, 0)
  const ouvre = () => d.getDay() !== 0 && d.getDay() !== 6
  while (!ouvre()) d.setDate(d.getDate() + 1)
  for (let reste = Math.abs(j); reste > 0; ) {
    d.setDate(d.getDate() + Math.sign(j))
    if (ouvre()) reste--
  }
  return d
}

// Journal d'activité (Audit Trail) partagé de DigitalVision.
// Enregistre chaque action de l'équipe (qui a créé quoi, déplacé une opportunité, programmé un appel, etc.)
// dans Neon Postgres (collection 'activite').

import { lireCollection, ecrireCollection } from './db'
import type { ActiviteDV } from './dv-types'

export class MagasinActivite {
  private async lire(): Promise<ActiviteDV[]> {
    return lireCollection<ActiviteDV[]>('activite', [])
  }

  private async sauvegarder(donnees: ActiviteDV[]) {
    await ecrireCollection<ActiviteDV[]>('activite', donnees)
  }

  async lister(limite = 50): Promise<ActiviteDV[]> {
    const list = await this.lire()
    return list.slice(0, limite)
  }

  async enregistrer(activite: Omit<ActiviteDV, 'id' | 'date'>): Promise<ActiviteDV> {
    const list = await this.lire()
    const nouvel: ActiviteDV = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      date: new Date().toISOString(),
      ...activite,
    }
    // Placer les plus récentes en tête, garder jusqu'à 500 entrées
    list.unshift(nouvel)
    if (list.length > 500) list.pop()
    await this.sauvegarder(list)
    return nouvel
  }
}

export const magasinActivite = new MagasinActivite()

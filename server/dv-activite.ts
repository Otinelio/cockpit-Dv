// Journal d'activité (Audit Trail) partagé de DigitalVision.
// Enregistre chaque action de l'équipe (qui a créé quoi, déplacé une opportunité, programmé un appel, etc.)
// dans Neon Postgres (collection 'activite').

import { lireCollection, ecrireCollection } from './db'
import type { ActiviteDV } from './dv-types'
import { servicePush } from './dv-push'

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

  async enregistrer(
    activite: Omit<ActiviteDV, 'id' | 'date'>,
    options?: { notifierPush?: boolean },
  ): Promise<ActiviteDV> {
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

    // Déclencher la notification Push universelle en arrière-plan
    if (options?.notifierPush !== false) {
      servicePush.envoyerSelonActivite(nouvel).catch((err) => {
        console.error('Erreur lors de l’envoi push automatique:', err)
      })
    }

    return nouvel
  }
}

export const magasinActivite = new MagasinActivite()

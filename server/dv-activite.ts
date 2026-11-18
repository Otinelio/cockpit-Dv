// Journal d'activité (Audit Trail) partagé de DigitalVision.
// Enregistre chaque action de l'équipe (qui a créé quoi, déplacé une opportunité, programmé un appel, etc.)
// dans .cockpit/activite.json.

import { promises as fs } from 'node:fs'
import path from 'node:path'
import { dossierCockpit } from './stockage-chemin'
import type { ActiviteDV } from './dv-types'

const dossier = dossierCockpit()
const fichier = path.join(dossier, 'activite.json')

export class MagasinActivite {
  private memoire: ActiviteDV[] | null = null
  private ecriture: Promise<void> = Promise.resolve()

  private async lire(): Promise<ActiviteDV[]> {
    if (this.memoire) return this.memoire
    try {
      this.memoire = JSON.parse(await fs.readFile(fichier, 'utf8')) as ActiviteDV[]
    } catch {
      this.memoire = []
    }
    return this.memoire
  }

  private async sauvegarder(donnees: ActiviteDV[]) {
    this.memoire = donnees
    this.ecriture = this.ecriture.then(async () => {
      await fs.mkdir(dossier, { recursive: true })
      const tmp = `${fichier}.${process.pid}.tmp`
      await fs.writeFile(tmp, JSON.stringify(donnees, null, 2) + '\n', 'utf8')
      await fs.rename(tmp, fichier)
    })
    await this.ecriture
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


// Gestion des contrats de prestation, maintenance et conventions de DigitalVision.
// Stocké dans .cockpit/contrats.json.

import { promises as fs } from 'node:fs'
import path from 'node:path'
import { dossierCockpit } from './stockage-chemin'
import type { ContratDV } from './dv-types'

const dossier = dossierCockpit()
const fichier = path.join(dossier, 'contrats.json')

export class MagasinContrats {
  private memoire: ContratDV[] | null = null
  private ecriture: Promise<void> = Promise.resolve()

  private async lire(): Promise<ContratDV[]> {
    if (this.memoire) return this.memoire
    try {
      this.memoire = JSON.parse(await fs.readFile(fichier, 'utf8')) as ContratDV[]
    } catch {
      this.memoire = []
      await this.sauvegarder(this.memoire)
    }
    return this.memoire
  }

  private async sauvegarder(donnees: ContratDV[]) {
    this.memoire = donnees
    this.ecriture = this.ecriture.then(async () => {
      await fs.mkdir(dossier, { recursive: true })
      const tmp = `${fichier}.${process.pid}.tmp`
      await fs.writeFile(tmp, JSON.stringify(donnees, null, 2) + '\n', 'utf8')
      await fs.rename(tmp, fichier)
    })
    await this.ecriture
  }

  async lister(): Promise<ContratDV[]> {
    return this.lire()
  }

  async obtenir(id: string): Promise<ContratDV | null> {
    const list = await this.lire()
    return list.find((c) => c.id === id) ?? null
  }

  async ajouter(contrat: Omit<ContratDV, 'id' | 'creeLe'>): Promise<ContratDV> {
    const list = await this.lire()
    const nouvel: ContratDV = {
      id: `ctr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      creeLe: new Date().toISOString(),
      ...contrat,
    }
    list.unshift(nouvel)
    await this.sauvegarder(list)
    return nouvel
  }

  async modifier(id: string, modifs: Partial<Omit<ContratDV, 'id' | 'creeLe'>>): Promise<ContratDV | null> {
    const list = await this.lire()
    const idx = list.findIndex((c) => c.id === id)
    if (idx === -1) return null
    list[idx] = { ...list[idx], ...modifs }
    await this.sauvegarder(list)
    return list[idx]
  }

  async supprimer(id: string): Promise<boolean> {
    const list = await this.lire()
    const filtre = list.filter((c) => c.id !== id)
    if (filtre.length === list.length) return false
    await this.sauvegarder(filtre)
    return true
  }
}

export const magasinContrats = new MagasinContrats()


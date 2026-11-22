// Gestion des contrats de prestation, maintenance et conventions de DigitalVision.
// Stocké dans Neon Postgres (collection 'contrats').

import { lireCollection, ecrireCollection } from './db'
import type { ContratDV } from './dv-types'

export class MagasinContrats {
  private memoire: ContratDV[] | null = null

  private async lire(): Promise<ContratDV[]> {
    if (this.memoire) return this.memoire
    this.memoire = await lireCollection<ContratDV[]>('contrats', [])
    return this.memoire
  }

  private async sauvegarder(donnees: ContratDV[]) {
    this.memoire = donnees
    await ecrireCollection<ContratDV[]>('contrats', donnees)
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

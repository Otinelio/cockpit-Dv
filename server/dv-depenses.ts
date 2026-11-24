// Gestion des dépenses et sorties d'argent de DigitalVision.
// Stocké dans Neon Postgres (collection 'depenses').

import { lireCollection, ecrireCollection } from './db'
import type { DepenseDV } from './dv-types'

function depensesInitiales(): DepenseDV[] {
  const moisCourant = new Date().toISOString().slice(0, 7)
  return [
    {
      id: 'd-1',
      date: `${moisCourant}-01`,
      libelle: 'Abonnement Lovable & Outils de développement AI',
      montantFCFA: 15000,
      categorie: 'tech',
      payePar: 'Othnelio',
      note: 'Pour la génération rapide des interfaces et composants apps',
      creePar: 'Othnelio',
      creeeLe: new Date().toISOString(),
    },
    {
      id: 'd-2',
      date: `${moisCourant}-02`,
      libelle: 'Serveur VPS & Noms de domaine',
      montantFCFA: 20000,
      categorie: 'hebergement',
      payePar: 'Othnelio',
      note: 'Hébergement MivaFid et environnements de tests clients',
      creePar: 'Othnelio',
      creeeLe: new Date().toISOString(),
    },
    {
      id: 'd-3',
      date: `${moisCourant}-05`,
      libelle: 'Connexion Internet Fibre & Data Équipe',
      montantFCFA: 30000,
      categorie: 'administratif',
      payePar: 'Roméo',
      note: 'Box bureau + recharges data pour les prospections terrain',
      creePar: 'Roméo',
      creeeLe: new Date().toISOString(),
    },
  ]
}

export class MagasinDepenses {
  private async lire(): Promise<DepenseDV[]> {
    return lireCollection<DepenseDV[]>('depenses', depensesInitiales())
  }

  private async sauvegarder(donnees: DepenseDV[]) {
    await ecrireCollection<DepenseDV[]>('depenses', donnees)
  }

  async lister(): Promise<DepenseDV[]> {
    return this.lire()
  }

  async ajouter(depense: Omit<DepenseDV, 'id' | 'creeeLe'>): Promise<DepenseDV> {
    const list = await this.lire()
    const nouvel: DepenseDV = {
      id: `d-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      creeeLe: new Date().toISOString(),
      ...depense,
    }
    list.unshift(nouvel)
    await this.sauvegarder(list)
    return nouvel
  }

  async supprimer(id: string): Promise<boolean> {
    const list = await this.lire()
    const filtre = list.filter((d) => d.id !== id)
    if (filtre.length === list.length) return false
    await this.sauvegarder(filtre)
    return true
  }

  async dissocierContrat(contratId: string): Promise<number> {
    const list = await this.lire()
    let modifies = 0
    for (const d of list) {
      if (d.contratId === contratId) {
        d.contratId = undefined
        modifies++
      }
    }
    if (modifies > 0) {
      await this.sauvegarder(list)
    }
    return modifies
  }

  async modifier(id: string, modifs: Partial<Omit<DepenseDV, 'id' | 'creeeLe'>>): Promise<DepenseDV | null> {
    const list = await this.lire()
    const idx = list.findIndex((d) => d.id === id)
    if (idx === -1) return null
    list[idx] = { ...list[idx], ...modifs }
    await this.sauvegarder(list)
    return list[idx]
  }
}

export const magasinDepenses = new MagasinDepenses()

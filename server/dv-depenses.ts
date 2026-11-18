// Gestion des dépenses et sorties d'argent de DigitalVision.
// Stocké dans .cockpit/depenses.json.

import { promises as fs } from 'node:fs'
import path from 'node:path'
import { dossierCockpit } from './stockage-chemin'
import type { DepenseDV } from './dv-types'

const dossier = dossierCockpit()
const fichier = path.join(dossier, 'depenses.json')

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
  private memoire: DepenseDV[] | null = null
  private ecriture: Promise<void> = Promise.resolve()

  private async lire(): Promise<DepenseDV[]> {
    if (this.memoire) return this.memoire
    try {
      this.memoire = JSON.parse(await fs.readFile(fichier, 'utf8')) as DepenseDV[]
    } catch {
      this.memoire = depensesInitiales()
      await this.sauvegarder(this.memoire)
    }
    return this.memoire
  }

  private async sauvegarder(donnees: DepenseDV[]) {
    this.memoire = donnees
    this.ecriture = this.ecriture.then(async () => {
      await fs.mkdir(dossier, { recursive: true })
      const tmp = `${fichier}.${process.pid}.tmp`
      await fs.writeFile(tmp, JSON.stringify(donnees, null, 2) + '\n', 'utf8')
      await fs.rename(tmp, fichier)
    })
    await this.ecriture
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

  async totalMois(mois?: string): Promise<number> {
    const list = await this.lire()
    const prefixe = mois || new Date().toISOString().slice(0, 7)
    return list
      .filter((d) => d.date.startsWith(prefixe))
      .reduce((sum, d) => sum + d.montantFCFA, 0)
  }
}

export const magasinDepenses = new MagasinDepenses()


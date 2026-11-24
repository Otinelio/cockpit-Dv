// Gestionnaire des tâches, prospections et appels d'équipe de DigitalVision.
// Stocké dans Neon Postgres (collection 'taches').

import { lireCollection, ecrireCollection } from './db'
import type { TacheDV } from './dv-types'

function tachesInitiales(): TacheDV[] {
  const aujourdhui = new Date().toISOString().slice(0, 10)
  return [
    {
      id: 't-1',
      titre: 'Intégrer le système de fidélité par tampons sur MivaFid',
      description: 'Développer le composant de carte à tampons virtuelle côté app mobile client.',
      type: 'dev_saas',
      assigneA: 'Othnelio',
      creePar: 'Othnelio',
      statut: 'en_cours',
      priorite: 'haute',
      echeance: aujourdhui,
      heure: '15:00',
      saasId: 'mivafid',
      creeeLe: new Date().toISOString(),
    },
    {
      id: 't-2',
      titre: 'Démarcher 5 restaurants à Lomé pour tester la démo MivaFid',
      description: 'Présenter la solution de fidélisation aux gérants et récolter leurs retours sur les offres.',
      type: 'prospection',
      assigneA: 'Medard',
      creePar: 'Medard',
      statut: 'a_faire',
      priorite: 'urgente',
      echeance: aujourdhui,
      heure: '11:00',
      saasId: 'mivafid',
      creeeLe: new Date().toISOString(),
    },
    {
      id: 't-3',
      titre: 'Prise de contact avec les ateliers de couture partenaires (MivaCouture)',
      description: 'Recueillir la grille de mesures standard des tailleurs de Lomé pour la personnalisation.',
      type: 'appel',
      assigneA: 'Roméo',
      creePar: 'Roméo',
      statut: 'a_faire',
      priorite: 'haute',
      echeance: aujourdhui,
      heure: '14:30',
      saasId: 'mivacouture',
      creeeLe: new Date().toISOString(),
    },
    {
      id: 't-4',
      titre: 'Point d’équipe hebdomadaire DigitalVision',
      description: 'Revue des objectifs de la semaine, trésorerie et avancement des projets clients & SaaS.',
      type: 'reunion',
      assigneA: 'Othnelio',
      creePar: 'Roméo',
      statut: 'a_faire',
      priorite: 'normale',
      echeance: aujourdhui,
      heure: '18:00',
      creeeLe: new Date().toISOString(),
    },
  ]
}

export class MagasinTaches {
  private async lire(): Promise<TacheDV[]> {
    return lireCollection<TacheDV[]>('taches', tachesInitiales())
  }

  private async sauvegarder(donnees: TacheDV[]) {
    await ecrireCollection<TacheDV[]>('taches', donnees)
  }

  async lister(): Promise<TacheDV[]> {
    return this.lire()
  }

  async ajouter(tache: Omit<TacheDV, 'id' | 'creeeLe'>): Promise<TacheDV> {
    const list = await this.lire()
    const nouvel: TacheDV = {
      id: `t-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      creeeLe: new Date().toISOString(),
      ...tache,
    }
    list.unshift(nouvel)
    await this.sauvegarder(list)
    return nouvel
  }

  async modifier(id: string, modifs: Partial<Omit<TacheDV, 'id' | 'creeeLe'>>): Promise<TacheDV | null> {
    const list = await this.lire()
    const idx = list.findIndex((t) => t.id === id)
    if (idx === -1) return null
    if (modifs.statut === 'terminee' && list[idx].statut !== 'terminee') {
      modifs.termineeLe = new Date().toISOString()
    } else if (modifs.statut && modifs.statut !== 'terminee') {
      modifs.termineeLe = undefined
    }
    list[idx] = { ...list[idx], ...modifs }
    await this.sauvegarder(list)
    return list[idx]
  }

  async marquerSupprimeesParContrat(contratId: string): Promise<number> {
    const list = await this.lire()
    let modifies = 0
    for (const t of list) {
      if (t.contratId === contratId && t.statut !== 'supprimee') {
        t.statut = 'supprimee'
        t.estSupprime = true
        t.supprimeLe = new Date().toISOString()
        modifies++
      }
    }
    if (modifies > 0) {
      await this.sauvegarder(list)
    }
    return modifies
  }

  async restaurerParContrat(contratId: string): Promise<number> {
    const list = await this.lire()
    let modifies = 0
    for (const t of list) {
      if (t.contratId === contratId && t.statut === 'supprimee') {
        t.statut = t.termineeLe ? 'terminee' : 'a_faire'
        t.estSupprime = false
        t.supprimeLe = undefined
        modifies++
      }
    }
    if (modifies > 0) {
      await this.sauvegarder(list)
    }
    return modifies
  }

  async marquerSupprimeesParEntreprise(entrepriseId: string, nomEntreprise?: string): Promise<number> {
    const list = await this.lire()
    const nomLower = nomEntreprise?.trim().toLowerCase()
    let modifies = 0
    for (const t of list) {
      const matchId = t.entrepriseId === entrepriseId
      const matchNom = !!(nomLower && t.nomEntreprise && t.nomEntreprise.trim().toLowerCase() === nomLower)
      if ((matchId || matchNom) && t.statut !== 'supprimee') {
        t.statut = 'supprimee'
        t.estSupprime = true
        t.supprimeLe = new Date().toISOString()
        modifies++
      }
    }
    if (modifies > 0) {
      await this.sauvegarder(list)
    }
    return modifies
  }

  async restaurerParEntreprise(entrepriseId: string, nomEntreprise?: string): Promise<number> {
    const list = await this.lire()
    const nomLower = nomEntreprise?.trim().toLowerCase()
    let modifies = 0
    for (const t of list) {
      const matchId = t.entrepriseId === entrepriseId
      const matchNom = !!(nomLower && t.nomEntreprise && t.nomEntreprise.trim().toLowerCase() === nomLower)
      if ((matchId || matchNom) && t.statut === 'supprimee') {
        t.statut = t.termineeLe ? 'terminee' : 'a_faire'
        t.estSupprime = false
        t.supprimeLe = undefined
        modifies++
      }
    }
    if (modifies > 0) {
      await this.sauvegarder(list)
    }
    return modifies
  }

  async supprimer(id: string): Promise<boolean> {
    const list = await this.lire()
    const filtre = list.filter((t) => t.id !== id)
    if (filtre.length === list.length) return false
    await this.sauvegarder(filtre)
    return true
  }

  async supprimerParContrat(contratId: string): Promise<number> {
    const list = await this.lire()
    const avant = list.length
    const filtre = list.filter((t) => t.contratId !== contratId)
    const supprimees = avant - filtre.length
    if (supprimees > 0) {
      await this.sauvegarder(filtre)
    }
    return supprimees
  }

  async supprimerParEntreprise(entrepriseId: string, nomEntreprise?: string): Promise<number> {
    const list = await this.lire()
    const avant = list.length
    const nomLower = nomEntreprise?.trim().toLowerCase()
    const filtre = list.filter(
      (t) =>
        t.entrepriseId !== entrepriseId &&
        (!nomLower || !t.nomEntreprise || t.nomEntreprise.trim().toLowerCase() !== nomLower),
    )
    const supprimees = avant - filtre.length
    if (supprimees > 0) {
      await this.sauvegarder(filtre)
    }
    return supprimees
  }
}

export const magasinTaches = new MagasinTaches()

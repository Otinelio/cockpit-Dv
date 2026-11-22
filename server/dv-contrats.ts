// Gestion des contrats de prestation, maintenance et conventions de DigitalVision.
// Stocké dans Neon Postgres (collection 'contrats').

import { lireCollection, ecrireCollection } from './db'
import type { ContratDV } from './dv-types'

export class MagasinContrats {
  private async lire(): Promise<ContratDV[]> {
    return lireCollection<ContratDV[]>('contrats', [])
  }

  private async sauvegarder(donnees: ContratDV[]) {
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

    // Synchronisation en cascade de la facture liée si le prix, la TVA ou le statut change
    if (modifs.montantFCFA !== undefined || modifs.tvaTaux !== undefined || modifs.statut !== undefined) {
      try {
        const fichierFactures = await lireCollection<{
          prochainId: number
          factures: Array<{
            id: number
            montantHT: number
            tauxTva: number
            numero: string
            date: string | null
            echeance: string | null
            echeanceJours: number
            contratId?: string
            payeeLe?: string | null
          }>
        }>('factures', { prochainId: 1, factures: [] })
        let change = false
        const date = new Date().toLocaleDateString('sv-SE')
        for (const f of fichierFactures.factures) {
          if (f.contratId === id) {
            if (modifs.montantFCFA !== undefined && !f.payeeLe) {
              f.montantHT = Math.round(Number(modifs.montantFCFA) || 0)
              change = true
            }
            if (modifs.tvaTaux !== undefined && !f.payeeLe) {
              f.tauxTva = modifs.tvaTaux === 18 ? 0.18 : 0
              change = true
            }
            // Si le contrat passe à terminé et que la facture était en brouillon, la valider immédiatement pour actualiser le CA
            if (modifs.statut === 'termine' && !f.numero) {
              const prefixe = `F-${date.slice(0, 4)}-`
              const dernier = Math.max(
                0,
                ...fichierFactures.factures
                  .filter((x) => x.numero && x.numero.startsWith(prefixe))
                  .map((x) => Number(x.numero.slice(prefixe.length)) || 0),
              )
              f.numero = prefixe + String(dernier + 1).padStart(4, '0')
              f.date = date
              const d = new Date(date)
              d.setDate(d.getDate() + (f.echeanceJours || 15))
              f.echeance = d.toLocaleDateString('sv-SE')
              change = true
            }
          }
        }
        if (change) await ecrireCollection('factures', fichierFactures)
      } catch (err) {
        console.error('Erreur synchronisation factures liées au contrat:', err)
      }
    }

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

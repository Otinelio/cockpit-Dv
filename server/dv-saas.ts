// Gestion du pôle SaaStup (Produits SaaS) de DigitalVision.
// Stocké dans Neon Postgres (collection 'saas').

import { lireCollection, ecrireCollection } from './db'
import type { SaasDV } from './dv-types'

function saasInitiaux(): SaasDV[] {
  const aujourdhui = new Date().toISOString()
  return [
    {
      id: 'mivafid',
      nom: 'MivaFid',
      slogan: 'Fidélisation & CRM digital pour restaurants et bars',
      description:
        'Solution SaaS permettant aux établissements de restauration de créer et gérer leurs programmes de fidélité digitaux (tampons, points, cashback, offres VIP). Offre une application mobile unique pour les clients centralisant leurs cartes et récompenses.',
      statut: 'beta',
      leadTech: 'Othnelio',
      leadMarketing: 'Medard',
      leadOps: 'Roméo',
      url: 'https://mivafid.digitalvision.tg',
      depotGit: 'github.com/digitalvision/mivafid',
      mrrFCFA: 0,
      objectifMrrFCFA: 500000,
      utilisateurs: 12,
      jalons: [
        { id: 'j-1', titre: 'App mobile client (tampons & points)', description: 'Interface Flutter / React Native', termine: true },
        { id: 'j-2', titre: 'Dashboard restaurateur (gestion des offres & QR)', description: 'Portail web de validation', termine: true },
        { id: 'j-3', titre: 'Phase pilote auprès de 5 restaurants à Lomé', description: 'Recueil des retours utilisateurs', termine: false },
        { id: 'j-4', titre: 'Intégration paiements locaux (T-Money & Flooz)', description: 'Abonnements automatiques', termine: false },
      ],
      documents: [
        { id: 'doc-1', titre: 'Pitch & Présentation commerciale', type: 'maquette', urlOuContenu: 'https://drive.google.com/mivafid-pitch', date: aujourdhui.slice(0, 10) },
        { id: 'doc-2', titre: 'Spécifications techniques & API', type: 'fiche_technique', urlOuContenu: 'Architecture backend et schéma base de données', date: aujourdhui.slice(0, 10) },
      ],
      creeLe: aujourdhui,
      misAJourLe: aujourdhui,
    },
    {
      id: 'mivacouture',
      nom: 'MivaCouture',
      slogan: "L'application de gestion complète pour ateliers de couture et créateurs",
      description:
        'Application permettant aux couturiers et ateliers de prendre et archiver les mesures des clients, suivre les commandes et créations en cours, gérer les délais et stocker les patrons/fiches techniques en toute simplicité.',
      statut: 'prototypage',
      leadTech: 'Othnelio',
      leadMarketing: 'Medard',
      leadOps: 'Roméo',
      url: 'https://mivacouture.digitalvision.tg',
      depotGit: 'github.com/digitalvision/mivacouture',
      mrrFCFA: 0,
      objectifMrrFCFA: 350000,
      utilisateurs: 4,
      jalons: [
        { id: 'jc-1', titre: 'Prise de mesures sur mesure & fiches clients', description: 'Grille morphologique paramétrable', termine: true },
        { id: 'jc-2', titre: 'Gestion des commandes et dates de livraison', description: 'Planning d’atelier et statut', termine: false },
        { id: 'jc-3', titre: 'Partage de fiches & documents avec le client', description: 'Génération de fiches récapitulatives', termine: false },
      ],
      documents: [
        { id: 'doc-c1', titre: 'Grille standard des mesures tailleurs', type: 'fiche_technique', urlOuContenu: 'Modèle de mensurations homme/femme Togo', date: aujourdhui.slice(0, 10) },
      ],
      creeLe: aujourdhui,
      misAJourLe: aujourdhui,
    },
  ]
}

export class MagasinSaas {
  private memoire: SaasDV[] | null = null

  private async lire(): Promise<SaasDV[]> {
    if (this.memoire) return this.memoire
    this.memoire = await lireCollection<SaasDV[]>('saas', saasInitiaux())
    return this.memoire
  }

  private async sauvegarder(donnees: SaasDV[]) {
    this.memoire = donnees
    await ecrireCollection<SaasDV[]>('saas', donnees)
  }

  async lister(): Promise<SaasDV[]> {
    return this.lire()
  }

  async obtenir(id: string): Promise<SaasDV | null> {
    const list = await this.lire()
    return list.find((s) => s.id === id) ?? null
  }

  async ajouter(saas: Omit<SaasDV, 'id' | 'creeLe' | 'misAJourLe'>): Promise<SaasDV> {
    const list = await this.lire()
    const aujourdhui = new Date().toISOString()
    const id = saas.nom.toLowerCase().replace(/[^a-z0-9]/g, '-') || `saas-${Date.now()}`
    const nouvel: SaasDV = {
      id,
      creeLe: aujourdhui,
      misAJourLe: aujourdhui,
      ...saas,
    }
    list.push(nouvel)
    await this.sauvegarder(list)
    return nouvel
  }

  async modifier(id: string, modifs: Partial<Omit<SaasDV, 'id' | 'creeLe'>>): Promise<SaasDV | null> {
    const list = await this.lire()
    const idx = list.findIndex((s) => s.id === id)
    if (idx === -1) return null
    list[idx] = {
      ...list[idx],
      ...modifs,
      misAJourLe: new Date().toISOString(),
    }
    await this.sauvegarder(list)
    return list[idx]
  }

  async supprimer(id: string): Promise<boolean> {
    const list = await this.lire()
    const filtre = list.filter((s) => s.id !== id)
    if (filtre.length === list.length) return false
    await this.sauvegarder(filtre)
    return true
  }
}

export const magasinSaas = new MagasinSaas()

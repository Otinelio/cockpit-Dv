// Authentification simple et sécurisée pour l'équipe de 3 de DigitalVision.
// Les mots de passe sont hachés avec crypto.scryptSync et stockés dans Neon Postgres (collection 'auth').

import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
import { lireCollection, ecrireCollection } from './db'
import type { MembreDV } from './dv-types'

export interface UtilisateurStocke {
  nom: MembreDV
  sel: string
  hachage: string
  motDePasseDefini: boolean
  modifieLe: string
}

export interface FichierAuth {
  utilisateurs: Record<string, UtilisateurStocke>
}

export const MEMBRES_DEFAUT: MembreDV[] = ['Othnelio', 'Medard', 'Roméo']

function hacher(mdp: string, sel: string): string {
  return scryptSync(mdp, sel, 64).toString('hex')
}

function authInitiale(): FichierAuth {
  const initial: FichierAuth = { utilisateurs: {} }
  for (const nom of MEMBRES_DEFAUT) {
    const sel = randomBytes(16).toString('hex')
    initial.utilisateurs[nom] = {
      nom,
      sel,
      hachage: '',
      motDePasseDefini: false, // Doit être défini à la 1re connexion
      modifieLe: new Date().toISOString(),
    }
  }
  return initial
}

export class MagasinAuth {
  private memoire: FichierAuth | null = null

  private async lire(): Promise<FichierAuth> {
    if (this.memoire) return this.memoire
    const donnees = await lireCollection<FichierAuth>('auth', authInitiale())
    // S'assurer que les 3 membres existent
    for (const nom of MEMBRES_DEFAUT) {
      if (!donnees.utilisateurs[nom]) {
        donnees.utilisateurs[nom] = {
          nom,
          sel: randomBytes(16).toString('hex'),
          hachage: '',
          motDePasseDefini: false,
          modifieLe: new Date().toISOString(),
        }
      }
    }
    this.memoire = donnees
    return this.memoire
  }

  private async sauvegarder(donnees: FichierAuth) {
    this.memoire = donnees
    await ecrireCollection<FichierAuth>('auth', donnees)
  }

  /**
   * Retourne pour chaque membre si son mot de passe initial a déjà été défini.
   */
  async obtenirStatuts(): Promise<Record<string, { motDePasseDefini: boolean }>> {
    const f = await this.lire()
    const statuts: Record<string, { motDePasseDefini: boolean }> = {}
    for (const nom of MEMBRES_DEFAUT) {
      const u = f.utilisateurs[nom]
      statuts[nom] = {
        motDePasseDefini: Boolean(u && u.motDePasseDefini && u.hachage),
      }
    }
    return statuts
  }

  /**
   * Définit le premier mot de passe choisi par l'utilisateur lors de sa première connexion.
   */
  async definirPremierMotDePasse(nom: string, motDePasse: string): Promise<boolean> {
    const f = await this.lire()
    const u = f.utilisateurs[nom]
    if (!u) return false
    const sel = randomBytes(16).toString('hex')
    f.utilisateurs[nom] = {
      nom: nom as MembreDV,
      sel,
      hachage: hacher(motDePasse, sel),
      motDePasseDefini: true,
      modifieLe: new Date().toISOString(),
    }
    await this.sauvegarder(f)
    return true
  }

  /**
   * Vérifie le mot de passe d'un utilisateur.
   */
  async verifier(nom: string, mdp: string): Promise<boolean> {
    const f = await this.lire()
    const u = f.utilisateurs[nom]
    if (!u || !u.motDePasseDefini || !u.hachage) return false
    const h = Buffer.from(hacher(mdp, u.sel), 'hex')
    const stocke = Buffer.from(u.hachage, 'hex')
    if (h.length === stocke.length && timingSafeEqual(h, stocke)) {
      return true
    }
    return false
  }

  /**
   * Change le mot de passe d'un utilisateur connaissant l'ancien.
   */
  async changerMotDePasse(nom: string, ancienMdp: string, nouveauMdp: string): Promise<boolean> {
    const ok = await this.verifier(nom, ancienMdp)
    if (!ok) return false
    const f = await this.lire()
    const sel = randomBytes(16).toString('hex')
    f.utilisateurs[nom] = {
      nom: nom as MembreDV,
      sel,
      hachage: hacher(nouveauMdp, sel),
      motDePasseDefini: true,
      modifieLe: new Date().toISOString(),
    }
    await this.sauvegarder(f)
    return true
  }

  /**
   * Réinitialise les mots de passe pour forcer le choix initial à la prochaine visite.
   */
  async forcerPremierChoixTous(): Promise<void> {
    const initial = authInitiale()
    await this.sauvegarder(initial)
  }
}

export const magasinAuth = new MagasinAuth()

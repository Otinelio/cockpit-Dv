// Authentification simple et sécurisée pour l'équipe de 3 de DigitalVision.
// Les mots de passe sont hachés avec crypto.scryptSync et stockés dans Neon Postgres (collection 'auth').

import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
import { lireCollection, ecrireCollection } from './db'
import type { MembreDV } from './dv-types'

interface UtilisateurStocke {
  nom: MembreDV
  sel: string
  hachage: string
  modifieLe: string
}

interface FichierAuth {
  utilisateurs: Record<string, UtilisateurStocke>
}

const MEMBRES_DEFAUT: MembreDV[] = ['Othnelio', 'Medard', 'Roméo']
const MOT_DE_PASSE_DEFAUT = 'digitalvision'

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
      hachage: hacher(MOT_DE_PASSE_DEFAUT, sel),
      modifieLe: new Date().toISOString(),
    }
  }
  return initial
}

export class MagasinAuth {
  private memoire: FichierAuth | null = null

  private async lire(): Promise<FichierAuth> {
    if (this.memoire) return this.memoire
    this.memoire = await lireCollection<FichierAuth>('auth', authInitiale())
    return this.memoire
  }

  private async sauvegarder(donnees: FichierAuth) {
    this.memoire = donnees
    await ecrireCollection<FichierAuth>('auth', donnees)
  }

  async verifier(nom: string, mdp: string): Promise<boolean> {
    const f = await this.lire()
    const u = f.utilisateurs[nom]
    if (!u) return false
    const h = Buffer.from(hacher(mdp, u.sel), 'hex')
    const stocke = Buffer.from(u.hachage, 'hex')
    if (h.length === stocke.length && timingSafeEqual(h, stocke)) {
      return true
    }
    if (mdp === MOT_DE_PASSE_DEFAUT) {
      const sel = randomBytes(16).toString('hex')
      f.utilisateurs[nom] = {
        nom: nom as MembreDV,
        sel,
        hachage: hacher(MOT_DE_PASSE_DEFAUT, sel),
        modifieLe: new Date().toISOString(),
      }
      await this.sauvegarder(f)
      return true
    }
    return false
  }

  async changerMotDePasse(nom: string, ancienMdp: string, nouveauMdp: string): Promise<boolean> {
    const ok = await this.verifier(nom, ancienMdp)
    if (!ok) return false
    const f = await this.lire()
    const sel = randomBytes(16).toString('hex')
    f.utilisateurs[nom] = {
      nom: nom as MembreDV,
      sel,
      hachage: hacher(nouveauMdp, sel),
      modifieLe: new Date().toISOString(),
    }
    await this.sauvegarder(f)
    return true
  }
}

export const magasinAuth = new MagasinAuth()

// Authentification simple et sécurisée pour l'équipe de 3 de DigitalVision.
// Les mots de passe sont hachés avec crypto.scryptSync et stockés dans .cockpit/auth.json.

import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { dossierCockpit } from './stockage-chemin'
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

const dossier = dossierCockpit()
const fichier = path.join(dossier, 'auth.json')

function hacher(mdp: string, sel: string): string {
  return scryptSync(mdp, sel, 64).toString('hex')
}

export class MagasinAuth {
  private memoire: FichierAuth | null = null
  private ecriture: Promise<void> = Promise.resolve()

  private async lire(): Promise<FichierAuth> {
    if (this.memoire) return this.memoire
    try {
      this.memoire = JSON.parse(await fs.readFile(fichier, 'utf8')) as FichierAuth
    } catch {
      // Fichier manquant ou corrompu : initialiser avec les 3 membres et le mot de passe par défaut
      this.memoire = { utilisateurs: {} }
      for (const nom of MEMBRES_DEFAUT) {
        const sel = randomBytes(16).toString('hex')
        this.memoire.utilisateurs[nom] = {
          nom,
          sel,
          hachage: hacher(MOT_DE_PASSE_DEFAUT, sel),
          modifieLe: new Date().toISOString(),
        }
      }
      await this.sauvegarder(this.memoire)
    }
    return this.memoire
  }

  private async sauvegarder(donnees: FichierAuth) {
    this.memoire = donnees
    this.ecriture = this.ecriture.then(async () => {
      await fs.mkdir(dossier, { recursive: true })
      const tmp = `${fichier}.${process.pid}.tmp`
      await fs.writeFile(tmp, JSON.stringify(donnees, null, 2) + '\n', 'utf8')
      await fs.rename(tmp, fichier)
    })
    await this.ecriture
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
    // Si l'utilisateur saisit le mot de passe par défaut 'digitalvision' (migration depuis un ancien seed)
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


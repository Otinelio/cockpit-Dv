// Service de notifications Web Push (PWA & Navigateurs) pour Cockpit DigitalVision.
// Stockage des clés VAPID et des souscriptions dans Neon Postgres.

import * as webpush from 'web-push'
import { lireCollection, ecrireCollection } from './db'
import type { ActiviteDV, CategorieActiviteDV } from './dv-types'

export interface AbonnementPushDV {
  id: string
  endpoint: string
  keys: {
    p256dh: string
    auth: string
  }
  auteur: string
  creeLe: string
  userAgent?: string
}

interface ConfigurationSysteme {
  cle: string
  valeur: unknown
}

interface VapidKeys {
  publicKey: string
  privateKey: string
}

const SUJET_VAPID = 'mailto:contact@digitalvision.tg'

let vapidInitialise = false
let clePubliqueCache: string | null = null

async function initialiserVapid(): Promise<VapidKeys> {
  const configs = await lireCollection<ConfigurationSysteme[]>('configuration_systeme', [])
  const entree = configs.find((c) => c.cle === 'vapid_keys')
  let keys = entree ? (entree.valeur as VapidKeys) : null

  if (!keys || !keys.publicKey || !keys.privateKey) {
    keys = webpush.generateVAPIDKeys()
    if (entree) {
      entree.valeur = keys
    } else {
      configs.push({ cle: 'vapid_keys', valeur: keys })
    }
    await ecrireCollection('configuration_systeme', configs)
  }

  if (!vapidInitialise) {
    webpush.setVapidDetails(SUJET_VAPID, keys.publicKey, keys.privateKey)
    vapidInitialise = true
    clePubliqueCache = keys.publicKey
  }

  return keys
}

export class ServicePush {
  async obtenirClePublique(): Promise<string> {
    if (clePubliqueCache) return clePubliqueCache
    const keys = await initialiserVapid()
    return keys.publicKey
  }

  async souscrire(sub: {
    endpoint: string
    keys: { p256dh: string; auth: string }
    auteur: string
    userAgent?: string
  }): Promise<AbonnementPushDV> {
    await initialiserVapid()
    const abos = await lireCollection<AbonnementPushDV[]>('abonnements_push', [])
    const existantIdx = abos.findIndex((a) => a.endpoint === sub.endpoint)

    const abonnement: AbonnementPushDV = {
      id: existantIdx >= 0 ? abos[existantIdx].id : `push-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      endpoint: sub.endpoint,
      keys: sub.keys,
      auteur: sub.auteur,
      creeLe: new Date().toISOString(),
      userAgent: sub.userAgent,
    }

    if (existantIdx >= 0) {
      abos[existantIdx] = abonnement
    } else {
      abos.unshift(abonnement)
    }

    await ecrireCollection('abonnements_push', abos)
    return abonnement
  }

  async desinscrire(endpoint: string): Promise<boolean> {
    const abos = await lireCollection<AbonnementPushDV[]>('abonnements_push', [])
    const filtre = abos.filter((a) => a.endpoint !== endpoint)
    if (filtre.length === abos.length) return false
    await ecrireCollection('abonnements_push', filtre)
    return true
  }

  async lister(): Promise<AbonnementPushDV[]> {
    return lireCollection<AbonnementPushDV[]>('abonnements_push', [])
  }

  async envoyer(payload: {
    titre: string
    corps: string
    url?: string
    icone?: string
    tag?: string
    badge?: string
    categorie?: CategorieActiviteDV
    data?: Record<string, unknown>
  }): Promise<{ envoyes: number; echecs: number }> {
    await initialiserVapid()
    const abos = await lireCollection<AbonnementPushDV[]>('abonnements_push', [])
    if (abos.length === 0) return { envoyes: 0, echecs: 0 }

    const message = JSON.stringify({
      titre: payload.titre,
      corps: payload.corps,
      url: payload.url || '/',
      icone: payload.icone || '/icons/icon-192.png',
      badge: payload.badge || '/icon.svg',
      tag: payload.tag || `notif-${Date.now()}`,
      categorie: payload.categorie || 'autre',
      data: {
        url: payload.url || '/',
        categorie: payload.categorie || 'autre',
        timestamp: Date.now(),
        ...(payload.data || {}),
      },
      timestamp: Date.now(),
    })

    let envoyes = 0
    let echecs = 0
    const endpointsInvalides: string[] = []

    await Promise.all(
      abos.map(async (abo) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: abo.endpoint,
              keys: abo.keys,
            },
            message,
          )
          envoyes++
        } catch (err: unknown) {
          echecs++
          const statut = (err as { statusCode?: number }).statusCode
          if (statut === 404 || statut === 410) {
            endpointsInvalides.push(abo.endpoint)
          }
        }
      }),
    )

    if (endpointsInvalides.length > 0) {
      const restants = abos.filter((a) => !endpointsInvalides.includes(a.endpoint))
      await ecrireCollection('abonnements_push', restants)
    }

    return { envoyes, echecs }
  }

  async envoyerSelonActivite(activite: ActiviteDV): Promise<{ envoyes: number; echecs: number }> {
    const titreMin = (activite.titre || '').toLowerCase()
    const detailsMin = (activite.details || '').toLowerCase()

    let emoji = '🔔'
    let prefixe = '[INFO]'
    let categorie: CategorieActiviteDV = activite.categorie || 'autre'
    let urlCible = activite.url || '/'

    const estSuppression =
      activite.action === 'suppression' ||
      titreMin.includes('supprim') ||
      titreMin.includes('corbeille') ||
      detailsMin.includes('corbeille')

    const estRestauration =
      activite.action === 'restauration' ||
      titreMin.includes('restaur') ||
      detailsMin.includes('restaur')

    if (estSuppression) {
      emoji = '🗑️'
      prefixe = '[CORBEILLE]'
      categorie = 'suppression'
      if (activite.type === 'contrat') urlCible = '/contrats'
      else if (activite.type === 'facture') urlCible = '/factures'
      else if (activite.type === 'client') urlCible = '/entreprises'
      else if (activite.type === 'tache') urlCible = '/taches'
    } else if (estRestauration) {
      emoji = '♻️'
      prefixe = '[RESTAURÉ]'
      categorie = 'restauration'
      if (activite.type === 'contrat') urlCible = activite.cibleId ? `/contrats?id=${activite.cibleId}` : '/contrats'
      else if (activite.type === 'facture') urlCible = activite.cibleId ? `/factures?id=${activite.cibleId}` : '/factures'
      else if (activite.type === 'client') urlCible = activite.cibleId ? `/entreprises?id=${activite.cibleId}` : '/entreprises'
      else if (activite.type === 'tache') urlCible = activite.cibleId ? `/taches?id=${activite.cibleId}` : '/taches'
    } else if (activite.type === 'tache') {
      const estTermine = activite.action === 'termine' || titreMin.includes('termin') || detailsMin.includes('termin')
      emoji = estTermine ? '✅' : '📌'
      prefixe = '[TÂCHE]'
      categorie = 'tache'
      urlCible = activite.cibleId ? `/taches?id=${activite.cibleId}` : '/taches'
    } else if (activite.type === 'contrat') {
      const estSigne = activite.action === 'signature' || titreMin.includes('sign') || detailsMin.includes('sign')
      emoji = estSigne ? '✍️' : '📄'
      prefixe = '[CONTRAT]'
      categorie = 'contrat'
      urlCible = activite.cibleId ? `/contrats?id=${activite.cibleId}` : '/contrats'
    } else if (activite.type === 'facture') {
      const estPaye = activite.action === 'paiement' || titreMin.includes('pay') || detailsMin.includes('encaiss')
      emoji = estPaye ? '💰' : '💳'
      prefixe = '[FACTURE]'
      categorie = 'facture'
      urlCible = activite.cibleId ? `/factures?id=${activite.cibleId}` : '/factures'
    } else if (activite.type === 'saas') {
      emoji = '🚀'
      prefixe = '[SAAS]'
      categorie = 'saas'
      urlCible = activite.cibleId ? `/saas?id=${activite.cibleId}` : '/saas'
    } else if (activite.type === 'client' || activite.type === 'etape') {
      const estGagne = titreMin.includes('gagné') || detailsMin.includes('gagné')
      emoji = estGagne ? '🎉' : '🏢'
      prefixe = '[CLIENT]'
      categorie = 'client'
      urlCible = activite.cibleId ? `/entreprises?id=${activite.cibleId}` : '/entreprises'
    } else if (activite.type === 'depense') {
      emoji = '💸'
      prefixe = '[DÉPENSE]'
      categorie = 'depense'
      urlCible = '/factures'
    }

    const titrePush = `${emoji} ${prefixe} ${activite.titre}`
    const corpsPush = activite.details
      ? `${activite.details} • par ${activite.auteur}`
      : `Action enregistrée par ${activite.auteur} sur Cockpit.`

    return this.envoyer({
      titre: titrePush,
      corps: corpsPush,
      url: urlCible,
      categorie,
      tag: `act-${activite.type}-${activite.cibleId || activite.id}`,
      data: {
        activiteId: activite.id,
        cibleId: activite.cibleId,
        type: activite.type,
        action: activite.action,
        url: urlCible,
      },
    })
  }
}

export const servicePush = new ServicePush()

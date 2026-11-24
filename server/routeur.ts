// L'API locale de Cockpit, servie par Next.js (app/api/[...chemin]/route.ts et app/payer/[numero]/route.ts).
// Avec PENNYLANE_API_TOKEN dans .env, elle lit ton compte Pennylane. Sans, elle lit le faux Pennylane de la démo
// (faux-pennylane.ts), par le même client : Cockpit est branché dès l'ouverture dans les deux cas.
// Le jeton ne quitte jamais le serveur : la page ne reçoit que des chiffres déjà calculés.

import { ErreurCrm, magasinCrm, type MagasinCrm } from './crm'
import { sourceDemo, type SourceDemo } from './demo'
import { FAUX_PENNYLANE, fauxPennylane } from './faux-pennylane'
import { sourceLocale, type SourceLocale } from './local'
import { pagePaiement } from './page-paiement'
import { sourcePennylane } from './pennylane'
import { calculerTableau } from './tableau'
import type { CodeTva, NouvelleFacture, Source, Tableau } from './types'

import { magasinAuth } from './dv-auth'
import { magasinActivite } from './dv-activite'
import { magasinTaches } from './dv-taches'
import { magasinDepenses } from './dv-depenses'
import { magasinSaas } from './dv-saas'
import { magasinContrats } from './dv-contrats'
import { servicePush } from './dv-push'
import { hubService } from './hub-service'
import type { ActiviteDV, ContratDV, DepenseDV, JalonFacturationDV, ModeFacturationContrat, SaasDV, TacheDV } from './dv-types'
import type { CategorieCoffre, IdentiteEntreprise, ReunionDV, VisionStrategique } from './hub-types'

const TVA: CodeTva[] = ['FR_200', 'FR_100', 'FR_55', 'TG_180', 'exempt']

class ErreurHttp extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
  }
}

type Etat = {
  source: Source
  /** Présent seulement en mode local : les factures et leur PDF sont gardés sur cet ordinateur. */
  local: SourceLocale | null
  demo: SourceDemo
  objectif: number
  cache: { quand: number; tableau: Tableau } | null
  crm: MagasinCrm
}

// Une seule instance pour tout le serveur, même quand Next.js recharge un module en développement.
function etat(): Etat {
  const g = globalThis as typeof globalThis & { __cockpit?: Etat }
  if (!g.__cockpit) {
    const jeton = process.env.PENNYLANE_API_TOKEN?.trim()
    // Trois modes : Pennylane (jeton dans .env), la démo (COCKPIT_MODE=demo) et, par défaut, le mode local.
    const mode = jeton ? 'pennylane' : process.env.COCKPIT_MODE?.trim().toLowerCase() === 'demo' ? 'demo' : 'local'
    const demo = sourceDemo()
    const crm = magasinCrm(mode)
    const local = mode === 'local' ? sourceLocale(crm) : null
    // Le lien de paiement de la démo reste la page simulée (/payer/…) : le PDF de Pennylane n'existe pas ici.
    const source: Source =
      local ??
      (jeton
        ? sourcePennylane(jeton, process.env.PENNYLANE_API_URL || undefined)
        : { ...sourcePennylane('demo', FAUX_PENNYLANE, fauxPennylane(demo)), mode: 'demo', lienPaiement: demo.lienPaiement })
    g.__cockpit = {
      source,
      local,
      demo,
      objectif: Number(process.env.COCKPIT_OBJECTIF_ANNUEL) || (mode === 'demo' ? 360_000 : 0),
      cache: null,
      crm,
    }
    console.info(
      mode === 'pennylane'
        ? '  Cockpit : branché sur ton compte Pennylane'
        : mode === 'local'
          ? '  Cockpit DV : mode local actif, données DigitalVision gardées sur cet ordinateur (.cockpit/)'
          : '  Cockpit : démo, branché sur le faux Pennylane (retire COCKPIT_MODE=demo de .env pour passer en mode local)',
    )
  }
  return g.__cockpit
}

async function lireJson(req: Request): Promise<unknown> {
  const corps = await req.text()
  if (corps.length > 20_000) throw new ErreurHttp(413, 'Requête trop lourde')
  try {
    return corps ? JSON.parse(corps) : {}
  } catch {
    throw new ErreurHttp(400, 'JSON illisible')
  }
}

const json = (status: number, data: unknown) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  })

const html = (corps: string) =>
  new Response(corps, { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } })

const echapper = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

function valider(b: unknown): NouvelleFacture {
  if (!b || typeof b !== 'object') throw new ErreurHttp(400, 'Corps manquant')
  const r = b as Record<string, unknown>
  const clientId = Number(r.clientId)
  const libelle = String(r.libelle ?? '').trim()
  const montantHT = Number(r.montantHT)
  const tva = r.tva as CodeTva
  const echeanceJours = Number(r.echeanceJours ?? 30)
  const contratId = r.contratId ? String(r.contratId) : undefined
  if (!clientId) throw new ErreurHttp(400, 'Client obligatoire')
  if (!libelle) throw new ErreurHttp(400, 'Libellé obligatoire')
  if (!montantHT || montantHT <= 0) throw new ErreurHttp(400, 'Montant HT positif obligatoire')
  if (!TVA.includes(tva)) throw new ErreurHttp(400, `TVA inconnue : ${tva}`)
  return { clientId, libelle, montantHT, tva, echeanceJours, contratId }
}

async function tableau(e: Etat, frais: boolean) {
  const maintenant = Date.now()
  if (!frais && e.cache && maintenant - e.cache.quand < 60_000) return e.cache.tableau
  const t = await calculerTableau(e.source, e.objectif)
  e.cache = { quand: maintenant, tableau: t }
  return t
}

async function router(req: Request): Promise<Response> {
  const e = etat()
  const { source, local, demo, crm } = e
  const url = new URL(req.url)
  const chemin = url.pathname
  const methode = req.method
  const auteur = decodeURIComponent(req.headers.get('x-auteur') || 'Othnelio')

  if (methode === 'POST' || methode === 'PUT' || methode === 'DELETE') {
    // Protection basique cross-site
    if (req.headers.get('sec-fetch-site') === 'cross-site') throw new ErreurHttp(403, 'Requête refusée')
    const estUploadFichier = chemin === '/api/hub/documents/fichiers/upload'
    if (methode !== 'DELETE' && !estUploadFichier && !String(req.headers.get('content-type')).startsWith('application/json')) {
      throw new ErreurHttp(415, 'JSON attendu')
    }
  }

  // === AUTHENTIFICATION ===
  if (methode === 'GET' && chemin === '/api/auth/statut') {
    const statuts = await magasinAuth.obtenirStatuts()
    return json(200, statuts)
  }

  if (methode === 'POST' && chemin === '/api/auth/premier-mot-de-passe') {
    const b = (await lireJson(req)) as { nom?: string; motDePasse?: string }
    if (!b.nom || !b.motDePasse) throw new ErreurHttp(400, 'Nom et mot de passe requis')
    if (b.motDePasse.length < 4) throw new ErreurHttp(400, 'Le mot de passe doit comporter au moins 4 caractères')
    const ok = await magasinAuth.definirPremierMotDePasse(b.nom, b.motDePasse)
    if (!ok) throw new ErreurHttp(400, `Impossible de configurer le mot de passe pour ${b.nom}`)
    await magasinActivite.enregistrer({
      auteur: b.nom,
      type: 'connexion',
      titre: `${b.nom} a défini son mot de passe initial`,
      details: 'Première connexion réussie à Cockpit DV',
    })
    return json(200, { ok: true, nom: b.nom })
  }

  if (methode === 'POST' && chemin === '/api/auth/connexion') {
    const b = (await lireJson(req)) as { nom?: string; motDePasse?: string }
    if (!b.nom || !b.motDePasse) throw new ErreurHttp(400, 'Nom et mot de passe requis')
    const ok = await magasinAuth.verifier(b.nom, b.motDePasse)
    if (!ok) throw new ErreurHttp(401, 'Mot de passe incorrect')
    await magasinActivite.enregistrer({
      auteur: b.nom,
      type: 'connexion',
      titre: `${b.nom} s'est connecté(e)`,
      details: 'Connexion à Cockpit DV',
    })
    return json(200, { ok: true, nom: b.nom })
  }

  if (methode === 'POST' && chemin === '/api/auth/changer-mot-de-passe') {
    const b = (await lireJson(req)) as { nom?: string; ancien?: string; nouveau?: string }
    if (!b.nom || !b.ancien || !b.nouveau) throw new ErreurHttp(400, 'Paramètres manquants')
    if (b.nouveau.length < 4) throw new ErreurHttp(400, 'Le nouveau mot de passe doit faire au moins 4 caractères')
    const ok = await magasinAuth.changerMotDePasse(b.nom, b.ancien, b.nouveau)
    if (!ok) throw new ErreurHttp(400, 'Ancien mot de passe invalide')
    await magasinActivite.enregistrer({
      auteur: b.nom,
      type: 'connexion',
      titre: `${b.nom} a modifié son mot de passe`,
    })
    return json(200, { ok: true })
  }

  // === ACTIVITÉS & AUDIT TRAIL ===
  if (methode === 'GET' && chemin === '/api/activite') {
    return json(200, await magasinActivite.lister())
  }
  if (methode === 'POST' && chemin === '/api/activite') {
    const b = (await lireJson(req)) as { type?: ActiviteDV['type']; titre: string; details?: string; cibleId?: string | number }
    if (!b.titre) throw new ErreurHttp(400, 'Titre requis')
    const nouv = await magasinActivite.enregistrer({
      auteur,
      type: b.type ?? 'tache',
      titre: b.titre,
      details: b.details,
      cibleId: b.cibleId,
    })
    return json(201, nouv)
  }

  // === TÂCHES & APPELS ===
  if (methode === 'GET' && chemin === '/api/taches') {
    return json(200, await magasinTaches.lister())
  }
  if (methode === 'POST' && chemin === '/api/taches') {
    const b = (await lireJson(req)) as Partial<TacheDV>
    if (!b.titre) throw new ErreurHttp(400, 'Titre de tâche requis')
    const tache = await magasinTaches.ajouter({
      titre: String(b.titre).trim(),
      description: b.description ? String(b.description) : undefined,
      type: b.type ?? 'dev_client',
      assigneA: b.assigneA ?? auteur,
      creePar: auteur,
      statut: b.statut ?? 'a_faire',
      priorite: b.priorite ?? 'normale',
      echeance: b.echeance ?? new Date().toISOString().slice(0, 10),
      heure: b.heure ? String(b.heure) : undefined,
      entrepriseId: b.entrepriseId ? String(b.entrepriseId) : undefined,
      nomEntreprise: b.nomEntreprise ? String(b.nomEntreprise) : undefined,
      saasId: b.saasId ? String(b.saasId) : undefined,
    })
    await magasinActivite.enregistrer({
      auteur,
      type: 'tache',
      titre: `Nouvelle tâche pour ${tache.assigneA}`,
      details: tache.titre,
      cibleId: tache.id,
    })
    return json(201, tache)
  }
  const routeTache = chemin.match(/^\/api\/taches\/([a-z0-9-]+)$/)
  if (routeTache) {
    const id = routeTache[1]
    if (methode === 'PUT') {
      const modifs = (await lireJson(req)) as Partial<TacheDV>
      const t = await magasinTaches.modifier(id, modifs)
      if (!t) throw new ErreurHttp(404, 'Tâche introuvable')
      if (modifs.statut === 'terminee') {
        await magasinActivite.enregistrer({
          auteur,
          type: 'tache',
          titre: `Tâche terminée par ${auteur}`,
          details: t.titre,
          cibleId: t.id,
        })
      }
      return json(200, t)
    }
    if (methode === 'DELETE') {
      const ok = await magasinTaches.supprimer(id)
      if (!ok) throw new ErreurHttp(404, 'Tâche introuvable')
      return json(200, { ok: true })
    }
  }

  // === DÉPENSES & CASH-FLOW ===
  if (methode === 'GET' && chemin === '/api/depenses') {
    return json(200, await magasinDepenses.lister())
  }
  if (methode === 'POST' && chemin === '/api/depenses') {
    const b = (await lireJson(req)) as Partial<DepenseDV>
    if (!b.libelle || !b.montantFCFA) throw new ErreurHttp(400, 'Libellé et montant en FCFA requis')
    const depense = await magasinDepenses.ajouter({
      date: b.date ?? new Date().toISOString().slice(0, 10),
      libelle: String(b.libelle).trim(),
      montantFCFA: Number(b.montantFCFA),
      categorie: b.categorie ?? 'tech',
      payePar: b.payePar ?? auteur,
      note: b.note ? String(b.note) : undefined,
      contratId: b.contratId ? String(b.contratId) : undefined,
      creePar: auteur,
    })
    await magasinActivite.enregistrer({
      auteur,
      type: 'depense',
      titre: `Dépense enregistrée : ${depense.libelle}`,
      details: `${depense.montantFCFA.toLocaleString('fr-FR')} FCFA (${depense.categorie}) • Payé par ${depense.payePar}`,
      cibleId: depense.id,
    })
    return json(201, depense)
  }
  const routeDepense = chemin.match(/^\/api\/depenses\/([a-z0-9-]+)$/)
  if (routeDepense && methode === 'DELETE') {
    const ok = await magasinDepenses.supprimer(routeDepense[1])
    if (!ok) throw new ErreurHttp(404, 'Dépense introuvable')
    return json(200, { ok: true })
  }

  // === SAAS (MIVAFID, MIVACOUTURE, ETC.) ===
  if (methode === 'GET' && chemin === '/api/saas') {
    return json(200, await magasinSaas.lister())
  }
  if (methode === 'POST' && chemin === '/api/saas') {
    const b = (await lireJson(req)) as Partial<SaasDV>
    if (!b.nom || !b.slogan) throw new ErreurHttp(400, 'Nom et slogan requis')
    const saas = await magasinSaas.ajouter({
      nom: String(b.nom).trim(),
      slogan: String(b.slogan).trim(),
      description: String(b.description ?? '').trim(),
      statut: b.statut ?? 'prototypage',
      leadTech: b.leadTech ?? 'Othnelio',
      leadMarketing: b.leadMarketing ?? 'Medard',
      leadOps: b.leadOps ?? 'Roméo',
      url: b.url ? String(b.url) : undefined,
      depotGit: b.depotGit ? String(b.depotGit) : undefined,
      apkUrl: b.apkUrl ? String(b.apkUrl) : undefined,
      mrrFCFA: Number(b.mrrFCFA ?? 0),
      objectifMrrFCFA: Number(b.objectifMrrFCFA ?? 500000),
      utilisateurs: Number(b.utilisateurs ?? 0),
      jalons: Array.isArray(b.jalons) ? b.jalons : [],
      documents: Array.isArray(b.documents) ? b.documents : [],
    })
    await magasinActivite.enregistrer({
      auteur,
      type: 'saas',
      titre: `Nouveau SaaS créé : ${saas.nom}`,
      details: saas.slogan,
      cibleId: saas.id,
    })
    return json(201, saas)
  }
  const routeSaas = chemin.match(/^\/api\/saas\/([a-z0-9-]+)$/)
  if (routeSaas) {
    const id = routeSaas[1]
    if (methode === 'GET') {
      const s = await magasinSaas.obtenir(id)
      if (!s) throw new ErreurHttp(404, 'SaaS introuvable')
      return json(200, s)
    }
    if (methode === 'PUT') {
      const modifs = (await lireJson(req)) as Partial<SaasDV>
      const s = await magasinSaas.modifier(id, modifs)
      if (!s) throw new ErreurHttp(404, 'SaaS introuvable')
      await magasinActivite.enregistrer({
        auteur,
        type: 'saas',
        titre: `Mise à jour du SaaS ${s.nom}`,
        details: `Statut : ${s.statut} • MRR : ${s.mrrFCFA.toLocaleString('fr-FR')} FCFA`,
        cibleId: s.id,
      })
      return json(200, s)
    }
    if (methode === 'DELETE') {
      const ok = await magasinSaas.supprimer(id)
      if (!ok) throw new ErreurHttp(404, 'SaaS introuvable')
      return json(200, { ok: true })
    }
  }

  // === CONTRATS ===
  if (methode === 'GET' && chemin === '/api/contrats') {
    return json(200, await magasinContrats.lister())
  }
  if (methode === 'POST' && chemin === '/api/contrats') {
    const b = (await lireJson(req)) as Partial<ContratDV> & {
      genererTaches?: boolean
      modeFacturation?: ModeFacturationContrat
      pourcentageAcompte?: number
      montantAcompteFCFA?: number
    }
    if (!b.titre || !b.nomEntreprise) throw new ErreurHttp(400, 'Titre et entreprise requis')

    const prestationsInitiales = Array.isArray(b.prestations) ? b.prestations : []
    const totalContrat = Number(b.montantFCFA ?? 0)
    let jalonsInitiaux: JalonFacturationDV[] | undefined = Array.isArray(b.jalonsFacturation) ? b.jalonsFacturation : undefined
    if (!jalonsInitiaux && b.modeFacturation === 'jalons' && totalContrat > 0) {
      const m1 = Math.round(totalContrat * 0.4)
      const m2 = Math.round(totalContrat * 0.3)
      const m3 = totalContrat - m1 - m2
      jalonsInitiaux = [
        { id: `jalon-${Date.now()}-1`, titre: 'Acompte au démarrage', pourcentage: 40, montantFCFA: m1, statut: 'pret' },
        { id: `jalon-${Date.now()}-2`, titre: 'Validation prototype & démo', pourcentage: 30, montantFCFA: m2, statut: 'en_attente' },
        { id: `jalon-${Date.now()}-3`, titre: 'Livraison finale & recette', pourcentage: 30, montantFCFA: m3, statut: 'en_attente' },
      ]
    }
    const jetonSignature = b.jetonSignature || `sig_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`

    const contrat = await magasinContrats.ajouter({
      entrepriseId: String(b.entrepriseId ?? ''),
      nomEntreprise: String(b.nomEntreprise).trim(),
      titre: String(b.titre).trim(),
      type: b.type ?? 'creation_site',
      prestations: prestationsInitiales,
      montantFCFA: totalContrat,
      signeLe: b.signeLe ? String(b.signeLe) : undefined,
      debutLe: b.debutLe ?? new Date().toISOString().slice(0, 10),
      finLe: b.finLe ? String(b.finLe) : undefined,
      statut: b.statut ?? 'brouillon',
      responsable: b.responsable ?? auteur,
      notes: b.notes ? String(b.notes) : undefined,
      mentionsLegales: b.mentionsLegales ? String(b.mentionsLegales) : undefined,
      modalitesPaiement: b.modalitesPaiement ? String(b.modalitesPaiement) : undefined,
      tvaTaux: b.tvaTaux !== undefined ? Number(b.tvaTaux) : 0,
      documentId: b.documentId ? String(b.documentId) : undefined,
      documentNom: b.documentNom ? String(b.documentNom) : undefined,
      documentUrl: b.documentUrl ? String(b.documentUrl) : undefined,
      documentTailleOctets: b.documentTailleOctets !== undefined ? Number(b.documentTailleOctets) : undefined,
      jalonsFacturation: jalonsInitiaux,
      jetonSignature,
      factureIds: [],
      tacheIds: [],
      estSigne: b.estSigne ?? false,
      estLivre: b.estLivre ?? false,
      livreLe: b.livreLe ? String(b.livreLe) : undefined,
      estPaye: b.estPaye ?? false,
      montantPayeFCFA: b.montantPayeFCFA !== undefined ? Number(b.montantPayeFCFA) : undefined,
      payeLe: b.payeLe ? String(b.payeLe) : undefined,
    })

    const tacheIdsCreees: string[] = []
    const prestationsMisesAJour = [...(contrat.prestations ?? [])]

    // 1. Automatisation TÂCHES : chaque prestation devient une tâche
    if (b.genererTaches !== false && prestationsMisesAJour.length > 0) {
      for (let i = 0; i < prestationsMisesAJour.length; i++) {
        const p = prestationsMisesAJour[i]
        const libellePresta = p.libellePersonnalise || p.type
        const respPresta = p.responsable || contrat.responsable
        const echeancePresta = p.echeancePrestation || contrat.finLe || contrat.debutLe

        const tache = await magasinTaches.ajouter({
          titre: `${libellePresta} — ${contrat.nomEntreprise}`,
          description: `Livrable du contrat "${contrat.titre}". Prestation valorisée à ${p.montantFCFA.toLocaleString('fr-FR')} FCFA.`,
          type: 'dev_client',
          assigneA: respPresta,
          creePar: auteur,
          statut: 'a_faire',
          priorite: 'haute',
          echeance: echeancePresta,
          entrepriseId: contrat.entrepriseId || undefined,
          nomEntreprise: contrat.nomEntreprise,
          contratId: contrat.id,
          prestationId: p.id,
        })
        tacheIdsCreees.push(tache.id)
        prestationsMisesAJour[i] = { ...p, tacheIdLiee: tache.id }
      }
    }

    // 2. Automatisation FACTURATION : créer une facture pour l'acompte ou la totalité
    const factureIdsCreees: number[] = []
    if (b.modeFacturation && b.modeFacturation !== 'aucun' && contrat.montantFCFA > 0) {
      let carnet = await crm.idsLocaux()
      let clientCrm = carnet.entreprises.find(
        (c) => c.id === contrat.entrepriseId || c.nom.toLowerCase() === contrat.nomEntreprise.toLowerCase()
      )

      if (!clientCrm && contrat.nomEntreprise) {
        clientCrm = await crm.ajouter({
          nom: contrat.nomEntreprise,
          etape: 'Client',
          responsable: contrat.responsable,
          pipeline: contrat.montantFCFA,
          chances: 100,
        })
        carnet = await crm.idsLocaux()
        clientCrm = carnet.entreprises.find((c) => c.id === clientCrm?.id) ?? clientCrm
      }

      const clientId = clientCrm?.pennylaneId
      if (clientId) {
        let montantFactureHT = contrat.montantFCFA
        let libelleFacture = `${contrat.titre} — Totalité`

        if (b.modeFacturation === 'acompte_50') {
          montantFactureHT = Math.round(contrat.montantFCFA * 0.5)
          libelleFacture = `${contrat.titre} — Acompte 50%`
        } else if (b.modeFacturation === 'acompte_30') {
          montantFactureHT = Math.round(contrat.montantFCFA * 0.3)
          libelleFacture = `${contrat.titre} — Acompte 30%`
        } else if (b.modeFacturation === 'sur_mesure') {
          montantFactureHT =
            b.montantAcompteFCFA && b.montantAcompteFCFA > 0
              ? b.montantAcompteFCFA
              : Math.round(contrat.montantFCFA * ((b.pourcentageAcompte || 50) / 100))
          const pct = Math.round((montantFactureHT / contrat.montantFCFA) * 100)
          libelleFacture = `${contrat.titre} — Acompte ${pct}%`
        } else if (b.modeFacturation === 'jalons' && jalonsInitiaux && jalonsInitiaux.length > 0) {
          montantFactureHT = jalonsInitiaux[0].montantFCFA
          libelleFacture = `${contrat.titre} — ${jalonsInitiaux[0].titre}`
        }

        const codeTva: CodeTva = (b.tvaTaux === 0 || contrat.tvaTaux === 0) ? 'exempt' : 'TG_180'
        const facture = await source.creerBrouillon({
          clientId,
          libelle: libelleFacture,
          montantHT: montantFactureHT,
          tva: codeTva,
          echeanceJours: 15,
          contratId: contrat.id,
        })
        factureIdsCreees.push(facture.id)

        if (jalonsInitiaux && jalonsInitiaux.length > 0 && b.modeFacturation === 'jalons') {
          jalonsInitiaux[0].statut = 'facture'
          jalonsInitiaux[0].factureId = facture.id
          await magasinContrats.modifier(contrat.id, { jalonsFacturation: jalonsInitiaux })
        }
        e.cache = null
      }
    }

    // 3. Automatisation CRM : passer le prospect en 'Client' si le contrat est actif ou signé
    if (contrat.statut === 'actif' || contrat.statut === 'termine' || contrat.estSigne) {
      const carnet = await crm.lire()
      const ent = carnet.entreprises.find(
        (c) => c.id === contrat.entrepriseId || c.nom.toLowerCase() === contrat.nomEntreprise.toLowerCase()
      )
      if (ent && ent.etape !== 'Client') {
        await crm.modifier(ent.id, {
          etape: 'Client',
          pipeline: Math.max(ent.pipeline, contrat.montantFCFA),
          chances: 100,
          dernierEchange: {
            date: new Date().toISOString().slice(0, 10),
            libelle: `Contrat signé : ${contrat.titre}`.slice(0, 40),
          },
        })
      }
    }

    // Mettre à jour le contrat avec les liaisons générées
    const contratFinal =
      (await magasinContrats.modifier(contrat.id, {
        prestations: prestationsMisesAJour,
        tacheIds: tacheIdsCreees,
        factureIds: factureIdsCreees,
      })) || contrat

    await magasinActivite.enregistrer({
      auteur,
      type: 'contrat',
      titre: `Nouveau contrat : ${contratFinal.titre}`,
      details: `${contratFinal.nomEntreprise} • ${contratFinal.montantFCFA.toLocaleString('fr-FR')} FCFA${
        tacheIdsCreees.length > 0 ? ` • ${tacheIdsCreees.length} tâche(s) générée(s)` : ''
      }${factureIdsCreees.length > 0 ? ' • Facture générée' : ''}`,
      cibleId: contratFinal.id,
    })
    return json(201, contratFinal)
  }

  const routeFacturerContrat = chemin.match(/^\/api\/contrats\/([a-z0-9-]+)\/facturer$/)
  if (routeFacturerContrat && methode === 'POST') {
    const id = routeFacturerContrat[1]
    const contrat = await magasinContrats.obtenir(id)
    if (!contrat) throw new ErreurHttp(404, 'Contrat introuvable')

    const b = (await lireJson(req)) as {
      libelle?: string
      montantHT: number
      tva?: CodeTva
      echeanceJours?: number
    }
    if (!b.montantHT || b.montantHT <= 0) throw new ErreurHttp(400, 'Montant HT positif requis')

    const carnet = await crm.idsLocaux()
    const clientCrm = carnet.entreprises.find(
      (c) => c.id === contrat.entrepriseId || c.nom.toLowerCase() === contrat.nomEntreprise.toLowerCase()
    )
    if (!clientCrm?.pennylaneId) throw new ErreurHttp(422, 'Client CRM sans numéro client local')

    const libelle = b.libelle?.trim() || `${contrat.titre} — Solde`
    const facture = await source.creerBrouillon({
      clientId: clientCrm.pennylaneId,
      libelle,
      montantHT: Math.round(b.montantHT),
      tva: b.tva ?? 'TG_180',
      echeanceJours: b.echeanceJours ?? 15,
      contratId: contrat.id,
    })

    const existants = contrat.factureIds ?? []
    if (!existants.includes(facture.id)) {
      await magasinContrats.modifier(contrat.id, {
        factureIds: [...existants, facture.id],
      })
    }
    e.cache = null

    await magasinActivite.enregistrer({
      auteur,
      type: 'facture',
      titre: `Facture contrat #${facture.id}`,
      details: `${libelle} • ${Math.round(b.montantHT).toLocaleString('fr-FR')} FCFA HT`,
      cibleId: facture.id,
    })

    return json(201, { id: facture.id })
  }

  const routeFacturerJalon = chemin.match(/^\/api\/contrats\/([a-zA-Z0-9_-]+)\/jalons\/([a-zA-Z0-9_-]+)\/facturer$/)
  if (routeFacturerJalon && methode === 'POST') {
    const contratId = routeFacturerJalon[1]
    const jalonId = routeFacturerJalon[2]
    const contrat = await magasinContrats.obtenir(contratId)
    if (!contrat) throw new ErreurHttp(404, 'Contrat introuvable')

    const jalons = [...(contrat.jalonsFacturation ?? [])]
    const idx = jalons.findIndex((j) => j.id === jalonId)
    if (idx === -1) throw new ErreurHttp(404, 'Jalon de facturation introuvable')
    const jalon = jalons[idx]

    let carnet = await crm.idsLocaux()
    let clientCrm = carnet.entreprises.find(
      (c) => c.id === contrat.entrepriseId || c.nom.toLowerCase() === contrat.nomEntreprise.toLowerCase()
    )
    if (!clientCrm && contrat.nomEntreprise) {
      clientCrm = await crm.ajouter({
        nom: contrat.nomEntreprise,
        etape: 'Client',
        responsable: contrat.responsable,
        pipeline: contrat.montantFCFA,
        chances: 100,
      })
      carnet = await crm.idsLocaux()
      clientCrm = carnet.entreprises.find((c) => c.id === clientCrm?.id) ?? clientCrm
    }
    if (!clientCrm?.pennylaneId) throw new ErreurHttp(422, 'Client CRM sans compte local')

    const codeTva: CodeTva = contrat.tvaTaux === 0 ? 'exempt' : 'TG_180'
    const libelle = `${contrat.titre} — ${jalon.titre}`
    const facture = await source.creerBrouillon({
      clientId: clientCrm.pennylaneId,
      libelle,
      montantHT: jalon.montantFCFA,
      tva: codeTva,
      echeanceJours: 15,
      contratId: contrat.id,
    })

    jalons[idx] = { ...jalon, statut: 'facture', factureId: facture.id }
    const existants = contrat.factureIds ?? []
    await magasinContrats.modifier(contrat.id, {
      jalonsFacturation: jalons,
      factureIds: existants.includes(facture.id) ? existants : [...existants, facture.id],
    })

    e.cache = null
    await magasinActivite.enregistrer({
      auteur,
      type: 'facture',
      titre: `Facture émise pour le jalon : ${jalon.titre}`,
      details: `${libelle} • ${jalon.montantFCFA.toLocaleString('fr-FR')} FCFA HT`,
      cibleId: facture.id,
    })

    return json(201, { id: facture.id, jalon: jalons[idx] })
  }

  const routeMargeContrat = chemin.match(/^\/api\/contrats\/([a-zA-Z0-9_-]+)\/marge$/)
  if (routeMargeContrat && methode === 'GET') {
    const contratId = routeMargeContrat[1]
    const contrat = await magasinContrats.obtenir(contratId)
    if (!contrat) throw new ErreurHttp(404, 'Contrat introuvable')

    const factures = await source.factures()
    const facturesLiees = factures.filter((f) => f.contratId === contrat.id || (contrat.factureIds ?? []).includes(f.id))
    const totalFactureTTC = facturesLiees.reduce((acc, f) => acc + Number(f.amount || 0), 0)
    const totalEncaisseTTC = facturesLiees
      .filter((f) => f.status === 'paid')
      .reduce((acc, f) => acc + Number(f.amount || 0), 0)
    const totalEncaisseHT = facturesLiees
      .filter((f) => f.status === 'paid')
      .reduce((acc, f) => acc + Number(f.currency_amount_before_tax || f.amount || 0), 0)

    const toutesDepenses = await magasinDepenses.lister()
    const depensesLiees = toutesDepenses.filter((d) => d.contratId === contrat.id)
    const totalDepenses = depensesLiees.reduce((acc, d) => acc + d.montantFCFA, 0)

    const montantTotalHT = contrat.montantFCFA || 0
    const margeEstimeeFCFA = montantTotalHT - totalDepenses
    const margeReelleEncaisseeFCFA = totalEncaisseHT - totalDepenses
    const tauxMargePourcent = montantTotalHT > 0 ? Math.round((margeEstimeeFCFA / montantTotalHT) * 100) : 0

    return json(200, {
      contratId: contrat.id,
      montantTotalHT,
      totalFactureTTC,
      totalEncaisseTTC,
      totalEncaisseHT,
      totalDepenses,
      depenses: depensesLiees,
      margeEstimeeFCFA,
      margeReelleEncaisseeFCFA,
      tauxMargePourcent,
    })
  }

  const routeSignature = chemin.match(/^\/api\/contrats\/signer\/([a-zA-Z0-9_-]+)$/)
  if (routeSignature) {
    const jeton = routeSignature[1]
    const tous = await magasinContrats.lister()
    const contrat = tous.find((c) => c.jetonSignature === jeton || c.id === jeton)
    if (!contrat) throw new ErreurHttp(404, 'Contrat ou lien de signature invalide')

    if (methode === 'GET') {
      return json(200, contrat)
    }

    if (methode === 'POST') {
      const b = (await lireJson(req)) as {
        nomSignataire: string
        fonctionSignataire?: string
        signatureBase64?: string
      }
      if (!b.nomSignataire?.trim()) throw new ErreurHttp(400, 'Nom du signataire requis')

      const dateAujourdhui = new Date().toISOString().slice(0, 10)
      const noteSignature = `\n[Signature en ligne] Validé par ${b.nomSignataire.trim()}${b.fonctionSignataire ? ` (${b.fonctionSignataire.trim()})` : ''} le ${new Date().toLocaleString('fr-FR')}`

      const c = await magasinContrats.modifier(contrat.id, {
        statut: 'actif',
        estSigne: true,
        signeLe: dateAujourdhui,
        notes: (contrat.notes ? contrat.notes : '') + noteSignature,
      })

      // Passer le prospect en client dans le CRM
      const carnet = await crm.lire()
      const ent = carnet.entreprises.find(
        (e) => e.id === contrat.entrepriseId || e.nom.toLowerCase() === contrat.nomEntreprise.toLowerCase()
      )
      if (ent && ent.etape !== 'Client') {
        await crm.modifier(ent.id, {
          etape: 'Client',
          pipeline: Math.max(ent.pipeline, contrat.montantFCFA),
          chances: 100,
        })
      }

      await magasinActivite.enregistrer({
        auteur: b.nomSignataire.trim(),
        type: 'contrat',
        titre: `Convention validée et signée en ligne`,
        details: `${contrat.titre} — ${contrat.nomEntreprise} (Signé par ${b.nomSignataire.trim()})`,
        cibleId: contrat.id,
      })

      e.cache = null
      await servicePush
        .envoyer({
          titre: '✍️ Contrat signé par le client !',
          corps: `${b.nomSignataire.trim()} vient de signer le contrat "${contrat.titre}" (${contrat.nomEntreprise})`,
          url: '/contrats',
        })
        .catch(() => {})
      return json(200, { ok: true, contrat: c })
    }
  }

  const routeContrat = chemin.match(/^\/api\/contrats\/([a-z0-9-]+)$/)
  if (routeContrat) {
    const id = routeContrat[1]
    if (methode === 'GET') {
      const c = await magasinContrats.obtenir(id)
      if (!c) throw new ErreurHttp(404, 'Contrat introuvable')
      return json(200, c)
    }
    if (methode === 'PUT') {
      const modifs = (await lireJson(req)) as Partial<ContratDV>
      const c = await magasinContrats.modifier(id, modifs)
      if (!c) throw new ErreurHttp(404, 'Contrat introuvable')
      return json(200, c)
    }
    if (methode === 'DELETE') {
      const mode = url.searchParams.get('mode') === 'hard' ? 'hard' : 'soft'
      if (mode === 'hard') {
        let facturesSupprimees = 0
        if (local) {
          facturesSupprimees = await local.supprimerParContrat(id)
        }
        const tachesSupprimees = await magasinTaches.supprimerParContrat(id)
        await magasinDepenses.dissocierContrat(id)
        const ok = await magasinContrats.supprimer(id)
        if (!ok) throw new ErreurHttp(404, 'Contrat introuvable')
        e.cache = null
        await magasinActivite.enregistrer({
          auteur,
          type: 'contrat',
          titre: `Contrat supprimé définitivement`,
          details: `${facturesSupprimees} facture(s) et ${tachesSupprimees} tâche(s) purgées`,
          cibleId: id,
        })
        return json(200, { ok: true, mode: 'hard', facturesSupprimees, tachesSupprimees })
      } else {
        // Soft delete : mise à la corbeille
        let facturesInvalidees = 0
        if (local) {
          facturesInvalidees = await local.marquerSupprimeesParContrat(id, 'Contrat parent supprimé')
        }
        const tachesInvalidees = await magasinTaches.marquerSupprimeesParContrat(id)
        const c = await magasinContrats.marquerSupprime(id)
        if (!c) throw new ErreurHttp(404, 'Contrat introuvable')
        e.cache = null
        await magasinActivite.enregistrer({
          auteur,
          type: 'contrat',
          titre: `Contrat mis à la corbeille`,
          details: `${facturesInvalidees} facture(s) invalidée(s) et décomptée(s) du CA`,
          cibleId: id,
        })
        return json(200, { ok: true, mode: 'soft', facturesInvalidees, tachesInvalidees })
      }
    }
  }

  const routeContratRestaurer = chemin.match(/^\/api\/contrats\/([a-z0-9-]+)\/restaurer$/)
  if (routeContratRestaurer && methode === 'POST') {
    const id = routeContratRestaurer[1]
    const c = await magasinContrats.restaurer(id)
    if (!c) throw new ErreurHttp(404, 'Contrat introuvable')
    let facturesRestaurees = 0
    if (local) {
      facturesRestaurees = await local.restaurerParContrat(id)
    }
    const tachesRestaurees = await magasinTaches.restaurerParContrat(id)
    e.cache = null
    await magasinActivite.enregistrer({
      auteur,
      type: 'contrat',
      titre: `Contrat restauré : ${c.titre}`,
      details: `${facturesRestaurees} facture(s) réactivée(s) et réintégrée(s) au CA`,
      cibleId: id,
    })
    return json(200, { ok: true, contrat: c, facturesRestaurees, tachesRestaurees })
  }

  // === DIGITALVISION HUB (ESPACE ENTREPRISE) ===

  // 1. Identité de l'entreprise
  if (methode === 'GET' && chemin === '/api/hub/identite') {
    return json(200, await hubService.obtenirIdentite())
  }
  if (methode === 'PUT' && chemin === '/api/hub/identite') {
    const modifs = (await lireJson(req)) as Partial<IdentiteEntreprise>
    const identite = await hubService.mettreAJourIdentite(modifs, auteur)
    return json(200, identite)
  }

  // 2. Coffre-fort numérique
  if (methode === 'GET' && chemin === '/api/hub/coffre') {
    return json(200, await hubService.listerCoffre())
  }
  if (methode === 'POST' && chemin === '/api/hub/coffre') {
    const b = (await lireJson(req)) as {
      nomService: string
      categorie: CategorieCoffre
      url?: string
      identifiant: string
      emailAssocie?: string
      secret: string
      notes?: string
      responsable: string
    }
    if (!b.nomService || !b.identifiant || b.secret === undefined) {
      throw new ErreurHttp(400, 'Nom du service, identifiant et mot de passe requis')
    }
    const nouv = await hubService.ajouterEntreeCoffre(b, auteur)
    return json(201, nouv)
  }
  const routeCoffreReveler = chemin.match(/^\/api\/hub\/coffre\/([a-z0-9-]+)\/reveler$/)
  if (routeCoffreReveler && methode === 'POST') {
    const id = routeCoffreReveler[1]
    const b = (await lireJson(req)) as { action?: 'consultation' | 'copie'; motDePasse?: string }
    if (b.motDePasse) {
      const ok = await magasinAuth.verifier(auteur, b.motDePasse)
      if (!ok) throw new ErreurHttp(401, 'Mot de passe utilisateur incorrect')
    }
    const secret = await hubService.revelerSecretCoffre(id, auteur, b.action ?? 'consultation')
    if (secret === null) throw new ErreurHttp(404, 'Entrée introuvable')
    return json(200, { secret })
  }
  const routeCoffreEntree = chemin.match(/^\/api\/hub\/coffre\/([a-z0-9-]+)$/)
  if (routeCoffreEntree) {
    const id = routeCoffreEntree[1]
    if (methode === 'PUT') {
      const modifs = (await lireJson(req)) as {
        nomService?: string
        categorie?: CategorieCoffre
        url?: string
        identifiant?: string
        emailAssocie?: string
        secret?: string
        notes?: string
        responsable?: string
      }
      const misAJour = await hubService.modifierEntreeCoffre(id, modifs, auteur)
      if (!misAJour) throw new ErreurHttp(404, 'Entrée introuvable')
      return json(200, misAJour)
    }
    if (methode === 'DELETE') {
      const ok = await hubService.supprimerEntreeCoffre(id, auteur)
      if (!ok) throw new ErreurHttp(404, 'Entrée introuvable')
      return json(200, { ok: true })
    }
  }

  // 3. Vision et Stratégie
  if (methode === 'GET' && chemin === '/api/hub/strategie') {
    return json(200, await hubService.obtenirStrategie())
  }
  if (methode === 'PUT' && chemin === '/api/hub/strategie') {
    const modifs = (await lireJson(req)) as Partial<VisionStrategique>
    const strat = await hubService.mettreAJourStrategie(modifs, auteur)
    return json(200, strat)
  }

  // 4. Associés et Gouvernance
  if (methode === 'GET' && chemin === '/api/hub/associes') {
    return json(200, await hubService.obtenirAssocies())
  }
  const routeAssocie = chemin.match(/^\/api\/hub\/associes\/([a-zA-Z0-9_-]+)$/)
  if (routeAssocie && methode === 'PUT') {
    const id = routeAssocie[1]
    const modifs = (await lireJson(req)) as Record<string, unknown>
    const mis = await hubService.mettreAJourAssocie(id, modifs, auteur)
    if (!mis) throw new ErreurHttp(404, 'Associé introuvable')
    return json(200, mis)
  }

  // 5. Réunions et Décisions
  if (methode === 'GET' && chemin === '/api/hub/reunions') {
    return json(200, await hubService.obtenirReunions())
  }
  if (methode === 'POST' && chemin === '/api/hub/reunions') {
    const b = (await lireJson(req)) as Omit<ReunionDV, 'id' | 'creeLe'>
    if (!b.titre) throw new ErreurHttp(400, 'Titre de la réunion requis')
    const reu = await hubService.ajouterReunion(b, auteur)
    return json(201, reu)
  }
  const routeReunion = chemin.match(/^\/api\/hub\/reunions\/([a-z0-9-]+)$/)
  if (routeReunion) {
    const id = routeReunion[1]
    if (methode === 'PUT') {
      const modifs = (await lireJson(req)) as Partial<ReunionDV>
      const reu = await hubService.modifierReunion(id, modifs, auteur)
      if (!reu) throw new ErreurHttp(404, 'Réunion introuvable')
      return json(200, reu)
    }
    if (methode === 'DELETE') {
      const ok = await hubService.supprimerReunion(id)
      if (!ok) throw new ErreurHttp(404, 'Réunion introuvable')
      return json(200, { ok: true })
    }
  }

  // 6. Documents et Archives
  if (methode === 'GET' && chemin === '/api/hub/documents') {
    return json(200, await hubService.obtenirDocuments())
  }
  if (methode === 'POST' && chemin === '/api/hub/documents/dossiers') {
    const b = (await lireJson(req)) as { nom?: string; parentId?: string | null }
    if (!b.nom) throw new ErreurHttp(400, 'Nom du dossier requis')
    const dos = await hubService.creerDossier(b.nom, b.parentId ?? null)
    return json(201, dos)
  }
  const routeDossier = chemin.match(/^\/api\/hub\/documents\/dossiers\/([a-z0-9-]+)$/)
  if (routeDossier) {
    const id = routeDossier[1]
    if (methode === 'PUT') {
      const b = (await lireJson(req)) as { nom?: string }
      if (!b.nom) throw new ErreurHttp(400, 'Nom requis')
      const ok = await hubService.renommerDossier(id, b.nom)
      if (!ok) throw new ErreurHttp(404, 'Dossier introuvable')
      return json(200, { ok: true })
    }
    if (methode === 'DELETE') {
      const ok = await hubService.supprimerDossier(id)
      if (!ok) throw new ErreurHttp(404, 'Dossier introuvable')
      return json(200, { ok: true })
    }
  }
  if (methode === 'POST' && chemin === '/api/hub/documents/fichiers/upload') {
    const formData = await req.formData()
    const fichier = formData.get('fichier') as File | null
    if (!fichier) throw new ErreurHttp(400, 'Fichier manquant')
    const dossierId = String(formData.get('dossierId') || 'dos-admin')
    const description = formData.get('description') ? String(formData.get('description')) : undefined
    const projetSaasId = formData.get('projetSaasId') ? String(formData.get('projetSaasId')) : undefined
    const clientCrmId = formData.get('clientCrmId') ? String(formData.get('clientCrmId')) : undefined
    const reunionId = formData.get('reunionId') ? String(formData.get('reunionId')) : undefined
    const contratId = formData.get('contratId') ? String(formData.get('contratId')) : undefined

    const buffer = Buffer.from(await fichier.arrayBuffer())
    const doc = await hubService.enregistrerFichierDocument(
      fichier.name,
      buffer,
      fichier.type || 'application/octet-stream',
      dossierId,
      auteur,
      description,
      { projetSaasId, clientCrmId, reunionId, contratId },
    )
    return json(201, doc)
  }
  const routeFichier = chemin.match(/^\/api\/hub\/documents\/fichiers\/([a-z0-9-]+)$/)
  if (routeFichier) {
    const id = routeFichier[1]
    if (methode === 'GET') {
      const res = await hubService.obtenirFichierBinaire(id)
      if (!res) throw new ErreurHttp(404, 'Fichier introuvable sur le disque')
      return new Response(new Uint8Array(res.buffer), {
        headers: {
          'Content-Type': res.document.mimeType || 'application/octet-stream',
          'Content-Disposition': `inline; filename="${encodeURIComponent(res.document.nomOriginal)}"`,
          'Content-Length': String(res.document.tailleOctets),
          'Cache-Control': 'no-store',
        },
      })
    }
    if (methode === 'PUT') {
      const b = (await lireJson(req)) as { nom?: string; dossierId?: string }
      if (b.nom) await hubService.renommerDocument(id, b.nom)
      if (b.dossierId) await hubService.deplacerDocument(id, b.dossierId)
      return json(200, { ok: true })
    }
    if (methode === 'DELETE') {
      const ok = await hubService.supprimerDocument(id)
      if (!ok) throw new ErreurHttp(404, 'Fichier introuvable')
      return json(200, { ok: true })
    }
  }

  // === CRM & TABLEAU DE BORD ===
  if (methode === 'GET' && chemin === '/api/tableau') {
    return json(200, await tableau(e, url.searchParams.has('frais') || source.mode !== 'pennylane'))
  }

  if (methode === 'GET' && chemin === '/api/crm') {
    // En mode local, le CRM est la liste de tes clients : rien à aller chercher ailleurs.
    if (local) return json(200, await crm.idsLocaux())
    // Les clients Pennylane qui manquent au CRM y entrent avant la réponse : le CRM et Pennylane restent d'accord.
    const [clients, factures] = await Promise.all([source.clients(), source.factures()])
    return json(200, await crm.synchroniser(clients, factures))
  }

  if (methode === 'POST' && chemin === '/api/crm/entreprises') {
    const corps = await lireJson(req)
    const nouv = await crm.ajouter(corps)
    await magasinActivite.enregistrer({
      auteur,
      type: 'client',
      titre: `Nouveau client : ${nouv.nom}`,
      details: `Responsable : ${nouv.responsable} • Étape : ${nouv.etape}`,
      cibleId: nouv.id,
    })
    return json(201, nouv)
  }

  const fiche = chemin.match(/^\/api\/crm\/entreprises\/([a-z0-9-]+)$/)
  if ((methode === 'POST' || methode === 'PUT') && fiche) {
    const corps = await lireJson(req)
    const modif = await crm.modifier(fiche[1], corps)
    if (corps && typeof corps === 'object' && 'etape' in corps) {
      await magasinActivite.enregistrer({
        auteur,
        type: 'etape',
        titre: `${modif.nom} → ${modif.etape}`,
        details: `Pipeline : ${modif.pipeline.toLocaleString('fr-FR')} FCFA`,
        cibleId: modif.id,
      })
    }
    return json(200, modif)
  }
  if (methode === 'DELETE' && fiche) {
    const id = fiche[1]
    const carnet = await crm.idsLocaux()
    const ent = carnet.entreprises.find((x) => x.id === id)
    if (!ent) throw new ErreurHttp(404, 'Entreprise introuvable')
    const mode = url.searchParams.get('mode') === 'hard' ? 'hard' : 'soft'

    if (mode === 'hard') {
      const contratsSupprimes = await magasinContrats.supprimerParEntreprise(ent.id, ent.nom)
      let facturesSupprimees = 0
      if (local) {
        for (const c of contratsSupprimes) {
          facturesSupprimees += await local.supprimerParContrat(c.id)
          await magasinTaches.supprimerParContrat(c.id)
          await magasinDepenses.dissocierContrat(c.id)
        }
        if (ent.pennylaneId !== null) {
          facturesSupprimees += await local.supprimerParClient(ent.pennylaneId)
        }
      }
      const tachesSupprimees = await magasinTaches.supprimerParEntreprise(ent.id, ent.nom)
      const ok = await crm.supprimer(id)
      if (!ok) throw new ErreurHttp(404, 'Entreprise introuvable')
      e.cache = null
      await magasinActivite.enregistrer({
        auteur,
        type: 'client',
        titre: `Entreprise supprimée définitivement : ${ent.nom}`,
        details: `${contratsSupprimes.length} contrat(s) et ${facturesSupprimees} facture(s) purgés`,
        cibleId: id,
      })
      return json(200, { ok: true, mode: 'hard', contratsSupprimes: contratsSupprimes.length, facturesSupprimees, tachesSupprimees })
    } else {
      // Soft delete
      const contratsModifs = await magasinContrats.marquerSupprimesParEntreprise(ent.id, ent.nom)
      let facturesInvalidees = 0
      if (local) {
        for (const c of contratsModifs) {
          facturesInvalidees += await local.marquerSupprimeesParContrat(c.id, `Entreprise parente (${ent.nom}) supprimée`)
        }
        if (ent.pennylaneId !== null) {
          facturesInvalidees += await local.marquerSupprimeesParClient(ent.pennylaneId, `Entreprise parente (${ent.nom}) supprimée`)
        }
      }
      const tachesInvalidees = await magasinTaches.marquerSupprimeesParEntreprise(ent.id, ent.nom)
      const ok = await crm.marquerSupprime(id)
      if (!ok) throw new ErreurHttp(404, 'Entreprise introuvable')
      e.cache = null
      await magasinActivite.enregistrer({
        auteur,
        type: 'client',
        titre: `Entreprise mise à la corbeille : ${ent.nom}`,
        details: `${contratsModifs.length} contrat(s) et ${facturesInvalidees} facture(s) invalidés`,
        cibleId: id,
      })
      return json(200, { ok: true, mode: 'soft', contratsModifs: contratsModifs.length, facturesInvalidees, tachesInvalidees })
    }
  }

  const ficheRestaurer = chemin.match(/^\/api\/crm\/entreprises\/([a-z0-9-]+)\/restaurer$/)
  if (methode === 'POST' && ficheRestaurer) {
    const id = ficheRestaurer[1]
    const carnet = await crm.idsLocaux()
    const ent = carnet.entreprises.find((x) => x.id === id)
    if (!ent) throw new ErreurHttp(404, 'Entreprise introuvable')
    const ok = await crm.restaurer(id)
    if (!ok) throw new ErreurHttp(404, 'Entreprise introuvable')
    const contratsRestaurees = await magasinContrats.restaurerParEntreprise(ent.id, ent.nom)
    let facturesRestaurees = 0
    if (local) {
      for (const c of contratsRestaurees) {
        facturesRestaurees += await local.restaurerParContrat(c.id)
      }
      if (ent.pennylaneId !== null) {
        facturesRestaurees += await local.restaurerParClient(ent.pennylaneId)
      }
    }
    await magasinTaches.restaurerParEntreprise(ent.id, ent.nom)
    e.cache = null
    await magasinActivite.enregistrer({
      auteur,
      type: 'client',
      titre: `Entreprise restaurée : ${ent.nom}`,
      cibleId: id,
    })
    return json(200, { ok: true, contratsRestaurees: contratsRestaurees.length, facturesRestaurees })
  }

  // === FACTURES ===
  if (methode === 'POST' && chemin === '/api/factures') {
    const donnee = valider(await lireJson(req))
    const f = await source.creerBrouillon(donnee)
    e.cache = null
    await magasinActivite.enregistrer({
      auteur,
      type: 'facture',
      titre: `Facture brouillon #${f.id}`,
      details: `${donnee.libelle} • ${donnee.montantHT.toLocaleString('fr-FR')} FCFA HT`,
      cibleId: f.id,
    })
    return json(201, { id: f.id })
  }

  const routeModifFacture = chemin.match(/^\/api\/factures\/(\d+)$/)
  if (routeModifFacture && methode === 'PUT') {
    const id = Number(routeModifFacture[1])
    if (!local) throw new ErreurHttp(400, 'Modification de facture supportée en mode local')
    const corps = (await lireJson(req)) as { montantHT?: number; tva?: CodeTva; libelle?: string }
    const f = await local.modifier(id, corps)
    e.cache = null
    await magasinActivite.enregistrer({
      auteur,
      type: 'facture',
      titre: `Facture #${id} modifiée`,
      details: `${f.label} • ${Number(f.amount).toLocaleString('fr-FR')} FCFA`,
      cibleId: id,
    })
    return json(200, f)
  }
  if (routeModifFacture && methode === 'DELETE') {
    const id = Number(routeModifFacture[1])
    if (!local) throw new ErreurHttp(400, 'Suppression de facture supportée en mode local')
    const mode = url.searchParams.get('mode') === 'hard' ? 'hard' : 'soft'

    if (mode === 'hard') {
      const ok = await local.supprimer(id)
      if (!ok) throw new ErreurHttp(404, 'Facture introuvable')
      e.cache = null

      // Détacher d'éventuels jalons de contrat
      const tousContrats = await magasinContrats.lister()
      for (const c of tousContrats) {
        if (c.jalonsFacturation) {
          let change = false
          for (const j of c.jalonsFacturation) {
            if (j.factureId === id) {
              j.statut = 'pret'
              j.factureId = undefined
              change = true
            }
          }
          if (change) {
            await magasinContrats.modifier(c.id, { jalonsFacturation: c.jalonsFacturation })
          }
        }
      }

      await magasinActivite.enregistrer({
        auteur,
        type: 'facture',
        titre: `Facture #${id} supprimée définitivement`,
        cibleId: id,
      })
      return json(200, { ok: true, mode: 'hard' })
    } else {
      // Soft delete
      const ok = await local.marquerSupprimee(id, 'Facture mise à la corbeille')
      if (!ok) throw new ErreurHttp(404, 'Facture introuvable')
      e.cache = null

      // Détacher jalon si nécessaire
      const tousContrats = await magasinContrats.lister()
      for (const c of tousContrats) {
        if (c.jalonsFacturation) {
          let change = false
          for (const j of c.jalonsFacturation) {
            if (j.factureId === id) {
              j.statut = 'pret'
              j.factureId = undefined
              change = true
            }
          }
          if (change) {
            await magasinContrats.modifier(c.id, { jalonsFacturation: c.jalonsFacturation })
          }
        }
      }

      await magasinActivite.enregistrer({
        auteur,
        type: 'facture',
        titre: `Facture #${id} mise à la corbeille (exclue du CA)`,
        cibleId: id,
      })
      return json(200, { ok: true, mode: 'soft' })
    }
  }

  const routeRestaurerFacture = chemin.match(/^\/api\/factures\/(\d+)\/restaurer$/)
  if (routeRestaurerFacture && methode === 'POST') {
    const id = Number(routeRestaurerFacture[1])
    if (!local) throw new ErreurHttp(400, 'Restauration de facture supportée en mode local')
    const ok = await local.restaurer(id)
    if (!ok) throw new ErreurHttp(404, 'Facture introuvable')
    e.cache = null
    await magasinActivite.enregistrer({
      auteur,
      type: 'facture',
      titre: `Facture #${id} restaurée`,
      details: 'La facture a été réactivée et réintégrée au CA',
      cibleId: id,
    })
    return json(200, { ok: true })
  }

  const action = chemin.match(/^\/api\/factures\/(\d+)\/(finaliser|envoyer|pdf|paiement|payer)$/)
  if (action) {
    const id = Number(action[1])
    if (methode === 'POST' && action[2] === 'finaliser') {
      const f = await source.finaliser(id)
      e.cache = null
      await magasinActivite.enregistrer({
        auteur,
        type: 'facture',
        titre: `Facture ${f.invoice_number} validée`,
        details: `${Number(f.amount).toLocaleString('fr-FR')} FCFA TTC`,
        cibleId: f.id,
      })
      return json(200, { id: f.id, numero: f.invoice_number })
    }
    if (methode === 'POST' && action[2] === 'envoyer') {
      await source.envoyer(id)
      const f = await source.facture(id)
      if (f.customer) await crm.factureEnvoyee(f.customer.id, f.invoice_number)
      return json(200, { ok: true })
    }
    if (methode === 'POST' && action[2] === 'payer') {
      if (!local) throw new ErreurHttp(404, 'Seul le mode local marque les factures payées à la main')
      await local.marquerPayee(id)
      e.cache = null
      await magasinActivite.enregistrer({
        auteur,
        type: 'facture',
        titre: `Paiement enregistré pour facture #${id}`,
        details: 'Facture encaissée',
        cibleId: id,
      })
      await servicePush
        .envoyer({
          titre: '💰 Paiement reçu !',
          corps: `Paiement enregistré pour la facture #${id}`,
          url: '/factures',
        })
        .catch(() => {})
      return json(200, { ok: true })
    }
    if (methode === 'GET' && action[2] === 'pdf' && local) {
      const { octets, nom } = await local.pdf(id)
      return new Response(Buffer.from(octets), {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `inline; filename="${nom}.pdf"`,
          'Cache-Control': 'no-store',
        },
      })
    }
    if (methode === 'GET' && action[2] === 'pdf') {
      const f = await source.facture(id)
      if (!f.public_file_url) throw new ErreurHttp(404, "Cette facture n'a pas encore de PDF (brouillon ?)")
      return new Response(null, { status: 302, headers: { Location: new URL(f.public_file_url, url).href } })
    }
    if (methode === 'GET' && action[2] === 'paiement') {
      const lien = await source.lienPaiement(id)
      if (!lien) throw new ErreurHttp(404, "Pas de lien de paiement pour un brouillon : finalise d'abord la facture")
      return json(200, { url: lien, simule: source.mode === 'demo' })
    }
  }

  // === NOTIFICATIONS PUSH PWA ===
  if (methode === 'GET' && chemin === '/api/notifications/cle-publique') {
    const clePublique = await servicePush.obtenirClePublique()
    return json(200, { clePublique })
  }

  if (methode === 'POST' && chemin === '/api/notifications/souscrire') {
    const b = (await lireJson(req)) as {
      endpoint: string
      keys: { p256dh: string; auth: string }
      userAgent?: string
    }
    if (!b.endpoint || !b.keys?.p256dh || !b.keys?.auth) {
      throw new ErreurHttp(400, 'Souscription Web Push invalide')
    }
    const sub = await servicePush.souscrire({
      endpoint: b.endpoint,
      keys: b.keys,
      auteur,
      userAgent: b.userAgent,
    })
    return json(201, sub)
  }

  if (methode === 'POST' && chemin === '/api/notifications/desinscrire') {
    const b = (await lireJson(req)) as { endpoint: string }
    if (!b.endpoint) throw new ErreurHttp(400, 'Endpoint requis')
    const ok = await servicePush.desinscrire(b.endpoint)
    return json(200, { ok })
  }

  if (methode === 'POST' && chemin === '/api/notifications/tester') {
    const res = await servicePush.envoyer({
      titre: '🚀 Cockpit DigitalVision',
      corps: `Notification de test réussie pour ${auteur} ! Vos alertes push PWA sont actives.`,
      url: '/',
    })
    return json(200, res)
  }

  if (source.mode === 'demo' && methode === 'POST' && chemin === '/api/demo/reinitialiser') {
    demo.reinitialiser()
    await crm.reinitialiser()
    e.cache = null
    return json(200, { ok: true })
  }

  // Page de paiement démo
  const paiement = chemin.match(/^\/payer\/([\w-]+)$/)
  if (source.mode === 'demo' && paiement) {
    const trouvee = demo.numero(decodeURIComponent(paiement[1]))
    if (!trouvee) throw new ErreurHttp(404, 'Facture introuvable')
    if (methode === 'POST') {
      const f = await demo.payer(trouvee.id)
      e.cache = null
      return json(200, { ok: true, numero: f.invoice_number })
    }
    if (methode === 'GET') {
      return html(pagePaiement(trouvee, (await demo.clients()).find((c) => c.id === trouvee.customer?.id)))
    }
  }

  const apercu = chemin.match(/^\/api\/demo\/factures\/(\d+)$/)
  if (source.mode === 'demo' && methode === 'GET' && apercu) {
    const f = await demo.facture(Number(apercu[1]))
    const client = (await demo.clients()).find((c) => c.id === f.customer?.id)
    const eur = (v: string) => Number(v).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })
    return html(`<!doctype html><meta charset="utf-8"><title>${echapper(f.invoice_number || 'Brouillon')} · démo</title>
<style>body{font:15px/1.5 system-ui;max-width:640px;margin:48px auto;padding:0 20px;color:#f9fbff;background:#161616}h1{font-size:22px}
table{width:100%;border-collapse:collapse;margin:24px 0}td{padding:8px 0;border-bottom:1px solid #2a2a2a}td:last-child{text-align:right}
.demo{background:#33301a;border:1px solid #5a5228;color:#fde68a;padding:8px 12px;border-radius:8px;font-size:13px}</style>
<p class="demo">Facture fictive de la démo Cockpit : aucune donnée réelle.</p>
<h1>Facture ${echapper(f.invoice_number || '(brouillon)')}</h1>
<p><strong>Maison Orée</strong>, agence de communication, Lyon<br>Pour : ${echapper(client?.name ?? '')}, ${echapper(client?.billing_address?.city ?? '')}</p>
<p>Émise le ${echapper(f.date ?? '')} · à régler avant le ${echapper(f.deadline ?? '')}</p>
<table><tr><td>${echapper(f.label ?? '')}</td><td>${eur(f.currency_amount_before_tax)} HT</td></tr>
<tr><td>TVA</td><td>${eur(String(Number(f.amount) - Number(f.currency_amount_before_tax)))}</td></tr>
<tr><td><strong>Total TTC</strong></td><td><strong>${eur(f.amount)}</strong></td></tr></table>`)
  }

  throw new ErreurHttp(404, `Route inconnue : ${methode} ${chemin}`)
}

export async function traiter(req: Request): Promise<Response> {
  try {
    return await router(req)
  } catch (err) {
    const e = err as Error & { status?: number }
    const status = e instanceof ErreurHttp || e instanceof ErreurCrm ? e.status : (e.status ?? 502)
    if (status >= 500) console.error('[cockpit]', e.message)
    return json(status, { erreur: e.message })
  }
}

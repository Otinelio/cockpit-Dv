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
import type { ActiviteDV, ContratDV, DepenseDV, SaasDV, TacheDV } from './dv-types'

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
  if (!clientId) throw new ErreurHttp(400, 'Client obligatoire')
  if (!libelle) throw new ErreurHttp(400, 'Libellé obligatoire')
  if (!montantHT || montantHT <= 0) throw new ErreurHttp(400, 'Montant HT positif obligatoire')
  if (!TVA.includes(tva)) throw new ErreurHttp(400, `TVA inconnue : ${tva}`)
  return { clientId, libelle, montantHT, tva, echeanceJours }
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
    if (methode !== 'DELETE' && !String(req.headers.get('content-type')).startsWith('application/json')) {
      throw new ErreurHttp(415, 'JSON attendu')
    }
  }

  // === AUTHENTIFICATION ===
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
    const b = (await lireJson(req)) as Partial<ContratDV>
    if (!b.titre || !b.nomEntreprise) throw new ErreurHttp(400, 'Titre et entreprise requis')
    const contrat = await magasinContrats.ajouter({
      entrepriseId: String(b.entrepriseId ?? ''),
      nomEntreprise: String(b.nomEntreprise).trim(),
      titre: String(b.titre).trim(),
      type: b.type ?? 'creation_site',
      prestations: Array.isArray(b.prestations) ? b.prestations : undefined,
      montantFCFA: Number(b.montantFCFA ?? 0),
      signeLe: b.signeLe ? String(b.signeLe) : undefined,
      debutLe: b.debutLe ?? new Date().toISOString().slice(0, 10),
      finLe: b.finLe ? String(b.finLe) : undefined,
      statut: b.statut ?? 'brouillon',
      responsable: b.responsable ?? auteur,
      notes: b.notes ? String(b.notes) : undefined,
      estSigne: b.estSigne ?? false,
      estLivre: b.estLivre ?? false,
      livreLe: b.livreLe ? String(b.livreLe) : undefined,
      estPaye: b.estPaye ?? false,
      montantPayeFCFA: b.montantPayeFCFA !== undefined ? Number(b.montantPayeFCFA) : undefined,
      payeLe: b.payeLe ? String(b.payeLe) : undefined,
    })
    await magasinActivite.enregistrer({
      auteur,
      type: 'contrat',
      titre: `Nouveau contrat : ${contrat.titre}`,
      details: `${contrat.nomEntreprise} • ${contrat.montantFCFA.toLocaleString('fr-FR')} FCFA`,
      cibleId: contrat.id,
    })
    return json(201, contrat)
  }
  const routeContrat = chemin.match(/^\/api\/contrats\/([a-z0-9-]+)$/)
  if (routeContrat) {
    const id = routeContrat[1]
    if (methode === 'PUT') {
      const modifs = (await lireJson(req)) as Partial<ContratDV>
      const c = await magasinContrats.modifier(id, modifs)
      if (!c) throw new ErreurHttp(404, 'Contrat introuvable')
      return json(200, c)
    }
    if (methode === 'DELETE') {
      const ok = await magasinContrats.supprimer(id)
      if (!ok) throw new ErreurHttp(404, 'Contrat introuvable')
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
  if (methode === 'POST' && fiche) {
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

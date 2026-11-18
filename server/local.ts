// Le mode local : tes factures vivent dans un fichier sur ton ordinateur (.cockpit/factures.json) et sortent en PDF.
// Pas de compte, pas de service externe. Tes clients sont les entreprises de ton CRM ; leur `pennylaneId` (un nom hérité
// du mode Pennylane) sert ici de numéro de client. Le PDF de la facture est dessiné par pdf-lib (server/pdf-facture.ts).

import { promises as fs } from 'node:fs'
import path from 'node:path'
import { ENTREPRISE, TVA_TAUX } from '../data/entreprise'
import type { MagasinCrm } from './crm'
import { genererPdf } from './pdf-facture'
import type { CodeTva, NouvelleFacture, PLCustomer, PLCustomerInvoice, PLTransaction, Source } from './types'

interface FactureLocale {
  id: number
  clientId: number
  libelle: string
  montantHT: number
  tauxTva: number
  echeanceJours: number
  /** Vide tant que la facture est un brouillon. */
  numero: string
  date: string | null
  echeance: string | null
  payeeLe: string | null
}

interface Fichier {
  prochainId: number
  factures: FactureLocale[]
}

export type SourceLocale = Source & {
  pdf(id: number): Promise<{ octets: Uint8Array; nom: string }>
  marquerPayee(id: number): Promise<void>
}

const TAUX: Partial<Record<CodeTva, number>> = { TG_180: TVA_TAUX, exempt: 0 }

const aujourdhui = () => new Date().toLocaleDateString('sv-SE')

function plusJours(iso: string, n: number) {
  const d = new Date(`${iso}T12:00:00`)
  d.setDate(d.getDate() + n)
  return d.toLocaleDateString('sv-SE')
}

const erreur = (status: number, message: string) => Object.assign(new Error(message), { status })

const ttcDe = (f: FactureLocale) => Math.round(f.montantHT * (1 + f.tauxTva))

function versPL(f: FactureLocale): PLCustomerInvoice {
  const ttc = ttcDe(f)
  const brouillon = !f.numero
  const statut = f.payeeLe ? 'paid' : brouillon ? 'draft' : (f.echeance ?? '') < aujourdhui() ? 'late' : 'upcoming'
  return {
    id: f.id,
    label: f.libelle,
    invoice_number: f.numero,
    amount: String(ttc),
    currency_amount_before_tax: String(f.montantHT),
    date: f.date,
    deadline: f.echeance,
    paid: !!f.payeeLe,
    status: statut,
    draft: brouillon,
    remaining_amount_with_tax: f.payeeLe ? '0' : String(ttc),
    public_file_url: brouillon ? null : `/api/factures/${f.id}/pdf`,
    customer: { id: f.clientId, url: '' },
  }
}

export function sourceLocale(crm: MagasinCrm): SourceLocale {
  const dossier = path.join(process.cwd(), '.cockpit')
  const fichier = path.join(dossier, 'factures.json')
  let memoire: Fichier | null = null
  let ecriture: Promise<void> = Promise.resolve()

  async function lire(): Promise<Fichier> {
    if (memoire) return memoire
    try {
      memoire = JSON.parse(await fs.readFile(fichier, 'utf8')) as Fichier
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw erreur(500, `${fichier} est illisible : ${(e as Error).message}`)
      memoire = { prochainId: 1, factures: [] }
    }
    return memoire
  }

  async function ecrire(f: Fichier) {
    memoire = f
    // Les écritures passent l'une après l'autre, et le fichier est remplacé d'un coup : jamais de JSON coupé en deux.
    ecriture = ecriture.then(async () => {
      await fs.mkdir(dossier, { recursive: true })
      const tmp = `${fichier}.${process.pid}.tmp`
      await fs.writeFile(tmp, JSON.stringify(f, null, 2) + '\n', 'utf8')
      await fs.rename(tmp, fichier)
    })
    await ecriture
  }

  const trouver = (f: Fichier, id: number) => {
    const facture = f.factures.find((x) => x.id === id)
    if (!facture) throw erreur(404, `Facture introuvable : ${id}`)
    return facture
  }

  async function clients(): Promise<PLCustomer[]> {
    const [carnet, f] = await Promise.all([crm.idsLocaux(), lire()])
    const facturees = new Set(f.factures.map((x) => x.clientId))
    return carnet.entreprises
      .filter((e) => e.pennylaneId !== null && (e.etape !== 'Perdu' || facturees.has(e.pennylaneId)))
      .map((e) => ({
        id: e.pennylaneId!,
        name: e.nom,
        emails: e.contact?.email ? [e.contact.email] : [],
        billing_address: e.ville ? { address: '', postal_code: '', city: e.ville, country_alpha2: 'TG' } : null,
      }))
  }

  return {
    mode: 'local',

    async entreprise() {
      return ENTREPRISE.nom
    },

    clients,

    async factures() {
      return (await lire()).factures.map(versPL)
    },

    /** Les entrées d'argent : une facture marquée « payée » devient un encaissement à la date où tu l'as marquée. */
    async encaissements(depuis: string): Promise<PLTransaction[]> {
      return (await lire()).factures
        .filter((f) => f.payeeLe && f.payeeLe >= depuis)
        .map((f) => ({ id: f.id, date: f.payeeLe!, amount: String(ttcDe(f)), customer: { id: f.clientId, url: '' } }))
    },

    async creerBrouillon(n: NouvelleFacture) {
      const f = await lire()
      const taux = TAUX[n.tva]
      if (taux === undefined) throw erreur(422, 'Taux de TVA inconnu')
      if (!(await clients()).some((c) => c.id === n.clientId)) throw erreur(422, 'Client inconnu : ajoute-le d’abord au CRM')
      const facture: FactureLocale = {
        id: f.prochainId,
        clientId: n.clientId,
        libelle: n.libelle,
        montantHT: Math.round(n.montantHT),
        tauxTva: taux,
        echeanceJours: n.echeanceJours,
        numero: '',
        date: null,
        echeance: null,
        payeeLe: null,
      }
      await ecrire({ prochainId: f.prochainId + 1, factures: [...f.factures, facture] })
      return versPL(facture)
    },

    async finaliser(id: number) {
      const f = await lire()
      const facture = trouver(f, id)
      if (!facture.numero) {
        const date = aujourdhui()
        const prefixe = `F-${date.slice(0, 4)}-`
        const dernier = Math.max(
          0,
          ...f.factures.filter((x) => x.numero.startsWith(prefixe)).map((x) => Number(x.numero.slice(prefixe.length)) || 0),
        )
        facture.numero = prefixe + String(dernier + 1).padStart(4, '0')
        facture.date = date
        facture.echeance = plusJours(date, facture.echeanceJours)
        await ecrire(f)
      }
      return versPL(facture)
    },

    /** Pas d'e-mail en mode local : « envoyer » vérifie seulement que la facture est prête, le PDF se télécharge. */
    async envoyer(id: number) {
      if (!trouver(await lire(), id).numero) throw erreur(409, 'Finalise la facture avant de l’envoyer')
    },

    async facture(id: number) {
      return versPL(trouver(await lire(), id))
    },

    /** Le « lien » d'une facture, en mode local, est son PDF. */
    async lienPaiement(id: number) {
      const f = trouver(await lire(), id)
      return f.numero ? `/api/factures/${id}/pdf` : null
    },

    async marquerPayee(id: number) {
      const f = await lire()
      const facture = trouver(f, id)
      if (!facture.numero) throw erreur(409, 'Un brouillon ne peut pas être payé : finalise-le d’abord')
      if (!facture.payeeLe) {
        facture.payeeLe = aujourdhui()
        await ecrire(f)
      }
    },

    async pdf(id: number) {
      const facture = trouver(await lire(), id)
      if (!facture.numero) throw erreur(404, 'Ce brouillon n’a pas encore de PDF : finalise-le d’abord')
      const client = (await clients()).find((c) => c.id === facture.clientId)
      const ttc = ttcDe(facture)
      const octets = await genererPdf({
        emetteur: {
          nom: ENTREPRISE.nom,
          adresse: ENTREPRISE.adresse,
          email: ENTREPRISE.email,
          telephone: ENTREPRISE.telephone,
          nif: ENTREPRISE.nif,
          rccm: ENTREPRISE.rccm,
        },
        paiement: ENTREPRISE.paiement,
        mentions: ENTREPRISE.mentions,
        facture: {
          numero: facture.numero,
          date: facture.date!,
          echeance: facture.echeance!,
          libelle: facture.libelle,
          ht: facture.montantHT,
          taux: facture.tauxTva,
          tva: ttc - facture.montantHT,
          ttc,
          payeeLe: facture.payeeLe,
        },
        client: {
          nom: client?.name ?? 'Client',
          ville: client?.billing_address?.city ?? null,
          email: client?.emails[0] ?? null,
        },
      })
      return { octets, nom: facture.numero }
    },
  }
}

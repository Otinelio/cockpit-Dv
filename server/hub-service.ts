// Service serveur complet pour DigitalVision Hub (Espace Entreprise)
// Gère la persistance atomique sur fichiers dans .cockpit/ et le chiffrement AES-256-GCM

import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { dossierCockpit } from './stockage-chemin'
import { ENTREPRISE } from '../data/entreprise'
import { magasinActivite } from './dv-activite'
import type {
  ActionStrategique,
  AssocieDV,
  AuditAccesCoffre,
  CategorieCoffre,
  DecisionReunion,
  DocumentDV,
  DossierDV,
  EntreeCoffreStockee,
  EntreeCoffreVue,
  IdentiteEntreprise,
  ObjectifMensuel,
  ResolutionAnnuelle,
  ResolutionReunion,
  ReunionDV,
  VisionStrategique,
} from './hub-types'

const dossier = dossierCockpit()
const fichierEntreprise = path.join(dossier, 'entreprise.json')
const fichierCoffre = path.join(dossier, 'coffre.json')
const fichierStrategie = path.join(dossier, 'strategie.json')
const fichierAssocies = path.join(dossier, 'associes.json')
const fichierReunions = path.join(dossier, 'reunions.json')
const fichierDocuments = path.join(dossier, 'documents.json')
const dossierFichiersStockage = path.join(dossier, 'documents', 'fichiers')

// --- CHIFFREMENT AES-256-GCM ---
const ALGO = 'aes-256-gcm'

interface FichierCoffreStockage {
  selMaitre: string
  entrees: EntreeCoffreStockee[]
  audits: AuditAccesCoffre[]
}

function deriverCle(selHex: string): Buffer {
  const secret = process.env.COCKPIT_VAULT_KEY?.trim() || 'dv-cockpit-master-key-2026-lome'
  return scryptSync(secret, Buffer.from(selHex, 'hex'), 32)
}

function chiffrer(texte: string, cle: Buffer): { secretChiffre: string; iv: string; authTag: string } {
  const iv = randomBytes(12)
  const cipher = createCipheriv(ALGO, cle, iv)
  let chiffre = cipher.update(texte, 'utf8', 'hex')
  chiffre += cipher.final('hex')
  const authTag = cipher.getAuthTag().toString('hex')
  return {
    secretChiffre: chiffre,
    iv: iv.toString('hex'),
    authTag,
  }
}

function dechiffrer(secretChiffre: string, ivHex: string, authTagHex: string, cle: Buffer): string {
  const iv = Buffer.from(ivHex, 'hex')
  const authTag = Buffer.from(authTagHex, 'hex')
  const decipher = createDecipheriv(ALGO, cle, iv)
  decipher.setAuthTag(authTag)
  let clair = decipher.update(secretChiffre, 'hex', 'utf8')
  clair += decipher.final('utf8')
  return clair
}

async function ecrireFichierAtomique(chemin: string, donnees: unknown) {
  await fs.mkdir(path.dirname(chemin), { recursive: true })
  const tmp = `${chemin}.${process.pid}.${Date.now()}.tmp`
  await fs.writeFile(tmp, JSON.stringify(donnees, null, 2) + '\n', 'utf8')
  await fs.rename(tmp, chemin)
}

export class HubService {
  private memoireEntreprise: IdentiteEntreprise | null = null
  private memoireCoffre: FichierCoffreStockage | null = null
  private memoireStrategie: VisionStrategique | null = null
  private memoireAssocies: AssocieDV[] | null = null
  private memoireReunions: ReunionDV[] | null = null
  private memoireDocuments: { dossiers: DossierDV[]; documents: DocumentDV[] } | null = null

  // ==========================================
  // 1. IDENTITÉ DE L'ENTREPRISE
  // ==========================================
  async obtenirIdentite(): Promise<IdentiteEntreprise> {
    if (this.memoireEntreprise) return this.memoireEntreprise
    try {
      this.memoireEntreprise = JSON.parse(await fs.readFile(fichierEntreprise, 'utf8')) as IdentiteEntreprise
    } catch {
      this.memoireEntreprise = {
        nomCommercial: ENTREPRISE.nom || 'DigitalVision',
        slogan: 'Ingénierie logicielle & Solutions numériques souveraines',
        description:
          'Entreprise technologique basée à Lomé, spécialisée dans le développement de solutions SaaS, d’applications mobiles et la transformation numérique des entreprises togolaises et ouest-africaines.',
        mission:
          'Concevoir des logiciels et services numériques fiables et élégants qui accélèrent la croissance des entrepreneurs et institutions en Afrique.',
        vision:
          'Devenir le studio produit et technologique de référence en Afrique de l’Ouest d’ici 2030.',
        valeurs: ['Excellence technique', 'Intégrité', 'Pragmatisme', 'Impact local'],
        logoPrincipal: '/assets/images/_common/logo.svg',
        logoVariantes: [],
        telephones: [ENTREPRISE.telephone || '+228 90 00 00 00'],
        emails: [ENTREPRISE.email || 'contact@digitalvision.tg'],
        adressePhysique: ENTREPRISE.adresse || 'Lomé, Togo',
        siteWeb: 'https://digitalvision.tg',
        reseauxSociaux: [
          { plateforme: 'linkedin', url: 'https://linkedin.com/company/digitalvision-tg' },
          { plateforme: 'x', url: 'https://x.com/digitalvision_tg' },
          { plateforme: 'github', url: 'https://github.com/digitalvision' },
        ],
        nif: ENTREPRISE.nif || '',
        rccm: ENTREPRISE.rccm || '',
        coordonneesPaiement: {
          banque: 'Compte Entreprise Togo',
          ibanOuRib: '',
          tMoney: '+228 90 00 00 00',
          flooz: '+228 99 00 00 00',
          mentions: ENTREPRISE.mentions || 'Facture payable à réception. DigitalVision SARL-U.',
        },
        modifieLe: new Date().toISOString(),
        modifiePar: 'Système',
      }
      await ecrireFichierAtomique(fichierEntreprise, this.memoireEntreprise)
    }
    return this.memoireEntreprise
  }

  async mettreAJourIdentite(modifs: Partial<IdentiteEntreprise>, auteur: string): Promise<IdentiteEntreprise> {
    const courante = await this.obtenirIdentite()
    this.memoireEntreprise = {
      ...courante,
      ...modifs,
      modifieLe: new Date().toISOString(),
      modifiePar: auteur,
    }
    await ecrireFichierAtomique(fichierEntreprise, this.memoireEntreprise)
    await magasinActivite.enregistrer({
      auteur,
      type: 'client',
      titre: `Identité DigitalVision mise à jour`,
      details: `Modifications enregistrées par ${auteur}`,
    })
    return this.memoireEntreprise
  }

  // ==========================================
  // 2. COFFRE-FORT NUMÉRIQUE (AES-256-GCM)
  // ==========================================
  private async chargerCoffre(): Promise<FichierCoffreStockage> {
    if (this.memoireCoffre) return this.memoireCoffre
    try {
      this.memoireCoffre = JSON.parse(await fs.readFile(fichierCoffre, 'utf8')) as FichierCoffreStockage
    } catch {
      this.memoireCoffre = {
        selMaitre: randomBytes(16).toString('hex'),
        entrees: [],
        audits: [],
      }
      await ecrireFichierAtomique(fichierCoffre, this.memoireCoffre)
    }
    return this.memoireCoffre
  }

  async listerCoffre(): Promise<{ entrees: EntreeCoffreVue[]; audits: AuditAccesCoffre[] }> {
    const c = await this.chargerCoffre()
    const vues: EntreeCoffreVue[] = c.entrees.map((e) => ({
      id: e.id,
      nomService: e.nomService,
      categorie: e.categorie,
      url: e.url,
      identifiant: e.identifiant,
      emailAssocie: e.emailAssocie,
      notes: e.notes,
      responsable: e.responsable,
      creeLe: e.creeLe,
      modifieLe: e.modifieLe,
      modifiePar: e.modifiePar,
      aUnSecret: Boolean(e.secretChiffre),
    }))
    return { entrees: vues, audits: c.audits.slice(-50).reverse() }
  }

  async ajouterEntreeCoffre(
    entree: {
      nomService: string
      categorie: CategorieCoffre
      url?: string
      identifiant: string
      emailAssocie?: string
      secret: string
      notes?: string
      responsable: string
    },
    auteur: string,
  ): Promise<EntreeCoffreVue> {
    const c = await this.chargerCoffre()
    const cle = deriverCle(c.selMaitre)
    const { secretChiffre, iv, authTag } = chiffrer(entree.secret, cle)

    const nouvelle: EntreeCoffreStockee = {
      id: `sec-${Date.now()}-${randomBytes(4).toString('hex')}`,
      nomService: entree.nomService.trim(),
      categorie: entree.categorie,
      url: entree.url?.trim(),
      identifiant: entree.identifiant.trim(),
      emailAssocie: entree.emailAssocie?.trim(),
      secretChiffre,
      iv,
      authTag,
      notes: entree.notes?.trim(),
      responsable: entree.responsable || auteur,
      creeLe: new Date().toISOString(),
      modifieLe: new Date().toISOString(),
      modifiePar: auteur,
    }

    c.entrees.push(nouvelle)
    const audit: AuditAccesCoffre = {
      id: `aud-${Date.now()}`,
      entreeId: nouvelle.id,
      nomService: nouvelle.nomService,
      auteur,
      action: 'creation',
      date: new Date().toISOString(),
    }
    c.audits.push(audit)
    await ecrireFichierAtomique(fichierCoffre, c)

    await magasinActivite.enregistrer({
      auteur,
      type: 'tache',
      titre: `Coffre-fort : ajout de ${nouvelle.nomService}`,
      details: `Catégorie : ${nouvelle.categorie}`,
      cibleId: nouvelle.id,
    })

    return {
      id: nouvelle.id,
      nomService: nouvelle.nomService,
      categorie: nouvelle.categorie,
      url: nouvelle.url,
      identifiant: nouvelle.identifiant,
      emailAssocie: nouvelle.emailAssocie,
      notes: nouvelle.notes,
      responsable: nouvelle.responsable,
      creeLe: nouvelle.creeLe,
      modifieLe: nouvelle.modifieLe,
      modifiePar: nouvelle.modifiePar,
      aUnSecret: true,
    }
  }

  async modifierEntreeCoffre(
    id: string,
    modifs: {
      nomService?: string
      categorie?: CategorieCoffre
      url?: string
      identifiant?: string
      emailAssocie?: string
      secret?: string
      notes?: string
      responsable?: string
    },
    auteur: string,
  ): Promise<EntreeCoffreVue | null> {
    const c = await this.chargerCoffre()
    const index = c.entrees.findIndex((e) => e.id === id)
    if (index === -1) return null

    const ex = c.entrees[index]
    if (modifs.nomService) ex.nomService = modifs.nomService.trim()
    if (modifs.categorie) ex.categorie = modifs.categorie
    if (modifs.url !== undefined) ex.url = modifs.url.trim()
    if (modifs.identifiant !== undefined) ex.identifiant = modifs.identifiant.trim()
    if (modifs.emailAssocie !== undefined) ex.emailAssocie = modifs.emailAssocie.trim()
    if (modifs.notes !== undefined) ex.notes = modifs.notes.trim()
    if (modifs.responsable) ex.responsable = modifs.responsable

    if (modifs.secret !== undefined && modifs.secret !== '') {
      const cle = deriverCle(c.selMaitre)
      const chiffr = chiffrer(modifs.secret, cle)
      ex.secretChiffre = chiffr.secretChiffre
      ex.iv = chiffr.iv
      ex.authTag = chiffr.authTag
    }

    ex.modifieLe = new Date().toISOString()
    ex.modifiePar = auteur

    c.audits.push({
      id: `aud-${Date.now()}`,
      entreeId: ex.id,
      nomService: ex.nomService,
      auteur,
      action: 'modification',
      date: new Date().toISOString(),
    })
    await ecrireFichierAtomique(fichierCoffre, c)

    return {
      id: ex.id,
      nomService: ex.nomService,
      categorie: ex.categorie,
      url: ex.url,
      identifiant: ex.identifiant,
      emailAssocie: ex.emailAssocie,
      notes: ex.notes,
      responsable: ex.responsable,
      creeLe: ex.creeLe,
      modifieLe: ex.modifieLe,
      modifiePar: ex.modifiePar,
      aUnSecret: Boolean(ex.secretChiffre),
    }
  }

  async revelerSecretCoffre(id: string, auteur: string, action: 'consultation' | 'copie' = 'consultation'): Promise<string | null> {
    const c = await this.chargerCoffre()
    const entree = c.entrees.find((e) => e.id === id)
    if (!entree) return null

    const cle = deriverCle(c.selMaitre)
    const secretClair = dechiffrer(entree.secretChiffre, entree.iv, entree.authTag, cle)

    c.audits.push({
      id: `aud-${Date.now()}`,
      entreeId: entree.id,
      nomService: entree.nomService,
      auteur,
      action,
      date: new Date().toISOString(),
    })
    await ecrireFichierAtomique(fichierCoffre, c)

    return secretClair
  }

  async supprimerEntreeCoffre(id: string, auteur: string): Promise<boolean> {
    const c = await this.chargerCoffre()
    const index = c.entrees.findIndex((e) => e.id === id)
    if (index === -1) return false

    const [suppr] = c.entrees.splice(index, 1)
    c.audits.push({
      id: `aud-${Date.now()}`,
      entreeId: id,
      nomService: suppr.nomService,
      auteur,
      action: 'suppression',
      date: new Date().toISOString(),
    })
    await ecrireFichierAtomique(fichierCoffre, c)
    return true
  }

  // ==========================================
  // 3. VISION ET STRATÉGIE
  // ==========================================
  async obtenirStrategie(): Promise<VisionStrategique> {
    if (this.memoireStrategie) return this.memoireStrategie
    try {
      this.memoireStrategie = JSON.parse(await fs.readFile(fichierStrategie, 'utf8')) as VisionStrategique
    } catch {
      this.memoireStrategie = {
        horizon: '2026 - 2030',
        ambitions: [
          'Générer 5 000 000 FCFA de MRR sur les produits SaaS propriétaires (MivaFid, MivaCouture).',
          'Devenir le partenaire technologique de référence de 50 PME togolaises d’ici fin 2027.',
          'Consolider une équipe agile de 10 ingénieurs et experts produits à Lomé.',
        ],
        positionnement:
          'Studio d’ingénierie logicielle & éditeur de solutions SaaS pratiques, adaptées aux réalités économiques ouest-africaines (mobile-first, paiements T-Money/Flooz intégrés).',
        marchesVises: ['Restauration & Hôtellerie', 'Mode & Métiers d’artisanat', 'Services & Commerce de détail'],
        piliersStrategiques: [
          {
            id: 'pil-1',
            titre: 'Excellence Produit & SaaS',
            description: 'Créer des logiciels simples à utiliser qui résolvent un vrai problème quotidien.',
          },
          {
            id: 'pil-2',
            titre: 'Proximité & Relations Clients',
            description: 'Présence active sur le terrain, écoute continue et accompagnement sur-mesure.',
          },
          {
            id: 'pil-3',
            titre: 'Discipline Financière & Cash-Flow',
            description: 'Rentabilité dès le premier jour, suivi rigoureux des encaissements et trésorerie saine.',
          },
        ],
        resolutionsAnnuelles: [
          {
            id: 'res-2026',
            annee: 2026,
            titre: 'Année de la traction commerciale et du lancement de MivaFid',
            description: 'Valider le modèle payant de MivaFid auprès de 30 restaurants et structurer le studio.',
            resultatsAttendus: [
              '30 restaurants actifs sur MivaFid à Lomé',
              'Finalisation de la V1 de MivaCouture',
              'Atteindre 1 000 000 FCFA de MRR récurrent',
            ],
            responsable: 'Othnelio',
            statut: 'en_cours',
          },
        ],
        objectifsMensuels: [
          {
            id: 'obj-1',
            mois: new Date().toISOString().slice(0, 7),
            titre: 'Déployer les 5 premiers restaurants pilotes sur MivaFid',
            indicateur: 'Restaurants pilotes installés et formés',
            cible: 5,
            actuel: 2,
            unite: 'restaurants',
            responsable: 'Medard',
            echeance: new Date(Date.now() + 15 * 86400000).toISOString().slice(0, 10),
            statut: 'en_cours',
            progression: 40,
            actions: [
              {
                id: 'act-1',
                titre: 'Finaliser la signalétique QR Code à imprimer pour comptoirs',
                responsable: 'Medard',
                echeance: new Date().toISOString().slice(0, 10),
                statut: 'en_cours',
              },
              {
                id: 'act-2',
                titre: 'Tester le flux complet d’ajout de points via scan',
                responsable: 'Othnelio',
                echeance: new Date().toISOString().slice(0, 10),
                statut: 'a_faire',
              },
            ],
          },
        ],
        misAJourLe: new Date().toISOString(),
      }
      await ecrireFichierAtomique(fichierStrategie, this.memoireStrategie)
    }
    return this.memoireStrategie
  }

  async mettreAJourStrategie(strategie: Partial<VisionStrategique>, auteur: string): Promise<VisionStrategique> {
    const s = await this.obtenirStrategie()
    this.memoireStrategie = {
      ...s,
      ...strategie,
      misAJourLe: new Date().toISOString(),
    }
    await ecrireFichierAtomique(fichierStrategie, this.memoireStrategie)
    await magasinActivite.enregistrer({
      auteur,
      type: 'tache',
      titre: `Mise à jour de la vision stratégique`,
      details: `Modifié par ${auteur}`,
    })
    return this.memoireStrategie
  }

  // ==========================================
  // 4. ASSOCIÉS ET GOUVERNANCE
  // ==========================================
  async obtenirAssocies(): Promise<AssocieDV[]> {
    if (this.memoireAssocies) return this.memoireAssocies
    try {
      this.memoireAssocies = JSON.parse(await fs.readFile(fichierAssocies, 'utf8')) as AssocieDV[]
    } catch {
      this.memoireAssocies = [
        {
          id: 'associe-othnelio',
          nom: 'Othnelio',
          fonction: 'CTO · Tech & Stratégie',
          roleDetaille:
            'Direction technique, architecture logicielle des solutions SaaS et sur-mesure, infrastructure cloud, sécurité et vision technologique globale.',
          email: 'othnelio@digitalvision.tg',
          telephone: '+228 90 00 00 01',
          responsabilites: [
            'Architecture logicielle & Dev full-stack (Next.js, Flutter, Node.js)',
            'Gestion de l’infrastructure d’hébergement et CI/CD',
            'Sécurité applicative et intégrité des données',
            'Planification des roadmaps techniques des produits SaaS',
          ],
          competences: ['TypeScript', 'Next.js', 'React', 'Flutter', 'PostgreSQL', 'Architecture Cloud', 'DevOps'],
          objectifsIndividuels: [
            'Garantir 99.9% de disponibilité sur les SaaS en production',
            'Accélérer les cycles de livraison MVP à moins de 3 semaines',
          ],
          ordre: 1,
        },
        {
          id: 'associe-medard',
          nom: 'Medard',
          fonction: 'CMO · Produit & Exécution',
          roleDetaille:
            'Gestion de produit, design d’expérience utilisateur (UI/UX), stratégie marketing, acquisition d’utilisateurs et animation des lancements.',
          email: 'medard@digitalvision.tg',
          telephone: '+228 90 00 00 02',
          responsabilites: [
            'Conception des maquettes et parcours utilisateurs',
            'Tests terrain auprès des utilisateurs finaux',
            'Campagnes d’acquisition, réseaux sociaux et visibilité de marque',
            'Documentation produit et supports de formation',
          ],
          competences: ['UI/UX Design', 'Product Management', 'Marketing Digital', 'Growth Hacking', 'Copywriting'],
          objectifsIndividuels: [
            'Faire tester MivaFid à au moins 20 commerçants par mois',
            'Structurer une identité visuelle forte et reconnaissable pour DigitalVision',
          ],
          ordre: 2,
        },
        {
          id: 'associe-romeo',
          nom: 'Roméo',
          fonction: 'COO · Commercial, Opérations & Relations clients',
          roleDetaille:
            'Direction commerciale, négociation des contrats, prospection terrain, gestion financière courante et relation client de premier plan.',
          email: 'romeo@digitalvision.tg',
          telephone: '+228 90 00 00 03',
          responsabilites: [
            'Prospection active et closing des contrats clients',
            'Gestion des devis, facturations et relances des impayés',
            'Partenariats stratégiques avec les commerces et institutions',
            'Gestion administrative et conformité juridique',
          ],
          competences: ['Négociation commerciale', 'Gestion de la relation client (CRM)', 'Gestion administrative', 'Opérations terrain'],
          objectifsIndividuels: [
            'Atteindre 100% de taux de recouvrement des factures sous 30 jours',
            'Clôturer 3 nouveaux contrats de développement de sites/logiciels par trimestre',
          ],
          ordre: 3,
        },
      ]
      await ecrireFichierAtomique(fichierAssocies, this.memoireAssocies)
    }
    return this.memoireAssocies
  }

  async mettreAJourAssocie(id: string, modifs: Partial<AssocieDV>, auteur: string): Promise<AssocieDV | null> {
    const associes = await this.obtenirAssocies()
    const index = associes.findIndex((a) => a.id === id || a.nom.toLowerCase() === id.toLowerCase())
    if (index === -1) return null
    associes[index] = { ...associes[index], ...modifs }
    this.memoireAssocies = associes
    await ecrireFichierAtomique(fichierAssocies, associes)
    await magasinActivite.enregistrer({
      auteur,
      type: 'connexion',
      titre: `Fiche associé mise à jour : ${associes[index].nom}`,
      cibleId: associes[index].id,
    })
    return associes[index]
  }

  // ==========================================
  // 5. RÉUNIONS ET DÉCISIONS
  // ==========================================
  async obtenirReunions(): Promise<ReunionDV[]> {
    if (this.memoireReunions) return this.memoireReunions
    try {
      this.memoireReunions = JSON.parse(await fs.readFile(fichierReunions, 'utf8')) as ReunionDV[]
    } catch {
      this.memoireReunions = [
        {
          id: 'reunion-init',
          titre: 'Réunion de cadrage stratégique & lancement Cockpit Hub',
          dateHeure: new Date().toISOString(),
          lieu: 'Bureau DigitalVision / Lomé',
          participants: ['Othnelio', 'Medard', 'Roméo'],
          ordreDuJour: [
            'Structuration du module central Entreprise',
            'Revue des objectifs SaaS Q4',
            'Sécurisation des accès et gestion documentaire',
          ],
          notes:
            'Accord unanime sur la centralisation institutionnelle dans Cockpit DV. Chaque associé dispose désormais d’un accès direct à la stratégie, aux documents officiels et au coffre-fort sécurisé.',
          decisions: [
            {
              id: 'dec-1',
              titre: 'Adoption de Cockpit comme source unique de vérité pour les 3 associés',
              description: 'Toutes les décisions et résolutions sont consignées ici.',
              statut: 'validee',
            },
          ],
          resolutions: [
            {
              id: 'res-1',
              titre: 'Déployer les premiers restaurants pilotes MivaFid',
              responsable: 'Medard',
              echeance: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
              statut: 'en_cours',
            },
          ],
          creePar: 'Othnelio',
          creeLe: new Date().toISOString(),
        },
      ]
      await ecrireFichierAtomique(fichierReunions, this.memoireReunions)
    }
    return this.memoireReunions
  }

  async ajouterReunion(
    reunion: Omit<ReunionDV, 'id' | 'creeLe'>,
    auteur: string,
  ): Promise<ReunionDV> {
    const meetings = await this.obtenirReunions()
    const nouvelle: ReunionDV = {
      ...reunion,
      id: `reu-${Date.now()}-${randomBytes(3).toString('hex')}`,
      creeLe: new Date().toISOString(),
      creePar: auteur,
    }
    meetings.unshift(nouvelle)
    this.memoireReunions = meetings
    await ecrireFichierAtomique(fichierReunions, meetings)
    await magasinActivite.enregistrer({
      auteur,
      type: 'tache',
      titre: `Nouvelle réunion consignée : ${nouvelle.titre}`,
      details: `${nouvelle.lieu} • ${nouvelle.participants.join(', ')}`,
      cibleId: nouvelle.id,
    })
    return nouvelle
  }

  async modifierReunion(id: string, modifs: Partial<ReunionDV>, auteur: string): Promise<ReunionDV | null> {
    const meetings = await this.obtenirReunions()
    const index = meetings.findIndex((r) => r.id === id)
    if (index === -1) return null
    meetings[index] = { ...meetings[index], ...modifs }
    this.memoireReunions = meetings
    await ecrireFichierAtomique(fichierReunions, meetings)
    await magasinActivite.enregistrer({
      auteur,
      type: 'tache',
      titre: `Mise à jour réunion : ${meetings[index].titre}`,
      cibleId: meetings[index].id,
    })
    return meetings[index]
  }

  async supprimerReunion(id: string): Promise<boolean> {
    const meetings = await this.obtenirReunions()
    const index = meetings.findIndex((r) => r.id === id)
    if (index === -1) return false
    meetings.splice(index, 1)
    this.memoireReunions = meetings
    await ecrireFichierAtomique(fichierReunions, meetings)
    return true
  }

  // ==========================================
  // 6. DOCUMENTS ET ARCHIVES
  // ==========================================
  private async chargerDocumentsData(): Promise<{ dossiers: DossierDV[]; documents: DocumentDV[] }> {
    if (this.memoireDocuments) return this.memoireDocuments
    try {
      this.memoireDocuments = JSON.parse(await fs.readFile(fichierDocuments, 'utf8')) as {
        dossiers: DossierDV[]
        documents: DocumentDV[]
      }
    } catch {
      this.memoireDocuments = {
        dossiers: [
          { id: 'dos-admin', nom: 'Administratif', parentId: null, creeLe: new Date().toISOString() },
          { id: 'dos-identite', nom: 'Identité visuelle', parentId: null, creeLe: new Date().toISOString() },
          { id: 'dos-strat', nom: 'Stratégie', parentId: null, creeLe: new Date().toISOString() },
          { id: 'dos-reunions', nom: 'Réunions', parentId: null, creeLe: new Date().toISOString() },
          { id: 'dos-ressources', nom: 'Ressources', parentId: null, creeLe: new Date().toISOString() },
          { id: 'dos-archives', nom: 'Archives', parentId: null, creeLe: new Date().toISOString() },
        ],
        documents: [],
      }
      await ecrireFichierAtomique(fichierDocuments, this.memoireDocuments)
    }
    await fs.mkdir(dossierFichiersStockage, { recursive: true })
    return this.memoireDocuments
  }

  async obtenirDocuments(): Promise<{ dossiers: DossierDV[]; documents: DocumentDV[] }> {
    return this.chargerDocumentsData()
  }

  async creerDossier(nom: string, parentId: string | null = null): Promise<DossierDV> {
    const data = await this.chargerDocumentsData()
    const nouveau: DossierDV = {
      id: `dos-${Date.now()}-${randomBytes(3).toString('hex')}`,
      nom: nom.trim(),
      parentId,
      creeLe: new Date().toISOString(),
    }
    data.dossiers.push(nouveau)
    await ecrireFichierAtomique(fichierDocuments, data)
    return nouveau
  }

  async renommerDossier(id: string, nouveauNom: string): Promise<boolean> {
    const data = await this.chargerDocumentsData()
    const d = data.dossiers.find((x) => x.id === id)
    if (!d) return false
    d.nom = nouveauNom.trim()
    await ecrireFichierAtomique(fichierDocuments, data)
    return true
  }

  async supprimerDossier(id: string): Promise<boolean> {
    const data = await this.chargerDocumentsData()
    const index = data.dossiers.findIndex((x) => x.id === id)
    if (index === -1) return false
    data.dossiers.splice(index, 1)
    // Déplace ou supprime les documents du dossier
    const docsASupprimer = data.documents.filter((d) => d.dossierId === id)
    for (const doc of docsASupprimer) {
      await this.supprimerDocument(doc.id)
    }
    await ecrireFichierAtomique(fichierDocuments, data)
    return true
  }

  async enregistrerFichierDocument(
    nomFichierOriginal: string,
    buffer: Buffer,
    mimeType: string,
    dossierId: string,
    auteur: string,
    description?: string,
    liaisons?: { projetSaasId?: string; clientCrmId?: string; reunionId?: string },
  ): Promise<DocumentDV> {
    const data = await this.chargerDocumentsData()
    const id = `doc-${Date.now()}-${randomBytes(4).toString('hex')}`
    const ext = path.extname(nomFichierOriginal).toLowerCase()
    const nomSurDisque = `${id}${ext}`
    const cheminAbsolu = path.join(dossierFichiersStockage, nomSurDisque)

    await fs.mkdir(dossierFichiersStockage, { recursive: true })
    await fs.writeFile(cheminAbsolu, buffer)

    const nouveau: DocumentDV = {
      id,
      dossierId,
      nomFichier: nomSurDisque,
      nomOriginal: nomFichierOriginal,
      extension: ext.replace('.', ''),
      mimeType,
      tailleOctets: buffer.length,
      cheminStockage: nomSurDisque,
      auteur,
      creeLe: new Date().toISOString(),
      misAJourLe: new Date().toISOString(),
      description,
      projetSaasId: liaisons?.projetSaasId,
      clientCrmId: liaisons?.clientCrmId,
      reunionId: liaisons?.reunionId,
    }

    data.documents.push(nouveau)
    await ecrireFichierAtomique(fichierDocuments, data)

    await magasinActivite.enregistrer({
      auteur,
      type: 'tache',
      titre: `Fichier archivé : ${nouveau.nomOriginal}`,
      details: `${(nouveau.tailleOctets / 1024).toFixed(1)} Ko • Dossier : ${dossierId}`,
      cibleId: nouveau.id,
    })

    return nouveau
  }

  async obtenirFichierBinaire(id: string): Promise<{ document: DocumentDV; buffer: Buffer } | null> {
    const data = await this.chargerDocumentsData()
    const doc = data.documents.find((d) => d.id === id)
    if (!doc) return null
    const chemin = path.join(dossierFichiersStockage, doc.cheminStockage)
    try {
      const buffer = await fs.readFile(chemin)
      return { document: doc, buffer }
    } catch {
      return null
    }
  }

  async renommerDocument(id: string, nouveauNom: string): Promise<boolean> {
    const data = await this.chargerDocumentsData()
    const doc = data.documents.find((d) => d.id === id)
    if (!doc) return false
    doc.nomOriginal = nouveauNom.trim()
    doc.misAJourLe = new Date().toISOString()
    await ecrireFichierAtomique(fichierDocuments, data)
    return true
  }

  async deplacerDocument(id: string, nouveauDossierId: string): Promise<boolean> {
    const data = await this.chargerDocumentsData()
    const doc = data.documents.find((d) => d.id === id)
    if (!doc) return false
    doc.dossierId = nouveauDossierId
    doc.misAJourLe = new Date().toISOString()
    await ecrireFichierAtomique(fichierDocuments, data)
    return true
  }

  async supprimerDocument(id: string): Promise<boolean> {
    const data = await this.chargerDocumentsData()
    const index = data.documents.findIndex((d) => d.id === id)
    if (index === -1) return false
    const [doc] = data.documents.splice(index, 1)
    const chemin = path.join(dossierFichiersStockage, doc.cheminStockage)
    await fs.unlink(chemin).catch(() => {})
    await ecrireFichierAtomique(fichierDocuments, data)
    return true
  }
}

export const hubService = new HubService()

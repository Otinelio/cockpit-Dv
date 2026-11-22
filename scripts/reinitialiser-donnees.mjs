// Script de remise à zéro des données Cockpit DV dans Neon Postgres.
// Conserve STRICTEMENT :
// - L'authentification (mots de passe hachés des associés)
// - Les 3 collaborateurs associés (Othnelio, Médard, Roméo)
// - L'identité légale de l'entreprise (DigitalVision)
//
// Supprime / réinitialise à vide :
// - Les tâches
// - Le CRM (prospects et entreprises vidés, équipe conservée)
// - Les factures
// - Les contrats
// - Les dépenses
// - Les projets SaaS
// - L'historique d'activité (audit trail)
// - Le coffre-fort (mots de passe et secrets vidés)
// - Les réunions
// - Les documents archivés
// - Les objectifs et résolutions stratégiques

import { neon } from '@neondatabase/serverless'

const url = process.env.DATABASE_URL || process.env.DATABASE_URL_UNPOOLED
if (!url) {
  console.error('DATABASE_URL non configurée')
  process.exit(1)
}

const sql = neon(url)

async function reinitialiser() {
  console.log('--- Réinitialisation des données dans Neon Postgres ---\n')

  const aujourdhui = new Date().toISOString()

  // 1. TÂCHES : vide
  await sql`
    UPDATE cockpit_collections
    SET donnees = '[]'::jsonb, mis_a_jour_le = NOW()
    WHERE cle = 'taches'
  `
  console.log('  ✓ Tâches réinitialisées à vide')

  // 2. FACTURES : vide
  await sql`
    UPDATE cockpit_collections
    SET donnees = '{"prochainId": 1, "factures": []}'::jsonb, mis_a_jour_le = NOW()
    WHERE cle = 'factures'
  `
  console.log('  ✓ Factures réinitialisées à vide')

  // 3. CONTRATS : vide
  await sql`
    UPDATE cockpit_collections
    SET donnees = '[]'::jsonb, mis_a_jour_le = NOW()
    WHERE cle = 'contrats'
  `
  console.log('  ✓ Contrats réinitialisés à vide')

  // 4. DÉPENSES : vide
  await sql`
    UPDATE cockpit_collections
    SET donnees = '[]'::jsonb, mis_a_jour_le = NOW()
    WHERE cle = 'depenses'
  `
  console.log('  ✓ Dépenses réinitialisées à vide')

  // 5. SAAS : vide
  await sql`
    UPDATE cockpit_collections
    SET donnees = '[]'::jsonb, mis_a_jour_le = NOW()
    WHERE cle = 'saas'
  `
  console.log('  ✓ Produits SaaS réinitialisés à vide')

  // 6. ACTIVITÉ : vide
  await sql`
    UPDATE cockpit_collections
    SET donnees = '[]'::jsonb, mis_a_jour_le = NOW()
    WHERE cle = 'activite'
  `
  console.log('  ✓ Journal d\'activité réinitialisé à vide')

  // 7. COFFRE : vidé de tous les secrets
  const coffreRes = await sql`SELECT donnees FROM cockpit_collections WHERE cle = 'coffre'`
  const selMaitre = coffreRes[0]?.donnees?.selMaitre || '0123456789abcdef0123456789abcdef'
  const coffreVide = { selMaitre, entrees: [], audits: [] }
  await sql`
    UPDATE cockpit_collections
    SET donnees = ${JSON.stringify(coffreVide)}::jsonb, mis_a_jour_le = NOW()
    WHERE cle = 'coffre'
  `
  console.log('  ✓ Coffre-fort vidé (tous les secrets supprimés)')

  // 8. RÉUNIONS : vide
  await sql`
    UPDATE cockpit_collections
    SET donnees = '[]'::jsonb, mis_a_jour_le = NOW()
    WHERE cle = 'reunions'
  `
  console.log('  ✓ Réunions réinitialisées à vide')

  // 9. DOCUMENTS : dossiers vides
  const documentsVides = {
    dossiers: [
      { id: 'dos-admin', nom: 'Administratif', parentId: null, creeLe: aujourdhui },
      { id: 'dos-identite', nom: 'Identité visuelle', parentId: null, creeLe: aujourdhui },
      { id: 'dos-strat', nom: 'Stratégie', parentId: null, creeLe: aujourdhui },
      { id: 'dos-reunions', nom: 'Réunions', parentId: null, creeLe: aujourdhui },
      { id: 'dos-ressources', nom: 'Ressources', parentId: null, creeLe: aujourdhui },
      { id: 'dos-archives', nom: 'Archives', parentId: null, creeLe: aujourdhui },
    ],
    documents: [],
  }
  await sql`
    UPDATE cockpit_collections
    SET donnees = ${JSON.stringify(documentsVides)}::jsonb, mis_a_jour_le = NOW()
    WHERE cle = 'documents'
  `
  console.log('  ✓ Documents et fichiers réinitialisés à vide')

  // 10. CRM : entreprises vidées, les 3 associés collaborateurs conservés
  const crmPropre = {
    moi: 'Othnelio',
    equipe: [
      {
        nom: 'Othnelio',
        role: 'CTO · Tech & Stratégie',
        email: 'othnelio@digitalvision.tg',
        telephone: '+228 90 00 00 01',
        ton: 'purple',
      },
      {
        nom: 'Medard',
        role: 'CMO · Produit & Exécution',
        email: 'medard@digitalvision.tg',
        telephone: '+228 90 00 00 02',
        ton: 'blue',
      },
      {
        nom: 'Roméo',
        role: 'COO · Commercial & Opérations',
        email: 'romeo@digitalvision.tg',
        telephone: '+228 90 00 00 03',
        ton: 'green',
      },
    ],
    prochainPennylaneId: 1,
    entreprises: [],
  }
  await sql`
    UPDATE cockpit_collections
    SET donnees = ${JSON.stringify(crmPropre)}::jsonb, mis_a_jour_le = NOW()
    WHERE cle = 'crm'
  `
  console.log('  ✓ CRM réinitialisé (0 entreprise, les 3 collaborateurs conservés)')

  // 11. STRATÉGIE : résolutions et objectifs vidés
  const strategieVide = {
    horizon: '2026 - 2030',
    ambitions: [],
    positionnement: '',
    marchesVises: [],
    piliersStrategiques: [],
    resolutionsAnnuelles: [],
    objectifsMensuels: [],
    misAJourLe: aujourdhui,
  }
  await sql`
    UPDATE cockpit_collections
    SET donnees = ${JSON.stringify(strategieVide)}::jsonb, mis_a_jour_le = NOW()
    WHERE cle = 'strategie'
  `
  console.log('  ✓ Stratégie réinitialisée (objectifs et résolutions vidés)')

  console.log('\n--- Vérification finale des données conservées ---')
  const authCheck = await sql`SELECT donnees FROM cockpit_collections WHERE cle = 'auth'`
  const associesCheck = await sql`SELECT donnees FROM cockpit_collections WHERE cle = 'associes'`
  const utilisateurs = Object.keys(authCheck[0]?.donnees?.utilisateurs || {})
  const nomsAssocies = (associesCheck[0]?.donnees || []).map((a) => a.nom)

  console.log('  ✓ Utilisateurs Auth préservés :', utilisateurs.join(', '))
  console.log('  ✓ Collaborateurs Associés préservés :', nomsAssocies.join(', '))
  console.log('\nRemise à zéro terminée avec succès !')
}

reinitialiser().catch((e) => {
  console.error('Erreur:', e)
  process.exit(1)
})

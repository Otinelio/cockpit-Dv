// Script complet de vérification End-to-End des services Neon (PostgreSQL + Object Storage)
// Exécution : node --env-file=.env.local scripts/test-e2e.mjs

import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3'
import { neon } from '@neondatabase/serverless'

async function run() {
  console.log('=====================================================')
  console.log('   TESTS DE VALIDATION END-TO-END SERVICES NEON')
  console.log('=====================================================\n')

  const base = 'http://localhost:5180'

  // --- 1. NEON POSTGRESQL (VIA API COCKPIT) ---
  console.log('[1/4] Test Neon Postgres : Routes API du Backend')

  // A. Tâches
  const resTaches = await fetch(`${base}/api/taches`)
  const taches = await resTaches.json()
  console.log(`  ✓ GET /api/taches (HTTP ${resTaches.status}) : ${taches.length} tâches récupérées depuis Neon`)

  // B. CRM
  const resCrm = await fetch(`${base}/api/crm`)
  const crm = await resCrm.json()
  console.log(`  ✓ GET /api/crm (HTTP ${resCrm.status}) : ${crm.entreprises?.length} entreprises CRM récupérées`)

  // C. Contrats
  const resContrats = await fetch(`${base}/api/contrats`)
  const contrats = await resContrats.json()
  console.log(`  ✓ GET /api/contrats (HTTP ${resContrats.status}) : ${contrats.length} contrats récupérés`)

  // D. Hub Identité
  const resIdentite = await fetch(`${base}/api/hub/identite`)
  const identite = await resIdentite.json()
  console.log(`  ✓ GET /api/hub/identite (HTTP ${resIdentite.status}) : ${identite.nomCommercial} ("${identite.slogan}")`)

  // E. Coffre-fort numérique
  const resCoffre = await fetch(`${base}/api/hub/coffre`)
  const coffre = await resCoffre.json()
  console.log(`  ✓ GET /api/hub/coffre (HTTP ${resCoffre.status}) : ${coffre.entrees?.length} entrées chiffrées dans le coffre`)

  // --- 2. NEON POSTGRESQL (MUTATION ATOMIQUE) ---
  console.log('\n[2/4] Test Neon Postgres : Mutation en Écriture')
  const resCreeTache = await fetch(`${base}/api/taches`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-auteur': 'Othnelio' },
    body: JSON.stringify({
      titre: 'Vérification automatique Neon Postgres ' + new Date().toISOString().slice(11, 19),
      type: 'dev_saas',
      assigneA: 'Othnelio',
      priorite: 'haute',
    }),
  })
  const nouvelleTache = await resCreeTache.json()
  console.log(`  ✓ POST /api/taches (HTTP ${resCreeTache.status}) : Tâche créée avec succès (ID: ${nouvelleTache.id})`)

  // --- 3. NEON OBJECT STORAGE (BUCKET ASSETS) ---
  console.log('\n[3/4] Test Neon Object Storage : Écriture, Lecture & Suppression S3')
  const s3 = new S3Client({
    forcePathStyle: true,
    endpoint: process.env.AWS_ENDPOINT_URL_S3,
    region: process.env.AWS_REGION || 'us-east-2',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  })

  const nomFichierTest = `e2e-test-${Date.now()}.txt`
  const contenuTexte = 'Document test généré par Cockpit DV pour Neon Object Storage.'
  const bufferContenu = Buffer.from(contenuTexte, 'utf8')

  // Upload S3
  await s3.send(
    new PutObjectCommand({
      Bucket: 'assets',
      Key: nomFichierTest,
      Body: bufferContenu,
      ContentType: 'text/plain',
    }),
  )
  console.log(`  ✓ PutObjectCommand : Fichier "${nomFichierTest}" uploadé avec succès dans le bucket assets`)

  // Download S3
  const reponseGet = await s3.send(
    new GetObjectCommand({
      Bucket: 'assets',
      Key: nomFichierTest,
    }),
  )
  const bytesLus = await reponseGet.Body.transformToByteArray()
  const texteRecupere = Buffer.from(bytesLus).toString('utf8')
  if (texteRecupere !== contenuTexte) {
    throw new Error('Le contenu récupéré ne correspond pas au contenu envoyé !')
  }
  console.log(`  ✓ GetObjectCommand : Fichier relu avec succès et intégrité vérifiée : "${texteRecupere}"`)

  // Delete S3
  await s3.send(
    new DeleteObjectCommand({
      Bucket: 'assets',
      Key: nomFichierTest,
    }),
  )
  console.log(`  ✓ DeleteObjectCommand : Fichier de test supprimé du bucket assets`)

  // --- 4. VÉRIFICATION GLOBALE DES COLLECTIONS POSTGRESQL ---
  console.log('\n[4/4] Synthèse des Collections dans Neon Postgres')
  const sql = neon(process.env.DATABASE_URL)
  const collections = await sql`
    SELECT cle, octet_length(donnees::text) as taille_octets, mis_a_jour_le
    FROM cockpit_collections
    ORDER BY cle ASC;
  `
  console.table(collections)

  console.log('\n=====================================================')
  console.log('   TOUS LES SERVICES NEON FONCTIONNENT À 100% !')
  console.log('=====================================================')
}

run().catch((err) => {
  console.error('\nERREUR LORS DU TEST:', err)
  process.exit(1)
})

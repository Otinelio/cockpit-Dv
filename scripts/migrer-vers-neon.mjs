// Script d'importation automatique de l'ensemble des données .cockpit/ vers Neon Postgres.
// Exécutable avec : node --env-file=.env.local scripts/migrer-vers-neon.mjs

import { promises as fs } from 'node:fs'
import path from 'node:path'
import { neon } from '@neondatabase/serverless'

const url = process.env.DATABASE_URL || process.env.DATABASE_URL_UNPOOLED
if (!url) {
  console.error('Erreur: DATABASE_URL non définie')
  process.exit(1)
}

const sql = neon(url)
const dossierCockpit = path.join(process.cwd(), '.cockpit')

async function migrer() {
  console.log('--- Initialisation de la table cockpit_collections sur Neon ---')
  await sql`
    CREATE TABLE IF NOT EXISTS cockpit_collections (
      cle TEXT PRIMARY KEY,
      donnees JSONB NOT NULL,
      mis_a_jour_le TIMESTAMPTZ DEFAULT NOW()
    );
  `

  console.log('--- Lecture des fichiers depuis', dossierCockpit, '---')
  const entrees = await fs.readdir(dossierCockpit, { withFileTypes: true })
  const fichiersJson = entrees.filter((e) => e.isFile() && e.name.endsWith('.json'))

  console.log(`Trouvé ${fichiersJson.length} fichiers JSON à migrer :`)

  for (const f of fichiersJson) {
    const cle = f.name.replace(/\.json$/, '')
    const cheminComplet = path.join(dossierCockpit, f.name)
    const texte = await fs.readFile(cheminComplet, 'utf8')
    try {
      const parsed = JSON.parse(texte)
      await sql`
        INSERT INTO cockpit_collections (cle, donnees, mis_a_jour_le)
        VALUES (${cle}, ${JSON.stringify(parsed)}::jsonb, NOW())
        ON CONFLICT (cle)
        DO UPDATE SET donnees = EXCLUDED.donnees, mis_a_jour_le = NOW();
      `
      console.log(`  ✓ Collection [${cle}] insérée dans Neon avec succès`)
    } catch (err) {
      console.error(`  ✗ Erreur sur ${f.name} :`, err.message)
    }
  }

  const compte = await sql`SELECT count(*)::int as total FROM cockpit_collections`
  console.log(`\nMigration terminée avec succès ! Total collections dans Neon: ${compte[0].total}`)
}

migrer().catch((err) => {
  console.error('Échec de la migration:', err)
  process.exit(1)
})

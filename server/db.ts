// Client et gestionnaire de persistance PostgreSQL Neon pour Cockpit DV.
// Remplace le stockage sur fichiers JSON locaux par des collections JSONB atomiques et indexées dans Neon Postgres.

import { neon, type NeonQueryFunction } from '@neondatabase/serverless'

let sqlClient: NeonQueryFunction<false, false> | null = null

function getSql(): NeonQueryFunction<false, false> {
  if (sqlClient) return sqlClient
  const url = process.env.DATABASE_URL || process.env.DATABASE_URL_UNPOOLED
  if (!url) {
    throw new Error('DATABASE_URL Neon non configurée dans .env.local ou .env')
  }
  sqlClient = neon(url)
  return sqlClient
}

let tablePrete = false

/**
 * Initialise la table des collections dans Neon Postgres si elle n'existe pas encore.
 */
export async function initialiserDb(): Promise<void> {
  if (tablePrete) return
  const sql = getSql()
  await sql`
    CREATE TABLE IF NOT EXISTS cockpit_collections (
      cle TEXT PRIMARY KEY,
      donnees JSONB NOT NULL,
      mis_a_jour_le TIMESTAMPTZ DEFAULT NOW()
    );
  `
  tablePrete = true
}

/**
 * Lit une collection complète depuis Neon Postgres.
 */
export async function lireCollection<T>(cle: string, valeurParDefaut: T): Promise<T> {
  await initialiserDb()
  const sql = getSql()
  const rows = (await sql`
    SELECT donnees FROM cockpit_collections WHERE cle = ${cle} LIMIT 1
  `) as Array<{ donnees: unknown }>

  if (!rows || rows.length === 0 || rows[0].donnees === undefined || rows[0].donnees === null) {
    return valeurParDefaut
  }
  return rows[0].donnees as T
}

/**
 * Écrit / met à jour une collection complète dans Neon Postgres de manière atomique.
 */
export async function ecrireCollection<T>(cle: string, donnees: T): Promise<void> {
  await initialiserDb()
  const sql = getSql()
  const jsonStr = JSON.stringify(donnees)
  await sql`
    INSERT INTO cockpit_collections (cle, donnees, mis_a_jour_le)
    VALUES (${cle}, ${jsonStr}::jsonb, NOW())
    ON CONFLICT (cle)
    DO UPDATE SET donnees = EXCLUDED.donnees, mis_a_jour_le = NOW();
  `
}

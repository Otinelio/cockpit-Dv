import os from 'node:os'
import path from 'node:path'

/**
 * Retourne le chemin absolu du dossier de stockage Cockpit.
 * - Sur Vercel / AWS Lambda : /tmp/.cockpit (seul répertoire accessible en écriture)
 * - En local : <racine>/.cockpit
 */
export function dossierCockpit(): string {
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    return path.join(os.tmpdir(), '.cockpit')
  }
  return path.join(process.cwd(), '.cockpit')
}


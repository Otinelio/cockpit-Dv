// Gestionnaire de stockage S3 Neon Object Storage (Bucket assets).
// Permet de stocker et récupérer les documents, fiches et pièces jointes de manière durable dans le Cloud Neon.

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3'

const BUCKET = 'assets'

function getS3Client(): S3Client | null {
  const endpoint = process.env.AWS_ENDPOINT_URL_S3
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY
  const region = process.env.AWS_REGION || 'us-east-2'

  if (!endpoint || !accessKeyId || !secretAccessKey) {
    return null
  }

  return new S3Client({
    forcePathStyle: true, // Requis par Neon Object Storage
    endpoint,
    region,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  })
}

/**
 * Sauvegarde un fichier dans le bucket Neon Object Storage.
 */
export async function stockerFichier(
  nomFichier: string,
  contenu: Buffer | Uint8Array,
  contentType: string = 'application/octet-stream',
): Promise<{ cle: string; taille: number }> {
  const s3 = getS3Client()
  if (!s3) {
    throw new Error('Variables Neon Object Storage non configurées (AWS_ENDPOINT_URL_S3, etc.)')
  }

  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: nomFichier,
      Body: contenu,
      ContentType: contentType,
    }),
  )

  return { cle: nomFichier, taille: contenu.length }
}

/**
 * Récupère un fichier depuis le bucket Neon Object Storage.
 */
export async function lireFichier(nomFichier: string): Promise<{ buffer: Buffer; contentType: string } | null> {
  const s3 = getS3Client()
  if (!s3) return null

  try {
    const res = await s3.send(
      new GetObjectCommand({
        Bucket: BUCKET,
        Key: nomFichier,
      }),
    )

    if (!res.Body) return null
    const octets = await res.Body.transformToByteArray()
    return {
      buffer: Buffer.from(octets),
      contentType: res.ContentType || 'application/octet-stream',
    }
  } catch (err) {
    const code = (err as { name?: string }).name
    if (code === 'NoSuchKey' || code === 'NotFound') {
      return null
    }
    throw err
  }
}

/**
 * Supprime un fichier du bucket Neon Object Storage.
 */
export async function supprimerFichier(nomFichier: string): Promise<boolean> {
  const s3 = getS3Client()
  if (!s3) return false

  try {
    await s3.send(
      new DeleteObjectCommand({
        Bucket: BUCKET,
        Key: nomFichier,
      }),
    )
    return true
  } catch {
    return false
  }
}

/**
 * Liste les fichiers présents dans le bucket.
 */
export async function listerFichiers(): Promise<string[]> {
  const s3 = getS3Client()
  if (!s3) return []

  const res = await s3.send(
    new ListObjectsV2Command({
      Bucket: BUCKET,
    }),
  )

  return (res.Contents || []).map((c) => c.Key || '').filter(Boolean)
}

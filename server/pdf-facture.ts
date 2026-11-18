// Dessine une facture en PDF, sur ton ordinateur, sans service externe (pdf-lib).
// Les polices standard du PDF ne gèrent pas tous les caractères : `propre` remplace ceux qu'elles ne connaissent pas.

import { PDFDocument, StandardFonts, rgb, type Color, type PDFFont } from 'pdf-lib'

export interface DonneesFacture {
  emetteur: { nom: string; adresse: string; email: string; telephone: string; nif: string; rccm: string }
  paiement: string
  mentions: string
  facture: {
    numero: string
    date: string
    echeance: string
    libelle: string
    ht: number
    taux: number
    tva: number
    ttc: number
    payeeLe: string | null
  }
  client: { nom: string; ville: string | null; email: string | null }
}

const A4: [number, number] = [595.28, 841.89]
const MARGE = 48

const propre = (s: string) =>
  s.replace(/[\r\t]+/g, ' ').replace(/[^\n\x20-\x7e -ÿ‘’“”–—€…]/g, '?')

export const fcfa = (n: number) => `${Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} FCFA`

const dateFr = (iso: string) => iso.split('-').reverse().join('/')

function decouper(texte: string, police: PDFFont, taille: number, largeur: number): string[] {
  const sortie: string[] = []
  for (const paragraphe of propre(texte).split('\n')) {
    let ligne = ''
    for (const mot of paragraphe.split(' ')) {
      const essai = ligne ? `${ligne} ${mot}` : mot
      if (!ligne || police.widthOfTextAtSize(essai, taille) <= largeur) ligne = essai
      else {
        sortie.push(ligne)
        ligne = mot
      }
    }
    sortie.push(ligne)
  }
  return sortie
}

export async function genererPdf(d: DonneesFacture): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  doc.setTitle(`Facture ${d.facture.numero}`)
  doc.setAuthor(propre(d.emetteur.nom))
  doc.setCreator('Cockpit')
  const page = doc.addPage(A4)
  const normal = await doc.embedFont(StandardFonts.Helvetica)
  const gras = await doc.embedFont(StandardFonts.HelveticaBold)
  const [L, H] = A4

  const encre = rgb(0.09, 0.1, 0.12)
  const doux = rgb(0.4, 0.43, 0.48)
  const accent = rgb(0, 0.5, 0.3)
  const fond = rgb(0.95, 0.96, 0.96)
  const trait = rgb(0.85, 0.87, 0.88)

  function ecrire(
    s: string,
    x: number,
    y: number,
    o: { taille?: number; police?: PDFFont; couleur?: Color; droite?: boolean } = {},
  ) {
    const taille = o.taille ?? 10
    const police = o.police ?? normal
    const t = propre(s).replace(/\n/g, ' ')
    const largeur = police.widthOfTextAtSize(t, taille)
    page.drawText(t, { x: o.droite ? x - largeur : x, y, size: taille, font: police, color: o.couleur ?? encre })
  }

  function bloc(lignes: string[], x: number, y: number, taille: number, couleur: Color, pas = taille + 4) {
    lignes.forEach((l, i) => ecrire(l, x, y - i * pas, { taille, couleur }))
    return y - lignes.length * pas
  }

  page.drawRectangle({ x: 0, y: H - 8, width: L, height: 8, color: accent })

  // ---------- En-tête : l'émetteur à gauche, le numéro à droite ----------
  const e = d.emetteur
  ecrire(e.nom, MARGE, H - 62, { taille: 20, police: gras })
  bloc(
    [e.adresse, e.email, e.telephone].filter(Boolean).flatMap((l) => decouper(l, normal, 9.5, 240)),
    MARGE,
    H - 80,
    9.5,
    doux,
  )

  ecrire('FACTURE', L - MARGE, H - 62, { taille: 26, police: gras, couleur: accent, droite: true })
  ecrire(`N° ${d.facture.numero}`, L - MARGE, H - 84, { taille: 11, police: gras, droite: true })
  ecrire(`Émise le ${dateFr(d.facture.date)}`, L - MARGE, H - 100, { taille: 9.5, couleur: doux, droite: true })
  ecrire(`Échéance le ${dateFr(d.facture.echeance)}`, L - MARGE, H - 114, { taille: 9.5, couleur: doux, droite: true })

  // ---------- Le client ----------
  ecrire('FACTURÉ À', MARGE, H - 172, { taille: 8.5, police: gras, couleur: doux })
  ecrire(d.client.nom, MARGE, H - 190, { taille: 12.5, police: gras })
  bloc([d.client.ville ?? '', d.client.email ?? ''].filter(Boolean), MARGE, H - 206, 10, doux)

  // ---------- Le tableau ----------
  const haut = H - 270
  const largeurTable = L - 2 * MARGE
  page.drawRectangle({ x: MARGE, y: haut - 8, width: largeurTable, height: 26, color: fond })
  ecrire('DÉSIGNATION', MARGE + 12, haut, { taille: 8.5, police: gras, couleur: doux })
  ecrire('MONTANT HT', L - MARGE - 12, haut, { taille: 8.5, police: gras, couleur: doux, droite: true })

  const lignes = decouper(d.facture.libelle, normal, 11, largeurTable - 170)
  lignes.forEach((l, i) => ecrire(l, MARGE + 12, haut - 32 - i * 15, { taille: 11 }))
  ecrire(fcfa(d.facture.ht), L - MARGE - 12, haut - 32, { taille: 11, droite: true })
  const basTable = haut - 32 - (lignes.length - 1) * 15 - 16
  page.drawLine({ start: { x: MARGE, y: basTable }, end: { x: L - MARGE, y: basTable }, thickness: 0.7, color: trait })

  // ---------- Les totaux ----------
  const xLabel = L - MARGE - 210
  const xValeur = L - MARGE - 12
  const pourcent = `${(Math.round(d.facture.taux * 1000) / 10).toString().replace('.', ',')} %`
  ecrire('Total HT', xLabel, basTable - 24, { taille: 10.5, couleur: doux })
  ecrire(fcfa(d.facture.ht), xValeur, basTable - 24, { taille: 10.5, droite: true })
  ecrire(`TVA ${pourcent}`, xLabel, basTable - 42, { taille: 10.5, couleur: doux })
  ecrire(fcfa(d.facture.tva), xValeur, basTable - 42, { taille: 10.5, droite: true })
  page.drawLine({
    start: { x: xLabel, y: basTable - 54 },
    end: { x: L - MARGE, y: basTable - 54 },
    thickness: 0.7,
    color: trait,
  })
  ecrire('Total TTC', xLabel, basTable - 74, { taille: 13, police: gras })
  ecrire(fcfa(d.facture.ttc), xValeur, basTable - 74, { taille: 13, police: gras, couleur: accent, droite: true })

  let y = basTable - 112
  if (d.facture.payeeLe) {
    ecrire(`Facture acquittée le ${dateFr(d.facture.payeeLe)}`, MARGE, y, { taille: 11, police: gras, couleur: accent })
    y -= 30
  }

  // ---------- Le paiement ----------
  ecrire('PAIEMENT', MARGE, y, { taille: 8.5, police: gras, couleur: doux })
  y -= 18
  y = bloc([`À régler avant le ${dateFr(d.facture.echeance)}.`], MARGE, y, 10.5, encre)
  if (d.paiement.trim()) bloc(decouper(d.paiement, normal, 10.5, largeurTable), MARGE, y - 2, 10.5, encre, 15)

  // ---------- Le pied de page ----------
  page.drawLine({ start: { x: MARGE, y: 70 }, end: { x: L - MARGE, y: 70 }, thickness: 0.7, color: trait })
  const legales = [e.nif && `NIF : ${e.nif}`, e.rccm && `RCCM : ${e.rccm}`].filter(Boolean).join('   ·   ')
  const pied = [legales, ...decouper(d.mentions, normal, 8.5, largeurTable)].filter(Boolean) as string[]
  pied.forEach((l, i) => ecrire(l, MARGE, 54 - i * 12, { taille: 8.5, couleur: doux }))

  return doc.save()
}

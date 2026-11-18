// Les informations de ta société, imprimées sur chaque facture PDF (mode local).
// Remplis ce que tu veux : une ligne laissée vide n'apparaît pas sur la facture.

export const ENTREPRISE = {
  nom: 'DigitalVision',
  adresse: 'Lomé, Togo',
  email: '',
  telephone: '',
  /** Numéro d'identification fiscale. */
  nif: '',
  /** Registre du commerce et du crédit mobilier. */
  rccm: '',
  /** Comment tes clients te paient : numéro T-Money ou Flooz, compte bancaire… (plusieurs lignes possibles avec \n). */
  paiement: '',
  /** Phrase imprimée en bas de chaque facture. */
  mentions: 'Facture payable à l’échéance indiquée.',
}

/** Taux de TVA proposé sur les factures (0,18 = 18 %). À confirmer avec ton comptable. */
export const TVA_TAUX = 0.18

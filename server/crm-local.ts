// Le CRM de départ du mode local : l'équipe de DigitalVision et aucune entreprise.
// Il n'est écrit qu'une fois, dans .cockpit/crm.json ; modifie ensuite ce fichier ou passe par l'interface.

import type { Crm } from './crm-types'

export function crmLocal(): Crm {
  return {
    moi: 'Othnelio',
    equipe: [
      { nom: 'Othnelio', role: 'CTO', email: '', telephone: '', ton: 'purple' },
      { nom: 'Medard', role: 'CMO', email: '', telephone: '', ton: 'blue' },
      { nom: 'Roméo', role: 'COO', email: '', telephone: '', ton: 'green' },
    ],
    entreprises: [],
  }
}

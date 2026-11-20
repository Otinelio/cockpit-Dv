# ÉVOLUTION DE COCKPIT DV — MODULE DIGITALVISION / ESPACE ENTREPRISE

## 1. Contexte

Cockpit DV est le système de gestion interne de DigitalVision, une entreprise numérique basée à Lomé, au Togo.

L'application est développée avec Next.js 16, React 19, TypeScript, Zustand 5 et Tailwind CSS v4.

Elle fonctionne actuellement avec une architecture locale et une persistance sur fichiers.

L'équipe fondatrice comprend :
- Othnelio : CTO, Tech & Stratégie.
- Médard : Produit & Exécution.
- Roméo : Commercial, Opérations & Relations clients.

## 2. Objectif

Créer un nouveau module principal intitulé « Entreprise » ou « DigitalVision Hub ».

Ce module doit devenir le centre de gestion institutionnelle et stratégique de DigitalVision.

Il doit permettre aux trois associés de centraliser :
- Les informations officielles de l'entreprise.
- L'identité visuelle.
- Les comptes et accès professionnels.
- La vision et la stratégie.
- Les objectifs annuels et mensuels.
- Les plans d'action.
- Les informations des associés.
- Les réunions et décisions.
- Les documents et archives.

## 3. Sous-modules à développer

### A. Identité de l'entreprise

Créer une fiche entièrement modifiable contenant :

- Nom commercial.
- Logo principal et variantes.
- Slogan.
- Description de l'entreprise.
- Mission.
- Vision.
- Valeurs.
- Numéros de téléphone.
- Adresses e-mail.
- Adresse physique.
- Site Internet.
- Réseaux sociaux.
- NIF.
- RCCM.
- Coordonnées de paiement.

Permettre l'importation et le remplacement du logo.

Prévoir la réutilisation des informations de cette fiche dans les factures, devis, contrats et documents générés par Cockpit.

### B. Coffre-fort numérique

Créer un gestionnaire sécurisé des identifiants professionnels.

Catégories :
- Réseaux sociaux.
- Messagerie.
- Hébergement et domaines.
- Développement.
- Services professionnels.
- Comptes financiers.
- API et clés techniques.
- Autres.

Chaque entrée doit contenir :
- Nom du service.
- URL.
- Identifiant.
- Adresse e-mail associée.
- Mot de passe ou secret.
- Notes.
- Responsable.
- Date de modification.

Sécurité impérative :
- Ne jamais stocker les mots de passe en clair.
- Utiliser un chiffrement authentifié AES-256-GCM.
- Protéger la clé de chiffrement par un mécanisme sécurisé indépendant des données applicatives.
- Prévoir un déverrouillage du coffre-fort.
- Masquer les secrets par défaut.
- Prévoir une fonction de copie contrôlée.
- Journaliser les consultations et modifications sensibles.
- Ne jamais exposer les secrets dans les logs, exports non chiffrés ou réponses API publiques.

Ne pas considérer Base64 comme du chiffrement.

### C. Vision et stratégie

Créer trois niveaux de planification :

1. Vision à long terme : vision à cinq ans, ambitions, positionnement et marchés visés.
2. Résolutions annuelles : ambitions et résultats attendus pour chaque année.
3. Objectifs mensuels : objectifs mesurables, indicateurs, responsables, échéances et progression.

Chaque objectif doit pouvoir contenir plusieurs actions.

Prévoir les statuts :
- À définir.
- À faire.
- En cours.
- Atteint.
- Non atteint.
- Abandonné.

Permettre de transformer une action stratégique en tâche dans le module Tâches existant.

### D. Associés et gouvernance

Créer une fiche pour chacun des trois associés.

Informations :
- Nom et photo.
- Fonction.
- Coordonnées professionnelles.
- Responsabilités.
- Compétences.
- Objectifs individuels.
- Engagements en cours.

Conserver les informations déjà présentes dans le système. Ne pas créer de faux associés ni de données fictives.

### E. Réunions et décisions

Créer un registre chronologique des réunions.

Chaque réunion contient :
- Titre.
- Date et heure.
- Lieu ou mode de réunion.
- Participants.
- Ordre du jour.
- Notes et discussions.
- Décisions prises.
- Résolutions.
- Responsables.
- Échéances.
- Statut de chaque résolution.

Prévoir les statuts des décisions :
- Proposée.
- Validée.
- En cours d'exécution.
- Exécutée.
- Abandonnée.

Permettre de transformer une résolution en tâche dans le module Tâches.

Permettre de consulter l'historique des réunions et de rechercher une ancienne décision.

### F. Documents et archives

Créer un gestionnaire documentaire avec dossiers et sous-dossiers.

Prévoir une arborescence initiale :
- Administratif.
- Identité visuelle.
- Stratégie.
- Réunions.
- Ressources.
- Archives.

Fonctionnalités :
- Importation de fichiers.
- Création de dossiers.
- Sous-dossiers.
- Renommage.
- Déplacement.
- Suppression avec confirmation.
- Prévisualisation des formats compatibles.
- Téléchargement.
- Recherche.
- Association de fichiers à des projets, clients ou réunions.
- Métadonnées : nom, type, taille, date d'ajout, auteur.

Les fichiers doivent être réellement enregistrés sur le stockage local contrôlé par l'application, pas uniquement conservés en mémoire.

## 4. Intégration avec les modules existants

Le nouveau module doit communiquer avec les autres fonctionnalités de Cockpit :

- Les informations de l'entreprise alimentent les factures et devis.
- Les objectifs peuvent générer des tâches.
- Les résolutions de réunions peuvent générer des tâches.
- Les documents peuvent être associés aux clients et projets.
- Les associés utilisent leurs comptes existants.
- Les notifications peuvent signaler les échéances des objectifs et résolutions.

Éviter de créer des fonctionnalités en double.

## 5. Interface utilisateur

Respecter strictement le design system existant de Cockpit DV.

Le module doit proposer :
- Une page d'accueil synthétique.
- Une navigation claire entre les six sous-modules.
- Des formulaires intuitifs.
- Des tableaux et listes filtrables.
- Des fenêtres de création et de modification.
- Des états vides explicites.
- Des confirmations avant suppression.
- Une interface responsive desktop et mobile.

Ne pas reconstruire toute l'application et ne pas modifier inutilement les modules existants.

## 6. Architecture et persistance

Avant de coder :
- Auditer l'architecture actuelle.
- Identifier les stores Zustand existants.
- Examiner les systèmes de persistance et les routes API.
- Identifier les composants réutilisables.
- Vérifier la manière dont les fichiers sont actuellement stockés.

Réutiliser les conventions et services déjà présents.

Créer une séparation claire entre les modèles de données, la logique métier, la persistance et les composants UI.

Ne pas stocker les fichiers binaires volumineux directement dans les stores Zustand ou dans des fichiers JSON en Base64.

Prévoir une architecture évolutive permettant une migration future vers une base SQL sans réécriture complète.

Respecter les contraintes du mode local. Ne pas ajouter de service externe, de dépendance cloud ou de base de données distante sans autorisation.

## 7. Qualité et validation

Vérifier :
- La création et modification des informations.
- La persistance après redémarrage.
- L'importation et récupération des fichiers.
- Le fonctionnement du coffre-fort.
- Les permissions.
- Les interactions entre modules.
- L'affichage mobile.
- La gestion des erreurs.
- Les sauvegardes.

Exécuter npm run check et npm run lint.

Corriger les erreurs introduites.

## 8. Consignes impératives

- Ne pas supprimer les données existantes.
- Ne pas inventer d'informations sur DigitalVision.
- Ne pas remplacer les vrais associés par des données de démonstration.
- Ne pas réintroduire de données fictives.
- Ne pas casser le CRM, SaaStup, les finances ou les tâches.
- Ne pas modifier arbitrairement le design global.
- Ne pas déclarer une fonctionnalité terminée si elle n'est que visuelle.
- Fournir un compte rendu des fichiers créés et modifiés.
- Signaler explicitement les fonctionnalités nécessitant encore une configuration ou une décision humaine.

Commencer par l'audit et présenter le plan d'implémentation avant les modifications structurelles importantes.
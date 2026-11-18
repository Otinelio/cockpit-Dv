import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Cockpit DigitalVision",
    short_name: "Cockpit DV",
    description: "Mission control, CRM et studio SaaS de l'agence DigitalVision",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#121212",
    theme_color: "#00B562",
    orientation: "any",
    categories: ["business", "productivity"],
    lang: "fr",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Tableau de bord",
        short_name: "Accueil",
        url: "/",
        description: "Vue d'ensemble et chiffres clés",
      },
      {
        name: "Tâches & Appels",
        short_name: "Tâches",
        url: "/taches",
        description: "Gestion des tâches, appels et prospections",
      },
      {
        name: "Finances & Dépenses",
        short_name: "Finances",
        url: "/factures",
        description: "Facturation clients et suivi des dépenses",
      },
      {
        name: "SaaStup Studio",
        short_name: "SaaS",
        url: "/saas",
        description: "MivaFid, MivaCouture et contrats",
      },
    ],
  };
}


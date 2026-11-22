import type { Metadata } from "next";
import ContratsHub from "@/components/contrats/contrats-hub";

export const metadata: Metadata = {
  title: "Contrats & Conventions · Cockpit DV",
  description: "Pilotage des contrats clients, livrables opérationnels, tâches associées et facturation directe.",
};

export default function Page() {
  return <ContratsHub />;
}

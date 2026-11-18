import type { Metadata } from "next";
import SaasHub from "@/components/saas/saas-hub";

export const metadata: Metadata = {
  title: "SaaStup & Contrats | Cockpit DV",
  description: "Pilotage des produits SaaS internes et contrats de DigitalVision",
};

export default function Page() {
  return <SaasHub />;
}


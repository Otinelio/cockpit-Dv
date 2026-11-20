import type { Metadata } from "next";
import HubPrincipal from "@/components/hub/hub-principal";

export const metadata: Metadata = {
  title: "DigitalVision Hub · Espace Entreprise",
  description: "Centre de gestion institutionnelle, stratégique, sécurité et gouvernance de DigitalVision Lomé.",
};

export default function Page() {
  return <HubPrincipal />;
}

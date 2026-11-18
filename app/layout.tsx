import type { Metadata, Viewport } from "next";
import Coquille from "@/components/_common/coquille";
import { SIDEBAR_WIDTH_SCRIPT } from "@/lib/sidebar";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Cockpit DV", template: "%s · Cockpit DigitalVision" },
  description:
    "Le mission control de DigitalVision : CRM, studio SaaS, prospections, factures et tâches d'équipe.",
  applicationName: "Cockpit DV",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Cockpit DV",
  },
  formatDetection: {
    telephone: true,
  },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [
      { url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: "#121212",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

const SW_SCRIPT = `
  if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
    window.addEventListener('load', function() {
      navigator.serviceWorker.register('/sw.js').catch(function() {});
    });
  }
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: SIDEBAR_WIDTH_SCRIPT }} />
        <script dangerouslySetInnerHTML={{ __html: SW_SCRIPT }} />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
      </head>
      <body className="relative z-0 font-sans antialiased">
        <Coquille>{children}</Coquille>
      </body>
    </html>
  );
}

"use client";

import { useEffect, useState } from "react";
import Button from "@/components/_ui/button";
import { Download, Smartphone, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function checkStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in window.navigator && (window.navigator as unknown as { standalone: boolean }).standalone === true)
  );
}

function checkIos(): boolean {
  if (typeof window === "undefined") return false;
  return /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase());
}

export default function PwaInstallBanner() {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIos] = useState(checkIos);
  const [dejaInstalle, setDejaInstalle] = useState(checkStandalone);
  const [ferme, setFerme] = useState(false);

  useEffect(() => {
    if (dejaInstalle) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setPromptEvent(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, [dejaInstalle]);

  if (dejaInstalle || ferme || (!promptEvent && !isIos)) {
    return null;
  }

  async function installer() {
    if (promptEvent) {
      await promptEvent.prompt();
      const choice = await promptEvent.userChoice;
      if (choice.outcome === "accepted") {
        setDejaInstalle(true);
      }
      setPromptEvent(null);
    }
  }

  return (
    <div className="border-border bg-card/90 m-2 flex items-center justify-between gap-2 rounded-xl border p-2.5 shadow-lg backdrop-blur-md">
      <div className="flex items-center gap-2">
        <div className="bg-primary/20 text-primary flex size-7 shrink-0 items-center justify-center rounded-lg">
          {isIos ? <Smartphone className="size-4" /> : <Download className="size-4" />}
        </div>
        <div className="flex flex-col text-left">
          <span className="text-xs font-medium text-foreground">
            Installer Cockpit DV
          </span>
          <span className="text-[10px] text-muted-foreground">
            {isIos
              ? "Appuyez sur Partager puis « Sur l'écran d'accueil »"
              : "Application rapide pour PC, Mac et Mobile"}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-1">
        {!isIos && promptEvent && (
          <Button
            variant="primary"
            size="sm"
            onClick={installer}
            className="h-7 px-2 text-xs font-normal"
          >
            Installer
          </Button>
        )}
        <button
          type="button"
          onClick={() => setFerme(true)}
          className="text-muted-foreground hover:text-foreground p-1"
          aria-label="Fermer"
        >
          <X className="size-3.5" />
        </button>
      </div>
    </div>
  );
}

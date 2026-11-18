"use client";

import { useState } from "react";
import Avatar from "@/components/_ui/avatar";
import Button from "@/components/_ui/button";
import { Input } from "@/components/_ui/input";
import Field from "@/components/_ui/field";
import { useCockpit } from "@/stores/cockpit-store";
import { cn } from "@/lib/utils";
import type { MembreDV } from "@/server/dv-types";
import { Lock, Eye, EyeOff, ShieldCheck, ArrowRight } from "lucide-react";

const EQUIPE: { nom: MembreDV; role: string; ton: "purple" | "blue" | "green" }[] = [
  { nom: "Othnelio", role: "CTO • Lead Tech & SaaS", ton: "purple" },
  { nom: "Medard", role: "CMO • Marketing & Ventes", ton: "blue" },
  { nom: "Roméo", role: "COO • Opérations & Suivi", ton: "green" },
];

export default function EcranConnexion() {
  const utilisateurActif = useCockpit((s) => s.utilisateurActif);
  const connecter = useCockpit((s) => s.connecter);

  const [selection, setSelection] = useState<MembreDV>(
    (EQUIPE.some((m) => m.nom === utilisateurActif) ? utilisateurActif : "Othnelio") as MembreDV,
  );
  const [motDePasse, setMotDePasse] = useState("");
  const [voirMdp, setVoirMdp] = useState(false);
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function handleConnexion(e: React.FormEvent) {
    e.preventDefault();
    if (!motDePasse) return;
    setChargement(true);
    setErreur(null);
    const succes = await connecter(selection, motDePasse);
    setChargement(false);
    if (!succes) {
      setErreur("Mot de passe incorrect pour " + selection);
    }
  }

  const membreChoisi = EQUIPE.find((m) => m.nom === selection)!;

  return (
    <div className="relative flex min-h-dvh w-full flex-col items-center justify-center overflow-hidden bg-[#121212] p-4 select-none">
      {/* Halo de lumière en arrière-plan */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 size-[620px] rounded-full bg-[radial-gradient(circle,rgba(0,181,98,0.12)_0%,rgba(0,0,0,0)_70%)] blur-3xl"
      />

      <div className="relative z-10 flex w-full max-w-[440px] flex-col gap-6">
        {/* En-tête DigitalVision */}
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="flex size-14 items-center justify-center rounded-2xl border border-white/10 bg-[#1E1E1E] shadow-xl">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 32 32"
              className="size-8"
              aria-hidden
            >
              <rect width="32" height="32" rx="8" fill="#2A2A2A" />
              <g fill="#395E4D">
                <rect x="6" y="19" width="3" height="3" rx="0.6" />
                <rect x="7.5" y="13.5" width="3" height="3" rx="0.6" />
                <rect x="11.5" y="9.5" width="3" height="3" rx="0.6" />
                <rect x="17.5" y="9.5" width="3" height="3" rx="0.6" />
              </g>
              <g fill="#00B562">
                <rect x="21.5" y="13.5" width="3" height="3" rx="0.6" />
                <rect x="23" y="19" width="3" height="3" rx="0.6" />
              </g>
              <path
                d="M16 22 21 14"
                stroke="#F9FBFF"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <circle cx="16" cy="22" r="2" fill="#F9FBFF" />
            </svg>
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card/70 px-2.5 py-0.5 text-[11px] font-medium text-emerald-400">
              <ShieldCheck className="size-3" />
              Accès Privé DigitalVision
            </div>
            <h1 className="mt-2 text-xl font-semibold tracking-tight text-foreground">
              Cockpit DigitalVision
            </h1>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Mission Control & Direction des opérations
            </p>
          </div>
        </div>

        {/* Carte de connexion */}
        <div className="rounded-2xl border border-border bg-[#181818]/90 p-6 shadow-2xl backdrop-blur-xl">
          <form onSubmit={handleConnexion} className="flex flex-col gap-5">
            {/* Sélecteur de membre */}
            <div className="flex flex-col gap-2">
              <label className="caption-style text-muted-foreground text-xs">
                Sélectionne ton profil
              </label>
              <div className="grid grid-cols-3 gap-2">
                {EQUIPE.map((m) => {
                  const actif = selection === m.nom;
                  return (
                    <button
                      key={m.nom}
                      type="button"
                      onClick={() => {
                        setSelection(m.nom);
                        setErreur(null);
                      }}
                      className={cn(
                        "flex flex-col items-center gap-2 rounded-xl border p-3 text-center transition-all duration-150",
                        actif
                          ? "border-primary bg-primary/10 shadow-[0_0_0_1px_var(--primary)]"
                          : "border-border bg-secondary/60 hover:border-line-strong hover:bg-secondary",
                      )}
                    >
                      <Avatar nom={m.nom} ton={m.ton} className="size-9 text-xs" />
                      <div className="flex flex-col">
                        <span className="text-xs font-medium text-foreground">
                          {m.nom}
                        </span>
                        <span className="text-[10px] text-muted-foreground leading-tight">
                          {m.role.split("•")[0].trim()}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Champ Mot de passe */}
            <Field
              label={`Mot de passe (${membreChoisi.nom})`}
              htmlFor="auth-password"
              hint="Initial : digitalvision"
            >
              <div className="relative">
                <Input
                  id="auth-password"
                  type={voirMdp ? "text" : "password"}
                  autoFocus
                  placeholder="••••••••••••"
                  value={motDePasse}
                  onChange={(e) => {
                    setMotDePasse(e.target.value);
                    if (erreur) setErreur(null);
                  }}
                  className="pr-10"
                  required
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setVoirMdp(!voirMdp)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {voirMdp ? (
                    <EyeOff className="size-4" />
                  ) : (
                    <Eye className="size-4" />
                  )}
                </button>
              </div>
            </Field>

            {/* Message d'erreur */}
            {erreur && (
              <div className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">
                {erreur}
              </div>
            )}

            {/* Bouton de validation */}
            <Button
              variant="primary"
              size="md"
              type="submit"
              disabled={chargement || !motDePasse}
              className="mt-1 w-full justify-center gap-2 py-2.5 font-medium"
            >
              {chargement ? (
                "Vérification..."
              ) : (
                <>
                  <Lock className="size-4" />
                  Déverrouiller le Cockpit
                  <ArrowRight className="size-4" />
                </>
              )}
            </Button>
          </form>
        </div>

        {/* Pied de page */}
        <p className="text-center text-[11px] text-muted-foreground/70">
          DigitalVision &bull; Lomé, Togo &bull; Système sécurisé interne
        </p>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import Avatar from "@/components/_ui/avatar";
import Button from "@/components/_ui/button";
import { Input } from "@/components/_ui/input";
import Field from "@/components/_ui/field";
import { useCockpit } from "@/stores/cockpit-store";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { MembreDV } from "@/server/dv-types";
import { Lock, Eye, EyeOff, ShieldCheck, ArrowRight, Sparkles, KeyRound } from "lucide-react";

const EQUIPE: { nom: MembreDV; role: string; ton: "purple" | "blue" | "green" }[] = [
  { nom: "Othnelio", role: "CTO • Lead Tech & Stratégie", ton: "purple" },
  { nom: "Medard", role: "CMO • Produit & Marketing", ton: "blue" },
  { nom: "Roméo", role: "COO • Commercial & Opérations", ton: "green" },
];

export default function EcranConnexion() {
  const connecter = useCockpit((s) => s.connecter);
  const definirPremierMotDePasse = useCockpit((s) => s.definirPremierMotDePasse);

  const [selection, setSelection] = useState<MembreDV | null>(null);
  const [statuts, setStatuts] = useState<Record<string, { motDePasseDefini: boolean }>>({});

  const [motDePasse, setMotDePasse] = useState("");
  const [confirmMdp, setConfirmMdp] = useState("");
  const [voirMdp, setVoirMdp] = useState(false);
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    async function chargerStatuts() {
      try {
        const res = await api.statutAuth();
        setStatuts(res);
      } catch (err) {
        console.error("Erreur chargement statuts auth:", err);
      }
    }
    chargerStatuts();
  }, []);

  const estPremierAcces = selection ? statuts[selection]?.motDePasseDefini === false : false;

  async function handleAction(e: React.FormEvent) {
    e.preventDefault();
    if (!selection) return;

    if (!motDePasse) {
      setErreur("Veuillez saisir un mot de passe.");
      return;
    }

    if (motDePasse.length < 4) {
      setErreur("Le mot de passe doit comporter au moins 4 caractères.");
      return;
    }

    if (estPremierAcces) {
      if (motDePasse !== confirmMdp) {
        setErreur("Les deux mots de passe ne correspondent pas.");
        return;
      }
      setChargement(true);
      setErreur(null);
      const ok = await definirPremierMotDePasse(selection, motDePasse);
      setChargement(false);
      if (!ok) {
        setErreur("Impossible d'enregistrer le mot de passe. Réessaie.");
      }
    } else {
      setChargement(true);
      setErreur(null);
      const ok = await connecter(selection, motDePasse);
      setChargement(false);
      if (!ok) {
        setErreur(`Mot de passe incorrect pour ${selection}.`);
      }
    }
  }

  const membreChoisi = selection ? EQUIPE.find((m) => m.nom === selection) : null;

  return (
    <div className="relative flex min-h-dvh w-full flex-col items-center justify-center overflow-hidden bg-[#121212] p-4 select-none">
      {/* Halo de lumière en arrière-plan */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 size-[620px] rounded-full bg-[radial-gradient(circle,rgba(0,181,98,0.12)_0%,rgba(0,0,0,0)_70%)] blur-3xl"
      />

      <div className="relative z-10 flex w-full max-w-[460px] flex-col gap-6">
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
          <form onSubmit={handleAction} className="flex flex-col gap-5">
            {/* Étape 1 : Choix du collaborateur */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label className="caption-style text-muted-foreground text-xs font-medium">
                  {selection ? "Profil sélectionné" : "Qui se connecte ?"}
                </label>
                {selection && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelection(null);
                      setMotDePasse("");
                      setConfirmMdp("");
                      setErreur(null);
                    }}
                    className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Changer de profil
                  </button>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2">
                {EQUIPE.map((m) => {
                  const actif = selection === m.nom;
                  const statutMdp = statuts[m.nom];
                  const premierFois = statutMdp && !statutMdp.motDePasseDefini;

                  return (
                    <button
                      key={m.nom}
                      type="button"
                      onClick={() => {
                        setSelection(m.nom);
                        setMotDePasse("");
                        setConfirmMdp("");
                        setErreur(null);
                      }}
                      className={cn(
                        "relative flex flex-col items-center gap-2 rounded-xl border p-3 text-center transition-all duration-150 touch-manipulation",
                        actif
                          ? "border-primary bg-primary/10 shadow-[0_0_0_1px_var(--primary)]"
                          : "border-border bg-secondary/60 hover:border-line-strong hover:bg-secondary",
                      )}
                    >
                      {premierFois && (
                        <span className="absolute -top-1.5 -right-1 flex items-center gap-0.5 rounded-full bg-emerald-500/20 px-1.5 py-0.2 text-[9px] font-semibold text-emerald-400 border border-emerald-500/40">
                          Nouveau
                        </span>
                      )}
                      <Avatar nom={m.nom} ton={m.ton} className="size-10 text-xs shadow-sm" />
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold text-foreground">
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

            {/* Étape 2 : Saisie ou Définition du mot de passe */}
            {selection && membreChoisi && (
              <div className="flex flex-col gap-4 border-t border-border pt-4 animate-in fade-in slide-in-from-top-2 duration-200">
                {estPremierAcces ? (
                  <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs">
                    <div className="flex items-center gap-1.5 font-semibold text-emerald-400">
                      <Sparkles className="size-3.5" />
                      Première connexion pour {selection}
                    </div>
                    <p className="mt-1 text-muted-foreground text-[11px] leading-relaxed">
                      Bienvenue ! Choisis ton mot de passe personnel. Il sera chiffré et te servira pour toutes tes prochaines connexions.
                    </p>
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground">
                    Connecte-toi en tant que <span className="font-semibold text-foreground">{selection}</span>.
                  </div>
                )}

                <Field
                  label={estPremierAcces ? "Nouveau mot de passe" : `Mot de passe de ${selection}`}
                  htmlFor="auth-password"
                  hint={estPremierAcces ? "4 caractères minimum" : undefined}
                >
                  <div className="relative">
                    <Input
                      id="auth-password"
                      type={voirMdp ? "text" : "password"}
                      autoFocus
                      placeholder={estPremierAcces ? "Choisis ton mot de passe" : "••••••••••••"}
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
                      {voirMdp ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </Field>

                {estPremierAcces && (
                  <Field label="Confirmer le mot de passe" htmlFor="auth-password-confirm">
                    <Input
                      id="auth-password-confirm"
                      type={voirMdp ? "text" : "password"}
                      placeholder="Retape ton mot de passe"
                      value={confirmMdp}
                      onChange={(e) => {
                        setConfirmMdp(e.target.value);
                        if (erreur) setErreur(null);
                      }}
                      required
                    />
                  </Field>
                )}

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
                  disabled={chargement || !motDePasse || (estPremierAcces && !confirmMdp)}
                  className="mt-1 w-full justify-center gap-2 py-2.5 font-medium"
                >
                  {chargement ? (
                    "Enregistrement..."
                  ) : estPremierAcces ? (
                    <>
                      <KeyRound className="size-4" />
                      Créer mon mot de passe et entrer
                      <ArrowRight className="size-4" />
                    </>
                  ) : (
                    <>
                      <Lock className="size-4" />
                      Déverrouiller le Cockpit
                      <ArrowRight className="size-4" />
                    </>
                  )}
                </Button>
              </div>
            )}
          </form>
        </div>

        {/* Pied de page */}
        <p className="text-center text-[11px] text-muted-foreground/70">
          DigitalVision &bull; Lomé, Togo &bull; Données Cloud Neon sécurisées
        </p>
      </div>
    </div>
  );
}

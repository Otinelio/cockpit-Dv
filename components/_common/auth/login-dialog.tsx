"use client";

import { useState, useEffect } from "react";
import Avatar from "@/components/_ui/avatar";
import Button from "@/components/_ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/_ui/dialog";
import { Input } from "@/components/_ui/input";
import Field from "@/components/_ui/field";
import { useCockpit } from "@/stores/cockpit-store";
import { cn } from "@/lib/utils";
import type { MembreDV } from "@/server/dv-types";
import { api } from "@/lib/api";
import { Sparkles } from "lucide-react";

const EQUIPE: { nom: MembreDV; role: string; ton: "purple" | "blue" | "green" }[] = [
  { nom: "Othnelio", role: "CTO • Lead Tech & Stratégie", ton: "purple" },
  { nom: "Medard", role: "CMO • Produit & Marketing", ton: "blue" },
  { nom: "Roméo", role: "COO • Commercial & Opérations", ton: "green" },
];

export default function LoginDialog() {
  const ouvert = useCockpit((s) => s.dialogueConnexionOuvert);
  const setOuvert = useCockpit((s) => s.setDialogueConnexionOuvert);
  const utilisateurActif = useCockpit((s) => s.utilisateurActif);
  const connecter = useCockpit((s) => s.connecter);
  const definirPremierMotDePasse = useCockpit((s) => s.definirPremierMotDePasse);
  const toast = useCockpit((s) => s.toast);

  const [selection, setSelection] = useState<MembreDV>(
    (EQUIPE.some((m) => m.nom === utilisateurActif) ? utilisateurActif : "Othnelio") as MembreDV,
  );
  const [statuts, setStatuts] = useState<Record<string, { motDePasseDefini: boolean }>>({});
  const [motDePasse, setMotDePasse] = useState("");
  const [confirmMdp, setConfirmMdp] = useState("");
  const [chargement, setChargement] = useState(false);
  const [modeChangement, setModeChangement] = useState(false);

  const [ancienMdp, setAncienMdp] = useState("");
  const [nouveauMdp, setNouveauMdp] = useState("");

  useEffect(() => {
    if (ouvert) {
      api.statutAuth().then(setStatuts).catch(console.error);
    }
  }, [ouvert]);

  const estPremierAcces = statuts[selection]?.motDePasseDefini === false;

  async function handleConnexion(e: React.FormEvent) {
    e.preventDefault();
    if (!motDePasse) return;
    setChargement(true);

    if (estPremierAcces) {
      if (motDePasse !== confirmMdp) {
        toast({ ton: "erreur", titre: "Erreur", texte: "Les mots de passe ne correspondent pas." });
        setChargement(false);
        return;
      }
      const ok = await definirPremierMotDePasse(selection, motDePasse);
      setChargement(false);
      if (ok) {
        setMotDePasse("");
        setConfirmMdp("");
        setOuvert(false);
      }
    } else {
      const succes = await connecter(selection, motDePasse);
      setChargement(false);
      if (succes) {
        setMotDePasse("");
        setOuvert(false);
      }
    }
  }

  async function handleChangerMdp(e: React.FormEvent) {
    e.preventDefault();
    if (!ancienMdp || !nouveauMdp) return;
    setChargement(true);
    try {
      await api.changerMotDePasse(selection, ancienMdp, nouveauMdp);
      toast({
        ton: "succes",
        titre: "Mot de passe modifié",
        texte: `Nouveau mot de passe enregistré pour ${selection}.`,
      });
      setModeChangement(false);
      setAncienMdp("");
      setNouveauMdp("");
      setMotDePasse(nouveauMdp);
    } catch (err) {
      toast({
        ton: "erreur",
        titre: "Erreur",
        texte: (err as Error).message,
      });
    } finally {
      setChargement(false);
    }
  }

  return (
    <Dialog open={ouvert} onOpenChange={setOuvert}>
      <DialogContent className="max-w-[440px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <span className="bg-primary/20 text-primary flex size-7 items-center justify-center rounded-lg text-xs font-semibold">
              DV
            </span>
            <DialogTitle>Changer d&apos;utilisateur</DialogTitle>
          </div>
          <DialogDescription>
            {modeChangement
              ? `Changement de mot de passe pour ${selection}`
              : estPremierAcces
                ? `Première connexion : Définis le mot de passe de ${selection}`
                : `Connecte-toi en tant que ${selection}`}
          </DialogDescription>
        </DialogHeader>

        {!modeChangement ? (
          <form onSubmit={handleConnexion} className="flex flex-col gap-5 p-6">
            <div className="flex flex-col gap-2">
              <label className="caption-style text-muted-foreground">Sélectionne un profil</label>
              <div className="grid grid-cols-3 gap-2">
                {EQUIPE.map((m) => {
                  const actif = selection === m.nom;
                  return (
                    <button
                      key={m.nom}
                      type="button"
                      onClick={() => {
                        setSelection(m.nom);
                        setMotDePasse("");
                        setConfirmMdp("");
                      }}
                      className={cn(
                        "flex flex-col items-center gap-2 rounded-xl border p-3 text-center transition-all",
                        actif
                          ? "border-primary bg-primary/10 shadow-[0_0_0_1px_var(--primary)]"
                          : "border-border bg-secondary hover:border-line-strong",
                      )}
                    >
                      <Avatar nom={m.nom} ton={m.ton} className="size-9 text-[11px]" />
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">{m.nom}</span>
                        <span className="text-muted-foreground text-[10px] leading-tight">
                          {m.role.split("•")[0]}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {estPremierAcces && (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-2.5 text-xs text-emerald-400 flex items-center gap-2">
                <Sparkles className="size-4 shrink-0" />
                <span>Première connexion pour {selection} : Définis ton mot de passe.</span>
              </div>
            )}

            <Field
              label={estPremierAcces ? "Nouveau mot de passe" : "Mot de passe"}
              htmlFor="dv-password"
              hint={estPremierAcces ? "4 caractères minimum" : undefined}
            >
              <Input
                id="dv-password"
                type="password"
                autoFocus
                placeholder="••••••••"
                value={motDePasse}
                onChange={(e) => setMotDePasse(e.target.value)}
                required
              />
            </Field>

            {estPremierAcces && (
              <Field label="Confirmer le mot de passe" htmlFor="dv-password-confirm">
                <Input
                  id="dv-password-confirm"
                  type="password"
                  placeholder="Retape ton mot de passe"
                  value={confirmMdp}
                  onChange={(e) => setConfirmMdp(e.target.value)}
                  required
                />
              </Field>
            )}

            {!estPremierAcces && (
              <div className="flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() => setModeChangement(true)}
                  className="text-primary hover:underline"
                >
                  Changer de mot de passe
                </button>
              </div>
            )}

            <DialogFooter className="mt-2 border-t border-border pt-4">
              <Button
                variant="secondary"
                type="button"
                onClick={() => setOuvert(false)}
              >
                Annuler
              </Button>
              <Button
                variant="primary"
                type="submit"
                disabled={!motDePasse || (estPremierAcces && !confirmMdp) || chargement}
              >
                {chargement
                  ? "Validation..."
                  : estPremierAcces
                    ? "Enregistrer & Entrer"
                    : "Se connecter"}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <form onSubmit={handleChangerMdp} className="flex flex-col gap-4 p-6">
            <Field label="Ancien mot de passe" htmlFor="dv-old-pwd">
              <Input
                id="dv-old-pwd"
                type="password"
                placeholder="••••••••"
                value={ancienMdp}
                onChange={(e) => setAncienMdp(e.target.value)}
                required
              />
            </Field>

            <Field
              label="Nouveau mot de passe"
              htmlFor="dv-new-pwd"
              hint="Minimum 4 caractères"
            >
              <Input
                id="dv-new-pwd"
                type="password"
                placeholder="••••••••"
                value={nouveauMdp}
                onChange={(e) => setNouveauMdp(e.target.value)}
                required
              />
            </Field>

            <DialogFooter className="mt-2 border-t border-border pt-4">
              <Button
                variant="secondary"
                type="button"
                onClick={() => setModeChangement(false)}
              >
                Retour
              </Button>
              <Button
                variant="primary"
                type="submit"
                disabled={!ancienMdp || nouveauMdp.length < 4 || chargement}
              >
                {chargement ? "Mise à jour..." : "Enregistrer"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

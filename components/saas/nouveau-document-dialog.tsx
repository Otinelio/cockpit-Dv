"use client";

import { useState } from "react";
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
import type { DocumentSaas, SaasDV } from "@/server/dv-types";

interface Props {
  saas: SaasDV | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function NouveauDocumentDialog({ saas, open, onOpenChange }: Props) {
  const modifierSaas = useCockpit((s) => s.modifierSaas);

  const [titre, setTitre] = useState("");
  const [type, setType] = useState<"cahier_charges" | "contrat" | "fiche_technique" | "maquette" | "autre">("fiche_technique");
  const [urlOuContenu, setUrlOuContenu] = useState("");
  const [chargement, setChargement] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!saas || !titre.trim() || !urlOuContenu.trim()) return;

    setChargement(true);
    const nouvDoc = {
      id: `doc-${Date.now()}`,
      titre: titre.trim(),
      type,
      urlOuContenu: urlOuContenu.trim(),
      date: new Date().toISOString().slice(0, 10),
    };

    await modifierSaas(saas.id, {
      documents: [...(saas.documents ?? []), nouvDoc],
    });

    setChargement(false);
    setTitre("");
    setUrlOuContenu("");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Ajouter un document à {saas?.nom}</DialogTitle>
          <DialogDescription>
            Fiche technique, cahier des charges, maquette Figma ou lien drive.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-6">
          <Field label="Titre du document" htmlFor="doc-titre">
            <Input
              id="doc-titre"
              autoFocus
              placeholder="Ex : Grille de mesures tailleurs V1"
              value={titre}
              onChange={(e) => setTitre(e.target.value)}
              required
            />
          </Field>

          <Field label="Type de document" htmlFor="doc-type">
            <select
              id="doc-type"
              value={type}
              onChange={(e) => setType(e.target.value as DocumentSaas["type"])}
              className="border-line-strong bg-secondary text-foreground rounded-lg border px-3 py-2 text-sm outline-none"
            >
              <option value="fiche_technique">Fiche technique / Spécifications</option>
              <option value="cahier_charges">Cahier des charges</option>
              <option value="maquette">Maquettes & Design (Figma / Drive)</option>
              <option value="contrat">Contrat / Convention</option>
              <option value="autre">Autre document</option>
            </select>
          </Field>

          <Field label="Lien URL ou note" htmlFor="doc-url">
            <Input
              id="doc-url"
              placeholder="https://drive.google.com/... ou texte"
              value={urlOuContenu}
              onChange={(e) => setUrlOuContenu(e.target.value)}
              required
            />
          </Field>

          <DialogFooter className="mt-2 border-t border-border pt-4">
            <Button
              variant="secondary"
              type="button"
              onClick={() => onOpenChange(false)}
            >
              Annuler
            </Button>
            <Button
              variant="primary"
              type="submit"
              disabled={!titre.trim() || !urlOuContenu.trim() || chargement}
            >
              {chargement ? "Ajout..." : "Enregistrer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}


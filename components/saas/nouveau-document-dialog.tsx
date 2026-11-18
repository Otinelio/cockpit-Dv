"use client";

import { useRef, useState } from "react";
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
import { UploadCloud, Link as LinkIcon, Check } from "lucide-react";

interface Props {
  saas: SaasDV | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function NouveauDocumentDialog({ saas, open, onOpenChange }: Props) {
  const modifierSaas = useCockpit((s) => s.modifierSaas);
  const toast = useCockpit((s) => s.toast);

  const [mode, setMode] = useState<"upload" | "lien">("upload");
  const [titre, setTitre] = useState("");
  const [type, setType] = useState<DocumentSaas["type"]>("fiche_technique");
  const [urlOuContenu, setUrlOuContenu] = useState("");
  const [fichierSelectionne, setFichierSelectionne] = useState<{
    nom: string;
    taille: number;
    mime: string;
    dataUrl: string;
  } | null>(null);
  const [chargement, setChargement] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.name.endsWith(".apk")) {
      setType("apk");
    } else if (file.type.startsWith("image/")) {
      setType("maquette");
    }

    if (!titre) {
      setTitre(file.name.replace(/\.[^/.]+$/, ""));
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setFichierSelectionne({
        nom: file.name,
        taille: file.size,
        mime: file.type || "application/octet-stream",
        dataUrl,
      });
    };
    reader.readAsDataURL(file);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!saas || !titre.trim()) return;

    let contenuFinal = "";
    let nomFichier: string | undefined;
    let tailleOctets: number | undefined;
    let mimeType: string | undefined;

    if (mode === "upload") {
      if (!fichierSelectionne) {
        toast({ ton: "info", titre: "Fichier requis", texte: "Choisis un fichier à téléverser." });
        return;
      }
      contenuFinal = fichierSelectionne.dataUrl;
      nomFichier = fichierSelectionne.nom;
      tailleOctets = fichierSelectionne.taille;
      mimeType = fichierSelectionne.mime;
    } else {
      if (!urlOuContenu.trim()) {
        toast({ ton: "info", titre: "Lien requis", texte: "Saisis l'URL du document." });
        return;
      }
      contenuFinal = urlOuContenu.trim();
    }

    setChargement(true);
    const nouvDoc: DocumentSaas = {
      id: `doc-${Date.now()}`,
      titre: titre.trim(),
      type,
      urlOuContenu: contenuFinal,
      nomFichier,
      tailleOctets,
      mimeType,
      date: new Date().toISOString().slice(0, 10),
    };

    const majSaas: Partial<SaasDV> = {
      documents: [...(saas.documents ?? []), nouvDoc],
    };
    if (type === "apk" && !saas.apkUrl) {
      majSaas.apkUrl = nouvDoc.nomFichier || nouvDoc.titre;
    }

    await modifierSaas(saas.id, majSaas);

    setChargement(false);
    setTitre("");
    setUrlOuContenu("");
    setFichierSelectionne(null);
    onOpenChange(false);
    toast({ ton: "succes", titre: "Document ajouté", texte: `Ajouté au dossier ${saas.nom}` });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Ajouter un document au SaaS</DialogTitle>
          <DialogDescription>
            {saas ? `Dossier de projet : ${saas.nom}` : "Ajoute un document ou un fichier"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-5 sm:p-6">
          <div className="grid grid-cols-2 gap-2 rounded-lg bg-secondary/60 p-1 border border-border">
            <button
              type="button"
              onClick={() => setMode("upload")}
              className={`flex items-center justify-center gap-2 rounded-md py-1.5 text-xs font-medium transition-all ${
                mode === "upload"
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <UploadCloud className="size-3.5" />
              Téléverser un fichier
            </button>
            <button
              type="button"
              onClick={() => setMode("lien")}
              className={`flex items-center justify-center gap-2 rounded-md py-1.5 text-xs font-medium transition-all ${
                mode === "lien"
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <LinkIcon className="size-3.5" />
              Lien web externe
            </button>
          </div>

          <Field label="Titre ou nom du document" htmlFor="doc-titre">
            <Input
              id="doc-titre"
              autoFocus
              placeholder="Ex : Build APK MivaFid v1.0.2 ou Fiche d'architecture"
              value={titre}
              onChange={(e) => setTitre(e.target.value)}
              required
            />
          </Field>

          <Field label="Catégorie de document" htmlFor="doc-type">
            <select
              id="doc-type"
              value={type}
              onChange={(e) => setType(e.target.value as DocumentSaas["type"])}
              className="border-line-strong bg-secondary text-foreground rounded-lg border px-3 py-2 text-xs outline-none"
            >
              <option value="apk">Application mobile / Package APK (.apk)</option>
              <option value="fiche_technique">Fiche technique / Spécifications</option>
              <option value="cahier_charges">Cahier des charges & Roadmap</option>
              <option value="maquette">Maquettes & Design (Figma, screenshots...)</option>
              <option value="contrat">Contrat / Convention partenaire</option>
              <option value="autre">Autre document ou ressource</option>
            </select>
          </Field>

          {mode === "upload" ? (
            <Field label="Fichier à téléverser" htmlFor="doc-fichier-input">
              <input
                ref={fileInputRef}
                id="doc-fichier-input"
                type="file"
                className="hidden"
                onChange={handleFileChange}
              />
              <div
                onClick={() => fileInputRef.current?.click()}
                className="hover:border-border hover:bg-secondary/50 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-secondary/30 p-5 text-center transition-all"
              >
                {fichierSelectionne ? (
                  <div className="flex flex-col items-center gap-1.5 text-xs">
                    <div className="flex size-9 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400">
                      <Check className="size-5" />
                    </div>
                    <span className="font-semibold text-foreground truncate max-w-[280px]">
                      {fichierSelectionne.nom}
                    </span>
                    <span className="text-subtle font-mono text-[11px]">
                      {(fichierSelectionne.taille / 1024).toFixed(0)} Ko • Prêt à être enregistré
                    </span>
                    <span className="text-primary text-[11px] underline mt-1">
                      Cliquer pour remplacer
                    </span>
                  </div>
                ) : (
                  <>
                    <div className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <UploadCloud className="size-5" />
                    </div>
                    <span className="text-xs font-medium text-foreground">
                      Clique pour sélectionner ton fichier
                    </span>
                    <span className="text-subtle text-[11px]">
                      APK Android, PDF, Images, Word, ZIP, etc.
                    </span>
                  </>
                )}
              </div>
            </Field>
          ) : (
            <Field label="URL web du document" htmlFor="doc-url">
              <Input
                id="doc-url"
                placeholder="https://drive.google.com/... ou https://figma.com/..."
                value={urlOuContenu}
                onChange={(e) => setUrlOuContenu(e.target.value)}
                required
              />
            </Field>
          )}

          <DialogFooter className="mt-2">
            <Button
              type="button"
              variant="subtle"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={chargement || (!fichierSelectionne && mode === "upload")}
            >
              {chargement ? "Enregistrement…" : "Enregistrer dans le dossier"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

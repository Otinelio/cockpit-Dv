"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/_ui/dialog";
import Button from "@/components/_ui/button";
import type { DocumentSaas } from "@/server/dv-types";
import { Download, ExternalLink, FileText, Smartphone } from "lucide-react";

interface Props {
  document: DocumentSaas | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function DocumentPreviewModal({ document: doc, open, onOpenChange }: Props) {
  if (!doc) return null;

  const estDataUrl = doc.urlOuContenu.startsWith("data:");
  const estUrl = doc.urlOuContenu.startsWith("http://") || doc.urlOuContenu.startsWith("https://");
  const estApk = doc.type === "apk" || doc.nomFichier?.endsWith(".apk");
  const estImage =
    doc.mimeType?.startsWith("image/") ||
    doc.nomFichier?.match(/\.(png|jpe?g|gif|webp|svg)$/i) ||
    (estDataUrl && doc.urlOuContenu.startsWith("data:image/"));
  const estPdf =
    doc.mimeType === "application/pdf" ||
    doc.nomFichier?.endsWith(".pdf") ||
    (estDataUrl && doc.urlOuContenu.startsWith("data:application/pdf"));

  function telecharger() {
    if (!doc) return;
    const a = window.document.createElement("a");
    a.href = doc.urlOuContenu;
    a.download = doc.nomFichier || doc.titre.replace(/[^a-z0-9_-]/gi, "_") + (estApk ? ".apk" : "");
    window.document.body.appendChild(a);
    a.click();
    window.document.body.removeChild(a);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[720px] max-h-[90dvh] flex flex-col p-4 sm:p-6 overflow-hidden">
        <DialogHeader className="border-b border-border pb-3">
          <div className="flex items-center justify-between gap-3 pr-6">
            <div className="flex min-w-0 items-center gap-2">
              {estApk ? (
                <Smartphone className="size-5 text-purple-400 shrink-0" />
              ) : (
                <FileText className="size-5 text-blue-400 shrink-0" />
              )}
              <div className="flex min-w-0 flex-col">
                <DialogTitle className="truncate text-base">{doc.titre}</DialogTitle>
                <span className="text-subtle text-xs">
                  {doc.nomFichier ? `${doc.nomFichier} • ` : ""}
                  {doc.tailleOctets ? `${Math.round(doc.tailleOctets / 1024)} Ko • ` : ""}
                  Ajouté le {doc.date}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {estDataUrl ? (
                <Button variant="secondary" size="sm" onClick={telecharger} className="gap-1.5">
                  <Download className="size-3.5" />
                  Télécharger
                </Button>
              ) : estUrl ? (
                <a
                  href={doc.urlOuContenu}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90"
                >
                  <ExternalLink className="size-3.5" />
                  Ouvrir le lien
                </a>
              ) : null}
            </div>
          </div>
        </DialogHeader>

        {/* Zone de prévisualisation */}
        <div className="flex-1 overflow-y-auto py-4">
          {estImage ? (
            <div className="flex items-center justify-center rounded-lg bg-secondary/50 p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={doc.urlOuContenu}
                alt={doc.titre}
                className="max-h-[60vh] max-w-full rounded-md object-contain shadow-sm"
              />
            </div>
          ) : estPdf && estDataUrl ? (
            <iframe
              src={doc.urlOuContenu}
              title={doc.titre}
              className="h-[60vh] w-full rounded-lg border border-border"
            />
          ) : estApk ? (
            <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border bg-secondary/30 p-8 text-center">
              <div className="flex size-14 items-center justify-center rounded-full bg-purple-500/10 text-purple-400">
                <Smartphone className="size-8" />
              </div>
              <div className="flex flex-col gap-1 max-w-sm">
                <h4 className="text-sm font-semibold text-foreground">Package APK Android</h4>
                <p className="text-subtle text-xs">
                  Ce fichier est un package d&apos;installation mobile prêt à être testé ou déployé sur un appareil Android.
                </p>
                {doc.tailleOctets && (
                  <span className="text-muted-foreground text-xs font-mono mt-1">
                    Taille : {(doc.tailleOctets / (1024 * 1024)).toFixed(2)} Mo
                  </span>
                )}
              </div>
              {estDataUrl ? (
                <Button variant="primary" size="sm" onClick={telecharger} className="gap-2">
                  <Download className="size-4" />
                  Télécharger le fichier APK
                </Button>
              ) : estUrl ? (
                <a
                  href={doc.urlOuContenu}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-md bg-purple-600 px-4 py-2 text-xs font-medium text-white hover:bg-purple-500"
                >
                  <Download className="size-4" />
                  Télécharger depuis le lien
                </a>
              ) : null}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-border bg-secondary/40 p-8 text-center">
              <FileText className="size-12 text-muted-foreground stroke-1" />
              <div className="max-w-md">
                <p className="text-sm font-medium text-foreground">{doc.titre}</p>
                <p className="text-subtle text-xs mt-1 break-all">
                  {estUrl ? doc.urlOuContenu : "Document enregistré dans le projet"}
                </p>
              </div>
              {estDataUrl && (
                <Button variant="secondary" size="sm" onClick={telecharger} className="mt-2 gap-1.5">
                  <Download className="size-3.5" />
                  Télécharger le document
                </Button>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}


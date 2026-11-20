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
import Field from "@/components/_ui/field";
import { Input } from "@/components/_ui/input";
import Tag from "@/components/_ui/tag";
import { useHub } from "@/stores/hub-store";
import { useCockpit } from "@/stores/cockpit-store";
import type { DocumentDV } from "@/server/hub-types";
import {
  Download,
  Eye,
  File,
  FileCode,
  FileImage,
  FileSpreadsheet,
  FileText,
  Folder,
  FolderOpen,
  FolderPlus,
  Search,
  Trash2,
  UploadCloud,
} from "lucide-react";

function getFileIcon(extension: string) {
  const ext = extension.toLowerCase();
  if (["png", "jpg", "jpeg", "svg", "webp", "gif"].includes(ext)) {
    return <FileImage className="size-5 text-purple-400" />;
  }
  if (["pdf"].includes(ext)) {
    return <FileText className="size-5 text-red-400" />;
  }
  if (["ts", "tsx", "js", "json", "html", "css"].includes(ext)) {
    return <FileCode className="size-5 text-blue-400" />;
  }
  if (["xlsx", "csv", "xls"].includes(ext)) {
    return <FileSpreadsheet className="size-5 text-green-400" />;
  }
  return <File className="size-5 text-muted-foreground" />;
}

function formatBytes(bytes: number) {
  if (bytes === 0) return "0 Octet";
  const k = 1024;
  const sizes = ["Octets", "Ko", "Mo", "Go"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export default function TabDocuments() {
  const dossiers = useHub((s) => s.dossiers);
  const documents = useHub((s) => s.documents);
  const creerDossier = useHub((s) => s.creerDossier);
  const uploadFichier = useHub((s) => s.uploadFichier);
  const supprimerDocument = useHub((s) => s.supprimerDocument);
  const saas = useCockpit((s) => s.saas);

  const [dossierSelectionneId, setDossierSelectionneId] = useState<string>("dos-admin");
  const [recherche, setRecherche] = useState("");

  // Modales
  const [modalNouveauDossier, setModalNouveauDossier] = useState(false);
  const [nomNouveauDossier, setNomNouveauDossier] = useState("");

  const [modalUpload, setModalUpload] = useState(false);
  const [fichierAUploader, setFichierAUploader] = useState<File | null>(null);
  const [descriptionUpload, setDescriptionUpload] = useState("");
  const [saasLiaison, setSaasLiaison] = useState("");
  const [uploadEnCours, setUploadEnCours] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Prévisualisation
  const [docApercu, setDocApercu] = useState<DocumentDV | null>(null);

  const dossierActif = dossiers.find((d) => d.id === dossierSelectionneId) || dossiers[0];

  const documentsFiltres = documents.filter((doc) => {
    const matchDossier = doc.dossierId === (dossierActif?.id ?? "dos-admin");
    const matchSearch =
      !recherche ||
      doc.nomOriginal.toLowerCase().includes(recherche.toLowerCase()) ||
      (doc.description && doc.description.toLowerCase().includes(recherche.toLowerCase()));
    return matchDossier && matchSearch;
  });

  async function handleCreerDossier(e: React.FormEvent) {
    e.preventDefault();
    if (!nomNouveauDossier.trim()) return;
    const ok = await creerDossier(nomNouveauDossier.trim());
    if (ok) {
      setModalNouveauDossier(false);
      setNomNouveauDossier("");
    }
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!fichierAUploader || !dossierActif) return;
    setUploadEnCours(true);

    const doc = await uploadFichier(
      fichierAUploader,
      dossierActif.id,
      descriptionUpload.trim() || undefined,
      saasLiaison ? { projetSaasId: saasLiaison } : undefined,
    );

    setUploadEnCours(false);
    if (doc) {
      setModalUpload(false);
      setFichierAUploader(null);
      setDescriptionUpload("");
      setSaasLiaison("");
    }
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-border bg-[#181818] p-5">
        <div className="flex items-center gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 text-primary">
            <FolderOpen className="size-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground">Documents & Archives Réelles</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Stockage physique sur disque local (<code className="text-subtle font-mono">.cockpit/documents/</code>) sans Base64
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setModalNouveauDossier(true)}
            className="gap-1.5"
          >
            <FolderPlus className="size-4" />
            Nouveau dossier
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setModalUpload(true)}
            className="gap-1.5"
          >
            <UploadCloud className="size-4" />
            Importer un fichier
          </Button>
        </div>
      </div>

      {/* Explorateur 2 colonnes */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Colonne gauche : Arborescence des dossiers */}
        <div className="md:col-span-1 space-y-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block px-1">
            Dossiers ({dossiers.length})
          </span>

          <div className="space-y-1 rounded-xl border border-border bg-[#141414] p-2">
            {dossiers.map((dos) => {
              const estActif = dos.id === (dossierActif?.id ?? "dos-admin");
              const nbFichiers = documents.filter((d) => d.dossierId === dos.id).length;

              return (
                <button
                  key={dos.id}
                  type="button"
                  onClick={() => setDossierSelectionneId(dos.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors text-left ${
                    estActif
                      ? "bg-primary/15 text-primary border border-primary/30"
                      : "text-muted-foreground hover:bg-card hover:text-foreground"
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    {estActif ? (
                      <FolderOpen className="size-4 shrink-0 text-primary" />
                    ) : (
                      <Folder className="size-4 shrink-0 text-subtle" />
                    )}
                    <span className="truncate">{dos.nom}</span>
                  </div>
                  <span className="text-[10px] tabular-nums font-mono opacity-80 shrink-0">
                    {nbFichiers}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Colonne droite : Fichiers du dossier actif */}
        <div className="md:col-span-3 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <FolderOpen className="size-5 text-primary" />
              <h4 className="text-base font-bold text-foreground">
                {dossierActif?.nom ?? "Dossier"}
              </h4>
              <span className="text-xs text-muted-foreground font-mono">
                ({documentsFiltres.length} fichier{documentsFiltres.length > 1 ? "s" : ""})
              </span>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
              <Input
                value={recherche}
                onChange={(e) => setRecherche(e.target.value)}
                placeholder="Filtrer les fichiers..."
                className="pl-9 text-xs h-9"
              />
            </div>
          </div>

          {documentsFiltres.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-12 text-center space-y-3">
              <UploadCloud className="size-8 mx-auto text-muted-foreground opacity-60" />
              <p className="text-sm font-semibold text-foreground">Aucun document dans ce dossier</p>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Téléverse des contrats, grilles tarifaires, logos ou maquettes. Ils sont stockés
                physiquement sur le disque local.
              </p>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setModalUpload(true)}
                className="mt-2"
              >
                Importer un fichier ici
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {documentsFiltres.map((doc) => {
                const url = `/api/hub/documents/fichiers/${doc.id}`;

                return (
                  <div
                    key={doc.id}
                    className="group relative rounded-xl border border-border bg-[#141414] p-3.5 flex flex-col justify-between hover:border-primary/40 transition-colors"
                  >
                    <div>
                      <div className="flex items-start gap-2.5">
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-card/60 border border-border/60">
                          {getFileIcon(doc.extension)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h5
                            className="text-xs font-semibold text-foreground truncate select-all"
                            title={doc.nomOriginal}
                          >
                            {doc.nomOriginal}
                          </h5>
                          <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                            <span>{formatBytes(doc.tailleOctets)}</span>
                            <span>·</span>
                            <span className="uppercase font-mono">{doc.extension}</span>
                          </div>
                        </div>
                      </div>

                      {doc.description && (
                        <p className="text-[11px] text-muted-foreground mt-2 line-clamp-2">
                          {doc.description}
                        </p>
                      )}

                      {/* Liaison SaaS */}
                      {doc.projetSaasId && (
                        <div className="mt-2">
                          <Tag tone="purple" className="text-[10px]">
                            SaaS : {doc.projetSaasId}
                          </Tag>
                        </div>
                      )}
                    </div>

                    <div className="pt-3 mt-3 border-t border-border/40 flex items-center justify-between gap-1">
                      <span className="text-[10px] text-subtle truncate">
                        {new Date(doc.creeLe).toLocaleDateString("fr-FR")}
                      </span>

                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => setDocApercu(doc)}
                          title="Prévisualiser"
                        >
                          <Eye className="size-3.5 text-muted-foreground hover:text-foreground" />
                        </Button>

                        <a
                          href={url}
                          download={doc.nomOriginal}
                          className="inline-flex size-7 items-center justify-center rounded hover:bg-card text-muted-foreground hover:text-foreground"
                          title="Télécharger sur l'ordinateur"
                        >
                          <Download className="size-3.5" />
                        </a>

                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => {
                            if (confirm(`Supprimer définitivement « ${doc.nomOriginal} » ?`)) {
                              supprimerDocument(doc.id);
                            }
                          }}
                          title="Supprimer"
                        >
                          <Trash2 className="size-3.5 text-muted-foreground hover:text-red-400" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* MODAL CRÉER DOSSIER */}
      <Dialog open={modalNouveauDossier} onOpenChange={setModalNouveauDossier}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderPlus className="size-5 text-primary" />
              Nouveau dossier
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreerDossier} className="space-y-4 py-2">
            <Field label="Nom du dossier" htmlFor="dossier-nom">
              <Input
                id="dossier-nom"
                value={nomNouveauDossier}
                onChange={(e) => setNomNouveauDossier(e.target.value)}
                placeholder="Ex: Contrats 2026, Factures fournisseurs..."
                autoFocus
                required
              />
            </Field>

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setModalNouveauDossier(false)}
              >
                Annuler
              </Button>
              <Button type="submit" variant="primary">
                Créer le dossier
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL UPLOAD FICHIER */}
      <Dialog open={modalUpload} onOpenChange={setModalUpload}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UploadCloud className="size-5 text-primary" />
              Importer un fichier
            </DialogTitle>
            <DialogDescription>
              Le fichier sera stocké physiquement dans le dossier{" "}
              <span className="text-foreground font-semibold">« {dossierActif?.nom} »</span>.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleUpload} className="space-y-4 py-2">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-border/80 hover:border-primary/60 rounded-xl p-6 text-center cursor-pointer bg-card/20 transition-colors"
            >
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) setFichierAUploader(f);
                }}
              />
              <UploadCloud className="size-8 mx-auto text-primary mb-2" />
              {fichierAUploader ? (
                <div>
                  <span className="text-sm font-semibold text-foreground block truncate">
                    {fichierAUploader.name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatBytes(fichierAUploader.size)}
                  </span>
                </div>
              ) : (
                <div>
                  <span className="text-sm font-medium text-foreground block">
                    Cliquer pour choisir un fichier
                  </span>
                  <span className="text-xs text-muted-foreground">
                    PDF, image, document, archive (tous formats)
                  </span>
                </div>
              )}
            </div>

            <Field label="Description ou note (optionnel)" htmlFor="fichier-desc">
              <Input
                id="fichier-desc"
                value={descriptionUpload}
                onChange={(e) => setDescriptionUpload(e.target.value)}
                placeholder="Ex: Grille tarifaire signée, maquette V2..."
              />
            </Field>

            <Field label="Lier à un projet SaaS (optionnel)" htmlFor="fichier-saas">
              <select
                id="fichier-saas"
                value={saasLiaison}
                onChange={(e) => setSaasLiaison(e.target.value)}
                className="border-line-strong bg-secondary text-foreground focus-visible:border-ring w-full rounded-lg border px-3 py-2 text-sm outline-none"
              >
                <option value="">Aucun projet SaaS lié</option>
                {saas.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nom}
                  </option>
                ))}
              </select>
            </Field>

            <DialogFooter className="gap-2 pt-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setModalUpload(false)}
                disabled={uploadEnCours}
              >
                Annuler
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={!fichierAUploader || uploadEnCours}
              >
                {uploadEnCours ? "Enregistrement..." : "Archiver le fichier"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL PRÉVISUALISATION DOCUMENT */}
      <Dialog open={Boolean(docApercu)} onOpenChange={(open) => !open && setDocApercu(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col p-5">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 truncate">
              {docApercu && getFileIcon(docApercu.extension)}
              <span className="truncate">{docApercu?.nomOriginal}</span>
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-auto rounded-lg border border-border bg-[#0d0d0d] p-2 flex items-center justify-center min-h-[350px]">
            {docApercu && (
              <>
                {["png", "jpg", "jpeg", "svg", "webp", "gif"].includes(
                  docApercu.extension.toLowerCase(),
                ) ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={`/api/hub/documents/fichiers/${docApercu.id}`}
                    alt={docApercu.nomOriginal}
                    className="max-h-[500px] max-w-full object-contain rounded"
                  />
                ) : docApercu.extension.toLowerCase() === "pdf" ? (
                  <iframe
                    src={`/api/hub/documents/fichiers/${docApercu.id}`}
                    className="w-full h-[500px] rounded border-0"
                    title={docApercu.nomOriginal}
                  />
                ) : (
                  <div className="text-center p-8 space-y-3">
                    <FileText className="size-12 mx-auto text-muted-foreground opacity-60" />
                    <p className="text-sm text-foreground">Prévisualisation directe non supportée</p>
                    <a
                      href={`/api/hub/documents/fichiers/${docApercu.id}`}
                      download={docApercu.nomOriginal}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold"
                    >
                      <Download className="size-4" />
                      Télécharger le fichier ({formatBytes(docApercu.tailleOctets)})
                    </a>
                  </div>
                )}
              </>
            )}
          </div>

          <DialogFooter className="gap-2 pt-2">
            {docApercu && (
              <a
                href={`/api/hub/documents/fichiers/${docApercu.id}`}
                download={docApercu.nomOriginal}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-card/80 text-xs font-medium text-foreground"
              >
                <Download className="size-4" />
                Télécharger
              </a>
            )}
            <Button variant="secondary" onClick={() => setDocApercu(null)}>
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

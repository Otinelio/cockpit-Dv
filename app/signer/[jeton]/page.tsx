"use client";

import { useEffect, useRef, useState, use } from "react";
import Button from "@/components/_ui/button";
import { Input } from "@/components/_ui/input";
import Field from "@/components/_ui/field";
import Tag from "@/components/_ui/tag";
import { api } from "@/lib/api";
import { euros, jourCourt } from "@/lib/format";
import type { ContratDV } from "@/server/dv-types";
import {
  Building2,
  CheckCircle2,
  Clock,
  Download,
  Eraser,
  FileCheck,
  FileText,
  Layers,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

interface Props {
  params: Promise<{ jeton: string }>;
}

export default function PageSignatureClient({ params }: Props) {
  const resolvedParams = use(params);
  const jeton = resolvedParams.jeton;

  const [contrat, setContrat] = useState<ContratDV | null>(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);

  // Formulaire de signature
  const [nomSignataire, setNomSignataire] = useState("");
  const [fonctionSignataire, setFonctionSignataire] = useState("");
  const [accepteConditions, setAccepteConditions] = useState(false);
  const [aSigne, setASigne] = useState(false);
  const [envoiEnCours, setEnvoiEnCours] = useState(false);
  const [succes, setSucces] = useState(false);

  // Canvas
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [enDessin, setEnDessin] = useState(false);

  useEffect(() => {
    async function charger() {
      try {
        const c = await api.obtenirContratPourSignature(jeton);
        setContrat(c);
        if (c.estSigne) {
          setSucces(true);
        }
      } catch (e) {
        setErreur((e as Error).message || "Lien de signature invalide ou expiré.");
      } finally {
        setChargement(false);
      }
    }
    charger();
  }, [jeton]);

  // Canvas touch & mouse handlers
  function demarrerDessin(e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    setEnDessin(true);
    setASigne(true);
    const rect = canvas.getBoundingClientRect();
    const x = "touches" in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = "touches" in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#3b82f6";
  }

  function dessiner(e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) {
    if (!enDessin) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = "touches" in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = "touches" in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  }

  function arreterDessin() {
    setEnDessin(false);
  }

  function effacerCanvas() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setASigne(false);
  }

  async function handleValiderSignature(e: React.FormEvent) {
    e.preventDefault();
    if (!nomSignataire.trim() || !accepteConditions || !aSigne) return;

    setEnvoiEnCours(true);
    try {
      const canvas = canvasRef.current;
      const signatureBase64 = canvas ? canvas.toDataURL("image/png") : undefined;

      await api.signerContratEnLigne(jeton, {
        nomSignataire: nomSignataire.trim(),
        fonctionSignataire: fonctionSignataire.trim() || undefined,
        signatureBase64,
      });

      setSucces(true);
    } catch (err) {
      alert((err as Error).message || "Erreur lors de l'enregistrement de la signature");
    } finally {
      setEnvoiEnCours(false);
    }
  }

  if (chargement) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#121212] p-4">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-xs text-muted-foreground">Chargement de la convention sécurisée...</p>
        </div>
      </div>
    );
  }

  if (erreur || !contrat) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#121212] p-4">
        <div className="max-w-md w-full p-6 rounded-2xl border border-border bg-[#181818] text-center space-y-4">
          <div className="size-12 rounded-full bg-rose-500/10 text-rose-400 mx-auto flex items-center justify-center">
            <ShieldCheck className="size-6" />
          </div>
          <h1 className="text-base font-bold text-foreground">Convention introuvable ou expirée</h1>
          <p className="text-xs text-muted-foreground">
            {erreur || "Le lien de signature semble invalide. Merci de contacter votre interlocuteur DigitalVision."}
          </p>
        </div>
      </div>
    );
  }

  const montantTotalHT = contrat.montantFCFA || 0;
  const tvaTaux = contrat.tvaTaux ?? 0;
  const montantTotalTTC = tvaTaux > 0 ? Math.round(montantTotalHT * 1.18) : montantTotalHT;
  const prestations = contrat.prestations ?? [];
  const jalons = contrat.jalonsFacturation ?? [];

  return (
    <div className="min-h-screen bg-[#121212] text-foreground py-10 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* EN-TÊTE DIGITALVISION */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl border border-border bg-[#181818]">
          <div className="flex items-center gap-3">
            <div className="size-12 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center font-bold text-xl">
              DV
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-tight text-foreground">DigitalVision Togo</h2>
              <p className="text-xs text-muted-foreground">Studio de Développement & Solutions Digitales • Lomé</p>
            </div>
          </div>

          <div className="text-left sm:text-right">
            <span className="text-[11px] font-mono uppercase text-muted-foreground block">
              Convention Officielle
            </span>
            <span className="text-xs font-semibold text-primary font-mono">
              #{contrat.id}
            </span>
          </div>
        </div>

        {/* SUCCÈS CONFIRMATION BANNER */}
        {succes && (
          <div className="p-5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 text-center space-y-2">
            <div className="size-10 rounded-full bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center">
              <CheckCircle2 className="size-6" />
            </div>
            <h3 className="text-base font-bold text-foreground">Convention validée et signée en ligne !</h3>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              Merci pour votre confiance. La convention a été certifiée et enregistrée. L&apos;équipe DigitalVision prend en charge le déploiement.
            </p>
            <div className="pt-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-medium">
                <FileCheck className="size-3.5" />
                Signé le {contrat.signeLe || new Date().toLocaleDateString("fr-FR")}
              </span>
            </div>
          </div>
        )}

        {/* DÉTAIL DU CONTRAT */}
        <div className="p-6 rounded-2xl border border-border bg-[#181818] space-y-6">
          <div className="border-b border-border/60 pb-4 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Building2 className="size-4 text-purple-400" />
                Bénéficiaire : {contrat.nomEntreprise}
              </span>
              <Tag tone="purple" size="sm">
                Proposition & Convention
              </Tag>
            </div>
            <h1 className="text-xl font-bold text-foreground">{contrat.titre}</h1>
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground pt-1">
              <span className="flex items-center gap-1">
                <Clock className="size-3.5" />
                Début : {jourCourt(contrat.debutLe)}
              </span>
              {contrat.finLe && (
                <span>• Échéance de livraison : {jourCourt(contrat.finLe)}</span>
              )}
            </div>
          </div>

          {/* VALORISATION FINANCIÈRE */}
          <div className="p-4 rounded-xl border border-border bg-card/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-xs text-muted-foreground uppercase font-mono block">
                Montant total convenu
              </span>
              <span className="text-2xl font-bold font-mono text-trend">
                {euros(montantTotalTTC, true)} {tvaTaux > 0 ? "TTC" : "HT (Exonéré)"}
              </span>
              {tvaTaux > 0 && (
                <span className="text-[11px] text-muted-foreground block mt-0.5">
                  Montant HT : {euros(montantTotalHT, true)} • TVA (18%) : {euros(montantTotalTTC - montantTotalHT, true)}
                </span>
              )}
            </div>

            <div className="text-left sm:text-right text-xs text-muted-foreground">
              <span className="font-semibold text-foreground block">Modalités de règlement :</span>
              <span>{contrat.modalitesPaiement || "Selon les conditions contractuelles convenues"}</span>
            </div>
          </div>

          {/* PRESTATIONS & LIVRABLES */}
          {prestations.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Layers className="size-4 text-primary" />
                Détail des prestations et livrables inclus ({prestations.length})
              </h3>
              <div className="space-y-2">
                {prestations.map((p, idx) => (
                  <div
                    key={p.id || idx}
                    className="p-3.5 rounded-xl border border-border bg-card/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                  >
                    <div>
                      <span className="text-xs font-semibold text-foreground block">
                        {p.libellePersonnalise || p.type}
                      </span>
                      {p.echeancePrestation && (
                        <span className="text-[11px] text-muted-foreground">
                          Échéance prévue : {jourCourt(p.echeancePrestation)}
                        </span>
                      )}
                    </div>
                    <span className="font-mono font-bold text-xs text-trend self-end sm:self-center">
                      {euros(p.montantFCFA, true)} HT
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* JALONS DE FACTURATION */}
          {jalons.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Sparkles className="size-4 text-amber-400" />
                Échéancier de facturation échelonnée ({jalons.length} jalons)
              </h3>
              <div className="space-y-2">
                {jalons.map((j, idx) => (
                  <div
                    key={j.id || idx}
                    className="p-3 rounded-lg border border-border/80 bg-card/20 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="size-5 rounded-full bg-secondary text-[11px] font-bold flex items-center justify-center text-muted-foreground">
                        {idx + 1}
                      </span>
                      <span className="font-medium text-foreground">{j.titre} ({j.pourcentage}%)</span>
                    </div>
                    <span className="font-mono font-bold text-foreground">
                      {euros(j.montantFCFA, true)} HT
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CLAUSES & MENTIONS LÉGALES */}
          {contrat.mentionsLegales && (
            <div className="space-y-2 border-t border-border/60 pt-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <FileText className="size-4 text-blue-400" />
                Clauses juridiques & Engagements contractuels
              </h3>
              <div className="p-4 rounded-xl border border-border bg-card/20 text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">
                {contrat.mentionsLegales}
              </div>
            </div>
          )}

          {/* SECTION SIGNATURE TACTILE */}
          {!succes && (
            <form onSubmit={handleValiderSignature} className="space-y-4 border-t border-border/80 pt-6">
              <div className="flex items-center gap-2">
                <ShieldCheck className="size-4 text-emerald-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Signature électronique du bon de commande
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Nom et Prénom du signataire" htmlFor="sig-nom">
                  <Input
                    id="sig-nom"
                    value={nomSignataire}
                    onChange={(e) => setNomSignataire(e.target.value)}
                    placeholder="Ex : M. Kofi Mensah"
                    required
                  />
                </Field>

                <Field label="Titre / Fonction dans l'entreprise" htmlFor="sig-fonction">
                  <Input
                    id="sig-fonction"
                    value={fonctionSignataire}
                    onChange={(e) => setFonctionSignataire(e.target.value)}
                    placeholder="Ex : Directeur Général"
                  />
                </Field>
              </div>

              {/* CANVAS DE DESSIN DE SIGNATURE */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Tracez votre signature ci-dessous (au doigt ou à la souris) :</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={effacerCanvas}
                    className="h-6 text-[11px] gap-1 text-muted-foreground hover:text-foreground"
                  >
                    <Eraser className="size-3" />
                    Effacer
                  </Button>
                </div>

                <div className="rounded-xl border border-border bg-[#0d0d0d] overflow-hidden relative cursor-crosshair">
                  <canvas
                    ref={canvasRef}
                    width={600}
                    height={160}
                    onMouseDown={demarrerDessin}
                    onMouseMove={dessiner}
                    onMouseUp={arreterDessin}
                    onMouseLeave={arreterDessin}
                    onTouchStart={demarrerDessin}
                    onTouchMove={dessiner}
                    onTouchEnd={arreterDessin}
                    className="w-full h-40 touch-none block"
                  />
                  {!aSigne && (
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center text-xs text-muted-foreground/40 italic">
                      Signez ici avec votre doigt ou la souris
                    </div>
                  )}
                </div>
              </div>

              {/* CHECKBOX ENGAGEMENT */}
              <div className="flex items-start gap-2.5 p-3 rounded-xl border border-border/60 bg-card/20">
                <input
                  id="chk-engage"
                  type="checkbox"
                  checked={accepteConditions}
                  onChange={(e) => setAccepteConditions(e.target.checked)}
                  className="mt-0.5 rounded border-border text-primary focus:ring-0"
                  required
                />
                <label htmlFor="chk-engage" className="text-xs text-muted-foreground cursor-pointer">
                  Je confirme être habilité(e) à engager l&apos;entreprise <strong className="text-foreground">{contrat.nomEntreprise}</strong>, déclare avoir pris connaissance des livrables et clauses susmentionnés, et valide cette convention.
                </label>
              </div>

              <Button
                type="submit"
                variant="primary"
                disabled={envoiEnCours || !nomSignataire.trim() || !accepteConditions || !aSigne}
                className="w-full h-11 text-sm font-bold bg-emerald-600 hover:bg-emerald-500 text-white gap-2 shadow-lg shadow-emerald-950/40"
              >
                <FileCheck className="size-4" />
                {envoiEnCours ? "Validation en cours..." : "Confirmer et signer électroniquement la convention"}
              </Button>
            </form>
          )}

          {succes && contrat.documentUrl && (
            <div className="pt-2 text-center">
              <a
                href={contrat.documentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground text-xs font-semibold border border-border transition-colors"
              >
                <Download className="size-4 text-primary" />
                Télécharger le document contractuel archivé
              </a>
            </div>
          )}
        </div>

        {/* PIED DE PAGE */}
        <p className="text-center text-[11px] text-muted-foreground">
          DigitalVision Togo • Tous droits réservés • Plateforme Cockpit DV
        </p>
      </div>
    </div>
  );
}

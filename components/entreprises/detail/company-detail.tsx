"use client";

import { useEffect, useState } from "react";
import Avatar from "@/components/_ui/avatar";
import Button from "@/components/_ui/button";
import Field from "@/components/_ui/field";
import { Input } from "@/components/_ui/input";
import Tag from "@/components/_ui/tag";
import { Checkbox } from "@/components/_ui/checkbox";
import { ScrollArea } from "@/components/_ui/scroll-area";
import { Slider } from "@/components/_ui/slider";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/_ui/sheet";
import FilterMenu from "@/components/_common/filter-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/_ui/select";
import DetailSection from "./detail-section";
import PipelineHealth from "./pipeline-health";
import ActivityTrend from "./activity-trend";
import PennylaneSection from "./pennylane-section";
import NouveauContratDialog from "@/components/contrats/nouveau-contrat-dialog";
import ContratDetailDialog from "@/components/contrats/contrat-detail-dialog";
import type { ContratDV } from "@/server/dv-types";
import { etiquettes } from "@/lib/cockpit";
import { aujourdhui, euros } from "@/lib/format";
import {
  ETAPES,
  SEGMENTS,
  TYPES_ECHANGE,
  type Entreprise,
  type Etape,
  type Segment,
} from "@/server/crm-types";
import { useCockpit } from "@/stores/cockpit-store";
import BuildingIcon from "@/public/assets/images/companies/detail/building.svg";
import XIcon from "@/public/assets/images/companies/detail/x.svg";
import {
  MessageCircle,
  PhoneCall,
  Mail,
  Plus,
  Clock,
  Trash2,
} from "lucide-react";

const ETAPE_OPTIONS = ETAPES.map((etape) => ({ value: etape, label: etape }));
const SEGMENT_OPTIONS = SEGMENTS.map((segment) => ({ value: segment, label: segment }));

type Brouillon = {
  nom: string;
  ville: string;
  responsable: string;
  segment: Segment;
  etape: Etape;
  affaires: number;
  pipeline: number;
  chances: number;
  contactNom: string;
  contactEmail: string;
  contactTelephone: string;
  suite: string;
  notes: string;
  echangeDate: string;
  echangeLibelle: string;
};

function brouillonDe(e: Entreprise): Brouillon {
  return {
    nom: e.nom,
    ville: e.ville || "",
    responsable: e.responsable,
    segment: e.segment,
    etape: e.etape,
    affaires: e.affaires,
    pipeline: e.pipeline,
    chances: e.chances,
    contactNom: e.contact?.nom || "",
    contactEmail: e.contact?.email || "",
    contactTelephone: e.contact?.telephone || "",
    suite: e.suite || "",
    notes: e.notes || "",
    echangeDate: e.dernierEchange?.date || aujourdhui(),
    echangeLibelle: e.dernierEchange?.libelle || TYPES_ECHANGE[0],
  };
}

function lienWhatsApp(tel: string | undefined | null) {
  if (!tel) return null;
  const nettoye = tel.replace(/[^\d+]/g, "");
  let digits = nettoye.replace(/\D/g, "");
  if (!digits) return null;
  // Si numéro togolais à 8 chiffres sans indicatif, ajouter 228
  if (digits.length === 8) {
    digits = "228" + digits;
  }
  return `https://wa.me/${digits}`;
}

export default function CompanyDetail() {
  const detailId = useCockpit((state) => state.detailId);
  const detailOpen = useCockpit((state) => state.detailOpen);
  const crm = useCockpit((state) => state.crm);
  const closeDetail = useCockpit((state) => state.closeDetail);
  const modifier = useCockpit((state) => state.modifierEntreprise);
  const supprimer = useCockpit((state) => state.supprimerEntreprise);
  const toast = useCockpit((state) => state.toast);

  // Tâches et contrats
  const taches = useCockpit((state) => state.taches);
  const chargerTaches = useCockpit((state) => state.chargerTaches);
  const ajouterTache = useCockpit((state) => state.ajouterTache);
  const modifierTache = useCockpit((state) => state.modifierTache);

  const contrats = useCockpit((state) => state.contrats);
  const chargerContrats = useCockpit((state) => state.chargerContrats);

  const [modalContratClient, setModalContratClient] = useState(false);
  const [contratDetailSelect, setContratDetailSelect] = useState<ContratDV | null>(null);
  const [formTacheOuvert, setFormTacheOuvert] = useState(false);
  const [titreTacheClient, setTitreTacheClient] = useState("");
  const [assigneTacheClient, setAssigneTacheClient] = useState("Othnelio");
  const [echeanceTacheClient, setEcheanceTacheClient] = useState(() => aujourdhui());

  const company = crm?.entreprises.find((e) => e.id === detailId);
  const [brouillon, setBrouillon] = useState<Brouillon | null>(null);
  const ouverte = detailOpen && company ? company.id : null;
  const [ouverteAvant, setOuverteAvant] = useState<string | null>(null);

  if (ouverte !== ouverteAvant) {
    setOuverteAvant(ouverte);
    if (ouverte && company) setBrouillon(brouillonDe(company));
  }

  useEffect(() => {
    if (detailOpen) {
      chargerTaches();
      chargerContrats();
    }
  }, [detailOpen, chargerTaches, chargerContrats]);

  const modifie =
    company &&
    brouillon &&
    JSON.stringify(brouillonDe(company)) !== JSON.stringify(brouillon);

  async function enregistrer() {
    if (!company || !brouillon || !modifie) return closeDetail();
    const chances =
      brouillon.etape === "Gagné" || brouillon.etape === "Client"
        ? 100
        : brouillon.etape === "Perdu"
          ? 0
          : brouillon.chances;

    const echangeModifie =
      brouillon.echangeDate !== company.dernierEchange?.date ||
      brouillon.echangeLibelle !== company.dernierEchange?.libelle;

    const dernierEchange = echangeModifie
      ? { date: brouillon.echangeDate, libelle: brouillon.echangeLibelle.slice(0, 40) }
      : brouillon.etape !== company.etape
        ? { date: aujourdhui(), libelle: `Passé en ${brouillon.etape}`.slice(0, 40) }
        : company.dernierEchange;

    await modifier(company.id, {
      nom: brouillon.nom.trim() || company.nom,
      ville: brouillon.ville.trim() || null,
      responsable: brouillon.responsable || company.responsable,
      segment: brouillon.segment,
      etape: brouillon.etape,
      affaires: Math.max(0, Math.round(Number(brouillon.affaires) || 0)),
      pipeline: Math.max(0, Math.round(Number(brouillon.pipeline) || 0)),
      chances,
      contact: {
        nom: brouillon.contactNom.trim(),
        email: brouillon.contactEmail.trim(),
        telephone: brouillon.contactTelephone.trim(),
      },
      suite: brouillon.suite,
      notes: brouillon.notes,
      dernierEchange,
    });

    toast({
      ton: "succes",
      titre: `${brouillon.nom} mise à jour`,
      texte: "Les modifications de la fiche client sont enregistrées.",
    });
    closeDetail();
  }

  const maj = <K extends keyof Brouillon>(cle: K, valeur: Brouillon[K]) =>
    setBrouillon((b) => (b ? { ...b, [cle]: valeur } : b));

  async function handleCreerTacheClient(e: React.FormEvent) {
    e.preventDefault();
    if (!company || !titreTacheClient.trim()) return;

    await ajouterTache({
      titre: titreTacheClient.trim(),
      type: "dev_client",
      assigneA: assigneTacheClient,
      creePar: "Moi",
      statut: "a_faire",
      priorite: "haute",
      echeance: echeanceTacheClient,
      entrepriseId: company.id,
      nomEntreprise: company.nom,
    });

    setTitreTacheClient("");
    setFormTacheOuvert(false);
    toast({ ton: "succes", titre: "Tâche créée", texte: `Rattachée à ${company.nom}` });
  }

  if (!company || !brouillon) return null;

  const telephone = brouillon.contactTelephone || company.contact?.telephone || "";
  const email = brouillon.contactEmail || company.contact?.email || "";
  const lienWa = lienWhatsApp(telephone);

  // Tâches et contrats liés
  const tachesClient = (taches ?? []).filter(
    (t) =>
      t.entrepriseId === company.id ||
      t.nomEntreprise?.toLowerCase() === company.nom.toLowerCase(),
  );

  const contratsClient = (contrats ?? []).filter(
    (c) =>
      c.entrepriseId === company.id ||
      c.nomEntreprise.toLowerCase() === company.nom.toLowerCase(),
  );

  return (
    <>
      <Sheet
        open={detailOpen && company !== undefined}
        onOpenChange={(open) => !open && closeDetail()}
      >
        <SheetContent side="right" className="w-full sm:w-[600px] sm:max-w-[600px] flex flex-col p-0">
          <SheetHeader className="border-b border-border bg-card/60 p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BuildingIcon aria-hidden className="text-icon size-4 text-purple-400" />
                <SheetTitle className="text-base font-bold">Fiche client & Entreprise</SheetTitle>
              </div>
              <SheetClose asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Fermer la fiche"
                >
                  <XIcon aria-hidden className="text-foreground size-4" />
                </Button>
              </SheetClose>
            </div>
            <SheetDescription className="sr-only">
              Informations, modifications, contacts directs, tâches et contrats de l&apos;entreprise
            </SheetDescription>
          </SheetHeader>

          <ScrollArea className="min-h-0 flex-1">
            {/* 1. EN-TÊTE ÉDITABLE NOM DE L'ENTREPRISE */}
            <div className="flex flex-col gap-3 p-5 shadow-[inset_0_-1px_0_var(--line-strong)] bg-card">
              <div className="flex items-start gap-3">
                <span className="bg-muted flex size-12 shrink-0 items-center justify-center rounded-xl shadow-xs border border-border">
                  <span className="text-xl font-bold text-purple-400">
                    {brouillon.nom.slice(0, 1) || "C"}
                  </span>
                </span>

                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <Input
                    value={brouillon.nom}
                    onChange={(e) => maj("nom", e.target.value)}
                    placeholder="Nom de l'entreprise"
                    className="h-8 text-base font-bold text-foreground border-border bg-secondary/40"
                  />
                  <div className="flex flex-wrap items-center gap-1.5 mt-1">
                    {etiquettes({ ...company, segment: brouillon.segment, etape: brouillon.etape }).map((tag) => (
                      <Tag key={tag.libelle} tone={tag.ton} size="sm">
                        {tag.libelle}
                      </Tag>
                    ))}
                  </div>
                </div>
              </div>

              {/* 2. BOUTONS D'ACTION DIRECTE (WHATSAPP, APPELER, EMAIL, NOUVEAU CONTRAT) */}
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/60">
                {lienWa ? (
                  <a
                    href={lienWa}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white shadow-xs transition-colors"
                  >
                    <MessageCircle className="size-3.5" />
                    WhatsApp
                  </a>
                ) : null}

                {telephone ? (
                  <a
                    href={`tel:${telephone.replace(/\s+/g, "")}`}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 px-3 py-1.5 text-xs font-semibold text-white shadow-xs transition-colors"
                  >
                    <PhoneCall className="size-3.5" />
                    Appeler
                  </a>
                ) : null}

                {email ? (
                  <a
                    href={`mailto:${email}`}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-secondary hover:bg-secondary/80 px-3 py-1.5 text-xs font-semibold text-foreground transition-colors"
                  >
                    <Mail className="size-3.5" />
                    E-mail
                  </a>
                ) : null}

                <Button
                  variant="subtle"
                  size="sm"
                  onClick={() => setModalContratClient(true)}
                  className="gap-1 text-xs ml-auto border border-border bg-secondary/50"
                >
                  <Plus className="size-3" />
                  Nouveau contrat
                </Button>
              </div>
            </div>

            {/* 3. COORDONNÉES & CONTACT (MODIFIABLES) */}
            <DetailSection title="Coordonnées & Contact">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Nom du contact" htmlFor="fiche-contact-nom">
                  <Input
                    id="fiche-contact-nom"
                    value={brouillon.contactNom}
                    onChange={(e) => maj("contactNom", e.target.value)}
                    placeholder="Ex : M. Kofi Lawson"
                  />
                </Field>

                <Field label="Téléphone" htmlFor="fiche-contact-tel">
                  <Input
                    id="fiche-contact-tel"
                    type="tel"
                    value={brouillon.contactTelephone}
                    onChange={(e) => maj("contactTelephone", e.target.value)}
                    placeholder="Ex : +228 90 12 34 56"
                    className="tabular-nums"
                  />
                </Field>

                <Field label="Adresse e-mail" htmlFor="fiche-contact-email">
                  <Input
                    id="fiche-contact-email"
                    type="email"
                    value={brouillon.contactEmail}
                    onChange={(e) => maj("contactEmail", e.target.value)}
                    placeholder="contact@entreprise.com"
                  />
                </Field>

                <Field label="Ville / Localisation" htmlFor="fiche-ville">
                  <Input
                    id="fiche-ville"
                    value={brouillon.ville}
                    onChange={(e) => maj("ville", e.target.value)}
                    placeholder="Ex : Lomé"
                  />
                </Field>

                <div className="sm:col-span-2">
                  <Field label="Responsable du compte" htmlFor="fiche-responsable">
                    <Select
                      value={brouillon.responsable || company.responsable}
                      onValueChange={(v) => maj("responsable", v)}
                    >
                      <SelectTrigger id="fiche-responsable">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(crm?.equipe ?? []).map((m) => (
                          <SelectItem key={m.nom} value={m.nom}>
                            <span className="flex items-center gap-2">
                              <Avatar nom={m.nom} ton={m.ton} />
                              {m.nom}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                </div>
              </div>
            </DetailSection>

            {/* 4. ÉTAPE, SEGMENT, DERNIER ÉCHANGE ET SUIVI */}
            <DetailSection
              title="Étape, segment & échange"
              action={
                <div className="flex flex-wrap items-center gap-1.5">
                  <FilterMenu
                    label="Segment"
                    value={brouillon.segment}
                    options={SEGMENT_OPTIONS}
                    onChange={(v) => maj("segment", v as Segment)}
                    align="end"
                  />
                  <FilterMenu
                    label="Étape"
                    value={brouillon.etape}
                    options={ETAPE_OPTIONS}
                    onChange={(v) => maj("etape", v as Etape)}
                    align="end"
                  />
                </div>
              }
            >
              <div className="flex flex-col gap-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Dernier échange (Date)" htmlFor="fiche-echange-date">
                    <Input
                      id="fiche-echange-date"
                      type="date"
                      max={aujourdhui()}
                      value={brouillon.echangeDate}
                      onChange={(e) => maj("echangeDate", e.target.value)}
                      className="tabular-nums"
                    />
                  </Field>
                  <Field label="Type d'échange" htmlFor="fiche-echange-type">
                    <Select
                      value={brouillon.echangeLibelle}
                      onValueChange={(v) => maj("echangeLibelle", v)}
                    >
                      <SelectTrigger id="fiche-echange-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TYPES_ECHANGE.map((t) => (
                          <SelectItem key={t} value={t}>
                            {t}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <Field label="Montant espéré (FCFA HT)" htmlFor="fiche-pipeline">
                    <Input
                      id="fiche-pipeline"
                      type="number"
                      min={0}
                      step={100}
                      inputMode="numeric"
                      value={brouillon.pipeline}
                      onChange={(e) => maj("pipeline", Math.max(0, Math.round(Number(e.target.value) || 0)))}
                      className="tabular-nums"
                    />
                  </Field>

                  <Field label="Affaires en cours" htmlFor="fiche-affaires">
                    <Input
                      id="fiche-affaires"
                      type="number"
                      min={0}
                      inputMode="numeric"
                      value={brouillon.affaires}
                      onChange={(e) => maj("affaires", Math.max(0, Math.round(Number(e.target.value) || 0)))}
                      className="tabular-nums"
                    />
                  </Field>

                  <Field
                    label="Chances de signer"
                    htmlFor="fiche-chances"
                    trailing={
                      <span className="caption-style text-foreground tabular-nums">
                        {brouillon.chances} %
                      </span>
                    }
                  >
                    <div className="flex h-9 flex-col justify-center gap-2">
                      <Slider
                        id="fiche-chances"
                        aria-label="Chances de signer"
                        min={0}
                        max={100}
                        step={1}
                        value={[brouillon.chances]}
                        onValueChange={([v]) => maj("chances", v)}
                      />
                    </div>
                  </Field>
                </div>

                <Field label="Ce qu'il reste à faire (Action suivante)" htmlFor="fiche-suite">
                  <Input
                    id="fiche-suite"
                    value={brouillon.suite}
                    maxLength={80}
                    onChange={(e) => maj("suite", e.target.value)}
                    placeholder="Ex : Rappeler jeudi pour caler la démonstration"
                  />
                </Field>

                <Field label="Notes internes sur ce client" htmlFor="fiche-notes">
                  <textarea
                    id="fiche-notes"
                    value={brouillon.notes}
                    maxLength={2000}
                    rows={3}
                    onChange={(e) => maj("notes", e.target.value)}
                    placeholder="Besoins du client, budget discuté, historique..."
                    className="border-line-strong bg-secondary text-foreground placeholder:text-subtle focus-visible:border-ring min-h-[80px] w-full resize-y rounded-lg border px-3 py-2 text-xs outline-none"
                  />
                </Field>
              </div>
            </DetailSection>

            {/* 5. TÂCHES LIÉES À CE CLIENT AVEC AJOUT DIRECT */}
            <DetailSection
              title="Tâches & Prospections liées"
              action={
                <Button
                  variant="subtle"
                  size="sm"
                  onClick={() => setFormTacheOuvert(!formTacheOuvert)}
                  className="gap-1 text-xs h-7"
                >
                  <Plus className="size-3" />
                  Ajouter une tâche
                </Button>
              }
            >
              <div className="flex flex-col gap-3">
                {formTacheOuvert && (
                  <form
                    onSubmit={handleCreerTacheClient}
                    className="flex flex-col gap-3 rounded-xl border border-blue-500/30 bg-blue-500/5 p-3.5"
                  >
                    <span className="text-xs font-semibold text-foreground">
                      Nouvelle tâche pour {company.nom}
                    </span>

                    <Field label="Intitulé de la tâche" htmlFor="tch-client-titre">
                      <Input
                        id="tch-client-titre"
                        autoFocus
                        placeholder="Ex : Envoyer le devis finalisé avec les maquettes"
                        value={titreTacheClient}
                        onChange={(e) => setTitreTacheClient(e.target.value)}
                        required
                      />
                    </Field>

                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Assigné à" htmlFor="tch-client-assigne">
                        <select
                          id="tch-client-assigne"
                          value={assigneTacheClient}
                          onChange={(e) => setAssigneTacheClient(e.target.value)}
                          className="border-line-strong bg-secondary text-foreground rounded-lg border px-2.5 py-1.5 text-xs outline-none"
                        >
                          <option value="Othnelio">Othnelio</option>
                          <option value="Medard">Medard</option>
                          <option value="Roméo">Roméo</option>
                        </select>
                      </Field>

                      <Field label="Date d'échéance" htmlFor="tch-client-date">
                        <Input
                          id="tch-client-date"
                          type="date"
                          value={echeanceTacheClient}
                          onChange={(e) => setEcheanceTacheClient(e.target.value)}
                        />
                      </Field>
                    </div>

                    <div className="flex justify-end gap-2 mt-1">
                      <Button
                        type="button"
                        variant="subtle"
                        size="sm"
                        onClick={() => setFormTacheOuvert(false)}
                      >
                        Annuler
                      </Button>
                      <Button type="submit" variant="primary" size="sm">
                        Enregistrer la tâche
                      </Button>
                    </div>
                  </form>
                )}

                {tachesClient.length === 0 ? (
                  <p className="text-xs text-subtle italic py-2">
                    Aucune tâche rattachée à {company.nom} pour le moment.
                  </p>
                ) : (
                  <div className="divide-y divide-border rounded-xl border border-border bg-card overflow-hidden">
                    {tachesClient.map((t) => {
                      const estFaite = t.statut === "terminee";
                      return (
                        <div
                          key={t.id}
                          className="flex items-center justify-between gap-3 p-3 text-xs hover:bg-secondary/30 transition-colors"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <Checkbox
                              checked={estFaite}
                              onCheckedChange={(checked) => {
                                modifierTache(t.id, {
                                  statut: checked ? "terminee" : "a_faire",
                                  termineeLe: checked ? new Date().toISOString() : undefined,
                                });
                              }}
                            />
                            <span
                              className={`truncate font-medium ${
                                estFaite ? "line-through text-muted-foreground" : "text-foreground"
                              }`}
                            >
                              {t.titre}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 shrink-0 text-subtle text-[11px]">
                            <span className="flex items-center gap-1">
                              <Avatar nom={t.assigneA} ton="purple" className="size-3 text-[6px]" />
                              {t.assigneA}
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Clock className="size-3 text-muted-foreground" />
                              {t.echeance.split("-").reverse().join("/")}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </DetailSection>

            {/* 6. CONTRATS ET CONVENTIONS LIÉS À CE CLIENT */}
            <DetailSection
              title="Contrats & Conventions"
              action={
                <Button
                  variant="subtle"
                  size="sm"
                  onClick={() => setModalContratClient(true)}
                  className="gap-1 text-xs h-7"
                >
                  <Plus className="size-3" />
                  Nouveau contrat
                </Button>
              }
            >
              <div className="flex flex-col gap-2">
                {contratsClient.length === 0 ? (
                  <p className="text-xs text-subtle italic py-2">
                    Aucun contrat enregistré pour {company.nom}. Clique sur &quot;Nouveau contrat&quot; pour en créer un.
                  </p>
                ) : (
                  <div className="divide-y divide-border rounded-xl border border-border bg-card overflow-hidden">
                    {contratsClient.map((c) => (
                      <div
                        key={c.id}
                        onClick={() => setContratDetailSelect(c)}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 text-xs hover:bg-secondary/40 transition-colors cursor-pointer group"
                      >
                        <div className="flex flex-col">
                          <span className="font-semibold text-foreground group-hover:text-primary transition-colors">{c.titre}</span>
                          <span className="text-subtle text-[11px]">
                            Début le {c.debutLe.split("-").reverse().join("/")} • Resp : {c.responsable}
                          </span>
                        </div>

                        <div className="flex items-center gap-2.5">
                          <span className="font-bold text-trend tabular-nums">
                            {euros(c.montantFCFA, true)}
                          </span>
                          <Tag tone={c.statut === "actif" || c.statut === "termine" ? "green" : "amber"} size="sm">
                            {c.statut}
                          </Tag>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </DetailSection>

            {company.etape !== "Client" && (
              <DetailSection title="Santé du pipeline">
                <PipelineHealth company={{ ...company, ...brouillon }} />
              </DetailSection>
            )}

            <DetailSection title="Activité">
              <ActivityTrend company={company} />
            </DetailSection>

            <PennylaneSection company={company} />
          </ScrollArea>

          <SheetFooter className="border-t border-border bg-card/60 p-4 flex flex-row items-center justify-between gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={async () => {
                if (confirm(`Supprimer définitivement "${company.nom}" du CRM ?`)) {
                  const ok = await supprimer(company.id);
                  if (ok) closeDetail();
                }
              }}
              className="text-red-400 hover:text-red-300 hover:bg-red-500/10 gap-1.5 text-xs h-8"
            >
              <Trash2 className="size-3.5" />
              Supprimer
            </Button>

            <div className="flex items-center gap-2">
              <SheetClose asChild>
                <Button variant="subtle" size="sm">
                  Annuler
                </Button>
              </SheetClose>
              <Button variant="primary" size="sm" onClick={enregistrer} disabled={!modifie}>
                Enregistrer les modifications
              </Button>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Modale Nouveau Contrat pré-remplie pour ce client */}
      <NouveauContratDialog
        open={modalContratClient}
        onOpenChange={setModalContratClient}
        entrepriseIdParDefaut={company.id}
        nomEntrepriseParDefaut={company.nom}
      />

      {/* Détail d'un contrat cliqué */}
      <ContratDetailDialog
        contrat={contratDetailSelect}
        open={contratDetailSelect !== null}
        onOpenChange={(open) => !open && setContratDetailSelect(null)}
      />
    </>
  );
}

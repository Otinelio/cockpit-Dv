"use client";

import { useState } from "react";
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
import Field from "@/components/_ui/field";
import { Input } from "@/components/_ui/input";
import Select from "@/components/_ui/select";
import Tag from "@/components/_ui/tag";
import { useHub } from "@/stores/hub-store";
import { useCockpit } from "@/stores/cockpit-store";
import type {
  DecisionReunion,
  ResolutionReunion,
  ReunionDV,
  StatutDecision,
} from "@/server/hub-types";
import {
  ArrowRight,
  Calendar,
  CheckCircle2,
  Clock,
  FileCheck,
  MapPin,
  MessageSquare,
  Plus,
  Search,
  Trash2,
  Users,
  Video,
} from "lucide-react";

const STATUTS_DECISION: { value: StatutDecision; label: string }[] = [
  { value: "proposee", label: "Proposée" },
  { value: "validee", label: "Validée" },
  { value: "en_cours", label: "En cours d'exécution" },
  { value: "executee", label: "Exécutée" },
  { value: "abandonnee", label: "Abandonnée" },
];

function statutDecisionBadge(s: StatutDecision) {
  switch (s) {
    case "executee":
      return <Tag tone="green">Exécutée</Tag>;
    case "validee":
      return <Tag tone="purple">Validée</Tag>;
    case "en_cours":
      return <Tag tone="blue">En cours</Tag>;
    case "proposee":
      return <Tag tone="amber">Proposée</Tag>;
    default:
      return <Tag tone="neutral">Abandonnée</Tag>;
  }
}

export default function TabReunions() {
  const reunions = useHub((s) => s.reunions);
  const ajouterReunion = useHub((s) => s.ajouterReunion);
  const modifierReunion = useHub((s) => s.modifierReunion);
  const supprimerReunion = useHub((s) => s.supprimerReunion);
  const transformerResolutionEnTache = useHub((s) => s.transformerResolutionEnTache);
  const utilisateur = useCockpit((s) => s.utilisateurActif);

  const [recherche, setRecherche] = useState("");
  const [modalCreation, setModalCreation] = useState(false);
  const [conversionEnCoursId, setConversionEnCoursId] = useState<string | null>(null);

  // Formulaire nouvelle réunion
  const [form, setForm] = useState({
  const [form, setForm] = useState(() => ({
    titre: "",
    dateHeure: new Date().toISOString().slice(0, 16),
    lieu: "Bureau DigitalVision Lomé",
    participants: ["Othnelio", "Medard", "Roméo"],
    ordreDuJour: "",
    notes: "",
    decisionTitre: "",
    resolutionTitre: "",
    resolutionResponsable: utilisateur || "Othnelio",
    resolutionEcheance: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
  });
  }));
  const [sauvegardeEnCours, setSauvegardeEnCours] = useState(false);

  async function handleCreerReunion(e: React.FormEvent) {
    e.preventDefault();
    if (!form.titre) return;
    setSauvegardeEnCours(true);

    const decisions: DecisionReunion[] = form.decisionTitre.trim()
      ? [
          {
            id: `dec-${Date.now()}`,
            titre: form.decisionTitre.trim(),
            statut: "validee",
          },
        ]
      : [];

    const resolutions: ResolutionReunion[] = form.resolutionTitre.trim()
      ? [
          {
            id: `res-${Date.now()}`,
            titre: form.resolutionTitre.trim(),
            responsable: form.resolutionResponsable,
            echeance: form.resolutionEcheance,
            statut: "a_faire",
          },
        ]
      : [];

    const ok = await ajouterReunion({
      titre: form.titre.trim(),
      dateHeure: form.dateHeure,
      lieu: form.lieu.trim(),
      participants: form.participants,
      ordreDuJour: form.ordreDuJour
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean),
      notes: form.notes.trim(),
      decisions,
      resolutions,
      creePar: utilisateur || "Othnelio",
    });

    setSauvegardeEnCours(false);
    if (ok) {
      setModalCreation(false);
      setForm({
        titre: "",
        dateHeure: new Date().toISOString().slice(0, 16),
        lieu: "Bureau DigitalVision Lomé",
        participants: ["Othnelio", "Medard", "Roméo"],
        ordreDuJour: "",
        notes: "",
        decisionTitre: "",
        resolutionTitre: "",
        resolutionResponsable: utilisateur || "Othnelio",
        resolutionEcheance: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
      });
    }
  }

  async function handleTransformerEnTache(resolution: ResolutionReunion, reunionTitre: string) {
    setConversionEnCoursId(resolution.id);
    await transformerResolutionEnTache(resolution, reunionTitre);
    setConversionEnCoursId(null);
  }

  const reunionsFiltrees = reunions.filter((r) => {
    if (!recherche) return true;
    const q = recherche.toLowerCase();
    const matchTitre = r.titre.toLowerCase().includes(q);
    const matchNotes = r.notes.toLowerCase().includes(q);
    const matchDecisions = r.decisions.some((d) => d.titre.toLowerCase().includes(q));
    const matchResolutions = r.resolutions.some((res) => res.titre.toLowerCase().includes(q));
    return matchTitre || matchNotes || matchDecisions || matchResolutions;
  });

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-border bg-[#181818] p-5">
        <div className="flex items-center gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 text-primary">
            <Calendar className="size-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground">
              Registre des Réunions & Décisions
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Historique des points d’équipe, résolutions et transformation directe en tâches
            </p>
          </div>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => setModalCreation(true)}
          className="gap-2"
        >
          <Plus className="size-4" />
          Consigner une réunion
        </Button>
      </div>

      {/* Barre de recherche */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
        <Input
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
          placeholder="Rechercher une réunion, décision ou mot-clé..."
          className="pl-9 text-sm"
        />
      </div>

      {/* Liste des réunions */}
      {reunionsFiltrees.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center space-y-3">
          <p className="text-sm font-semibold text-foreground">Aucune réunion trouvée</p>
          <p className="text-xs text-muted-foreground">
            {recherche
              ? "Aucune réunion ne correspond à cette recherche."
              : "Consigne votre première réunion d'associés pour enregistrer les résolutions."}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {reunionsFiltrees.map((reu) => (
            <div
              key={reu.id}
              className="rounded-xl border border-border bg-[#141414] p-5 space-y-4 hover:border-border/80 transition-colors"
            >
              {/* En-tête de la réunion */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-border/50 pb-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-primary">
                      {new Date(reu.dateHeure).toLocaleDateString("fr-FR", {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                    <span className="text-xs text-subtle">·</span>
                    <span className="text-xs text-subtle font-mono">
                      {new Date(reu.dateHeure).toLocaleTimeString("fr-FR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <h4 className="text-base font-bold text-foreground">{reu.titre}</h4>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground pt-0.5">
                    <MapPin className="size-3.5 text-subtle" />
                    <span>{reu.lieu}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    {reu.participants.map((p) => (
                      <Avatar key={p} nom={p} className="size-6 text-[10px]" />
                    ))}
                  </div>

                  <Button
                    variant="ghost"
                    size="icon-xs"
                    size="icon-sm"
                    onClick={() => {
                      if (confirm(`Supprimer cette réunion du registre ?`)) {
                        supprimerReunion(reu.id);
                      }
                    }}
                    title="Supprimer la réunion"
                  >
                    <Trash2 className="size-3.5 text-muted-foreground hover:text-red-400" />
                  </Button>
                </div>
              </div>

              {/* Ordre du jour */}
              {reu.ordreDuJour.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">
                    Ordre du jour :
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {reu.ordreDuJour.map((odj, i) => (
                      <Tag key={i} tone="neutral" className="text-xs">
                        {odj}
                      </Tag>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes et compte-rendu */}
              {reu.notes && (
                <div className="rounded-lg bg-card/40 border border-border/50 p-3 space-y-1">
                  <span className="text-[11px] font-semibold text-foreground uppercase tracking-wider block">
                    Compte-rendu & Échanges :
                  </span>
                  <p className="text-xs text-foreground/90 whitespace-pre-line leading-relaxed">
                    {reu.notes}
                  </p>
                </div>
              )}

              {/* Décisions & Résolutions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                {/* Décisions */}
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-foreground flex items-center gap-1.5 uppercase tracking-wider">
                    <FileCheck className="size-3.5 text-trend" />
                    Décisions actées ({reu.decisions.length})
                  </span>

                  {reu.decisions.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">
                      Aucune décision formelle inscrite.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {reu.decisions.map((dec) => (
                        <div
                          key={dec.id}
                          className="p-2.5 rounded-lg border border-border/50 bg-[#161616] flex items-center justify-between gap-2 text-xs"
                        >
                          <span className="font-medium text-foreground">{dec.titre}</span>
                          {statutDecisionBadge(dec.statut)}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Résolutions */}
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-foreground flex items-center gap-1.5 uppercase tracking-wider">
                    <CheckCircle2 className="size-3.5 text-primary" />
                    Résolutions opérationnelles ({reu.resolutions.length})
                  </span>

                  {reu.resolutions.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">
                      Aucune résolution planifiée.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {reu.resolutions.map((res) => {
                        const enConversion = conversionEnCoursId === res.id;
                        const dejaLiee = Boolean(res.tacheIdLiee);

                        return (
                          <div
                            key={res.id}
                            className="p-2.5 rounded-lg border border-border/50 bg-[#161616] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                          >
                            <div className="space-y-0.5">
                              <span className="font-medium text-foreground block">{res.titre}</span>
                              <span className="text-[11px] text-muted-foreground">
                                Resp : {res.responsable} · Pour le{" "}
                                {new Date(res.echeance).toLocaleDateString("fr-FR")}
                              </span>
                            </div>

                            {dejaLiee ? (
                              <Tag tone="green" className="text-[10px]">
                                Tâche assignée
                              </Tag>
                            ) : (
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => handleTransformerEnTache(res, reu.titre)}
                                disabled={enConversion}
                                className="h-6 text-[10px] gap-1 px-2 text-primary hover:text-foreground shrink-0"
                              >
                                <ArrowRight className="size-3" />
                                {enConversion ? "Assignation..." : "Générer tâche"}
                              </Button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL CONSIGNER UNE RÉUNION */}
      <Dialog open={modalCreation} onOpenChange={setModalCreation}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="size-5 text-primary" />
              Consigner une réunion
            </DialogTitle>
            <DialogDescription>
              Enregistre les participants, discussions, décisions et résolutions transformables en
              tâches.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreerReunion} className="space-y-4 py-2">
            <Field label="Titre ou objet de la réunion">
            <Field label="Titre ou objet de la réunion" htmlFor="reu-titre">
              <Input
                id="reu-titre"
                value={form.titre}
                onChange={(e) => setForm({ ...form, titre: e.target.value })}
                placeholder="Ex: Point hebdomadaire, arbitrage architecture MivaFid..."
                required
              />
            </Field>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Date et heure">
              <Field label="Date et heure" htmlFor="reu-date">
                <Input
                  id="reu-date"
                  type="datetime-local"
                  value={form.dateHeure}
                  onChange={(e) => setForm({ ...form, dateHeure: e.target.value })}
                  required
                />
              </Field>

              <Field label="Lieu ou format">
              <Field label="Lieu ou format" htmlFor="reu-lieu">
                <Input
                  id="reu-lieu"
                  value={form.lieu}
                  onChange={(e) => setForm({ ...form, lieu: e.target.value })}
                  placeholder="Bureau, Google Meet, Appel..."
                  required
                />
              </Field>
            </div>

            <Field label="Ordre du jour (un point par ligne)">
            <Field label="Ordre du jour (un point par ligne)" htmlFor="reu-odj">
              <textarea
                id="reu-odj"
                value={form.ordreDuJour}
                onChange={(e) => setForm({ ...form, ordreDuJour: e.target.value })}
                rows={2}
                placeholder="1. Avancement dev&#10;2. Prospection terrain"
                className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </Field>

            <Field label="Compte-rendu et notes d'échanges">
            <Field label="Compte-rendu et notes d'échanges" htmlFor="reu-notes">
              <textarea
                id="reu-notes"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={3}
                placeholder="Synthèse des discussions, accords trouvés..."
                className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </Field>

            <div className="pt-2 border-t border-border space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground">
                Décision & Action immédiate
              </h4>

              <Field label="Décision clé actée (optionnel)">
              <Field label="Décision clé actée (optionnel)" htmlFor="reu-dec">
                <Input
                  id="reu-dec"
                  value={form.decisionTitre}
                  onChange={(e) => setForm({ ...form, decisionTitre: e.target.value })}
                  placeholder="Ex: Validation de la tarification mensuelle de 25 000 FCFA"
                />
              </Field>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Résolution opérationnelle (génère une tâche)">
                <Field label="Résolution opérationnelle (génère une tâche)" htmlFor="reu-res">
                  <Input
                    id="reu-res"
                    value={form.resolutionTitre}
                    onChange={(e) => setForm({ ...form, resolutionTitre: e.target.value })}
                    placeholder="Ex: Mettre à jour la grille tarifaire"
                  />
                </Field>

                <Field label="Responsable">
                <Field label="Responsable" htmlFor="reu-resp">
                  <Input
                    id="reu-resp"
                    value={form.resolutionResponsable}
                    onChange={(e) =>
                      setForm({ ...form, resolutionResponsable: e.target.value })
                    }
                  />
                </Field>
              </div>
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setModalCreation(false)}
                disabled={sauvegardeEnCours}
              >
                Annuler
              </Button>
              <Button type="submit" variant="primary" disabled={sauvegardeEnCours}>
                {sauvegardeEnCours ? "Enregistrement..." : "Consigner la réunion"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

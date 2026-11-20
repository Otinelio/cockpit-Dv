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
import Field from "@/components/_ui/field";
import { Input } from "@/components/_ui/input";
import Tag from "@/components/_ui/tag";
import { useHub } from "@/stores/hub-store";
import { useCockpit } from "@/stores/cockpit-store";
import type {
  ActionStrategique,
  ObjectifMensuel,
  StatutStrategique,
} from "@/server/hub-types";
import {
  ArrowRight,
  CheckCircle2,
  Compass,
  Flag,
  ListTodo,
  Plus,
  Target,
  Sparkles,
} from "lucide-react";

function statutBadge(s: StatutStrategique) {
  switch (s) {
    case "atteint":
      return <Tag tone="green">Atteint</Tag>;
    case "en_cours":
      return <Tag tone="purple">En cours</Tag>;
    case "a_faire":
      return <Tag tone="blue">À faire</Tag>;
    case "non_atteint":
      return <Tag tone="red">Non atteint</Tag>;
    case "abandonne":
      return <Tag tone="neutral">Abandonné</Tag>;
    default:
      return <Tag tone="neutral">À définir</Tag>;
  }
}

export default function TabStrategie() {
  const strategie = useHub((s) => s.strategie);
  const mettreAJourStrategie = useHub((s) => s.mettreAJourStrategie);
  const transformerActionEnTache = useHub((s) => s.transformerActionEnTache);
  const utilisateur = useCockpit((s) => s.utilisateurActif);

  const [modalObjectif, setModalObjectif] = useState(false);
  const [nouvelObj, setNouvelObj] = useState(() => ({
    titre: "",
    indicateur: "",
    cible: 10,
    actuel: 0,
    unite: "",
    responsable: utilisateur || "Othnelio",
    echeance: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
    actionTitre: "",
  }));
  const [sauvegardeEnCours, setSauvegardeEnCours] = useState(false);

  // Conversion en tâche feedback
  const [conversionEnCoursId, setConversionEnCoursId] = useState<string | null>(null);

  if (!strategie) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        Chargement de la stratégie DigitalVision...
      </div>
    );
  }

  async function handleCreerObjectif(e: React.FormEvent) {
    e.preventDefault();
    if (!nouvelObj.titre) return;
    setSauvegardeEnCours(true);

    const nouveau: ObjectifMensuel = {
      id: `obj-${Date.now()}`,
      mois: new Date().toISOString().slice(0, 7),
      titre: nouvelObj.titre.trim(),
      indicateur: nouvelObj.indicateur.trim(),
      cible: Number(nouvelObj.cible) || 1,
      actuel: Number(nouvelObj.actuel) || 0,
      unite: nouvelObj.unite.trim() || undefined,
      responsable: nouvelObj.responsable,
      echeance: nouvelObj.echeance,
      statut: "en_cours",
      progression: Math.min(
        100,
        Math.round(((Number(nouvelObj.actuel) || 0) / (Number(nouvelObj.cible) || 1)) * 100),
      ),
      actions: nouvelObj.actionTitre.trim()
        ? [
            {
              id: `act-${Date.now()}`,
              titre: nouvelObj.actionTitre.trim(),
              responsable: nouvelObj.responsable,
              statut: "a_faire",
              echeance: nouvelObj.echeance,
            },
          ]
        : [],
    };

    if (strategie) {
      await mettreAJourStrategie({
        objectifsMensuels: [nouveau, ...strategie.objectifsMensuels],
      });
    }

    setSauvegardeEnCours(false);
    setModalObjectif(false);
    setNouvelObj({
      titre: "",
      indicateur: "",
      cible: 10,
      actuel: 0,
      unite: "",
      responsable: utilisateur || "Othnelio",
      echeance: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
      actionTitre: "",
    });
  }

  async function handleTransformerEnTache(action: ActionStrategique, objTitre: string) {
    setConversionEnCoursId(action.id);
    await transformerActionEnTache(action, objTitre);
    setConversionEnCoursId(null);
  }

  return (
    <div className="space-y-8">
      {/* 1. VISION À LONG TERME (5 ANS) */}
      <div className="rounded-xl border border-border bg-[#181818] p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-3">
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20">
              <Compass className="size-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">
                1. Vision à Long Terme ({strategie.horizon})
              </h3>
              <p className="text-xs text-muted-foreground">
                Cap quinquennal, ambitions fondamentales et positionnement marché
              </p>
            </div>
          </div>
          <Tag tone="purple">Cap 5 ans</Tag>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          <div className="space-y-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Positionnement & Marchés cibles
            </span>
            <p className="text-sm text-foreground/90 leading-relaxed bg-card/40 p-3 rounded-lg border border-border/50">
              {strategie.positionnement}
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <span className="text-xs text-muted-foreground mr-1 self-center">Marchés :</span>
              {strategie.marchesVises.map((m) => (
                <Tag key={m} tone="blue" className="text-xs">
                  {m}
                </Tag>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Grandes Ambitions Quinquennales
            </span>
            <div className="space-y-2">
              {strategie.ambitions.map((amb, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2.5 p-2.5 rounded-lg bg-card/40 border border-border/50 text-xs text-foreground"
                >
                  <Sparkles className="size-4 shrink-0 text-amber-400 mt-0.5" />
                  <span className="leading-relaxed">{amb}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Piliers */}
        <div className="pt-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-3">
            Piliers Stratégiques
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {strategie.piliersStrategiques.map((pilier) => (
              <div
                key={pilier.id}
                className="rounded-lg border border-border/60 bg-card/30 p-3 space-y-1"
              >
                <h4 className="text-xs font-bold text-foreground">{pilier.titre}</h4>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  {pilier.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 2. RÉSOLUTIONS ANNUELLES */}
      <div className="rounded-xl border border-border bg-[#141414] p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-trend/10 text-trend border border-trend/20">
              <Flag className="size-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">
                2. Résolutions Annuelles (Année en cours)
              </h3>
              <p className="text-xs text-muted-foreground">
                Feuille de route et résultats clés attendus pour l’exercice
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {strategie.resolutionsAnnuelles.map((res) => (
            <div
              key={res.id}
              className="rounded-xl border border-border bg-card/40 p-4 space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-trend font-mono">[{res.annee}]</span>
                  <h4 className="text-sm font-semibold text-foreground">{res.titre}</h4>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-subtle">Pilote : {res.responsable}</span>
                  {statutBadge(res.statut)}
                </div>
              </div>

              {res.description && (
                <p className="text-xs text-muted-foreground">{res.description}</p>
              )}

              <div className="pt-2 border-t border-border/40">
                <span className="text-[11px] font-semibold text-foreground uppercase tracking-wider block mb-2">
                  Résultats attendus :
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {res.resultatsAttendus.map((r, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 text-xs text-foreground/90 bg-background/50 p-2 rounded-md border border-border/40"
                    >
                      <CheckCircle2 className="size-3.5 text-trend shrink-0" />
                      <span className="truncate">{r}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. OBJECTIFS MENSUELS & PLANS D'ACTION */}
      <div className="rounded-xl border border-border bg-[#141414] p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20">
              <Target className="size-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">
                3. Objectifs Mensuels & Plans d’Action Opérationnels
              </h3>
              <p className="text-xs text-muted-foreground">
                Indicateurs concrets avec transformation directe des actions en tâches d’équipe
              </p>
            </div>
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => setModalObjectif(true)}
            className="gap-1.5"
          >
            <Plus className="size-4" />
            Nouvel objectif mensuel
          </Button>
        </div>

        {strategie.objectifsMensuels.length === 0 ? (
          <div className="text-center py-10 border border-dashed border-border rounded-xl">
            <p className="text-xs text-muted-foreground">
              Aucun objectif mensuel défini. Ajoute le premier objectif de l’équipe.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {strategie.objectifsMensuels.map((obj) => (
              <div
                key={obj.id}
                className="rounded-xl border border-border bg-card/30 p-5 space-y-4 hover:border-border/80 transition-colors"
              >
                {/* En-tête de l'objectif */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-semibold text-primary">
                        {obj.mois}
                      </span>
                      <h4 className="text-base font-bold text-foreground">{obj.titre}</h4>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Indicateur clé : <span className="text-foreground">{obj.indicateur}</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 text-xs text-subtle">
                      <span>Responsable :</span>
                      <span className="font-semibold text-foreground">{obj.responsable}</span>
                    </div>
                    {statutBadge(obj.statut)}
                  </div>
                </div>

                {/* Progression & Métriques */}
                <div className="rounded-lg bg-background/50 border border-border/50 p-3 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">
                      Progression : {obj.actuel} / {obj.cible} {obj.unite ?? ""}
                    </span>
                    <span className="font-bold text-foreground font-mono">
                      {obj.progression} %
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-border overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-500 rounded-full"
                      style={{ width: `${Math.min(100, Math.max(0, obj.progression))}%` }}
                    />
                  </div>
                </div>

                {/* Plans d'actions détaillés */}
                <div className="space-y-2 pt-1">
                  <span className="text-xs font-semibold text-foreground flex items-center gap-1.5 uppercase tracking-wider">
                    <ListTodo className="size-3.5 text-primary" />
                    Actions stratégiques associées ({obj.actions.length}) :
                  </span>

                  {obj.actions.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">
                      Aucune action planifiée pour cet objectif.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {obj.actions.map((act) => {
                        const enConversion = conversionEnCoursId === act.id;
                        const dejaLiee = Boolean(act.tacheIdLiee);

                        return (
                          <div
                            key={act.id}
                            className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-lg border border-border/50 bg-[#161616] text-xs"
                          >
                            <div className="flex items-center gap-2">
                              <span
                                className={`size-2 rounded-full shrink-0 ${
                                  act.statut === "atteint"
                                    ? "bg-trend"
                                    : act.statut === "en_cours"
                                    ? "bg-primary"
                                    : "bg-muted-foreground"
                                }`}
                              />
                              <span className="font-medium text-foreground">{act.titre}</span>
                            </div>

                            <div className="flex items-center gap-3">
                              <span className="text-[11px] text-subtle">
                                Resp : {act.responsable}
                              </span>

                              {dejaLiee ? (
                                <Tag tone="green" className="text-[10px]">
                                  Tâche créée
                                </Tag>
                              ) : (
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => handleTransformerEnTache(act, obj.titre)}
                                  disabled={enConversion}
                                  className="h-6 text-[10px] gap-1 px-2 text-primary hover:text-foreground"
                                >
                                  <ArrowRight className="size-3" />
                                  {enConversion ? "Création..." : "Transformer en tâche"}
                                </Button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL CRÉATION OBJECTIF */}
      <Dialog open={modalObjectif} onOpenChange={setModalObjectif}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Target className="size-5 text-primary" />
              Ajouter un objectif mensuel
            </DialogTitle>
            <DialogDescription>
              Définit un résultat mesurable et une première action concrète à assigner.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreerObjectif} className="space-y-4 py-2">
            <Field label="Intitulé de l'objectif" htmlFor="obj-titre">
              <Input
                id="obj-titre"
                value={nouvelObj.titre}
                onChange={(e) => setNouvelObj({ ...nouvelObj, titre: e.target.value })}
                placeholder="Ex: Signer 5 nouveaux clients sur MivaFid"
                required
              />
            </Field>

            <Field label="Indicateur de mesure (KPI)" htmlFor="obj-kpi">
              <Input
                id="obj-kpi"
                value={nouvelObj.indicateur}
                onChange={(e) => setNouvelObj({ ...nouvelObj, indicateur: e.target.value })}
                placeholder="Ex: Nombre de contrats signés et validés"
                required
              />
            </Field>

            <div className="grid grid-cols-3 gap-2">
              <Field label="Cible" htmlFor="obj-cible">
                <Input
                  id="obj-cible"
                  type="number"
                  value={nouvelObj.cible}
                  onChange={(e) => setNouvelObj({ ...nouvelObj, cible: Number(e.target.value) })}
                  required
                />
              </Field>

              <Field label="Actuel" htmlFor="obj-actuel">
                <Input
                  id="obj-actuel"
                  type="number"
                  value={nouvelObj.actuel}
                  onChange={(e) => setNouvelObj({ ...nouvelObj, actuel: Number(e.target.value) })}
                />
              </Field>

              <Field label="Unité" htmlFor="obj-unite">
                <Input
                  id="obj-unite"
                  value={nouvelObj.unite}
                  onChange={(e) => setNouvelObj({ ...nouvelObj, unite: e.target.value })}
                  placeholder="clients, FCFA..."
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Responsable" htmlFor="obj-resp">
                <Input
                  id="obj-resp"
                  value={nouvelObj.responsable}
                  onChange={(e) =>
                    setNouvelObj({ ...nouvelObj, responsable: e.target.value })
                  }
                  required
                />
              </Field>

              <Field label="Échéance" htmlFor="obj-date">
                <Input
                  id="obj-date"
                  type="date"
                  value={nouvelObj.echeance}
                  onChange={(e) => setNouvelObj({ ...nouvelObj, echeance: e.target.value })}
                  required
                />
              </Field>
            </div>

            <Field
              label="Première action stratégique (optionnel)"
              htmlFor="obj-action"
              hint="Sera immédiatement transformable en tâche pour l'équipe."
            >
              <Input
                id="obj-action"
                value={nouvelObj.actionTitre}
                onChange={(e) =>
                  setNouvelObj({ ...nouvelObj, actionTitre: e.target.value })
                }
                placeholder="Ex: Contacter la liste des 15 restaurants présélectionnés"
              />
            </Field>

            <DialogFooter className="gap-2 pt-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setModalObjectif(false)}
                disabled={sauvegardeEnCours}
              >
                Annuler
              </Button>
              <Button type="submit" variant="primary" disabled={sauvegardeEnCours}>
                {sauvegardeEnCours ? "Création..." : "Créer l'objectif"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

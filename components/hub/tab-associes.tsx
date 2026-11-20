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
import Tag from "@/components/_ui/tag";
import { useHub } from "@/stores/hub-store";
import { useCockpit } from "@/stores/cockpit-store";
import type { AssocieDV } from "@/server/hub-types";
import {
  CheckCircle,
  Edit,
  Mail,
  Phone,
  Target,
  UserCheck,
} from "lucide-react";

export default function TabAssocies() {
  const associes = useHub((s) => s.associes);
  const modifierAssocie = useHub((s) => s.modifierAssocie);
  const taches = useCockpit((s) => s.taches);
  const contrats = useCockpit((s) => s.contrats);
  const saas = useCockpit((s) => s.saas);

  const [modalEdition, setModalEdition] = useState(false);
  const [associeEnEdition, setAssocieEnEdition] = useState<AssocieDV | null>(null);
  const [form, setForm] = useState({
    fonction: "",
    telephone: "",
    email: "",
    roleDetaille: "",
    responsabilites: "",
    competences: "",
    objectifsIndividuels: "",
  });
  const [sauvegardeEnCours, setSauvegardeEnCours] = useState(false);

  function ouvrirEdition(associe: AssocieDV) {
    setAssocieEnEdition(associe);
    setForm({
      fonction: associe.fonction,
      telephone: associe.telephone,
      email: associe.email,
      roleDetaille: associe.roleDetaille,
      responsabilites: associe.responsabilites.join("\n"),
      competences: associe.competences.join(", "),
      objectifsIndividuels: associe.objectifsIndividuels.join("\n"),
    });
    setModalEdition(true);
  }

  async function handleEnregistrer(e: React.FormEvent) {
    e.preventDefault();
    if (!associeEnEdition) return;
    setSauvegardeEnCours(true);

    const ok = await modifierAssocie(associeEnEdition.id, {
      fonction: form.fonction.trim(),
      telephone: form.telephone.trim(),
      email: form.email.trim(),
      roleDetaille: form.roleDetaille.trim(),
      responsabilites: form.responsabilites
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean),
      competences: form.competences
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      objectifsIndividuels: form.objectifsIndividuels
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean),
    });

    setSauvegardeEnCours(false);
    if (ok) setModalEdition(false);
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="rounded-xl border border-border bg-[#181818] p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 text-primary">
              <UserCheck className="size-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">
                Gouvernance & Équipe Associée
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Les trois associés fondateurs de DigitalVision Lomé et la répartition des pouvoirs
              </p>
            </div>
          </div>
          <Tag tone="purple">Collège des 3 associés</Tag>
        </div>
      </div>

      {/* Cartes des 3 associés */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {associes.map((associe) => {
          const tachesEnCours = taches.filter(
            (t) =>
              t.assigneA.toLowerCase() === associe.nom.toLowerCase() &&
              t.statut !== "terminee",
          );

          const contratsAssocies = contrats.filter(
            (c) =>
              c.responsable.toLowerCase() === associe.nom.toLowerCase() &&
              c.statut === "actif",
          );

          const saasAssocies = saas.filter(
            (s) =>
              s.leadTech?.toLowerCase() === associe.nom.toLowerCase() ||
              s.leadMarketing?.toLowerCase() === associe.nom.toLowerCase() ||
              s.leadOps?.toLowerCase() === associe.nom.toLowerCase(),
          );

          return (
            <div
              key={associe.id}
              className="rounded-xl border border-border bg-[#141414] p-5 flex flex-col justify-between space-y-5 hover:border-primary/40 transition-colors"
            >
              <div className="space-y-4">
                {/* Profil principal */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Avatar
                      nom={associe.nom}
                      className="size-12 text-sm font-bold shadow-md"
                    />
                    <div>
                      <h4 className="text-base font-bold text-foreground">{associe.nom}</h4>
                      <p className="text-xs font-medium text-primary mt-0.5">
                        {associe.fonction}
                      </p>
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => ouvrirEdition(associe)}
                    title="Modifier la fiche"
                  >
                    <Edit className="size-3.5 text-muted-foreground hover:text-foreground" />
                  </Button>
                </div>

                {/* Coordonnées */}
                <div className="rounded-lg bg-card/40 border border-border/50 p-3 space-y-1.5 text-xs">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="size-3.5 text-subtle shrink-0" />
                    <a href={`mailto:${associe.email}`} className="text-foreground hover:underline">
                      {associe.email}
                    </a>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="size-3.5 text-subtle shrink-0" />
                    <a
                      href={`tel:${associe.telephone}`}
                      className="text-foreground hover:underline font-mono"
                    >
                      {associe.telephone}
                    </a>
                  </div>
                </div>

                {/* Rôle & Responsabilités */}
                <div className="space-y-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">
                    Périmètre & Responsabilités
                  </span>
                  <p className="text-xs text-foreground/90 leading-relaxed bg-background/50 p-2.5 rounded-md border border-border/40">
                    {associe.roleDetaille}
                  </p>

                  <ul className="space-y-1.5 pt-1">
                    {associe.responsabilites.map((resp, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                        <CheckCircle className="size-3.5 text-primary shrink-0 mt-0.5" />
                        <span className="leading-tight">{resp}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Compétences clés */}
                <div className="space-y-1.5 pt-1">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">
                    Expertises & Compétences
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {associe.competences.map((comp) => (
                      <Tag key={comp} tone="neutral" className="text-[11px]">
                        {comp}
                      </Tag>
                    ))}
                  </div>
                </div>

                {/* Objectifs individuels */}
                {associe.objectifsIndividuels.length > 0 && (
                  <div className="space-y-1.5 pt-1 border-t border-border/40">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">
                      Objectifs personnels Q4
                    </span>
                    <ul className="space-y-1">
                      {associe.objectifsIndividuels.map((obj, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-1.5 text-xs text-muted-foreground"
                        >
                          <Target className="size-3.5 text-trend shrink-0 mt-0.5" />
                          <span className="leading-tight">{obj}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Engagements en cours en direct (calculés) */}
              <div className="rounded-lg bg-[#181818] border border-border p-3 space-y-2 text-xs">
                <span className="text-[11px] font-semibold text-foreground uppercase tracking-wider block">
                  Engagements en direct
                </span>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded bg-card/60 p-1.5">
                    <span className="text-sm font-bold text-primary font-mono block">
                      {tachesEnCours.length}
                    </span>
                    <span className="text-[10px] text-muted-foreground">Tâches en cours</span>
                  </div>

                  <div className="rounded bg-card/60 p-1.5">
                    <span className="text-sm font-bold text-trend font-mono block">
                      {contratsAssocies.length}
                    </span>
                    <span className="text-[10px] text-muted-foreground">Contrats actifs</span>
                  </div>

                  <div className="rounded bg-card/60 p-1.5">
                    <span className="text-sm font-bold text-amber-400 font-mono block">
                      {saasAssocies.length}
                    </span>
                    <span className="text-[10px] text-muted-foreground">Produits SaaS</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL ÉDITION FICHE ASSOCIÉ */}
      <Dialog open={modalEdition} onOpenChange={setModalEdition}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCheck className="size-5 text-primary" />
              Modifier la fiche : {associeEnEdition?.nom}
            </DialogTitle>
            <DialogDescription>
              Mise à jour des coordonnées officielles, compétences et objectifs personnels.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleEnregistrer} className="space-y-4 py-2">
            <Field label="Fonction officielle" htmlFor="associe-fonction">
              <Input
                id="associe-fonction"
                value={form.fonction}
                onChange={(e) => setForm({ ...form, fonction: e.target.value })}
                required
              />
            </Field>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Email professionnel" htmlFor="associe-email">
                <Input
                  id="associe-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                />
              </Field>

              <Field label="Téléphone" htmlFor="associe-tel">
                <Input
                  id="associe-tel"
                  value={form.telephone}
                  onChange={(e) => setForm({ ...form, telephone: e.target.value })}
                  required
                />
              </Field>
            </div>

            <Field label="Rôle détaillé" htmlFor="associe-role">
              <textarea
                id="associe-role"
                value={form.roleDetaille}
                onChange={(e) => setForm({ ...form, roleDetaille: e.target.value })}
                rows={2}
                className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </Field>

            <Field
              label="Responsabilités clés (une par ligne)"
              htmlFor="associe-resp"
              hint="Ex: Direction technique des SaaS..."
            >
              <textarea
                id="associe-resp"
                value={form.responsabilites}
                onChange={(e) => setForm({ ...form, responsabilites: e.target.value })}
                rows={3}
                className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </Field>

            <Field label="Compétences (séparées par des virgules)" htmlFor="associe-comp">
              <Input
                id="associe-comp"
                value={form.competences}
                onChange={(e) => setForm({ ...form, competences: e.target.value })}
                placeholder="TypeScript, Next.js, Négociation..."
              />
            </Field>

            <Field label="Objectifs individuels (un par ligne)" htmlFor="associe-obj">
              <textarea
                id="associe-obj"
                value={form.objectifsIndividuels}
                onChange={(e) => setForm({ ...form, objectifsIndividuels: e.target.value })}
                rows={2}
                className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </Field>

            <DialogFooter className="gap-2 pt-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setModalEdition(false)}
                disabled={sauvegardeEnCours}
              >
                Annuler
              </Button>
              <Button type="submit" variant="primary" disabled={sauvegardeEnCours}>
                {sauvegardeEnCours ? "Enregistrement..." : "Enregistrer la fiche"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

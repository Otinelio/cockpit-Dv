"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Avatar from "@/components/_ui/avatar";
import Button from "@/components/_ui/button";
import { Input } from "@/components/_ui/input";
import Field from "@/components/_ui/field";
import Tag from "@/components/_ui/tag";
import { ScrollArea } from "@/components/_ui/scroll-area";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/_ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/_ui/dialog";
import DetailSection from "../detail/detail-section";
import { TOUS, membre } from "@/lib/cockpit";
import { euros } from "@/lib/format";
import { api } from "@/lib/api";
import { useCockpit } from "@/stores/cockpit-store";
import { useHub } from "@/stores/hub-store";
import type { AssocieDV } from "@/server/hub-types";
import UsersIcon from "@/public/assets/images/companies/sidebar/users.svg";
import XIcon from "@/public/assets/images/companies/detail/x.svg";
import MailIcon from "@/public/assets/images/companies/detail/mail-04.svg";
import PhoneIcon from "@/public/assets/images/companies/detail/phone.svg";
import {
  LogOut,
  KeyRound,
  ShieldCheck,
  Award,
  PieChart,
  CheckCircle2,
  Target,
  Edit3,
  UserCheck,
} from "lucide-react";

export default function Profile() {
  const router = useRouter();
  const profileName = useCockpit((state) => state.profileName);
  const profileOpen = useCockpit((state) => state.profileOpen);
  const crm = useCockpit((state) => state.crm);
  const closeProfile = useCockpit((state) => state.closeProfile);
  const setFiltres = useCockpit((state) => state.setFiltres);
  const setVue = useCockpit((state) => state.setVue);
  const utilisateurActif = useCockpit((state) => state.utilisateurActif);
  const deconnecter = useCockpit((state) => state.deconnecter);
  const toast = useCockpit((state) => state.toast);

  // Données Associés (Hub)
  const associes = useHub((s) => s.associes);
  const chargerAssocies = useHub((s) => s.chargerAssocies);
  const modifierAssocie = useHub((s) => s.modifierAssocie);

  // Charger les associés à l'ouverture du profil
  useEffect(() => {
    if (profileOpen) {
      chargerAssocies();
    }
  }, [profileOpen, chargerAssocies]);

  // Mot de passe
  const [ancienMdp, setAncienMdp] = useState("");
  const [nouveauMdp, setNouveauMdp] = useState("");
  const [confirmMdp, setConfirmMdp] = useState("");
  const [chargementMdp, setChargementMdp] = useState(false);
  const [erreurMdp, setErreurMdp] = useState<string | null>(null);

  // Édition de la fiche associé & pouvoirs
  const [modalEditionAssocie, setModalEditionAssocie] = useState(false);
  const [sauvegardeAssocieEnCours, setSauvegardeAssocieEnCours] = useState(false);
  const [formAssocie, setFormAssocie] = useState({
    fonction: "",
    telephone: "",
    email: "",
    pourcentageCapital: 33.33,
    roleDetaille: "",
    responsabilites: "",
    competences: "",
    objectifsIndividuels: "",
  });

  const person = profileName && crm ? membre(crm.equipe, profileName) : null;
  const isMe = person?.nom === utilisateurActif || person?.nom === crm?.moi;

  // Trouver l'associé correspondant
  const associeActuel: AssocieDV | undefined = associes.find(
    (a) => a.nom.toLowerCase() === (person?.nom || "").toLowerCase()
  );

  const accounts = person
    ? (crm?.entreprises ?? [])
        .filter((e) => isMe || e.responsable === person.nom)
        .sort((a, b) => b.pipeline - a.pipeline)
    : [];

  const enCours = accounts.filter((e) => e.etape !== "Perdu");
  const affaires = enCours.reduce((s, e) => s + e.affaires, 0);
  const pipeline = enCours.reduce((s, e) => s + e.pipeline, 0);
  const moyenne = enCours.length
    ? Math.round(enCours.reduce((s, e) => s + e.chances, 0) / enCours.length)
    : 0;

  const stats = [
    { label: "Entreprises", value: String(accounts.length) },
    { label: "Affaires en cours", value: String(affaires) },
    { label: "Pipeline", value: euros(pipeline) },
    { label: "Chances moyennes", value: `${moyenne} %` },
  ];

  function ouvrirEditionAssocie() {
    if (!associeActuel) return;
    setFormAssocie({
      fonction: associeActuel.fonction || person?.role || "",
      telephone: associeActuel.telephone || person?.telephone || "",
      email: associeActuel.email || person?.email || "",
      pourcentageCapital: associeActuel.pourcentageCapital || 33.33,
      roleDetaille: associeActuel.roleDetaille || "",
      responsabilites: (associeActuel.responsabilites || []).join("\n"),
      competences: (associeActuel.competences || []).join(", "),
      objectifsIndividuels: (associeActuel.objectifsIndividuels || []).join("\n"),
    });
    setModalEditionAssocie(true);
  }

  async function handleEnregistrerAssocie(e: React.FormEvent) {
    e.preventDefault();
    if (!associeActuel) return;
    setSauvegardeAssocieEnCours(true);

    const ok = await modifierAssocie(associeActuel.id, {
      fonction: formAssocie.fonction.trim(),
      telephone: formAssocie.telephone.trim(),
      email: formAssocie.email.trim(),
      pourcentageCapital: Number(formAssocie.pourcentageCapital) || 33.33,
      roleDetaille: formAssocie.roleDetaille.trim(),
      responsabilites: formAssocie.responsabilites
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean),
      competences: formAssocie.competences
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      objectifsIndividuels: formAssocie.objectifsIndividuels
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean),
    });

    setSauvegardeAssocieEnCours(false);
    if (ok) {
      setModalEditionAssocie(false);
      toast({
        ton: "succes",
        titre: "Fiche d'associé mise à jour",
        texte: `Tes pouvoirs et informations d'associé ont été enregistrés avec succès.`,
      });
    }
  }

  async function handleChangerMdp(e: React.FormEvent) {
    e.preventDefault();
    if (!person) return;
    if (nouveauMdp !== confirmMdp) {
      setErreurMdp("Le nouveau mot de passe et sa confirmation ne correspondent pas.");
      return;
    }
    if (nouveauMdp.length < 4) {
      setErreurMdp("Le mot de passe doit comporter au moins 4 caractères.");
      return;
    }
    setChargementMdp(true);
    setErreurMdp(null);
    try {
      await api.changerMotDePasse(person.nom, ancienMdp, nouveauMdp);
      toast({
        ton: "succes",
        titre: "Mot de passe mis à jour",
        texte: `Ton nouveau mot de passe a bien été enregistré pour ${person.nom}.`,
      });
      setAncienMdp("");
      setNouveauMdp("");
      setConfirmMdp("");
    } catch (err) {
      setErreurMdp((err as Error).message);
    } finally {
      setChargementMdp(false);
    }
  }

  function handleDeconnexion() {
    closeProfile();
    deconnecter();
  }

  function showAccounts() {
    setVue("toutes");
    setFiltres({ responsable: isMe || !person ? TOUS : person.nom });
    closeProfile();
    router.push("/entreprises");
  }

  return (
    <>
      <Sheet
        open={profileOpen && person !== null}
        onOpenChange={(open) => !open && closeProfile()}
      >
        <SheetContent side="right" className="sm:w-[520px] sm:max-w-[520px]">
          <SheetHeader>
            <div className="flex items-center gap-2">
              <UsersIcon aria-hidden className="text-icon size-3.5" />
              <SheetTitle>{isMe ? "Mon Profil & Pouvoirs d'Associé" : `Profil de ${person?.nom}`}</SheetTitle>
            </div>
            <SheetDescription className="sr-only">
              Coordonnées, pouvoirs d&apos;associé, répartition du capital et pipeline
            </SheetDescription>
            <SheetClose asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                className="-mr-1"
                aria-label="Fermer le profil"
              >
                <XIcon aria-hidden className="text-foreground size-4" />
              </Button>
            </SheetClose>
          </SheetHeader>

          {person && (
            <ScrollArea className="min-h-0 flex-1">
              {/* En-tête du profil avec photo, nom et rôle */}
              <div className="flex items-center justify-between gap-3 p-5 shadow-[inset_0_-1px_0_var(--line-strong)]">
                <div className="flex items-center gap-3">
                  <Avatar
                    nom={person.nom}
                    ton={person.ton}
                    className="size-[54px] text-[18px] shadow-[0px_6.25px_6.25px_0px_rgba(15,15,15,0.24),0px_0px_0px_1.563px_#232323]"
                  />
                  <div className="flex min-w-0 flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-semibold truncate text-foreground">{person.nom}</h2>
                      <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 border border-primary/20 px-2 py-0.5 text-[10px] font-semibold text-primary">
                        <ShieldCheck className="size-3" />
                        Associé
                      </span>
                    </div>
                    <span className="caption-style text-soft block truncate text-xs">
                      {associeActuel?.fonction || person.role}
                    </span>
                  </div>
                </div>

                {associeActuel && (
                  <Button
                    variant="secondary"
                    size="sm"
                    className="gap-1.5 shrink-0 text-xs"
                    onClick={ouvrirEditionAssocie}
                    title="Modifier mes informations et pouvoirs d'associé"
                  >
                    <Edit3 className="size-3.5 text-primary" />
                    Modifier mes infos
                  </Button>
                )}
              </div>

              {/* Répartition du Capital & Droits de Vote */}
              <DetailSection title="Répartition du Capital & Droits Statutaires">
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="rounded-xl border border-border bg-[#181818] p-3 flex flex-col gap-1.5">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <PieChart className="size-3.5 text-emerald-400" />
                      <span>Parts du Capital</span>
                    </div>
                    <div className="text-base font-semibold text-foreground tabular-nums">
                      {associeActuel?.pourcentageCapital || 33.33} %
                    </div>
                    <span className="text-[10px] text-muted-foreground">
                      {associeActuel?.partsSociales || 333} parts sociales (1/3 égalitaire)
                    </span>
                  </div>

                  <div className="rounded-xl border border-border bg-[#181818] p-3 flex flex-col gap-1.5">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Award className="size-3.5 text-primary" />
                      <span>Droits de Vote</span>
                    </div>
                    <div className="text-base font-semibold text-foreground">
                      1 voix
                    </div>
                    <span className="text-[10px] text-muted-foreground">
                      Pouvoir de décision statutaire égal
                    </span>
                  </div>
                </div>
              </DetailSection>

              {/* Rôle Statutaire & Pouvoirs d'associé */}
              {associeActuel?.roleDetaille && (
                <DetailSection title="Rôle Statutaire & Pouvoirs Exécutifs">
                  <p className="text-xs text-muted-foreground leading-relaxed bg-[#181818] rounded-xl border border-border p-3">
                    {associeActuel.roleDetaille}
                  </p>
                </DetailSection>
              )}

              {/* Responsabilités & Domaines de décision */}
              {associeActuel?.responsabilites && associeActuel.responsabilites.length > 0 && (
                <DetailSection title="Domaines de Pouvoir & Responsabilités Déléguées">
                  <ul className="flex flex-col gap-1.5">
                    {associeActuel.responsabilites.map((resp, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 rounded-lg border border-border/80 bg-secondary/40 p-2.5 text-xs text-foreground"
                      >
                        <CheckCircle2 className="size-3.5 shrink-0 text-emerald-400 mt-0.5" />
                        <span className="leading-snug">{resp}</span>
                      </li>
                    ))}
                  </ul>
                </DetailSection>
              )}

              {/* Compétences clés */}
              {associeActuel?.competences && associeActuel.competences.length > 0 && (
                <DetailSection title="Expertises & Compétences Clés">
                  <div className="flex flex-wrap gap-1.5">
                    {associeActuel.competences.map((c, i) => (
                      <Tag key={i} tone="blue" className="text-[11px] py-1 px-2.5">
                        {c}
                      </Tag>
                    ))}
                  </div>
                </DetailSection>
              )}

              {/* Objectifs individuels */}
              {associeActuel?.objectifsIndividuels && associeActuel.objectifsIndividuels.length > 0 && (
                <DetailSection title="Objectifs Individuels">
                  <ul className="flex flex-col gap-1.5">
                    {associeActuel.objectifsIndividuels.map((obj, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 rounded-lg border border-border bg-[#181818] p-2.5 text-xs text-muted-foreground"
                      >
                        <Target className="size-3.5 shrink-0 text-primary mt-0.5" />
                        <span className="leading-snug text-foreground">{obj}</span>
                      </li>
                    ))}
                  </ul>
                </DetailSection>
              )}

              {/* Contact direct */}
              {(person.email || person.telephone || associeActuel?.telephone || associeActuel?.email) && (
                <DetailSection title="Coordonnées Directes">
                  <div className="lead-style flex flex-wrap items-center gap-x-4 gap-y-3">
                    {(associeActuel?.email || person.email) && (
                      <a
                        href={`mailto:${associeActuel?.email || person.email}`}
                        className="hover:text-soft ease-power3-in-out flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors duration-150"
                      >
                        <MailIcon aria-hidden className="text-primary size-3.5" />
                        {associeActuel?.email || person.email}
                      </a>
                    )}
                    {(associeActuel?.telephone || person.telephone) && (
                      <a
                        href={`tel:${(associeActuel?.telephone || person.telephone || "").replace(/[^\d+]/g, "")}`}
                        className="hover:text-soft ease-power3-in-out flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground tabular-nums transition-colors duration-150"
                      >
                        <PhoneIcon aria-hidden className="text-emerald-400 size-3.5" />
                        {associeActuel?.telephone || person.telephone}
                      </a>
                    )}
                  </div>
                </DetailSection>
              )}

              {/* Pipeline CRM */}
              <DetailSection title={isMe ? "Pipeline de l'équipe" : "Pipeline suivi"}>
                <div className="grid grid-cols-2 gap-2">
                  {stats.map((stat) => (
                    <div
                      key={stat.label}
                      className="border-line-strong flex flex-col gap-2 rounded-lg border p-[11px]"
                    >
                      <span className="caption-style text-soft block text-[11px]">
                        {stat.label}
                      </span>
                      <span className="lead-style block tabular-nums font-semibold">
                        {stat.value}
                      </span>
                    </div>
                  ))}
                </div>
              </DetailSection>

              {/* Sécurité et mot de passe */}
              {isMe && (
                <DetailSection title="Sécurité & Mot de passe" className="border-t border-border pt-4">
                  <form onSubmit={handleChangerMdp} className="flex flex-col gap-3">
                    <Field label="Mot de passe actuel" htmlFor="profile-ancien-mdp">
                      <Input
                        id="profile-ancien-mdp"
                        type="password"
                        placeholder="••••••••••••"
                        value={ancienMdp}
                        onChange={(e) => setAncienMdp(e.target.value)}
                        required
                      />
                    </Field>

                    <Field label="Nouveau mot de passe" htmlFor="profile-nouveau-mdp">
                      <Input
                        id="profile-nouveau-mdp"
                        type="password"
                        placeholder="Au moins 4 caractères"
                        value={nouveauMdp}
                        onChange={(e) => setNouveauMdp(e.target.value)}
                        required
                      />
                    </Field>

                    <Field label="Confirmer le nouveau mot de passe" htmlFor="profile-confirm-mdp">
                      <Input
                        id="profile-confirm-mdp"
                        type="password"
                        placeholder="Confirme ton mot de passe"
                        value={confirmMdp}
                        onChange={(e) => setConfirmMdp(e.target.value)}
                        required
                      />
                    </Field>

                    {erreurMdp && (
                      <div className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">
                        {erreurMdp}
                      </div>
                    )}

                    <div className="flex items-center justify-between gap-2 pt-1">
                      <Button
                        variant="secondary"
                        size="sm"
                        type="submit"
                        disabled={chargementMdp || !ancienMdp || !nouveauMdp || !confirmMdp}
                        className="gap-1.5"
                      >
                        <KeyRound className="size-3.5" />
                        {chargementMdp ? "Enregistrement..." : "Mettre à jour mon mot de passe"}
                      </Button>
                    </div>
                  </form>

                  <div className="mt-4 border-t border-border pt-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      type="button"
                      onClick={handleDeconnexion}
                      className="text-danger hover:bg-danger/10 hover:text-danger w-full justify-center gap-1.5"
                    >
                      <LogOut className="size-3.5" />
                      Se déconnecter de Cockpit DV
                    </Button>
                  </div>
                </DetailSection>
              )}
            </ScrollArea>
          )}

          <SheetFooter>
            <SheetClose asChild>
              <Button variant="subtle" size="sm">
                Fermer
              </Button>
            </SheetClose>
            <Button
              variant="primary"
              size="sm"
              onClick={showAccounts}
              disabled={accounts.length === 0}
            >
              {isMe ? "Voir toutes les entreprises" : "Filtrer le CRM sur ses entreprises"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Modale d'édition directe des pouvoirs et informations d'associé */}
      <Dialog open={modalEditionAssocie} onOpenChange={setModalEditionAssocie}>
        <DialogContent className="max-w-[560px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-lg bg-primary/20 text-primary">
                <UserCheck className="size-4" />
              </span>
              <DialogTitle>Gérer mes Pouvoirs & Informations d&apos;Associé</DialogTitle>
            </div>
            <DialogDescription>
              Mets à jour ton titre officiel, tes pouvoirs exécutifs, tes responsabilités et tes objectifs. Les modifications sont enregistrées directement dans Neon.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleEnregistrerAssocie} className="flex flex-col gap-4 p-5">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Fonction officielle" htmlFor="edit-associe-fonction" required>
                <Input
                  id="edit-associe-fonction"
                  value={formAssocie.fonction}
                  onChange={(e) => setFormAssocie({ ...formAssocie, fonction: e.target.value })}
                  placeholder="ex: CTO · Tech & Stratégie"
                  required
                />
              </Field>

              <Field label="Répartition du Capital (%)" htmlFor="edit-associe-parts" required>
                <Input
                  id="edit-associe-parts"
                  type="number"
                  step="0.01"
                  value={formAssocie.pourcentageCapital}
                  onChange={(e) => setFormAssocie({ ...formAssocie, pourcentageCapital: Number(e.target.value) })}
                  placeholder="33.33"
                  required
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Téléphone professionnel" htmlFor="edit-associe-tel" required>
                <Input
                  id="edit-associe-tel"
                  value={formAssocie.telephone}
                  onChange={(e) => setFormAssocie({ ...formAssocie, telephone: e.target.value })}
                  placeholder="+228 90 00 00 00"
                  required
                />
              </Field>

              <Field label="E-mail professionnel" htmlFor="edit-associe-email" required>
                <Input
                  id="edit-associe-email"
                  type="email"
                  value={formAssocie.email}
                  onChange={(e) => setFormAssocie({ ...formAssocie, email: e.target.value })}
                  placeholder="contact@digitalvision.tg"
                  required
                />
              </Field>
            </div>

            <Field
              label="Rôle Statutaire & Pouvoirs Exécutifs"
              htmlFor="edit-associe-role"
              hint="Décris tes prérogatives et pouvoirs de décision au sein de l'entreprise"
            >
              <textarea
                id="edit-associe-role"
                rows={3}
                value={formAssocie.roleDetaille}
                onChange={(e) => setFormAssocie({ ...formAssocie, roleDetaille: e.target.value })}
                className="w-full rounded-lg border border-border bg-card p-2.5 text-xs text-foreground focus:border-primary focus:outline-none"
                placeholder="Description des pouvoirs et mandats..."
              />
            </Field>

            <Field
              label="Domaines de Responsabilités & Décisions (1 par ligne)"
              htmlFor="edit-associe-resp"
              hint="Chaque ligne formera une prérogative claire"
            >
              <textarea
                id="edit-associe-resp"
                rows={4}
                value={formAssocie.responsabilites}
                onChange={(e) => setFormAssocie({ ...formAssocie, responsabilites: e.target.value })}
                className="w-full rounded-lg border border-border bg-card p-2.5 text-xs text-foreground font-mono focus:border-primary focus:outline-none"
                placeholder="Architecture & stack cloud&#10;Validation technique des devis&#10;..."
              />
            </Field>

            <Field
              label="Compétences Clés (séparées par des virgules)"
              htmlFor="edit-associe-comp"
            >
              <Input
                id="edit-associe-comp"
                value={formAssocie.competences}
                onChange={(e) => setFormAssocie({ ...formAssocie, competences: e.target.value })}
                placeholder="TypeScript, Next.js, Gestion de projet, ..."
              />
            </Field>

            <Field
              label="Objectifs Individuels (1 par ligne)"
              htmlFor="edit-associe-obj"
            >
              <textarea
                id="edit-associe-obj"
                rows={3}
                value={formAssocie.objectifsIndividuels}
                onChange={(e) => setFormAssocie({ ...formAssocie, objectifsIndividuels: e.target.value })}
                className="w-full rounded-lg border border-border bg-card p-2.5 text-xs text-foreground font-mono focus:border-primary focus:outline-none"
                placeholder="Objectif 1&#10;Objectif 2&#10;..."
              />
            </Field>

            <DialogFooter className="mt-3 border-t border-border pt-4">
              <Button
                variant="secondary"
                type="button"
                onClick={() => setModalEditionAssocie(false)}
              >
                Annuler
              </Button>
              <Button
                variant="primary"
                type="submit"
                disabled={sauvegardeAssocieEnCours}
              >
                {sauvegardeAssocieEnCours ? "Enregistrement..." : "Enregistrer les modifications"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

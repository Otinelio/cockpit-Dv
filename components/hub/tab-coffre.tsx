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
import type { CategorieCoffre, EntreeCoffreVue } from "@/server/hub-types";
import {
  Copy,
  Eye,
  EyeOff,
  ExternalLink,
  KeyRound,
  Lock,
  Plus,
  Search,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  Unlock,
  History,
  Check,
} from "lucide-react";

const CATEGORIES: { value: CategorieCoffre | "tous"; label: string }[] = [
  { value: "tous", label: "Toutes les catégories" },
  { value: "reseaux_sociaux", label: "Réseaux sociaux" },
  { value: "messagerie", label: "Messagerie & Mail" },
  { value: "hebergement_domaines", label: "Hébergement & Domaines" },
  { value: "developpement", label: "Développement & Code" },
  { value: "services_professionnels", label: "Services pro & Outils" },
  { value: "comptes_financiers", label: "Comptes financiers & Banques" },
  { value: "api_cles", label: "API & Clés techniques" },
  { value: "autre", label: "Autres accès" },
];

function categorieBadge(cat: CategorieCoffre) {
  switch (cat) {
    case "api_cles":
      return <Tag tone="purple">Clé API / Token</Tag>;
    case "comptes_financiers":
      return <Tag tone="green">Finances & Banque</Tag>;
    case "hebergement_domaines":
      return <Tag tone="blue">Serveur & Domaine</Tag>;
    case "developpement":
      return <Tag tone="amber">Dev & Outils</Tag>;
    case "messagerie":
      return <Tag tone="neutral">Email</Tag>;
    case "reseaux_sociaux":
      return <Tag tone="blue">Social</Tag>;
    default:
      return <Tag tone="neutral">Accès pro</Tag>;
  }
}

export default function TabCoffre() {
  const entrees = useHub((s) => s.entreesCoffre);
  const audits = useHub((s) => s.auditsCoffre);
  const deverrouille = useHub((s) => s.coffreDeverrouille);
  const deverrouillerCoffre = useHub((s) => s.deverrouillerCoffre);
  const verrouillerCoffre = useHub((s) => s.verrouillerCoffre);
  const ajouterEntree = useHub((s) => s.ajouterEntreeCoffre);
  const modifierEntree = useHub((s) => s.modifierEntreeCoffre);
  const supprimerEntree = useHub((s) => s.supprimerEntreeCoffre);
  const revelerSecret = useHub((s) => s.revelerSecret);
  const utilisateur = useCockpit((s) => s.utilisateurActif);
  const toast = useCockpit((s) => s.toast);

  const [filtreCat, setFiltreCat] = useState<CategorieCoffre | "tous">("tous");
  const [recherche, setRecherche] = useState("");
  const [secretsRevetus, setSecretsRevetus] = useState<Record<string, string>>({});
  const [secretCopieId, setSecretCopieId] = useState<string | null>(null);

  // Modal déverrouillage
  const [modalDeverrouillage, setModalDeverrouillage] = useState(false);
  const [mdpDeverrouillage, setMdpDeverrouillage] = useState("");
  const [deverrouillageEnCours, setDeverrouillageEnCours] = useState(false);

  // Modal ajout / modification
  const [modalAjout, setModalAjout] = useState(false);
  const [entreeEnEdition, setEntreeEnEdition] = useState<EntreeCoffreVue | null>(null);
  const [form, setForm] = useState({
    nomService: "",
    categorie: "developpement" as CategorieCoffre,
    url: "",
    identifiant: "",
    emailAssocie: "",
    secret: "",
    notes: "",
    responsable: utilisateur || "Othnelio",
  });
  const [enregistrementEnCours, setEnregistrementEnCours] = useState(false);

  // Modal audit trail
  const [modalAudit, setModalAudit] = useState(false);

  async function handleDeverrouiller(e: React.FormEvent) {
    e.preventDefault();
    if (!mdpDeverrouillage) return;
    setDeverrouillageEnCours(true);
    const ok = await deverrouillerCoffre(mdpDeverrouillage);
    setDeverrouillageEnCours(false);
    if (ok) {
      setModalDeverrouillage(false);
      setMdpDeverrouillage("");
    }
  }

  async function handleToggleVisibilite(entree: EntreeCoffreVue) {
    if (!deverrouille) {
      setModalDeverrouillage(true);
      return;
    }

    if (secretsRevetus[entree.id]) {
      const copy = { ...secretsRevetus };
      delete copy[entree.id];
      setSecretsRevetus(copy);
    } else {
      const secret = await revelerSecret(entree.id, "consultation");
      if (secret !== null) {
        setSecretsRevetus((prev) => ({ ...prev, [entree.id]: secret }));
      }
    }
  }

  async function handleCopier(entree: EntreeCoffreVue) {
    if (!deverrouille) {
      setModalDeverrouillage(true);
      return;
    }

    let secret = secretsRevetus[entree.id];
    if (!secret) {
      const recup = await revelerSecret(entree.id, "copie");
      if (recup === null) return;
      secret = recup;
    }

    await navigator.clipboard.writeText(secret);
    setSecretCopieId(entree.id);
    setTimeout(() => setSecretCopieId(null), 2500);

    toast({
      ton: "succes",
      titre: "Mot de passe copié",
      texte: `Le secret pour « ${entree.nomService} » est dans le presse-papier.`,
    });
  }

  function ouvrirModalCreation() {
    if (!deverrouille) {
      setModalDeverrouillage(true);
      return;
    }
    setEntreeEnEdition(null);
    setForm({
      nomService: "",
      categorie: "developpement",
      url: "",
      identifiant: "",
      emailAssocie: "",
      secret: "",
      notes: "",
      responsable: utilisateur || "Othnelio",
    });
    setModalAjout(true);
  }

  function ouvrirModalModification(entree: EntreeCoffreVue) {
    if (!deverrouille) {
      setModalDeverrouillage(true);
      return;
    }
    setEntreeEnEdition(entree);
    setForm({
      nomService: entree.nomService,
      categorie: entree.categorie,
      url: entree.url || "",
      identifiant: entree.identifiant,
      emailAssocie: entree.emailAssocie || "",
      secret: "",
      notes: entree.notes || "",
      responsable: entree.responsable,
    });
    setModalAjout(true);
  }

  async function handleEnregistrerEntree(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nomService || !form.identifiant) return;
    setEnregistrementEnCours(true);

    if (entreeEnEdition) {
      const ok = await modifierEntree(entreeEnEdition.id, {
        nomService: form.nomService,
        categorie: form.categorie,
        url: form.url || undefined,
        identifiant: form.identifiant,
        emailAssocie: form.emailAssocie || undefined,
        secret: form.secret || undefined,
        notes: form.notes || undefined,
        responsable: form.responsable,
      });
      setEnregistrementEnCours(false);
      if (ok) setModalAjout(false);
    } else {
      if (!form.secret) {
        toast({
          ton: "erreur",
          titre: "Secret requis",
          texte: "Indique le mot de passe ou la clé secrète.",
        });
        setEnregistrementEnCours(false);
        return;
      }
      const ok = await ajouterEntree(form);
      setEnregistrementEnCours(false);
      if (ok) setModalAjout(false);
    }
  }

  const entreesFiltrees = entrees.filter((e) => {
    const matchCat = filtreCat === "tous" || e.categorie === filtreCat;
    const matchSearch =
      recherche === "" ||
      e.nomService.toLowerCase().includes(recherche.toLowerCase()) ||
      e.identifiant.toLowerCase().includes(recherche.toLowerCase()) ||
      (e.emailAssocie && e.emailAssocie.toLowerCase().includes(recherche.toLowerCase())) ||
      e.responsable.toLowerCase().includes(recherche.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div className="space-y-6">
      {/* Barre d'état sécurité & actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-border bg-[#181818] p-5">
        <div className="flex items-center gap-4">
          <div
            className={`flex size-12 shrink-0 items-center justify-center rounded-xl border ${
              deverrouille
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                : "bg-red-500/10 border-red-500/30 text-red-400"
            }`}
          >
            {deverrouille ? <ShieldCheck className="size-6" /> : <ShieldAlert className="size-6" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-foreground">
                Coffre-fort numérique DigitalVision
              </h3>
              {deverrouille ? (
                <Tag tone="green">Déverrouillé pour la session</Tag>
              ) : (
                <Tag tone="red">Verrouillé · Chiffrement AES-256</Tag>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Mots de passe, clés API et accès d’administration protégés par chiffrement
              authentifié.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setModalAudit(true)}
            className="text-subtle hover:text-foreground gap-1.5"
          >
            <History className="size-4" />
            Journal d’accès
          </Button>

          {deverrouille ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={verrouillerCoffre}
              className="gap-1.5 text-muted-foreground hover:text-foreground"
            >
              <Lock className="size-4" />
              Verrouiller
            </Button>
          ) : (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setModalDeverrouillage(true)}
              className="gap-1.5"
            >
              <Unlock className="size-4" />
              Déverrouiller
            </Button>
          )}

          <Button
            variant="secondary"
            size="sm"
            onClick={ouvrirModalCreation}
            className="gap-1.5"
          >
            <Plus className="size-4" />
            Nouvel accès
          </Button>
        </div>
      </div>

      {/* Barre de filtres et recherche */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
          <Input
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            placeholder="Rechercher un service, email, responsable..."
            className="pl-9 text-sm"
          />
        </div>

        <div className="w-full sm:w-64">
          <select
            value={filtreCat}
            onChange={(e) => setFiltreCat(e.target.value as CategorieCoffre | "tous")}
            aria-label="Filtrer par catégorie"
            className="border-line-strong bg-secondary text-foreground focus-visible:border-ring w-full rounded-lg border px-3 py-2 text-sm outline-none"
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Liste des entrées */}
      {entreesFiltrees.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center space-y-3">
          <div className="flex size-12 mx-auto items-center justify-center rounded-full bg-card text-muted-foreground">
            <KeyRound className="size-6" />
          </div>
          <h4 className="text-sm font-semibold text-foreground">Aucun identifiant trouvé</h4>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            {recherche || filtreCat !== "tous"
              ? "Aucune entrée ne correspond aux filtres sélectionnés."
              : "Le coffre-fort ne contient pas encore d'identifiants. Clique sur « Nouvel accès » pour en chiffrer un."}
          </p>
          {!recherche && filtreCat === "tous" && (
            <Button variant="secondary" size="sm" onClick={ouvrirModalCreation} className="mt-2">
              Ajouter le premier identifiant
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {entreesFiltrees.map((entree) => {
            const secretRevele = secretsRevetus[entree.id];
            const estCopie = secretCopieId === entree.id;

            return (
              <div
                key={entree.id}
                className="group relative rounded-xl border border-border bg-[#141414] p-4 flex flex-col justify-between hover:border-primary/40 transition-colors"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <h4 className="font-semibold text-foreground text-sm flex items-center gap-1.5">
                        {entree.nomService}
                        {entree.url && (
                          <a
                            href={
                              entree.url.startsWith("http")
                                ? entree.url
                                : `https://${entree.url}`
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-subtle hover:text-primary transition-colors"
                          >
                            <ExternalLink className="size-3.5" />
                          </a>
                        )}
                      </h4>
                      <div className="mt-1">{categorieBadge(entree.categorie)}</div>
                    </div>

                    <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => ouvrirModalModification(entree)}
                        title="Modifier"
                      >
                        <KeyRound className="size-3.5 text-muted-foreground hover:text-foreground" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => {
                          if (confirm(`Supprimer l'accès pour « ${entree.nomService} » ?`)) {
                            supprimerEntree(entree.id);
                          }
                        }}
                        title="Supprimer"
                      >
                        <Trash2 className="size-3.5 text-muted-foreground hover:text-red-400" />
                      </Button>
                    </div>
                  </div>

                  {/* Identifiants & Email */}
                  <div className="space-y-1.5 my-3 text-xs">
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span className="text-subtle">Identifiant :</span>
                      <span className="font-mono text-foreground select-all font-medium">
                        {entree.identifiant}
                      </span>
                    </div>

                    {entree.emailAssocie && (
                      <div className="flex items-center justify-between text-muted-foreground">
                        <span className="text-subtle">Email :</span>
                        <span className="text-foreground truncate max-w-[170px] select-all">
                          {entree.emailAssocie}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Secret masqué ou affiché */}
                  <div className="rounded-lg bg-card/60 border border-border/70 p-2.5 flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground block mb-0.5">
                        Secret chiffré AES-256
                      </span>
                      <span className="font-mono text-xs text-foreground block truncate">
                        {secretRevele ? secretRevele : "••••••••••••••••"}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleToggleVisibilite(entree)}
                        title={secretRevele ? "Masquer" : "Révéler le mot de passe"}
                      >
                        {secretRevele ? (
                          <EyeOff className="size-4 text-primary" />
                        ) : (
                          <Eye className="size-4 text-muted-foreground" />
                        )}
                      </Button>

                      <Button
                        variant="secondary"
                        size="icon-sm"
                        onClick={() => handleCopier(entree)}
                        title="Copier dans le presse-papier"
                      >
                        {estCopie ? (
                          <Check className="size-4 text-trend" />
                        ) : (
                          <Copy className="size-4 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                  </div>

                  {entree.notes && (
                    <p className="text-[11px] text-muted-foreground mt-2 italic line-clamp-2">
                      {entree.notes}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between pt-3 mt-3 border-t border-border/40 text-[11px] text-subtle">
                  <span>Resp : {entree.responsable}</span>
                  <span>
                    Mis à jour le {new Date(entree.modifieLe).toLocaleDateString("fr-FR")}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL DE DÉVERROUILLAGE DU COFFRE */}
      <Dialog open={modalDeverrouillage} onOpenChange={setModalDeverrouillage}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="size-5 text-primary" />
              Déverrouiller le coffre-fort
            </DialogTitle>
            <DialogDescription>
              Pour consulter ou modifier les clés d’accès, saisis ton mot de passe de session DV (
              <span className="text-foreground font-semibold">{utilisateur || "Othnelio"}</span>
              ).
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleDeverrouiller} className="space-y-4 py-2">
            <Field label="Mot de passe de session" htmlFor="vault-password">
              <Input
                id="vault-password"
                type="password"
                value={mdpDeverrouillage}
                onChange={(e) => setMdpDeverrouillage(e.target.value)}
                placeholder="Mot de passe Cockpit DV"
                autoFocus
                required
              />
            </Field>

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setModalDeverrouillage(false)}
                disabled={deverrouillageEnCours}
              >
                Annuler
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={deverrouillageEnCours}
                className="gap-2"
              >
                <Unlock className="size-4" />
                {deverrouillageEnCours ? "Vérification..." : "Déverrouiller l'accès"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL AJOUT / MODIFICATION D'IDENTIFIANT */}
      <Dialog open={modalAjout} onOpenChange={setModalAjout}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="size-5 text-primary" />
              {entreeEnEdition ? "Modifier l’identifiant" : "Chiffrer un nouvel accès"}
            </DialogTitle>
            <DialogDescription>
              Le secret sera stocké sous chiffrement authentifié AES-256-GCM et ne sera jamais
              exposé en clair.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleEnregistrerEntree} className="space-y-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Nom du service ou compte" htmlFor="service-nom">
                <Input
                  id="service-nom"
                  value={form.nomService}
                  onChange={(e) => setForm({ ...form, nomService: e.target.value })}
                  placeholder="Ex: GitHub Organisation, AWS, Stripe..."
                  required
                />
              </Field>

              <Field label="Catégorie" htmlFor="service-cat">
                <select
                  id="service-cat"
                  value={form.categorie}
                  onChange={(e) =>
                    setForm({ ...form, categorie: e.target.value as CategorieCoffre })
                  }
                  className="border-line-strong bg-secondary text-foreground focus-visible:border-ring w-full rounded-lg border px-3 py-2 text-sm outline-none"
                >
                  {CATEGORIES.filter((c) => c.value !== "tous").map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Identifiant / Login" htmlFor="service-login">
                <Input
                  id="service-login"
                  value={form.identifiant}
                  onChange={(e) => setForm({ ...form, identifiant: e.target.value })}
                  placeholder="admin, handle, root..."
                  required
                />
              </Field>

              <Field label="Email associé" htmlFor="service-email">
                <Input
                  id="service-email"
                  type="email"
                  value={form.emailAssocie}
                  onChange={(e) => setForm({ ...form, emailAssocie: e.target.value })}
                  placeholder="contact@digitalvision.tg"
                />
              </Field>
            </div>

            <Field
              label={
                entreeEnEdition
                  ? "Nouveau secret / mot de passe (laisser vide pour ne pas changer)"
                  : "Mot de passe / Clé API secrète"
              }
              htmlFor="service-secret"
            >
              <Input
                id="service-secret"
                type="password"
                value={form.secret}
                onChange={(e) => setForm({ ...form, secret: e.target.value })}
                placeholder={entreeEnEdition ? "••••••••••••" : "Mot de passe fort ou secret"}
                required={!entreeEnEdition}
              />
            </Field>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="URL de connexion (optionnel)" htmlFor="service-url">
                <Input
                  id="service-url"
                  value={form.url}
                  onChange={(e) => setForm({ ...form, url: e.target.value })}
                  placeholder="https://..."
                />
              </Field>

              <Field label="Responsable" htmlFor="service-resp">
                <Input
                  id="service-resp"
                  value={form.responsable}
                  onChange={(e) => setForm({ ...form, responsable: e.target.value })}
                  placeholder="Othnelio, Medard, Roméo"
                />
              </Field>
            </div>

            <Field
              label="Notes & instructions de récupération"
              htmlFor="service-notes"
            >
              <textarea
                id="service-notes"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={2}
                placeholder="Codes de secours, 2FA sur téléphone de..., procédure de renouvellement"
                className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </Field>

            <DialogFooter className="gap-2 pt-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setModalAjout(false)}
                disabled={enregistrementEnCours}
              >
                Annuler
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={enregistrementEnCours}
                className="gap-2"
              >
                <ShieldCheck className="size-4" />
                {enregistrementEnCours
                  ? "Chiffrement..."
                  : entreeEnEdition
                  ? "Mettre à jour"
                  : "Chiffrer et enregistrer"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL AUDIT TRAIL COFFRE */}
      <Dialog open={modalAudit} onOpenChange={setModalAudit}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="size-5 text-primary" />
              Journal d’audit des accès au coffre
            </DialogTitle>
            <DialogDescription>
              Historique certifié des consultations, copies et modifications de secrets par les
              associés.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-80 overflow-y-auto space-y-2 py-2 pr-1">
            {audits.length === 0 ? (
              <p className="text-center text-xs text-muted-foreground py-8">
                Aucun événement d’accès enregistré pour l’instant.
              </p>
            ) : (
              audits.map((aud) => (
                <div
                  key={aud.id}
                  className="flex items-center justify-between p-2.5 rounded-lg border border-border/60 bg-card/40 text-xs"
                >
                  <div className="space-y-0.5">
                    <span className="font-semibold text-foreground">{aud.nomService}</span>
                    <p className="text-subtle text-[11px]">
                      Action : <span className="font-medium text-foreground">{aud.action}</span> ·
                      par {aud.auteur}
                    </p>
                  </div>
                  <span className="text-[11px] text-muted-foreground font-mono">
                    {new Date(aud.date).toLocaleString("fr-FR", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </span>
                </div>
              ))
            )}
          </div>

          <DialogFooter>
            <Button variant="secondary" onClick={() => setModalAudit(false)}>
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

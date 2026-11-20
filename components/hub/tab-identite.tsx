"use client";

import { useState } from "react";
import Button from "@/components/_ui/button";
import Field from "@/components/_ui/field";
import { Input } from "@/components/_ui/input";
import Tag from "@/components/_ui/tag";
import { useHub } from "@/stores/hub-store";
import { useCockpit } from "@/stores/cockpit-store";
import {
  Building2,
  Edit3,
  Globe,
  Mail,
  MapPin,
  Phone,
  Save,
  Shield,
  CreditCard,
  CheckCircle,
  FileText,
} from "lucide-react";

export default function TabIdentite() {
  const identite = useHub((s) => s.identite);
  const mettreAJourIdentite = useHub((s) => s.mettreAJourIdentite);
  const utilisateur = useCockpit((s) => s.utilisateurActif);

  const [enEdition, setEnEdition] = useState(false);
  const [form, setForm] = useState(identite || null);
  const [sauvegardeEnCours, setSauvegardeEnCours] = useState(false);

  function demarrerEdition() {
    if (identite) {
      setForm({ ...identite });
      setEnEdition(true);
    }
  }

  async function enregistrer(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    setSauvegardeEnCours(true);
    const ok = await mettreAJourIdentite(form);
    setSauvegardeEnCours(false);
    if (ok) setEnEdition(false);
  }

  if (!identite) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        Chargement des informations de l’entreprise...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête Identité */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-border bg-[#181818] p-5">
        <div className="flex items-center gap-4">
          <div className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 text-primary">
            <Building2 className="size-8" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold tracking-tight text-foreground">
                {identite.nomCommercial}
              </h2>
              <Tag tone="purple">Société active</Tag>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">{identite.slogan}</p>
          </div>
        </div>

        <div>
          {!enEdition ? (
            <Button variant="secondary" size="sm" onClick={demarrerEdition} className="gap-2">
              <Edit3 className="size-4" />
              Modifier la fiche
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setEnEdition(false)}
              className="text-subtle hover:text-foreground"
            >
              Annuler
            </Button>
          )}
        </div>
      </div>

      {!enEdition ? (
        /* MODE CONSULTATION */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Colonne Gauche : Présentation, Mission, Vision, Valeurs */}
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-xl border border-border bg-[#141414] p-5 space-y-4">
              <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                <FileText className="size-4 text-primary" />
                Présentation générale & Vision
              </h3>
              <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-line">
                {identite.description}
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-border/60">
                <div className="space-y-1.5">
                  <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                    Notre Mission
                  </span>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {identite.mission}
                  </p>
                </div>
                <div className="space-y-1.5">
                  <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                    Notre Vision 2030
                  </span>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {identite.vision}
                  </p>
                </div>
              </div>

              <div className="pt-2">
                <span className="text-xs font-medium text-muted-foreground block mb-2">
                  Valeurs fondamentales :
                </span>
                <div className="flex flex-wrap gap-2">
                  {identite.valeurs.map((val) => (
                    <Tag key={val} tone="neutral" className="text-xs">
                      {val}
                    </Tag>
                  ))}
                </div>
              </div>
            </div>

            {/* Coordonnées de paiement & Facturation */}
            <div className="rounded-xl border border-border bg-[#141414] p-5 space-y-4">
              <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                <CreditCard className="size-4 text-trend" />
                Coordonnées de règlement & Factures
              </h3>
              <p className="text-xs text-muted-foreground">
                Ces coordonnées sont automatiquement imprimées sur les devis et factures PDF émis
                par Cockpit DV.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                <div className="rounded-lg bg-card/40 border border-border/70 p-3 space-y-1">
                  <span className="text-xs text-muted-foreground block">Banque & RIB</span>
                  <span className="font-medium text-foreground block">
                    {identite.coordonneesPaiement.banque || "Non renseigné"}
                  </span>
                  <span className="text-xs font-mono text-muted-foreground block truncate">
                    {identite.coordonneesPaiement.ibanOuRib || "—"}
                  </span>
                </div>

                <div className="rounded-lg bg-card/40 border border-border/70 p-3 space-y-1">
                  <span className="text-xs text-muted-foreground block">T-Money (Togo)</span>
                  <span className="font-semibold text-emerald-400 font-mono block">
                    {identite.coordonneesPaiement.tMoney || "Non renseigné"}
                  </span>
                  <span className="text-[11px] text-muted-foreground block">Paiement marchand / direct</span>
                </div>

                <div className="rounded-lg bg-card/40 border border-border/70 p-3 space-y-1">
                  <span className="text-xs text-muted-foreground block">Moov Flooz (Togo)</span>
                  <span className="font-semibold text-blue-400 font-mono block">
                    {identite.coordonneesPaiement.flooz || "Non renseigné"}
                  </span>
                  <span className="text-[11px] text-muted-foreground block">Paiement marchand / direct</span>
                </div>
              </div>

              {identite.coordonneesPaiement.mentions && (
                <div className="rounded-lg bg-background/50 border border-border/40 p-3 text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">Mention légale facture : </span>
                  {identite.coordonneesPaiement.mentions}
                </div>
              )}
            </div>
          </div>

          {/* Colonne Droite : Coordonnées, Fiscalité, Liens */}
          <div className="space-y-6">
            {/* Légal & Fiscal */}
            <div className="rounded-xl border border-border bg-[#141414] p-5 space-y-3">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Shield className="size-4 text-amber-400" />
                Données légales & Récépissés
              </h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-border/50">
                  <span className="text-muted-foreground">NIF :</span>
                  <span className="font-mono font-medium text-foreground">
                    {identite.nif || "À renseigner"}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/50">
                  <span className="text-muted-foreground">RCCM :</span>
                  <span className="font-mono font-medium text-foreground">
                    {identite.rccm || "À renseigner"}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/50">
                  <span className="text-muted-foreground">Forme juridique :</span>
                  <span className="font-medium text-foreground">SARL-U</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground">Siège :</span>
                  <span className="font-medium text-foreground">Lomé, Togo</span>
                </div>
              </div>
            </div>

            {/* Coordonnées officielles */}
            <div className="rounded-xl border border-border bg-[#141414] p-5 space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Coordonnées de contact</h3>
              <div className="space-y-3 text-xs">
                <div className="flex items-start gap-2.5 text-muted-foreground">
                  <MapPin className="size-4 shrink-0 text-subtle mt-0.5" />
                  <span className="text-foreground">{identite.adressePhysique}</span>
                </div>
                <div className="flex items-center gap-2.5 text-muted-foreground">
                  <Phone className="size-4 shrink-0 text-subtle" />
                  <a
                    href={`tel:${identite.telephones[0]}`}
                    className="text-foreground hover:underline font-mono"
                  >
                    {identite.telephones.join(", ")}
                  </a>
                </div>
                <div className="flex items-center gap-2.5 text-muted-foreground">
                  <Mail className="size-4 shrink-0 text-subtle" />
                  <a
                    href={`mailto:${identite.emails[0]}`}
                    className="text-foreground hover:underline"
                  >
                    {identite.emails.join(", ")}
                  </a>
                </div>
                <div className="flex items-center gap-2.5 text-muted-foreground">
                  <Globe className="size-4 shrink-0 text-subtle" />
                  <a
                    href={identite.siteWeb}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    {identite.siteWeb}
                  </a>
                </div>
              </div>
            </div>

            {/* Réseaux sociaux */}
            <div className="rounded-xl border border-border bg-[#141414] p-5 space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Présence en ligne</h3>
              <div className="space-y-2">
                {identite.reseauxSociaux.map((res) => (
                  <a
                    key={res.url}
                    href={res.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-2 rounded-lg bg-card/30 hover:bg-card/70 border border-border/50 text-xs text-foreground transition-colors"
                  >
                    <span className="capitalize font-medium">{res.plateforme}</span>
                    <span className="text-[11px] text-muted-foreground truncate max-w-[150px]">
                      {res.url.replace(/^https?:\/\//, "")}
                    </span>
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* MODE ÉDITION */
        <form onSubmit={enregistrer} className="space-y-6">
          <div className="rounded-xl border border-border bg-[#141414] p-6 space-y-6">
            <h3 className="text-lg font-semibold text-foreground border-b border-border pb-3">
              Modifier la fiche d’identité officielle
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Nom commercial">
              <Field label="Nom commercial" htmlFor="id-nom">
                <Input
                  id="id-nom"
                  value={form?.nomCommercial ?? ""}
                  onChange={(e) =>
                    setForm((f) => (f ? { ...f, nomCommercial: e.target.value } : f))
                  }
                  required
                />
              </Field>

              <Field label="Slogan">
              <Field label="Slogan" htmlFor="id-slogan">
                <Input
                  id="id-slogan"
                  value={form?.slogan ?? ""}
                  onChange={(e) =>
                    setForm((f) => (f ? { ...f, slogan: e.target.value } : f))
                  }
                />
              </Field>
            </div>

            <Field label="Description de l’entreprise">
            <Field label="Description de l’entreprise" htmlFor="id-description">
              <textarea
                id="id-description"
                value={form?.description ?? ""}
                onChange={(e) =>
                  setForm((f) => (f ? { ...f, description: e.target.value } : f))
                }
                rows={3}
                className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </Field>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Mission">
              <Field label="Mission" htmlFor="id-mission">
                <textarea
                  id="id-mission"
                  value={form?.mission ?? ""}
                  onChange={(e) =>
                    setForm((f) => (f ? { ...f, mission: e.target.value } : f))
                  }
                  rows={2}
                  className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </Field>

              <Field label="Vision">
              <Field label="Vision" htmlFor="id-vision">
                <textarea
                  id="id-vision"
                  value={form?.vision ?? ""}
                  onChange={(e) =>
                    setForm((f) => (f ? { ...f, vision: e.target.value } : f))
                  }
                  rows={2}
                  className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </Field>
            </div>

            <Field
              label="Valeurs (séparées par des virgules)"
              description="Ex: Excellence technique, Intégrité, Impact local"
              htmlFor="id-valeurs"
              hint="Ex: Excellence technique, Intégrité, Impact local"
            >
              <Input
                id="id-valeurs"
                value={form?.valeurs.join(", ") ?? ""}
                onChange={(e) =>
                  setForm((f) =>
                    f
                      ? {
                          ...f,
                          valeurs: e.target.value
                            .split(",")
                            .map((s) => s.trim())
                            .filter(Boolean),
                        }
                      : f,
                  )
                }
              />
            </Field>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-border">
              <Field label="Téléphone principal">
              <Field label="Téléphone principal" htmlFor="id-tel">
                <Input
                  id="id-tel"
                  value={form?.telephones[0] ?? ""}
                  onChange={(e) =>
                    setForm((f) => (f ? { ...f, telephones: [e.target.value] } : f))
                  }
                />
              </Field>

              <Field label="Email principal">
              <Field label="Email principal" htmlFor="id-email">
                <Input
                  id="id-email"
                  type="email"
                  value={form?.emails[0] ?? ""}
                  onChange={(e) =>
                    setForm((f) => (f ? { ...f, emails: [e.target.value] } : f))
                  }
                />
              </Field>

              <Field label="Site web">
              <Field label="Site web" htmlFor="id-site">
                <Input
                  id="id-site"
                  value={form?.siteWeb ?? ""}
                  onChange={(e) =>
                    setForm((f) => (f ? { ...f, siteWeb: e.target.value } : f))
                  }
                />
              </Field>
            </div>

            <Field label="Adresse physique">
            <Field label="Adresse physique" htmlFor="id-adresse">
              <Input
                id="id-adresse"
                value={form?.adressePhysique ?? ""}
                onChange={(e) =>
                  setForm((f) => (f ? { ...f, adressePhysique: e.target.value } : f))
                }
              />
            </Field>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-border">
              <Field label="NIF (Numéro d’Identification Fiscale)">
              <Field label="NIF (Numéro d’Identification Fiscale)" htmlFor="id-nif">
                <Input
                  id="id-nif"
                  value={form?.nif ?? ""}
                  onChange={(e) => setForm((f) => (f ? { ...f, nif: e.target.value } : f))}
                  placeholder="Ex: 1000123456"
                />
              </Field>

              <Field label="RCCM (Registre du Commerce)">
              <Field label="RCCM (Registre du Commerce)" htmlFor="id-rccm">
                <Input
                  id="id-rccm"
                  value={form?.rccm ?? ""}
                  onChange={(e) => setForm((f) => (f ? { ...f, rccm: e.target.value } : f))}
                  placeholder="Ex: TG-LOM-202X-B-XXXX"
                />
              </Field>
            </div>

            <div className="space-y-4 pt-4 border-t border-border">
              <h4 className="text-sm font-semibold text-foreground">
                Coordonnées de règlement (Factures PDF)
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Field label="Banque / Compte">
                <Field label="Banque / Compte" htmlFor="id-banque">
                  <Input
                    id="id-banque"
                    value={form?.coordonneesPaiement.banque ?? ""}
                    onChange={(e) =>
                      setForm((f) =>
                        f
                          ? {
                              ...f,
                              coordonneesPaiement: {
                                ...f.coordonneesPaiement,
                                banque: e.target.value,
                              },
                            }
                          : f,
                      )
                    }
                  />
                </Field>

                <Field label="Numéro T-Money">
                <Field label="Numéro T-Money" htmlFor="id-tmoney">
                  <Input
                    id="id-tmoney"
                    value={form?.coordonneesPaiement.tMoney ?? ""}
                    onChange={(e) =>
                      setForm((f) =>
                        f
                          ? {
                              ...f,
                              coordonneesPaiement: {
                                ...f.coordonneesPaiement,
                                tMoney: e.target.value,
                              },
                            }
                          : f,
                      )
                    }
                  />
                </Field>

                <Field label="Numéro Flooz">
                <Field label="Numéro Flooz" htmlFor="id-flooz">
                  <Input
                    id="id-flooz"
                    value={form?.coordonneesPaiement.flooz ?? ""}
                    onChange={(e) =>
                      setForm((f) =>
                        f
                          ? {
                              ...f,
                              coordonneesPaiement: {
                                ...f.coordonneesPaiement,
                                flooz: e.target.value,
                              },
                            }
                          : f,
                      )
                    }
                  />
                </Field>
              </div>

              <Field label="Mentions obligatoires sur factures">
              <Field label="Mentions obligatoires sur factures" htmlFor="id-mentions">
                <Input
                  id="id-mentions"
                  value={form?.coordonneesPaiement.mentions ?? ""}
                  onChange={(e) =>
                    setForm((f) =>
                      f
                        ? {
                            ...f,
                            coordonneesPaiement: {
                              ...f.coordonneesPaiement,
                              mentions: e.target.value,
                            },
                          }
                        : f,
                    )
                  }
                />
              </Field>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setEnEdition(false)}
              disabled={sauvegardeEnCours}
            >
              Annuler
            </Button>
            <Button type="submit" variant="primary" disabled={sauvegardeEnCours} className="gap-2">
              <Save className="size-4" />
              {sauvegardeEnCours ? "Enregistrement..." : "Enregistrer les modifications"}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

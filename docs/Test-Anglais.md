# Test de la version anglaise — NanoXplore RH

> Captures réelles, langue forcée en anglais (`i18nextLng=en`), par page et par rôle.
> Captures dans `frontend-v2/e2e/screenshots/en/` (script : `e2e/capture-extras.mjs`).

## Verdict

L'app est **traduite à ~85 %**. Tout le **châssis fonctionnel** est en anglais :
navigation, boutons, en-têtes de tableaux, statuts, formulaire de connexion, libellés de
champs. Restent des **chaînes en dur (non i18n)** sur quelques éléments transverses.

## Ce qui est correctement traduit ✅

| Page | Constat |
|------|---------|
| Login | « Annual reviews, made simple », « Login », « Email address », « Password », « Remember me », « Sign In », « Need help? Contact your HR representative » |
| Dashboard | Titres, KPIs, sections |
| Campaigns | « Campaigns », filtres « All / Draft / Active / Closed / Archived », « Export », « New Campaign », « Search a campaign… », colonnes « NAME / STATUS / PERIOD / PROGRESS », statuts « Active / Draft / Closed » |
| Users, Org, LDAP, Documents, Evaluations, Help | Navigation et actions traduites |

## Trous de traduction trouvés ⚠️ (chaînes en dur à passer en i18n)

| # | Élément | Où | Texte resté en FR |
|---|---------|-----|-------------------|
| 1 | **Bannière de configuration** | `components/layout/SetupBanner.tsx` | « Configuration initiale incomplète. Il manque encore… Ouvrir l'assistant de configuration » (libellés `LABELS` codés en dur) |
| 2 | **Pied de page** | layout/footer | « Données personnelles (RGPD) · Mentions légales · Accessibilité · Contact RH » et « Conforme RGPD · Données hébergées en Union européenne » |
| 3 | **Encarts d'aide (PageGuide)** | guides par page | ex. « Comment créer une campagne d'évaluation ? … » |
| 4 | **Illustration de login** | LoginPage (carte décorative) | « Entretien annuel / Auto-évaluation / Bilan de l'année / Transmis à votre manager » (visuel marketing, non fonctionnel) |
| 5 | **Quelques libellés de nav** | `navConfig.ts` | ex. « Départements » écrit en dur (pas via `t()`) |

## Reco

- **P2** : i18n-iser SetupBanner (1–3), c'est ce qui saute aux yeux côté admin anglophone.
- **P3** : footer + libellés nav en dur.
- **P3** : l'illustration de login est cosmétique — à refaire en SVG localisé ou neutre.
- Les **données saisies** (descriptions de campagnes, titres de formulaires) restent dans la
  langue de saisie — comportement normal, pas un bug.

## Note

La page **login utilise le logo par défaut** (pré-authentification, sans accès à `/api/branding`) :
normal. Après connexion, le **logo personnalisé** de l'entreprise s'affiche (testé : « ACME RH »).

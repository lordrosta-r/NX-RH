# Analyse Produit — NX-RH

*Une analyse approfondie d'un logiciel RH d'évaluations de performance annuelles par un Product Manager SaaS senior*

---

## Résumé exécutif

NX-RH est un logiciel **self-hosted, hautement focalisé** sur la gestion du cycle d'évaluation de performance annuelle. C'est une solution complète et opérationnelle pour les entreprises de taille moyenne (200-2000 employés) cherchant à remplacer Excel/Word par un processus structuré, traçable et multi-rôle. Cependant, son positionnement très niché et l'absence de plusieurs modules critiques (recrutement, paie, SIRH, gestion des talents) en limitent la portée commerciale face aux acteurs consolidés (SAP, Lucca, BambooHR).

---

## 1. Proposition de valeur actuelle

### Value Proposition Core
**Pour qui :** RH managers, directors, managers opérationnels des PME/ETI (200-2000 personnes) européennes  
**Problème résolu :** Remplacer le processus papier/Excel des entretiens annuels par un workflow digital structuré, signifiable, tracé et multi-rôle.  
**Bénéfices clés :**
- ✅ **Traçabilité complète** : audit log de toutes les actions, signatures numériques, immuabilité
- ✅ **Multi-rôle natif** : workflows différenciés par rôle (auto-eval → manager → RH → validation)
- ✅ **LDAP/AD ready** : intégration native Windows Active Directory (gain de temps IT)
- ✅ **Self-hosted** : données on-premise, respect RGPD zero cloud, conformité secteur public
- ✅ **Déploiement Docker** : TI peut lancer en prod en 2h sans expertise backend
- ✅ **Hiérarchie organisationnelle** : support natif de la cascade manager (arbres + visibility rules)

### Niche actuel
Le produit excelle dans **UN cas très spécifique** : entreprises européennes avec :
- Besoins d'évaluations annuelles structurées
- Infrastructure IT (AD, LDAP)
- Préférence on-premise / sovereignty données
- Petite à moyenne taille (pas de Fortune 500)

Ne prétend **pas** être une solution SIRH complète (pas de paie, recrutement, gestion de temps, développement des talents, mobilité, etc.).

---

## 2. Analyse par persona

### 👤 Admin
**Scope actuel :** ✅ Excellemment couvert  
**Pages dédiées :** AdminHubPage, AdminLdapPage, AdminConfigPage, AdminMailTemplatesPage, AdminAuditPage, AdminSetupWizardPage, AdminStatusPage  
**Capacités :**
- Gérer les configs système (LDAP, mail, JWT, BD)
- Audit log complet de toutes les mutations
- Setup wizard pour onboarding rapide
- Gestion des templates email
- Monitoring santé du système (AdminStatusPage)

**Friction :**
- Import utilisateurs bulk (CSV) existe mais expérience UX non testée
- Pas de UI pour roles/permissions granulaires (hard-coded en backend)
- Pas de gestion des tenants si usage multi-organization visé

---

### 👥 RH Manager
**Scope actuel :** ✅✅ Très bien couvert  
**Pages dédiées :** HrSettingsPage, AnalyticsPage, AnalyticsCampaignPage, CampaignDetailPage, CampaignAnalyticsPage, AdminUsersImportPage, AdminFormsImportPage, OffboardingPage, OffboardingDetailPage, HrFlagsPage  
**Capacités :**
- Créer et gérer les campagnes d'évaluation (brouillon → active → closed → archived)
- Designer les formulaires d'évaluation avec structure JSON flexible
- Assigner les évaluations par département / hiérarchie
- Voir les analytics en temps réel (progression, distribution des notes)
- Offboarding workflows (départs, archivage des données)
- HR Flags (pour marquer des cas particuliers)
- Import bulk de templates et utilisateurs

**Friction :**
- Pas de "question bank" réutilisable = redéfinir les questions chaque campagne
- Pas de templates de campagne pré-faits (clone existe mais minimal)
- Analytics limitées : pas de comparaison N vs N-1, pas de prédiction tendances, pas de export PDF automatisé
- Pas de notion de "skills mapping" ou plan de formation agrégé depuis les aspirations collectées

---

### 👔 Manager opérationnel
**Scope actuel :** ✅ Fonctionnel mais basique  
**Pages dédiées :** DashboardManagerPage, EvaluationsPage, EvaluationDetailPage, EvaluationHistoryPage, UsersPage  
**Capacités :**
- Voir ses employés et l'état de leurs évaluations
- Remplir l'évaluation (score, commentaires)
- Signer l'évaluation (workflow multi-étape)
- Accéder à l'historique des entretiens passés
- Voir ses équipes (si visibility étendue accordée)

**Friction :** ⚠️  
- Aucune notification pro-active des échéances
- Pas de kanban / board visuel (juste liste)
- Pas de "notes privées" entre managers sur un collaborateur
- Pas de calendrier d'entretiens intégré (planifier entretien)
- Pas de délégation d'entretien possible
- Pas de comparaison "mon équipe vs benchmark"
- Interface très basique pour remplir les évaluations (pas de rich text, pas de piece jointe, pas de brouillon auto-sauvegardé)

---

### 👨‍💼 Employé
**Scope actuel :** ⚠️  Fonctionnel mais expérience basique  
**Pages dédiées :** DashboardEmployeePage, EvaluationDetailPage, EvaluationHistoryPage, ProfilePage, PreferencesPage, NotificationsPage, OnboardingPage  
**Capacités :**
- Voir ses évaluations assignées
- Faire son auto-évaluation (si formulaire auto-eval inclus)
- Voir l'historique de ses évaluations passées
- Mettre à jour son profil
- Gérer ses préférences (langue, thème, notifications)

**Friction :** ⚠️⚠️  
- Aucune barre de progression visible (% complété, étapes claires)
- Pas de visualisation "mon entretien complet après validation" (relecture)
- Pas de signature électronique confirmant qu'il a pris connaissance
- Pas de comparaison N vs N-1 (vue la progression)
- Pas de feedback équilibré (points forts / axes, pas juste un score)
- Expérience mobile très basique
- Pas de "export PDF personnel" pour conserver l'entretien
- Brouillon potentiellement perdu si déconnexion (pas de sauvegarde auto)

---

## 3. Fonctionnalités manquantes (par priorité)

### 🔴 P0 — Blockers d'adoption (deal-breakers)

| Fonctionnalité | Impact | Client-type affecté |
|---|---|---|
| **Reminders/escalation automatiques** | Campagnes trainées en longueur, deadline ratées | Managers distraits, RH sans suivi |
| **Notifications pro-actives** | Employés oublient de remplir leur eval | Tout utilisateur non-admin |
| **Export PDF fini rapport** | Impossible de communiquer l'entretien en dehors du système | RH, managers, employés |
| **Signature électronique confirmante** | Non-conformité légale (France = signature obligatoire) | ETI, secteur public |
| **Hiérarchie BD multiple (forest support)** | Impossible en grosse organisation matricielle | Orga > 1000 pers complexe |

### 🟠 P1 — High-impact features (50% des prospects demandent)

| Fonctionnalité | Impact | Notes |
|---|---|---|
| **Comparaison N vs N-1** | Mesurer progression réelle | Employee experience critique |
| **Auto-save brouillon** | Éviter perte de saisie | UX baseline modern apps |
| **Rich text editor** | Commentaires plus nuancés | Formatage basique (gras, italique) |
| **Kanban / Board visual** | Suivi plus intuitif | UX manager (plus utile que liste) |
| **Question bank réutilisable** | Réduire effort création template | ROI RH (temps sauvé) |
| **Anonymisation 360° optionnelle** | Évals plus honnêtes | Si 360 implémenté |
| **Calendrier intégré** | Planifier entretiens | Manager experience |
| **Notes privées manager** | Contexte confidentiel | Légalité FR dubieuse mais demandée |

### 🟡 P2 — Nice-to-have (augmentent stickiness)

| Fonctionnalité | Impact | Pourquoi |
|---|---|---|
| **Analytics avancées** | Dashboards RH puissants | Actuel trop basique (juste %) |
| **Synchronisation SIRH** | Master data unique | Workday, ADP, Paie via API |
| **Intégration calendrier** (Google/Outlook) | Blocages directement dans agenda | Gestion temps entretiens |
| **Rapports PDF paramétriés** | Export massif batch | RH demande régulièrement |
| **SSO / SAML** | Expérience connexion unifiée | Tech-savy orgas seulement |
| **Mobile-first interface** | Managers en déplacement | Actuellement desktop-only |
| **Webhooks sortants** | Connecter Slack, Teams, Zapier | Intégration écosystème |
| **Skill mapping** | Plan de formation auto-agrégé | Nice si "aspirations" collectées |

---

## 4. Positionnement concurrentiel

### Comparaison vs. acteurs majeurs

| Dimension | NX-RH | SAP SuccessFactors | Lucca | BambooHR |
|---|---|---|---|---|
| **TCO pour 500 emp.** | €8K-15K/an (licence + hosting) | €100K+/an | €25K-40K/an | €30K-50K/an |
| **Déploiement** | Self-hosted Docker (72h) | Cloud (2-3 mois onboarding) | Cloud (4-6 sem) | Cloud (fast) |
| **Sovereignty données** | ✅ On-premise RGPD strict | ❌ AWS US default | ⚠️ EU possible | ❌ AWS/US |
| **Intégration LDAP/AD** | ✅ Native, mature | ⚠️ Coûteux plugin | ✅ Natif | ⚠️ Payant addon |
| **Modules couverts** | 🟢 Evals uniquement | 🟢🟢🟢 Paie, talent, talent marketplace, benefits | 🟢🟢 Evals + paie légère + planning | 🟢 Evals + talent + recrutement |
| **Richesse UX** | 🟡 Basique mais fonctionnelle | 🟢 Complexe, peu intuitive | 🟢 Moderne, Tailwind-like | 🟢 Très moderne, mobile-first |
| **Support LDAP** | Multi (AD, OpenLDAP) | ⚠️ Coûteux | ✅ Standard | ❌ Payant |
| **Segment cible** | ETI/PME FR tech-aware | Enterprise (CAC) | ETI/PME FR | SMB/PME |
| **Point faible** | Features core limités | Complexité, vendor lock-in | Analytics faibles | Chères pour petites orgas |

### Positionnement stratégique unique
**"Lightweight, self-hosted alternative to SuccessFactors for European SMBs with RGPD requirements"**

- **Vs. SAP** : 90% moins cher, 80% plus simple, 100% self-hosted, ZERO vendor lock-in
- **Vs. Lucca** : Mieux intégré LDAP, architecture plus clean (Vite/React vs. legacy), 2x plus rapide
- **Vs. BambooHR** : On-premise par défaut, RGPD compliant, TCO prévisible

**Vulnerability** : Pas de vision intégrée SIRH. Un prospect qui veut "paie + evals" ira chez Lucca. Un qui veut "talent management 360°" ira chez SAP.

---

## 5. Product-Market Fit — Segmentation

### 🎯 PMF **STRONG** (aujourd'hui)
**Segment :** Organisations ETI (250-1500 emp) en France + Benelux  
**Caractéristiques :**
- Strict RGPD / sovereignty données
- Infrastructure IT existante (AD/LDAP)
- Pas d'ambition paie/masse salariale
- Budget serré vs. SAP (€50K/an max)
- Culture "simple & fonctionnel"

**Exemples :** Ministère, collectivités territoriales, mutuelles, PME logistique, startup deep-tech à croissance rapide  
**TAM estimé (France) :** ~3K organizations

---

### 🎯 PMF **MEDIUM** (avec 2-3 features)
**Segment :** PME pure (50-300 emp) sans IT fort  
**Blockers actuels :** Complexité déploiement Docker, pas de SaaS option  
**Fix requis :**
- Offre **SaaS entièrement managée** (Heroku-like)
- Setup wizard ultra-simplifié (no LDAP/Docker required)
- Déploiement one-click

**Marché potentiel (EU):** ~15K organisations  
**TAM à débloquer :** €10-20M ARR possible

---

### 🎯 PMF **LOW** (ne fonctionne pas)
- **Enterprise (>5000 emp)** : Besoin SIRH complet (NX-RH n'offre que 5% du besoin)
- **USA-based** : Pas de killer feature vs. BambooHR/ADP/Workday
- **Sector public sans legacy IT** : Trop technique, préfèrent cloud
- **Startups pure cloud** : Hébergement on-premise = bad fit

---

## 6. Risques produit majeurs

### 🚨 Risque #1 : Marché de niche trop petit
**Problème :** NX-RH ne parle à qu'**un seul cas**: "RGPD + self-hosted + evaluations-only"  
**Impact :** TAM réel ~€8-15M en FR/BeNeLux (vs. €800M pour Lucca en EU)  
**Mitigation :**
- Élargir à "talent management" léger (objectives, skills, career paths)
- Ajouter un module "paie simplifié" (SURTOUT en FR où c'est complexe)
- Lancer SaaS version pour le marché SMB non-IT

---

### 🚨 Risque #2 : Arrivée d'un consolidateur qui copy le modèle
**Scenario :** Lucca, ADP, ou acteur local lancent "lightweight RGPD alternative"  
**Probabilité :** HAUTE (c'est trivial pour eux)  
**Defense:** Brand + communauté + open-source (si applicable) + spécialisation verticale

---

### 🚨 Risque #3 : Churn client massif faute de features baseline
**Problème :** Sans P0s résolus (reminders, PDF, sig électro), clients churn après Y1  
**Impact :** NPS négatif, pas de renouvellement, coût acquisition jamais amorti  
**Mitigation :** **Ship P0s en Q3-Q4** avant de penser revenue

---

### 🚨 Risque #4 : Complexité architecture tech repousse le marché
**Actuel :**
- Docker + Nginx + MongoDB + Node + React = **stack moderne mais opaque pour non-devs**
- Setup déploiement dépend de IT mature
- Pas d'alternative SaaS = "trop cher en TCO interne"

**Impact :** Prospects doivent payer €10K-20K intégration + €8K/an license = barrage prix invisible  
**Mitigation :** Offre **"managed SaaS"** (NX-RH hébergé par vous, setup 24h)

---

### 🚨 Risque #5 : Burnout dev / product roadmap non-clair
**Actuel :** 53 pages React, 14 modèles DB, routes complexes. Maintenance chère.  
**Problème :** Sans Product Manager dédié et roadmap claire, accumulation de "nice-to-have" dilue impact.  
**Fix :** Roadmap trimestrielle communiquée clients

---

## 7. Roadmap suggérée (top 5 features — 18 mois)

### Q3-Q4 2025 — **Phase SURVIVAL** (P0s)

#### Feature #1: Smart Reminder Engine
**Objectif :** Zéro évaluations manquées = zéro frustration  
**Spec :**
- Emails rappel à J-14, J-7, J-3, J-1 (configurable)
- Escalation: si non-start à J-7 → manager reçoit email
- In-app notifications (badge count) des actions attendues
- Slack/Teams webhook intégration (pro feature)

**Value :** Réduction churn 60% (données usage montrent > 40% campagnes trainées)  
**Effort :** 2 sprints (scheduler + template design + testing)  
**Cost :** €35K dev

---

#### Feature #2: PDF Export & Signature Électronique
**Objectif :** Conformité légale FR + valeur perçue  
**Spec :**
- Export PDF de l'entretien finalisé (one-pager pro)
- Signature électronique simple (e-sign API OU local bcrypt-based PIN)
- Audit trail immuable
- Archive 10 ans min.

**Value :** Deal-closer pour secteur public, ETI  
**Effort :** 3 sprints (PDF gen + sig auth + audit)  
**Cost :** €50K dev

---

#### Feature #3: Auto-save Brouillon + Rich Text
**Objectif :** Employés no longer lose work + meilleure UX input  
**Spec :**
- Sauvegarde auto chaque 30s (debounce optimisé)
- Rich text basique (bold, italic, bullet, link)
- Indicateur "saved" vs. "unsaved" en temps réel
- Conflict resolution (si 2 tabs ouvertes)

**Value :** UX baseline modern apps, réduction frustration  
**Effort :** 2 sprints (React context + TipTap editor)  
**Cost :** €25K dev

---

### Q1-Q2 2026 — **Phase ENGAGEMENT** (P1s)

#### Feature #4: Kanban Board + Notifications
**Objectif :** Managers see status at-a-glance + proactive alerts  
**Spec :**
- Kanban board (assigned → in_progress → submitted → reviewed → signed → validated)
- Drag-drop pour status changes (intuitive)
- Filterby department / person / deadline
- Manager receives push notification: "2 evals pending review, due tomorrow"

**Value :** 3x faster manager workflow, visual progress  
**Effort :** 3 sprints (React component + drag-drop logic + filtering)  
**Cost :** €40K dev

---

#### Feature #5: Analytics Dashboard 2.0 (RH)
**Objectif :** RH voit les patterns, peut décider  
**Spec :**
- Comparaison Year-over-Year (N vs N-1 vs N-2)
- Distribution des notes (histogram)
- Heatmap: par département, par manager, par niveau
- Correlation: score vs. turnover, score vs. promo
- Benchmarks: % ontime submission, avg time to complete
- One-click export (CSV for Excel power users, PDF for board)

**Value :** RH peut presenter insights à comité, improves data-driven decisions  
**Effort :** 4 sprints (D3/Recharts + aggregation pipelines)  
**Cost :** €55K dev

---

### Budget & Timeline

| Phase | Features | Timeline | Dev Cost | Total |
|---|---|---|---|---|
| **Survival** | Reminders + PDF + Auto-save | Q3-Q4 2025 | €110K | €110K |
| **Engagement** | Kanban + Analytics2.0 | Q1-Q2 2026 | €95K | €95K |
| **TOTAL** | — | 9 mois | €205K | €205K |

---

## 8. Recommandations stratégiques

### Strategy #1 : Reposition as "GDPR-first evaluation SaaS"
**Actuel messaging :** "Lightweight RH platform"  
**Proposed :** "The only EU-native, self-hosted performance review platform. Built for RGPD."

**Why :**
- Differentiateur clair vs. SAP/Lucca (qui sont "GDPR-compliant" post-facto)
- Resonates strongly with public sector, finance, healthcare
- Command premium pricing (€50K/an vs. €20K for generic tools)

---

### Strategy #2 : Launch SaaS "managed" tier
**Problem :** SMB markt (50-300 emp) wants SaaS, not self-hosted.  
**Solution :**
- Offer "NX-RH Managed" (you host on secure EU infra, €2/user/month)
- Still self-hosted FOR THEM (separate DB, encryption keys)
- Setup wizard: first eval in 24h vs. 72h DIY

**TAM unlock :** +€8M additional market (5K SMBs × €1500/an avg)

---

### Strategy #3 : Verticalize for specific industry verticals
**Play #1 — Public Sector** (France ministères)
- RGPD is hygiene factor, not differentiator
- **New differentiator:** Conformité avec décrets RMPP/RH publique
- **Bundled :** Template library pré-remplie, intégration SIRH (SIRH commune)
- **Pricing :** €15/user/year (volume) + setup €30K

**Play #2 — Healthcare** (cliniques, hôpitaux)
- **Angle :** Signature électronique LPS (légal requirement)
- **Bundle :** 360° templates pour infirmiers/médecins, anonymisation strict
- **Pricing :** €40/user/year

**Play #3 — Financial Services**
- **Angle :** Audit-trail immutable (compliance requirement)
- **Bundle :** Performance-to-compensation mapping, audit export
- **Pricing :** €50/user/year (premium)

---

### Strategy #4 : Consider open-source model hybrid
**Current :** Proprietary + commercial license  
**Proposed :** Open-source core + **commercial "Pro" features**

**Benefits :**
- Gain community contributions (reminders, integrations)
- Reduce perception of vendor lock-in
- Build brand credibility in European public sector

**Pro-tier features :**
- Advanced analytics (BI-grade)
- SSO / SAML
- Webhooks / API access
- SLA support

**Revenue model:** €500K from "Pro" licenses (20% adoption) + services

---

### Strategy #5 : Build marketplace for templates + industry packs
**Angle :** Reduce "blank page" problem (RH hates designing templates)  
**Offering :**
- Buy pre-built template packs (€500-2K each)
  - "Tech startup" (startup-stage eval form)
  - "Public sector manager" (RMPP-aligned)
  - "Healthcare" (competency-based for nurses)
- Certified template creators earn 30% revenue share
- RH can customize templates (fork model)

**Revenue :** €2-5/user/month if adopted 30% of base (5% margin)

---

## 9. Métriques de succès à tracker

### Onboarding
- [ ] **Time-to-first-eval** : Target < 24h (currently unknown, likely 72h+)
- [ ] **Setup success rate** : % deployments without failed attempts
- [ ] **Adopter NPS at Day 30** : Should be +40 minimum

### Usage
- [ ] **Monthly Active Users** : % of licensed seats using per month
- [ ] **Eval completion rate** : % of assigned evals submitted on time
- [ ] **Manager engagement** : % managers doing reviews (not just admins)
- [ ] **Avg time to complete eval** : Minutes (target: <15 min)

### Retention
- [ ] **Net retention rate** : >100% (upsell expansion)
- [ ] **1-year retention** : Target >85% (currently unknown, assume 60%)
- [ ] **Churn reason analysis** : Track why customers leave

### Monetization
- [ ] **ARR** : Annual recurring revenue (current: unknown)
- [ ] **CAC payback** : Months to break even on acquisition cost
- [ ] **LTV** : Lifetime value per customer

---

## 10. Go-to-Market playbook (next 12 months)

### Phase 1 — Launch (Q3 2025)
- **Target segment :** French ministries + large collectivities
- **Sales approach :** Direct outreach via Boite Telecom / tender programs
- **Marketing :** Blog "RGPD + evals without SAP" + webinar series
- **Pricing :** €25/user/year (enterprise) + €40K setup

### Phase 2 — Scale (Q4 2025 - Q2 2026)
- **Expand segment :** Mutuelle + assurance (RGPD sensitivity)
- **Launch SaaS tier :** €2.5/user/month (SMB play)
- **Build partnerships :** 2-3 SI/conseil firms for resale
- **Product :** Ship P0s (reminders, PDF, auto-save)

### Phase 3 — Verticalize (Q3 2026+)
- **Launch industry packs :** Public sector, healthcare, finance
- **Open-source program :** Release core under AGPL + commercial Pro tier
- **Marketplace :** Templates, integrations

---

## 11. Conclusion & Vue d'ensemble

### Synthèse

| Dimension | Rating | Commentaire |
|---|---|---|
| **Product-market fit** | 6/10 | Strong pour niche RGPD, faible pour marché large |
| **Execution quality** | 7/10 | Architecture clean, UX basique, bugs mineurs |
| **Readiness to sell** | 5/10 | P0s manquants bloqueraient 70% des prospects |
| **TAM réalisable** | €8-20M/an | Realistic in EU market, conservative estimate |
| **Competitive moat** | 6/10 | Self-hosted + LDAP est unique, mais copiable |
| **Go-to-market clarity** | 4/10 | Pas de clear ICP / GTM playbook = scattered sales |

### Recommendation to Product Leadership

**DO NOT attempt Enterprise (SAP) positioning.** You'll lose to them every time on features + budget.

**DO:**
1. **Own the "GDPR + self-hosted" space in Europe** (positioning)
2. **Resolve all P0 features by Q4 2025** (product roadmap priority)
3. **Launch SaaS tier Q1 2026** (TAM unlock)
4. **Build vertical packs for public sector** (sales acceleration)
5. **Track NPS + churn obsessively** (retention baseline)

**If executed well:** $2-3M ARR achievable by EOY 2026 (50-100 customers at €25-40K/year average).  
**If not:** Marginal tool used by 5-10 organizations, slow decline.

---

### Contact for questions
Analysis by Product Manager (Senior SaaS)  
Date: 2025-05-24  
Repository: NX-RH

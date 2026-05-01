# NX-RH — Système de Notifications (Frontend v2)

> **Spec** : Design complet du système de notifications in-app, email et alertes
> **Stack** : React 18 + Vite + TypeScript + Tailwind CSS · Couleur primaire : `#17A8D4`
> **Source** : `01-features.md` · `models/User.js` · `config/constants.js`
> **Langue** : Français

---

## 1. Catalogue des types de notifications

### 1.1 Types backend natifs (NOTIF_PREF_KEYS)

| Type ID | Nom | Icône (Lucide) | Couleur | Qui la reçoit | Déclencheur backend |
|---------|-----|----------------|---------|---------------|---------------------|
| `campaignLaunch` | Campagne lancée | `Megaphone` | info | hr · admin · participants des depts ciblés | `PATCH /campaigns/:id` → `status: active` |
| `evaluationAssigned` | Évaluation assignée | `ClipboardList` | info | employee (évalué) · manager · director | `POST /evaluations` ou bulk |
| `evaluationSubmitted` | Évaluation soumise | `Send` | success | manager concerné · hr · admin | `PATCH /evaluations/:id` → `submitted` |
| `deadlineReminder` | Rappel d'échéance | `Clock` | warning | évaluateurs concernés | Scheduler J-7 et J-1 avant `expiresAt` |
| `managerActionRequired` | Action manager requise | `AlertCircle` | warning | employee (évalué) | Éval → `reviewed` ou `signed_hr` |
| `systemAlerts` | Alerte système | `ShieldAlert` | error | admin | Erreurs techniques, seuils critiques |

### 1.2 Types dérivés (inférés des transitions métier)

| Type ID | Nom | Icône (Lucide) | Couleur | Qui la reçoit | Déclencheur backend |
|---------|-----|----------------|---------|---------------|---------------------|
| `evaluationReviewed` | Évaluation révisée | `Eye` | success | employee (évalué) | Éval → `reviewed` (via `managerActionRequired`) |
| `evaluationSignedByEvaluatee` | Signée par l'évalué | `PenLine` | success | manager · director | Éval → `signed_evaluatee` |
| `evaluationSignedByManager` | Signée par le manager | `CheckSquare` | success | hr · admin | Éval → `signed_manager` |
| `evaluationSignedByHR` | Validée RH | `BadgeCheck` | success | manager · employee (évalué) | Éval → `signed_hr` |
| `evaluationValidated` | Évaluation clôturée | `Trophy` | success | évaluateur · évalué | Éval → `validated` |
| `evaluationExpired` | Évaluation expirée | `TimerOff` | error | admin · hr · évaluateur | Scheduler : `expiresAt` dépassé |
| `evaluationReassigned` | Évaluateur réaffecté | `UserCheck` | info | nouvel évaluateur | `PATCH /evaluations/:id/reassign` |
| `formFrozen` | Formulaire gelé | `Lock` | warning | admin · hr | 1ère évaluation créée sur ce formulaire |
| `offboardingInitiated` | Départ initié | `LogOut` | warning | admin · hr | `POST /offboarding` |
| `offboardingCompleted` | Départ finalisé | `UserX` | info | admin · hr | `PATCH /offboarding/:id` → `completed` |
| `ldapSyncComplete` | Synchro LDAP terminée | `RefreshCw` | info | admin | `POST /admin/ldap/sync` (succès) |
| `ldapSyncFailed` | Synchro LDAP échouée | `WifiOff` | error | admin | `POST /admin/ldap/sync` (erreur) |
| `onboardingComplete` | Onboarding finalisé | `PartyPopper` | success | admin · hr · manager direct | `PATCH /users/:id/onboarding/complete` |
| `evaluationBulkCreated` | Évaluations créées en masse | `Layers` | info | admin · hr | `POST /evaluations/bulk` |

---

### 1.3 Définitions détaillées par type

#### `campaignLaunch`
- **Titre** : `Campagne "{{campaignName}}" est maintenant active`
- **Corps** : `La campagne {{campaignName}} vient d'être lancée. Vos évaluations sont disponibles jusqu'au {{endDate}}.`
- **CTA** : `Voir la campagne` → `/campaigns/{{campaignId}}`
- **Priorité** : haute · **Auto-dismiss** : non

#### `evaluationAssigned`
- **Titre** : `Une évaluation vous a été assignée`
- **Corps** : `Vous avez une nouvelle évaluation à compléter pour la campagne {{campaignName}}. Échéance : {{expiresAt}}.`
- **CTA** : `Commencer l'évaluation` → `/evaluations/{{evaluationId}}`
- **Priorité** : haute · **Auto-dismiss** : non

#### `evaluationSubmitted`
- **Titre** : `{{evaluateeName}} a soumis son évaluation`
- **Corps** : `L'évaluation de {{evaluateeName}} (campagne {{campaignName}}) attend votre révision.`
- **CTA** : `Réviser l'évaluation` → `/evaluations/{{evaluationId}}`
- **Priorité** : haute · **Auto-dismiss** : non

#### `deadlineReminder`
- **Titre** : `Rappel : évaluation à soumettre {{daysLeft}}`
- **Corps** : `Votre évaluation pour {{campaignName}} expire {{daysLeft}}. Pensez à la soumettre.`
  - J-7 : `daysLeft = "dans 7 jours"` · J-1 : `daysLeft = "demain"`
- **CTA** : `Reprendre l'évaluation` → `/evaluations/{{evaluationId}}`
- **Priorité** : J-7 = medium · J-1 = urgent · **Auto-dismiss** : non

#### `managerActionRequired`
- **Titre** : `Action requise sur votre évaluation`
- **Corps** : `Votre évaluation (campagne {{campaignName}}) a été révisée et attend votre signature.`
- **CTA** : `Signer l'évaluation` → `/evaluations/{{evaluationId}}`
- **Priorité** : haute · **Auto-dismiss** : non

#### `systemAlerts`
- **Titre** : `Alerte système : {{alertTitle}}`
- **Corps** : `{{alertMessage}}`
- **CTA** : `Voir les détails` → `/admin/config` ou `/admin/audit`
- **Priorité** : urgent · **Auto-dismiss** : non

#### `evaluationReviewed`
- **Titre** : `Votre évaluation a été révisée`
- **Corps** : `{{reviewerName}} a terminé la révision de votre évaluation (campagne {{campaignName}}). Vous pouvez maintenant la signer.`
- **CTA** : `Consulter et signer` → `/evaluations/{{evaluationId}}`
- **Priorité** : haute · **Auto-dismiss** : non

#### `evaluationSignedByEvaluatee`
- **Titre** : `{{evaluateeName}} a signé son évaluation`
- **Corps** : `L'évaluation de {{evaluateeName}} attend désormais votre co-signature de manager.`
- **CTA** : `Co-signer` → `/evaluations/{{evaluationId}}`
- **Priorité** : haute · **Auto-dismiss** : non

#### `evaluationSignedByManager`
- **Titre** : `Évaluation prête pour validation RH`
- **Corps** : `L'évaluation de {{evaluateeName}} a été co-signée par le manager. Validation RH requise.`
- **CTA** : `Valider` → `/evaluations/{{evaluationId}}`
- **Priorité** : medium · **Auto-dismiss** : non

#### `evaluationSignedByHR`
- **Titre** : `Votre évaluation a été validée par les RH`
- **Corps** : `L'évaluation de la campagne {{campaignName}} a reçu la validation RH.`
- **CTA** : `Voir l'évaluation` → `/evaluations/{{evaluationId}}`
- **Priorité** : low · **Auto-dismiss** : oui, 8s

#### `evaluationValidated`
- **Titre** : `Évaluation finalisée ✓`
- **Corps** : `L'évaluation {{campaignName}} est maintenant clôturée. Vous pouvez télécharger le compte-rendu PDF.`
- **CTA** : `Télécharger le PDF` → `/evaluations/{{evaluationId}}/pdf`
- **Priorité** : low · **Auto-dismiss** : oui, 6s

#### `evaluationExpired`
- **Titre** : `Évaluation expirée — {{evaluateeName}}`
- **Corps** : `L'évaluation de {{evaluateeName}} (campagne {{campaignName}}) a expiré sans être soumise.`
- **CTA** : `Voir les détails` → `/evaluations/{{evaluationId}}`
- **Priorité** : medium · **Auto-dismiss** : non

#### `evaluationReassigned`
- **Titre** : `Une évaluation vous a été réaffectée`
- **Corps** : `L'évaluation de {{evaluateeName}} (campagne {{campaignName}}) a été transférée vers vous.`
- **CTA** : `Voir l'évaluation` → `/evaluations/{{evaluationId}}`
- **Priorité** : haute · **Auto-dismiss** : non

#### `formFrozen`
- **Titre** : `Formulaire "{{formTitle}}" gelé`
- **Corps** : `La première évaluation a été créée sur ce formulaire. Les questions ne peuvent plus être modifiées.`
- **CTA** : `Voir le formulaire` → `/forms/{{formId}}`
- **Priorité** : low · **Auto-dismiss** : oui, 8s

#### `offboardingInitiated`
- **Titre** : `Départ initié pour {{employeeName}}`
- **Corps** : `Le processus de départ de {{employeeName}} a été lancé. Dernier jour : {{lastDay}}.`
- **CTA** : `Gérer le départ` → `/offboarding/{{offboardingId}}`
- **Priorité** : haute · **Auto-dismiss** : non

#### `offboardingCompleted`
- **Titre** : `Départ de {{employeeName}} finalisé`
- **Corps** : `Toutes les étapes de départ ont été complétées. Le compte a été désactivé.`
- **CTA** : `Voir le dossier` → `/offboarding/{{offboardingId}}`
- **Priorité** : medium · **Auto-dismiss** : oui, 8s

#### `ldapSyncComplete`
- **Titre** : `Synchronisation LDAP terminée`
- **Corps** : `{{newUsers}} nouveaux utilisateurs importés, {{updatedUsers}} mis à jour.`
- **CTA** : `Voir les utilisateurs` → `/users`
- **Priorité** : low · **Auto-dismiss** : oui, 6s

#### `ldapSyncFailed`
- **Titre** : `Échec de la synchronisation LDAP`
- **Corps** : `La synchronisation a échoué : {{errorMessage}}. Vérifiez la configuration.`
- **CTA** : `Configurer LDAP` → `/admin/ldap`
- **Priorité** : urgent · **Auto-dismiss** : non

#### `onboardingComplete`
- **Titre** : `Onboarding terminé — {{employeeName}}`
- **Corps** : `{{employeeName}} a finalisé toutes les étapes d'intégration.`
- **CTA** : `Voir le profil` → `/users/{{userId}}`
- **Priorité** : low · **Auto-dismiss** : oui, 6s

#### `evaluationBulkCreated`
- **Titre** : `{{count}} évaluations créées en masse`
- **Corps** : `La création en masse pour la campagne {{campaignName}} est terminée : {{success}} réussies, {{skipped}} ignorées.`
- **CTA** : `Voir les évaluations` → `/evaluations?campaignId={{campaignId}}`
- **Priorité** : medium · **Auto-dismiss** : oui, 8s

---

## 2. Composants UI de notification

### 2.1 Toast (notification éphémère)

**Position** : bas-droite desktop (`bottom-4 right-4`) · haut-centre mobile (`top-4 left-1/2 -translate-x-1/2`)

**Durées** :
- `info` / `success` → 4 000 ms puis auto-dismiss
- `warning` → 8 000 ms puis auto-dismiss
- `error` → reste visible jusqu'à fermeture manuelle

**Empilement** : max 3 toasts visibles simultanément. Au-delà, les suivants sont mis en file d'attente (FIFO). Chaque toast entrant repousse les autres vers le haut (`translateY`).

**Structure HTML / Tailwind** :

```tsx
// Toast individuel
<div
  role="alert"
  aria-live="polite"
  className={`
    flex items-start gap-3 w-80 max-w-full p-4 rounded-xl shadow-lg
    border border-white/10 backdrop-blur-sm
    animate-in slide-in-from-bottom-2 fade-in duration-300
    ${variantClasses[variant]}
  `}
>
  {/* Icône */}
  <div className="shrink-0 mt-0.5">
    <Icon className={`w-5 h-5 ${iconColorClasses[variant]}`} />
  </div>

  {/* Contenu */}
  <div className="flex-1 min-w-0">
    <p className="text-sm font-semibold text-white leading-snug truncate">
      {title}
    </p>
    {message && (
      <p className="text-xs text-white/70 mt-0.5 line-clamp-2">{message}</p>
    )}
    {action && (
      <button
        onClick={action.onClick}
        className="mt-2 text-xs font-medium text-[#17A8D4] hover:underline focus:outline-none"
      >
        {action.label} →
      </button>
    )}
  </div>

  {/* Bouton fermeture */}
  <button
    onClick={onDismiss}
    aria-label="Fermer"
    className="shrink-0 text-white/40 hover:text-white/80 transition-colors"
  >
    <X className="w-4 h-4" />
  </button>

  {/* Barre de progression */}
  {duration > 0 && (
    <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full overflow-hidden">
      <div
        className={`h-full ${progressColorClasses[variant]} animate-shrink`}
        style={{ animationDuration: `${duration}ms` }}
      />
    </div>
  )}
</div>
```

**Classes par variante** :

| Variante | Container | Icône | Barre |
|----------|-----------|-------|-------|
| `success` | `bg-emerald-900/90 border-emerald-700/40` | `text-emerald-400` | `bg-emerald-400` |
| `error` | `bg-red-900/90 border-red-700/40` | `text-red-400` | `bg-red-400` |
| `warning` | `bg-amber-900/90 border-amber-700/40` | `text-amber-400` | `bg-amber-400` |
| `info` | `bg-slate-800/95 border-slate-700/40` | `text-[#17A8D4]` | `bg-[#17A8D4]` |

**Keyframe `animate-shrink`** :
```css
@keyframes shrink {
  from { width: 100%; }
  to   { width: 0%;   }
}
```

**Container global** (portail React) :
```tsx
<div
  aria-label="Notifications"
  className="fixed bottom-4 right-4 z-[9999] flex flex-col-reverse gap-2 items-end
             sm:bottom-4 sm:right-4
             max-sm:top-4 max-sm:left-1/2 max-sm:-translate-x-1/2 max-sm:w-[calc(100vw-2rem)]"
>
  {visibleToasts.map(toast => <Toast key={toast.id} {...toast} />)}
</div>
```

---

### 2.2 Cloche + Panneau déroulant

**Position** : barre de navigation, avant l'avatar utilisateur (côté droit).

**Badge non-lu** :
```tsx
<button
  aria-label={`Notifications — ${unreadCount} non lues`}
  className="relative p-2 rounded-lg hover:bg-white/5 transition-colors"
>
  <Bell className="w-5 h-5 text-slate-300" />
  {unreadCount > 0 && (
    <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px]
                     flex items-center justify-center px-1
                     rounded-full bg-red-500 text-[10px] font-bold text-white
                     ring-2 ring-slate-900 leading-none">
      {unreadCount > 99 ? '99+' : unreadCount}
    </span>
  )}
</button>
```

**Panneau déroulant (320 px)** :
```tsx
<div
  role="dialog"
  aria-label="Centre de notifications"
  className="absolute top-full right-0 mt-2 w-80 rounded-xl border border-white/10
             bg-slate-900/95 backdrop-blur-md shadow-2xl shadow-black/40 z-50
             flex flex-col overflow-hidden"
>
  {/* En-tête */}
  <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
    <h2 className="text-sm font-semibold text-white">Notifications</h2>
    <button
      onClick={markAllRead}
      className="text-xs text-[#17A8D4] hover:underline disabled:opacity-40"
      disabled={unreadCount === 0}
    >
      Tout marquer lu
    </button>
  </div>

  {/* Liste (max 480 px avec scroll) */}
  <div className="max-h-[480px] overflow-y-auto divide-y divide-white/5">
    {notifications.length === 0 ? <EmptyState /> : notifications.map(n => (
      <NotificationItem key={n.id} notification={n} />
    ))}
  </div>

  {/* Pied de panneau */}
  <div className="px-4 py-3 border-t border-white/10 text-center">
    <Link
      to="/notifications"
      className="text-xs text-[#17A8D4] hover:underline"
    >
      Voir toutes les notifications
    </Link>
  </div>
</div>
```

**Item de notification** :
```tsx
<div
  onClick={() => { markAsRead(n.id); navigate(n.actionUrl) }}
  className={`
    group relative flex items-start gap-3 px-4 py-3 cursor-pointer
    transition-colors hover:bg-white/5
    ${!n.read ? 'bg-[#17A8D4]/5' : ''}
  `}
>
  {/* Point non-lu */}
  {!n.read && (
    <span className="absolute left-2 top-1/2 -translate-y-1/2
                     w-1.5 h-1.5 rounded-full bg-[#17A8D4]" />
  )}

  {/* Icône colorée */}
  <div className={`shrink-0 mt-0.5 p-1.5 rounded-lg ${iconBg[n.variant]}`}>
    <n.Icon className={`w-4 h-4 ${iconColor[n.variant]}`} />
  </div>

  {/* Contenu */}
  <div className="flex-1 min-w-0">
    <p className={`text-sm leading-snug truncate ${!n.read ? 'font-semibold text-white' : 'text-slate-300'}`}>
      {n.title}
    </p>
    <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{n.message}</p>
    <p className="text-[11px] text-slate-600 mt-1">{formatRelativeTime(n.createdAt)}</p>
  </div>

  {/* Action au survol */}
  <button
    onClick={(e) => { e.stopPropagation(); markAsRead(n.id) }}
    aria-label="Marquer comme lu"
    className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity
               p-1 rounded hover:bg-white/10 text-slate-500 hover:text-slate-300"
  >
    <Check className="w-3.5 h-3.5" />
  </button>
</div>
```

**État vide** :
```tsx
<div className="flex flex-col items-center justify-center py-12 px-4 gap-3">
  <BellOff className="w-10 h-10 text-slate-600" />
  <p className="text-sm text-slate-500 text-center">Aucune notification pour le moment</p>
</div>
```

---

### 2.3 Bannières d'alerte in-page

Positionnement : **sous le header de page, au-dessus du contenu principal**. Maximum 2 bannières simultanées.

```tsx
// Bannière d'alerte
<div
  role="alert"
  className={`
    flex items-center gap-3 px-4 py-3 rounded-lg mb-4 text-sm
    ${variantClasses[type]}
    ${dismissible ? '' : 'pr-4'}
  `}
>
  <AlertIcon className="w-4 h-4 shrink-0" />
  <span className="flex-1">{message}</span>
  {action && (
    <Link to={action.href} className="font-medium underline underline-offset-2 shrink-0">
      {action.label}
    </Link>
  )}
  {dismissible && (
    <button onClick={onDismiss} aria-label="Fermer" className="ml-2 shrink-0 opacity-60 hover:opacity-100">
      <X className="w-4 h-4" />
    </button>
  )}
</div>
```

**Variantes** :

| Type | Classes | Icône | Dismissible |
|------|---------|-------|-------------|
| `info` | `bg-[#17A8D4]/10 border border-[#17A8D4]/30 text-[#17A8D4]` | `Info` | oui |
| `warning` | `bg-amber-500/10 border border-amber-500/30 text-amber-400` | `AlertTriangle` | oui |
| `critical` | `bg-red-500/10 border border-red-500/30 text-red-400` | `AlertOctagon` | **non** |

**Exemples de bannières contextuelles** :

| Page | Condition | Type | Message |
|------|-----------|------|---------|
| `/evaluations` | Évaluations en attente de signature | `warning` | `Vous avez {{n}} évaluation(s) en attente de votre signature.` |
| `/evaluations/:id` | Formulaire soumis (non modifiable) | `info` | `Cette évaluation a été soumise et ne peut plus être modifiée.` |
| `/forms/:id` | `frozenAt` renseigné | `warning` | `Ce formulaire est gelé — les questions ne peuvent plus être modifiées.` |
| `/campaigns/:id` | Campagne `closed` | `info` | `Cette campagne est clôturée. Aucune nouvelle évaluation ne peut être créée.` |
| `/users/:id` | Offboarding en cours | `critical` | `Un processus de départ est en cours pour cet utilisateur.` |

---

### 2.4 Templates d'emails de notification

> Les emails sont envoyés via le service configuré dans `POST /admin/config` (SMTP). En développement : prévisualisation Ethereal via `POST /admin/email/test`.

#### `campaignLaunch`
- **Objet** : `[NX-RH] La campagne "{{campaignName}}" est lancée`
- **Preview** : `Vos évaluations sont maintenant disponibles jusqu'au {{endDate}}`
- **Contenu** : Logo NX-RH · Titre campagne · Dates (début/fin) · Résumé des évaluations assignées · Lien de connexion
- **CTA** : `Accéder à mes évaluations` → `{{appBaseUrl}}/evaluations`
- **Désinscription** : *Gérez vos préférences de notification dans votre profil*

#### `evaluationAssigned`
- **Objet** : `[NX-RH] Nouvelle évaluation à compléter — {{campaignName}}`
- **Preview** : `Échéance : {{expiresAt}}. Cliquez pour commencer.`
- **Contenu** : Informations campagne · Type de formulaire · Échéance mise en évidence
- **CTA** : `Commencer l'évaluation` → `{{appBaseUrl}}/evaluations/{{evaluationId}}`
- **Désinscription** : *Modifier mes préférences* → `{{appBaseUrl}}/profile#notifications`

#### `deadlineReminder`
- **Objet** : `[NX-RH] ⚠️ Rappel : évaluation à soumettre {{daysLeft}}`
- **Preview** : `Ne laissez pas votre évaluation expirer — soumettez-la avant le {{expiresAt}}`
- **Contenu** : Nom de la campagne · Barre de progression de l'évaluation · Urgence visuelle J-1
- **CTA** : `Reprendre l'évaluation` → `{{appBaseUrl}}/evaluations/{{evaluationId}}`
- **Désinscription** : *Modifier mes préférences*

#### `evaluationSubmitted`
- **Objet** : `[NX-RH] {{evaluateeName}} a soumis son évaluation`
- **Preview** : `Révision en attente pour la campagne {{campaignName}}`
- **Contenu** : Nom de l'évalué · Campagne · Statut actuel · Actions disponibles
- **CTA** : `Réviser maintenant` → `{{appBaseUrl}}/evaluations/{{evaluationId}}`
- **Désinscription** : *Modifier mes préférences*

#### `managerActionRequired`
- **Objet** : `[NX-RH] Votre évaluation attend votre signature`
- **Preview** : `{{reviewerName}} a terminé sa révision. Signez votre évaluation.`
- **Contenu** : Résumé de la révision (score visible si partagé) · Prochaines étapes
- **CTA** : `Signer mon évaluation` → `{{appBaseUrl}}/evaluations/{{evaluationId}}`
- **Désinscription** : *Modifier mes préférences*

#### `systemAlerts` (admin uniquement)
- **Objet** : `[NX-RH] 🚨 Alerte système : {{alertTitle}}`
- **Preview** : `Action requise — {{alertMessage}}`
- **Contenu** : Détail technique · Stack trace partielle si disponible · Lien vers l'audit
- **CTA** : `Voir la piste d'audit` → `{{appBaseUrl}}/admin/audit`
- **Désinscription** : *Non applicable (alertes critiques)*

---

## 3. Interface des préférences de notification

**Route** : `/profile#notifications` (ancre dans la page de profil)

### 3.1 Structure de l'écran

```
┌─────────────────────────────────────────────────────────┐
│  Préférences de notification                            │
│  Choisissez quelles notifications vous souhaitez        │
│  recevoir et via quels canaux.                          │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  📋 ÉVALUATIONS                                         │
│  ─────────────────────────────────────────────────────  │
│  Évaluation assignée          [✓ In-app] [✓ Email]     │
│  Rappel d'échéance            [✓ In-app] [✓ Email]     │
│  Action manager requise       [✓ In-app] [✓ Email]     │
│  Évaluation soumise (*)       [✓ In-app] [✓ Email]     │
│                                                         │
│  📣 CAMPAGNES                                           │
│  ─────────────────────────────────────────────────────  │
│  Lancement de campagne (**)   [✓ In-app] [✓ Email]     │
│                                                         │
│  ⚙️  SYSTÈME                                            │
│  ─────────────────────────────────────────────────────  │
│  Alertes système (***)        [✓ In-app] [✓ Email]     │
│                                                         │
│  (*) manager, director, hr, admin uniquement           │
│  (**) hr, admin uniquement                              │
│  (***) admin uniquement                                 │
│                                                         │
│            [Enregistrer les préférences]                │
└─────────────────────────────────────────────────────────┘
```

### 3.2 Composant Toggle de notification

```tsx
<div className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
  <div className="flex-1">
    <p className="text-sm font-medium text-white">{label}</p>
    {description && <p className="text-xs text-slate-500 mt-0.5">{description}</p>}
  </div>

  <div className="flex items-center gap-3 ml-4">
    {/* Canal In-app */}
    <label className="flex items-center gap-1.5 cursor-pointer">
      <input
        type="checkbox"
        checked={prefs[key]}
        onChange={(e) => updatePref(key, e.target.checked)}
        className="w-4 h-4 rounded border-slate-600 bg-slate-700
                   text-[#17A8D4] focus:ring-[#17A8D4] focus:ring-offset-slate-900"
      />
      <span className="text-xs text-slate-400">In-app</span>
    </label>

    {/* Canal Email */}
    <label className="flex items-center gap-1.5 cursor-pointer">
      <input
        type="checkbox"
        checked={emailPrefs[key]}
        onChange={(e) => updateEmailPref(key, e.target.checked)}
        className="w-4 h-4 rounded border-slate-600 bg-slate-700
                   text-[#17A8D4] focus:ring-[#17A8D4] focus:ring-offset-slate-900"
      />
      <span className="text-xs text-slate-400">Email</span>
    </label>
  </div>
</div>
```

### 3.3 Valeurs par défaut par rôle

| Clé de notification | admin | hr | director | manager | employee |
|---------------------|:-----:|:--:|:--------:|:-------:|:--------:|
| `evaluationAssigned` | ✅ on | ✅ on | ✅ on | ✅ on | ✅ on |
| `deadlineReminder` | ✅ on | ✅ on | ✅ on | ✅ on | ✅ on |
| `managerActionRequired` | — | — | — | — | ✅ on |
| `evaluationSubmitted` | ✅ on | ✅ on | ✅ on | ✅ on | — |
| `campaignLaunch` | ✅ on | ✅ on | — | — | — |
| `systemAlerts` | ❌ off | — | — | — | — |

> `—` : clé non applicable au rôle (filtrée par `NOTIF_KEYS_BY_ROLE` côté backend).
> Les clés absentes du rôle ne sont **pas affichées** dans l'interface de préférences.

### 3.4 Comportement à la sauvegarde

- `PATCH /api/auth/preferences` avec `{ notificationPrefs: { ... } }`
- **Optimistic update** : mise à jour UI immédiate avant la réponse serveur
- **Succès** → toast `success` : `"Préférences enregistrées"`
- **Erreur** → rollback état précédent + toast `error` : `"Erreur lors de la sauvegarde. Réessayez."`

---

## 4. Matrice des déclencheurs de notification

| Événement backend | Type notif | Destinataires | Canal | Priorité |
|-------------------|------------|---------------|-------|----------|
| Campagne `draft` → `active` | `campaignLaunch` | Participants depts ciblés | in-app + email | haute |
| `POST /evaluations` (individuelle) | `evaluationAssigned` | Évalué | in-app + email | haute |
| `POST /evaluations/bulk` | `evaluationAssigned` × N | Évalués concernés | in-app + email | haute |
| `POST /evaluations/bulk` (fin) | `evaluationBulkCreated` | admin · hr déclencheur | in-app | medium |
| Éval → `submitted` | `evaluationSubmitted` | Manager · director concerné | in-app + email | haute |
| Éval → `signed_evaluatee` | `evaluationSignedByEvaluatee` | Manager · director | in-app + email | haute |
| Éval → `signed_manager` | `evaluationSignedByManager` | hr · admin | in-app + email | medium |
| Éval → `signed_hr` | `evaluationSignedByHR` | Manager · évalué | in-app + email | low |
| Éval → `reviewed` | `managerActionRequired` | Évalué | in-app + email | haute |
| Éval → `validated` | `evaluationValidated` | Évaluateur · évalué | in-app + email | low |
| Scheduler J-7 avant `expiresAt` | `deadlineReminder` | Évaluateur | in-app + email | medium |
| Scheduler J-1 avant `expiresAt` | `deadlineReminder` | Évaluateur | in-app + email | urgent |
| Scheduler : `expiresAt` dépassé | `evaluationExpired` | admin · hr · évaluateur | in-app | medium |
| `PATCH /evaluations/:id/reassign` | `evaluationReassigned` | Nouvel évaluateur | in-app + email | haute |
| 1ère évaluation créée sur un formulaire | `formFrozen` | admin · hr créateur | in-app | low |
| `POST /offboarding` | `offboardingInitiated` | admin · hr | in-app + email | haute |
| `PATCH /offboarding/:id` → `completed` | `offboardingCompleted` | admin · hr | in-app | medium |
| `POST /admin/ldap/sync` (succès) | `ldapSyncComplete` | admin déclencheur | in-app | low |
| `POST /admin/ldap/sync` (erreur) | `ldapSyncFailed` | admin déclencheur | in-app + email | urgent |
| `PATCH /users/:id/onboarding/complete` | `onboardingComplete` | admin · hr · manager direct | in-app | low |
| Erreur critique applicative | `systemAlerts` | admin | in-app + email | urgent |

---

## 5. Stratégie de polling (REST sans WebSocket)

### 5.1 Logique de polling

Le backend est REST uniquement (pas de WebSocket). Le frontend poll l'endpoint `/api/auth/me` (ou un futur `GET /api/notifications`) pour récupérer le compte de notifications non lues et mettre à jour le badge de la cloche.

```ts
// hooks/useNotificationPolling.ts

const POLL_ACTIVE_MS   = 30_000   // 30s — onglet actif
const POLL_HIDDEN_MS   = 300_000  // 5min — onglet en arrière-plan

export function useNotificationPolling() {
  const queryClient = useQueryClient()
  const isVisible   = usePageVisibility() // document.visibilityState

  useEffect(() => {
    const interval = setInterval(
      () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
      isVisible ? POLL_ACTIVE_MS : POLL_HIDDEN_MS
    )
    return () => clearInterval(interval)
  }, [isVisible, queryClient])
}
```

### 5.2 Mise à jour du badge sans rechargement

```ts
// Appel GET /api/notifications?unreadOnly=true&limit=1
// → retourne { unreadCount: number, items: Notification[] }

// Le badge est piloté par React Query — mise à jour automatique
// lors de l'invalidation du cache sans reload de page
const { data } = useQuery({
  queryKey: ['notifications'],
  queryFn:  fetchNotifications,
  staleTime: 25_000,      // données fraîches 25s
  refetchOnWindowFocus: true,
})
```

### 5.3 Mise à jour optimiste du statut "lu"

```ts
// markAsRead : optimistic update
const markAsRead = useMutation({
  mutationFn: (id: string) => api.patch(`/notifications/${id}/read`),
  onMutate: async (id) => {
    await queryClient.cancelQueries({ queryKey: ['notifications'] })
    const previous = queryClient.getQueryData(['notifications'])
    queryClient.setQueryData(['notifications'], (old: NotificationList) => ({
      ...old,
      unreadCount: Math.max(0, old.unreadCount - 1),
      items: old.items.map(n => n.id === id ? { ...n, read: true } : n),
    }))
    return { previous }
  },
  onError: (_err, _id, ctx) => {
    // rollback si erreur réseau
    queryClient.setQueryData(['notifications'], ctx?.previous)
  },
})
```

### 5.4 Règles de polling par état

| État | Intervalle | Stratégie |
|------|-----------|-----------|
| Onglet actif + utilisateur connecté | 30s | `setInterval` sur `invalidateQueries` |
| Onglet masqué (`visibilityState: hidden`) | 5 min | Réduction automatique |
| Utilisateur non connecté | Aucun | Polling suspendu |
| Erreur réseau | Exponentiel (30s → 60s → 120s, max 5 min) | `react-query` retryDelay |
| Retour en avant-plan | Immédiat | `refetchOnWindowFocus: true` |

---

## 6. Centre de notifications (page complète)

**Route** : `/notifications`
**Accès** : Tous les rôles (contenu filtré par le backend selon le rôle connecté)

### 6.1 Structure de la page

```
┌─────────────────────────────────────────────────────────────────┐
│  ← Retour    Notifications          [Tout marquer lu] [Supprimer]│
├─────────────────────────────────────────────────────────────────┤
│  Filtres :                                                       │
│  [Toutes ▾] [Non lues (3) ▾] [Type ▾] [Du: ____] [Au: ____]   │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  AUJOURD'HUI                                                     │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ 🔵 [ClipboardList] Évaluation assignée          14:32   │   │
│  │    Vous avez une nouvelle évaluation à compléter…        │   │
│  │    Campagne Revue annuelle 2025 · Échéance 31/03/2025    │   │
│  │                    [Voir l'évaluation →] [✓ Lu]          │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  HIER                                                            │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │    [Send] Évaluation soumise                    Hier      │   │
│  │    Marie Dupont a soumis son évaluation (Revue 2025)      │   │
│  │                    [Réviser →] [✓ Lu]                    │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│                    [← Précédent] Page 1/4 [Suivant →]           │
└─────────────────────────────────────────────────────────────────┘
```

### 6.2 En-tête de la page

```tsx
<div className="flex items-center justify-between mb-6">
  <div>
    <h1 className="text-2xl font-bold text-white">Notifications</h1>
    <p className="text-sm text-slate-400 mt-1">
      {unreadCount > 0
        ? `${unreadCount} notification${unreadCount > 1 ? 's' : ''} non lue${unreadCount > 1 ? 's' : ''}`
        : 'Toutes les notifications ont été lues'}
    </p>
  </div>

  <div className="flex items-center gap-2">
    <button
      onClick={markAllRead}
      disabled={unreadCount === 0}
      className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm
                 text-slate-400 hover:text-white hover:bg-white/5 transition-colors
                 disabled:opacity-40 disabled:cursor-not-allowed"
    >
      <CheckCheck className="w-4 h-4" />
      Tout marquer lu
    </button>

    <button
      onClick={() => setShowBulkDelete(true)}
      className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm
                 text-slate-400 hover:text-red-400 hover:bg-red-500/5 transition-colors"
    >
      <Trash2 className="w-4 h-4" />
      Supprimer les lues
    </button>
  </div>
</div>
```

### 6.3 Filtres

```tsx
<div className="flex flex-wrap items-center gap-2 mb-6 p-4 rounded-xl bg-white/3 border border-white/8">
  {/* Statut */}
  <Select value={filter.status} onChange={v => setFilter(f => ({ ...f, status: v }))}>
    <option value="all">Toutes</option>
    <option value="unread">Non lues ({unreadCount})</option>
    <option value="read">Lues</option>
  </Select>

  {/* Type */}
  <Select value={filter.type} onChange={v => setFilter(f => ({ ...f, type: v }))}>
    <option value="">Tous les types</option>
    <option value="evaluationAssigned">Évaluations assignées</option>
    <option value="deadlineReminder">Rappels d'échéance</option>
    <option value="evaluationSubmitted">Soumissions</option>
    <option value="managerActionRequired">Actions requises</option>
    <option value="campaignLaunch">Campagnes</option>
    <option value="systemAlerts">Alertes système</option>
  </Select>

  {/* Plage de dates */}
  <input type="date" value={filter.from}
    className="px-3 py-1.5 rounded-lg bg-slate-800 border border-white/10
               text-sm text-slate-300 focus:ring-1 focus:ring-[#17A8D4]"
  />
  <span className="text-slate-600 text-sm">→</span>
  <input type="date" value={filter.to}
    className="px-3 py-1.5 rounded-lg bg-slate-800 border border-white/10
               text-sm text-slate-300 focus:ring-1 focus:ring-[#17A8D4]"
  />

  {/* Reset */}
  {hasActiveFilters && (
    <button onClick={resetFilters}
      className="text-xs text-[#17A8D4] hover:underline ml-auto">
      Réinitialiser les filtres
    </button>
  )}
</div>
```

### 6.4 Liste paginée avec regroupement par date

```tsx
// Regroupement client : Today / Yesterday / Cette semaine / Ce mois / Plus ancien
const grouped = groupNotificationsByDate(notifications)

{Object.entries(grouped).map(([label, items]) => (
  <section key={label} className="mb-6">
    <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-1">
      {label}
    </h2>
    <div className="rounded-xl border border-white/8 overflow-hidden divide-y divide-white/5">
      {items.map(n => <NotificationPageItem key={n.id} notification={n} />)}
    </div>
  </section>
))}
```

### 6.5 Pagination

```tsx
// 20 notifications par page
<div className="flex items-center justify-between mt-6">
  <p className="text-sm text-slate-500">
    Affichage {(page - 1) * PAGE_SIZE + 1} – {Math.min(page * PAGE_SIZE, total)} sur {total}
  </p>

  <div className="flex items-center gap-1">
    <PaginationButton onClick={() => setPage(p => p - 1)} disabled={page === 1}>
      <ChevronLeft className="w-4 h-4" />
    </PaginationButton>

    {pageNumbers.map(p => (
      <PaginationButton key={p} onClick={() => setPage(p)} active={p === page}>
        {p}
      </PaginationButton>
    ))}

    <PaginationButton onClick={() => setPage(p => p + 1)} disabled={page === totalPages}>
      <ChevronRight className="w-4 h-4" />
    </PaginationButton>
  </div>
</div>
```

**Classes du bouton de pagination** :
```tsx
// Actif
className="w-8 h-8 rounded-lg text-sm font-medium bg-[#17A8D4] text-white"
// Inactif
className="w-8 h-8 rounded-lg text-sm text-slate-400 hover:bg-white/5 hover:text-white transition-colors"
// Désactivé
className="w-8 h-8 rounded-lg text-sm text-slate-700 cursor-not-allowed"
```

### 6.6 État vide de la page

```tsx
<div className="flex flex-col items-center justify-center py-24 gap-4">
  <div className="p-6 rounded-2xl bg-white/3 border border-white/8">
    <BellOff className="w-12 h-12 text-slate-600" />
  </div>
  <h3 className="text-lg font-semibold text-slate-400">Aucune notification</h3>
  <p className="text-sm text-slate-600 text-center max-w-xs">
    {hasActiveFilters
      ? 'Aucune notification ne correspond à vos filtres.'
      : 'Vous n\'avez pas encore reçu de notification.'}
  </p>
  {hasActiveFilters && (
    <button onClick={resetFilters}
      className="text-sm text-[#17A8D4] hover:underline">
      Réinitialiser les filtres
    </button>
  )}
</div>
```

---

## Annexe A — Types TypeScript

```ts
export type NotificationVariant = 'info' | 'success' | 'warning' | 'error'

export type NotificationTypeId =
  | 'campaignLaunch'
  | 'evaluationAssigned'
  | 'evaluationSubmitted'
  | 'deadlineReminder'
  | 'managerActionRequired'
  | 'systemAlerts'
  | 'evaluationReviewed'
  | 'evaluationSignedByEvaluatee'
  | 'evaluationSignedByManager'
  | 'evaluationSignedByHR'
  | 'evaluationValidated'
  | 'evaluationExpired'
  | 'evaluationReassigned'
  | 'formFrozen'
  | 'offboardingInitiated'
  | 'offboardingCompleted'
  | 'ldapSyncComplete'
  | 'ldapSyncFailed'
  | 'onboardingComplete'
  | 'evaluationBulkCreated'

export interface AppNotification {
  id:         string
  type:       NotificationTypeId
  variant:    NotificationVariant
  title:      string
  message:    string
  actionUrl?: string
  actionLabel?: string
  read:       boolean
  createdAt:  string   // ISO 8601
}

export interface NotificationList {
  unreadCount: number
  total:       number
  items:       AppNotification[]
}

export type NotificationPrefs = {
  [K in (typeof NOTIF_PREF_KEYS)[number]]: boolean
}
```

---

## Annexe B — Mapping icônes / couleurs

```ts
export const NOTIFICATION_CONFIG: Record<NotificationTypeId, {
  icon: LucideIcon
  variant: NotificationVariant
  priority: 'low' | 'medium' | 'high' | 'urgent'
  autoDismiss: number | false // ms ou false
}> = {
  campaignLaunch:               { icon: Megaphone,      variant: 'info',    priority: 'high',   autoDismiss: false },
  evaluationAssigned:           { icon: ClipboardList,  variant: 'info',    priority: 'high',   autoDismiss: false },
  evaluationSubmitted:          { icon: Send,           variant: 'success', priority: 'high',   autoDismiss: false },
  deadlineReminder:             { icon: Clock,          variant: 'warning', priority: 'urgent', autoDismiss: false },
  managerActionRequired:        { icon: AlertCircle,    variant: 'warning', priority: 'high',   autoDismiss: false },
  systemAlerts:                 { icon: ShieldAlert,    variant: 'error',   priority: 'urgent', autoDismiss: false },
  evaluationReviewed:           { icon: Eye,            variant: 'success', priority: 'high',   autoDismiss: false },
  evaluationSignedByEvaluatee:  { icon: PenLine,        variant: 'success', priority: 'high',   autoDismiss: false },
  evaluationSignedByManager:    { icon: CheckSquare,    variant: 'success', priority: 'medium', autoDismiss: false },
  evaluationSignedByHR:         { icon: BadgeCheck,     variant: 'success', priority: 'low',    autoDismiss: 8000  },
  evaluationValidated:          { icon: Trophy,         variant: 'success', priority: 'low',    autoDismiss: 6000  },
  evaluationExpired:            { icon: TimerOff,       variant: 'error',   priority: 'medium', autoDismiss: false },
  evaluationReassigned:         { icon: UserCheck,      variant: 'info',    priority: 'high',   autoDismiss: false },
  formFrozen:                   { icon: Lock,           variant: 'warning', priority: 'low',    autoDismiss: 8000  },
  offboardingInitiated:         { icon: LogOut,         variant: 'warning', priority: 'high',   autoDismiss: false },
  offboardingCompleted:         { icon: UserX,          variant: 'info',    priority: 'medium', autoDismiss: 8000  },
  ldapSyncComplete:             { icon: RefreshCw,      variant: 'success', priority: 'low',    autoDismiss: 6000  },
  ldapSyncFailed:               { icon: WifiOff,        variant: 'error',   priority: 'urgent', autoDismiss: false },
  onboardingComplete:           { icon: PartyPopper,    variant: 'success', priority: 'low',    autoDismiss: 6000  },
  evaluationBulkCreated:        { icon: Layers,         variant: 'info',    priority: 'medium', autoDismiss: 8000  },
}
```

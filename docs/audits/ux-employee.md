# Audit Parcours Utilisateur — Rôle Employé

**Date** : Janvier 2025  
**Scope** : Parcours complet du rôle "employee" de NX-RH  
**Testeur** : UX Expert  
**Approche** : Analyse code-first + évaluation selon critères UX

---

## Résumé exécutif

**Score général : 6.5/10**

Le parcours employé répond aux besoins **essentiels** mais souffre d'une **clarté insuffisante** et d'une **orientation lacunaire**. Un employé peut techniquement compléter son parcours, mais avec des frictions importantes et peu d'aide contextuelle.

### Résumé par étape
| Étape | Score | État |
|-------|-------|------|
| Connexion | 7/10 | ✅ Fonctionnelle, clair |
| Dashboard | 6/10 | ⚠️ Bon début, manque de contexte |
| Mes Évaluations (list) | 7/10 | ✅ Bonne structure, peu de filtres |
| Remplir auto-évaluation | 6/10 | ⚠️ Fonctionne, orientation faible |
| Profil | 5/10 | ❌ Compliqué pour un employé standard |
| Demandes RH | 4/10 | ❌ **Interface d'admin**, pas accessible |
| Navigation | 7/10 | ✅ Simple, minimaliste |

---

## Parcours critique identifié

### 🔴 Parcours principal d'un nouvel employé

```
1. Connexion → 2. Dashboard → 3. Comprendre ce que faire → ??? 
4. Cliquer sur "Mes Évaluations"
5. Voir une évaluation "Assignée" → Cliquer "Commencer"
6. Remplir multi-étapes (sans repères visuels clairs)
7. Soumettre → Attendre manager → Attendre RH → Signer
```

**Problème critique** : Entre étapes 3 et 4, l'employé est **desorienté**. Aucune indication visuelle sur :
- Son rôle exact dans le processus
- Ce qui est attendu de lui
- Les délais
- Qu'est-ce qui viendra après soumission

---

## P0 — Bloquants 🚨

### 1. **Demandes RH inaccessibles pour les employés**
**Localisation** : `/hr/flags`  
**Problème** : Page affiche "Aucun signal RH" mais c'est une **interface d'administrateur RH** complète avec filtres RH (statut, type).

**Analyse du code** :
```tsx
// HrFlagsPage.tsx
- Affiche les demandes de manière administrative (table avec colonnes: Collaborateur, Type, Date, Statut, Actions)
- Permet la mise à jour du statut (réservée aux admins)
- Pas de distinction de rôle dans le composant lui-même
```

**Impact** : Un employé **ne peut pas faire de demande** de mobilité/formation/augmentation comme indiqué dans la spec.

**Résolution** : 
- Créer un `EmployeeHrRequestsPage` où l'employé peut **créer une demande** (formulaire simple)
- Garder `/hr/flags` pour admins/RH uniquement

---

### 2. **Contexte de campagne d'évaluation manquant**
**Localisation** : `DashboardEmployeePage.tsx`, `EvaluationDetailPage.tsx`  
**Problème** : L'employé voit "Campagne : 2025-H1" mais sans explication du processus.

```tsx
// DashboardEmployeePage.tsx ligne 143
<p className="font-medium text-slate-900 text-sm">
  Campagne : {evaluation.campaignId}
</p>
```

**Manque** : 
- Contexte sur la campagne (dates, objectifs, durée estimée)
- Instructions étape par étape
- Timeline attendue du processus complet

**Impact** : Nouvel employé panique → pas sûr de ce qu'il fait.

---

### 3. **Auto-évaluation sans guide contextuel**
**Localisation** : `EvaluationDetailPage.tsx`  
**Problème** : Formulaire multi-phases sans aide de navigation.

```tsx
// EvaluationDetailPage.tsx
- currentPhase, currentQuestionIdx
- Progression : answeredCount/questions.length
- **MAIS** : pas de titre de phase visible, pas d'indication "vous êtes à la phase X/Y"
```

**Analyse** :
- Code supporte les phases (`const phases = [...new Set(questions.map(q => q.phase))]`)
- Mais UI n'affiche pas clairement quelle phase on est dans
- Pas d'étapes visuelles (progress bar par phase)

**Impact** : Employé confus = remplit n'importe comment ou abandonne.

---

### 4. **Page profil trop complexe pour employé**
**Localisation** : `ProfilePage.tsx`  
**Problème** : 5 onglets (info, avatar, prefs, **data**, **requests**) mais pas de permissions par rôle.

```tsx
// ProfilePage.tsx ligne 17
type TabId = 'info' | 'avatar' | 'prefs' | 'data' | 'requests'
```

**Problème** : 
- L'onglet "data" expose probablement des infos d'admin
- L'onglet "requests" existe mais sans UI pour créer des demandes

**Impact** : Interface confuse pour un employé qui ne comprend pas ces onglets.

---

## P1 — Frictions importantes ⚠️

### 5. **Dashboard ambigu pour nouvel arrivant**
**Localisation** : `DashboardEmployeePage.tsx` ligne 92
```tsx
const showOnboarding = !!(user?.isActive && !user?.managerId)
```

**Problème** : 
- Section "Mon intégration" affiche toujours les 3 mêmes étapes (hardcodées)
- Pas de lien vers un processus d'onboarding réel
- Progression fictive (33% sans mise à jour)

**Analyse** :
```tsx
// Lignes 170-188 : toujours les mêmes 3 étapes
{['Profil complété', 'Premier entretien planifié', 'Documents signés'].map(...)
// progression toujours à 33%
style={{ width: '33%' }}
```

**Impact** : Employé confus — ce checklist est-il réel ? Dois-je le compléter maintenant ?

---

### 6. **Historique des évaluations peu exploitable**
**Localisation** : `DashboardEmployeePage.tsx` ligne 284-315

```tsx
// Montre seulement validées avec score
{history.data?.data?.map((evaluation) => (
  <div>
    <p>Campagne : {evaluation.campaignId}</p>
    <span>{evaluation.reviewerScore}/10</span>
    <Link>Voir PDF →</Link>
  </div>
))}
```

**Problème** :
- Pas de contexte (date, manager, commentaires)
- Le lien "Voir PDF" ne fait que rediriger vers l'évaluation complète (pas de téléchargement réel)
- Pas de filtrage ou recherche

**Impact** : Un employé ne peut pas vraiment consulter son historique efficacement.

---

### 7. **Filtre d'évaluations inadapté pour employee**
**Localisation** : `EvaluationsPage.tsx` ligne 50-52

```tsx
const { data, isLoading } = useQuery({
  queryFn: () => (isEmployee
    ? evaluationsApi.getMyEvaluations({...})  // OK
    : evaluationsApi.getEvaluations({...})     // Admin
  )
})
```

**Mais** :
```tsx
// Lignes 30-35 : les mêmes filtres admin pour tous
const [campaignFilter, setCampaignFilter] = useState('')
const [statusFilter, setStatusFilter] = useState<string[]>([])
const [deptFilter, setDeptFilter] = useState('')
const [search, setSearch] = useState('')
```

**Problème** : Filtre "department" n'a pas de sens pour un employé qui voit ses propres évaluations.

**Impact** : Interface polluée, confusion.

---

### 8. **Pas de confirmation/feedback après soumission**
**Localisation** : `EvaluationDetailPage.tsx` ligne 84-86

```tsx
const submitMutation = useMutation({
  mutationFn: () => evaluationsApi.submitEvaluation(id!),
  onSuccess: () => { 
    queryClient.invalidateQueries({ queryKey: ['evaluation', id] })
    setSubmitModal(false) 
  },
})
```

**Manque** : 
- Toast de confirmation
- Message clair : "Soumis ! Votre manager recevra la notification"
- Redirection ou indication prochaine étape

**Impact** : Employé ne sait pas si ça a fonctionné ou pas.

---

### 9. **Navigation insuffisante dans le formulaire**
**Localisation** : `EvaluationDetailPage.tsx` ligne 36-59

```tsx
const phases = [...new Set(questions.map(q => q.phase).filter(Boolean))] as string[]
const filteredQuestions = currentPhase ? questions.filter(...) : questions
const currentQuestion = filteredQuestions[currentQuestionIdx]
```

**Problème** : 
- Pas de UI pour naviguer entre phases (en bas/haut de page)
- Pas de boutons "Phase précédente / Phase suivante"
- Juste `currentQuestionIdx` qui itère dans filteredQuestions

**Impact** : Employé doit cliquer 50 fois pour passer d'une question à l'autre.

---

### 10. **Pas de feedback visuel pendant auto-save**
**Localisation** : `EvaluationDetailPage.tsx` ligne 64-76

```tsx
const autoSave = useCallback((updatedAnswers) => {
  if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
  saveTimeoutRef.current = setTimeout(async () => {
    try {
      await evaluationsApi.updateEvaluation(id!, { 
        answers: updatedAnswers, 
        status: 'in_progress' 
      })
      setLastSavedAt(new Date())
    } catch {}
  }, 2000)
}, [id])
```

**Problème** :
- `lastSavedAt` existe mais n'est pas affiché nulle part
- Pas d'indicateur "Sauvegarde..." visible
- Catch vide sans toast d'erreur

**Impact** : Employé ne sait pas si ses réponses sont sauvegardées.

---

## P2 — Améliorations mineures 🔨

### 11. **Connexion : pas d'onboarding post-login**
Après connexion réussie, redirect vers `/` (dashboard) directement. Pour nouvel employé, pourrait avoir un mini-tour ou checklist d'actions.

---

### 12. **Navigation pour employé minimaliste**
Le menu du rôle "employee" :
```tsx
return [
  { label: 'Tableau de bord', href: '/' },
  { label: 'Mes Évaluations', href: '/evaluations' },
  { label: 'Pilotage', dropdown: [Calendrier, Ressources] },
]
```

C'est **bon** (minimaliste) mais pas d'accès rapide à :
- Mon profil
- Mes demandes RH
- Support/Help

---

### 13. **Status badges non contextuels pour employee**
Sur la liste des évaluations, affiche les statuts complets :
```tsx
const evalStatusLabels: Record<EvaluationStatus, string> = {
  assigned: 'Assignée',
  in_progress: 'En cours',
  submitted: 'Soumise',
  reviewed: 'Revue',
  signed_evaluatee: 'Signée (évalué)',
  signed_manager: 'Signée (manager)',
  signed_hr: 'Signée (RH)',
  validated: 'Validée',
  expired: 'Expirée',
  archived: 'Archivée',
}
```

Pour un employee, certains statuts (signed_manager, signed_hr) sont invisibles pour lui. Afficher une version simplifiée ?

---

### 14. **Pas de lien vers formulaire dans dashboard**
Dashboard montre "Mes évaluations en cours" mais pas d'accès rapide à "Voir tous les formulaires disponibles" ou "FAQ d'évaluation".

---

### 15. **Profil : champs non éditables visibles**
ProfilePage affiche position, department en lecture seule. OK, mais pas d'indication claire qu'on ne peut pas les éditer.

---

## Points positifs ✅

### ✅ Connexion
- **Email + Mot de passe** : Simple, standard
- **Validation claire** : Messages d'erreur explicites ("Format d'e-mail invalide")
- **"Se souvenir de moi"** : Feature pratique
- **LDAP alternative** : Bonne flexibilité

### ✅ Dashboard synthétique
- **Bienvenue personnalisée** : "Bonjour, [Prénom]"
- **Fonction + Département affichés** : Contexte d'identité
- **Évaluations en cours** : L'info essentielle en premier
- **Liens rapides** : "Tout voir →" pour accéder aux listes complètes
- **Événements + Ressources** : Bonne intégration

### ✅ Liste des évaluations
- **Code couleur par statut** : Visuel
- **Boutons d'action clairs** : "Commencer" vs "Continuer"
- **Historique séparé** : Pas de mélange passé/présent

### ✅ Formulaire d'évaluation
- **Auto-save** : Évite la perte de données
- **Barre de progression** : Feedback visuel
- **Multi-phases supporté** : Structure flexible
- **Questions numérotées** : Contexte

### ✅ Profil accessible
- **Avatar personalisable** : Feature engageante
- **Édition limitée** : Pas de risque de mauvaise modification

### ✅ Navigation
- **Minimaliste** : Pas d'surcharge cognitive
- **Logo clickable** : Retour au dashboard
- **Notifications** : Intégration (cloche)

---

## Recommandations prioritaires

### 🔴 **URGENT — P0**

#### 1. **Créer une page de création de demande RH pour employés**
**Titre** : `RequestHrPage.tsx` ou `NewRequestPage.tsx`

```tsx
// Pseudo-code
export default function NewHrRequestPage() {
  const [type, setType] = useState<HrFlagType>('mobility_request')
  const [description, setDescription] = useState('')
  const [attachments, setAttachments] = useState([])
  
  return (
    <>
      <h1>Faire une demande</h1>
      <form>
        <select label="Type de demande">
          <option>Mobilité interne</option>
          <option>Augmentation</option>
          <option>Formation</option>
          <option>Promotion</option>
          <option>Autre</option>
        </select>
        <textarea label="Décrivez votre demande..." />
        <FileUpload label="Pièces jointes optionnelles" />
        <button type="submit">Envoyer ma demande</button>
      </form>
    </>
  )
}
```

**Ajouter au menu employee** :
```tsx
if (role === 'employee') return [
  dashboard,
  { label: 'Mes Évaluations', href: '/evaluations' },
  { label: 'Faire une demande', href: '/requests/new' },  // ← NOUVEAU
  pilotageNoAnalytics,
]
```

---

#### 2. **Ajouter un guide contextuel à chaque évaluation**
**Localisation** : En haut de `EvaluationDetailPage.tsx`

```tsx
<PageGuide
  id={`eval-${id}`}
  title="Comment remplir votre auto-évaluation ?"
  steps={[
    "Répondez honnêtement à chaque question",
    "Vous avez jusqu'au " + formatDate(evaluation.deadline),
    "Votre réponse sera envoyée à votre manager pour révision",
    "Vous pourrez la signer après",
  ]}
  color="blue"
/>
```

**Résultat** : Nouvel employé sait exactement ce qui se passe.

---

#### 3. **Afficher le processus d'évaluation en timeline**
**Ajouter à `EvaluationDetailPage.tsx`** :

```tsx
const ProcessTimeline = ({ evaluation }) => {
  const steps = [
    { label: 'Auto-évaluation', status: evaluation.status === 'assigned' ? 'current' : 'done' },
    { label: 'Révision manager', status: ['assigned', 'in_progress'].includes(evaluation.status) ? 'waiting' : 'current' },
    { label: 'Signature', status: ['assigned', 'in_progress', 'submitted'].includes(evaluation.status) ? 'waiting' : 'current' },
    { label: 'Validation RH', status: 'waiting' },
  ]
  
  return (
    <div className="flex gap-4 mb-6">
      {steps.map((step, i) => (
        <div key={i} className={`flex-1 text-center p-3 rounded-lg ${step.status === 'done' ? 'bg-success-50' : step.status === 'current' ? 'bg-primary-50' : 'bg-slate-50'}`}>
          <p className="text-sm font-medium">{step.label}</p>
          <p className="text-xs text-slate-500">{step.status}</p>
        </div>
      ))}
    </div>
  )
}
```

---

#### 4. **Clarifier les étapes du formulaire**
**Ajouter une navigation visuelle de phases** dans `EvaluationDetailPage.tsx` :

```tsx
<div className="mb-6 border-b border-slate-200 pb-4">
  <div className="flex gap-2 mb-4">
    {phases.map((phase, i) => (
      <button
        key={i}
        onClick={() => setCurrentPhase(phase)}
        className={`px-4 py-2 rounded-lg text-sm font-medium ${
          currentPhase === phase 
            ? 'bg-primary-600 text-white' 
            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
        }`}
      >
        {phase}
      </button>
    ))}
  </div>
  <p className="text-xs text-slate-500">
    Questions {currentQuestionIdx + 1}/{filteredQuestions.length} dans {currentPhase}
  </p>
</div>
```

---

### 🟡 **IMPORTANT — P1**

#### 5. **Feedback post-soumission**
```tsx
const submitMutation = useMutation({
  mutationFn: () => evaluationsApi.submitEvaluation(id!),
  onSuccess: () => {
    toast.success("Soumis avec succès !", "Votre manager en a été notifié.");
    setTimeout(() => navigate('/evaluations'), 2000);
  },
  onError: () => toast.error("Erreur lors de la soumission", "Réessayez."),
})
```

---

#### 6. **Indicateur de sauvegarde visible**
```tsx
<div className="text-xs text-slate-400 flex items-center gap-2">
  {lastSavedAt ? (
    <>
      <Check size={14} /> Sauvegardé à {lastSavedAt.toLocaleTimeString('fr-FR')}
    </>
  ) : (
    <>
      <Loader2 size={14} className="animate-spin" /> Sauvegarde en cours...
    </>
  )}
</div>
```

---

#### 7. **Remplacer onboarding fictif par vrai checklist**
**Option A** : Liens vers tâches réelles  
```tsx
{['Compléter mon profil', 'Planifier 1er entretien avec manager', 'Signer documents'].map(...)
```

**Option B** : Masquer si irrelevant
```tsx
const showOnboarding = !!(user?.isActive && !user?.managerId && isNewUser())
```

---

#### 8. **Améliorer l'historique des évaluations**
```tsx
// Ajouter des colonnes plus riches
{history.data?.data?.map((evaluation) => (
  <div className="py-3 flex items-center justify-between">
    <div>
      <p className="text-sm font-medium">Campagne : {evaluation.campaign?.name}</p>
      <p className="text-xs text-slate-400">Manager : {evaluation.evaluator?.firstName} {evaluation.evaluator?.lastName}</p>
      <p className="text-xs text-slate-400">Validée le {new Date(evaluation.signedByHrAt).toLocaleDateString('fr-FR')}</p>
    </div>
    <div className="flex items-center gap-3">
      {evaluation.reviewerComment && (
        <button className="text-xs text-primary-600 hover:underline">
          Voir commentaire
        </button>
      )}
      {evaluation.reviewerScore && (
        <span className="text-sm font-semibold bg-slate-100 px-3 py-1 rounded-full">
          {evaluation.reviewerScore}/10
        </span>
      )}
    </div>
  </div>
))}
```

---

### 🟢 **NICE-TO-HAVE — P2**

#### 9. **Accès rapide au profil dans navbar**
Ajouter "Mon profil" avec menu dropdown utilisateur.

#### 10. **FAQ/Help contextuel**
Petit "?" clickable sur chaque section pour mini-aide.

#### 11. **Rappels email**
Envoyer email avant deadline : "Il vous reste 3 jours pour votre évaluation"

#### 12. **Statuts simplifiés pour employee**
Afficher "En cours de remplissage" au lieu de "assigned/in_progress/submitted".

---

## Annexe : Matrice d'évaluation détaillée

### Critère 1 : L'employé comprend-il pourquoi il est là et ce qu'on attend de lui ?

| Page | Score | Détail |
|------|-------|--------|
| LoginPage | 9/10 | Très clair : "Connexion à NX-RH NanoXplore" |
| DashboardEmployeePage | 6/10 | Bienvenue personnalisée ✓ mais pas de mission/contexte |
| EvaluationsPage | 7/10 | Titre "Mes évaluations" clair, mais pas de guide global |
| EvaluationDetailPage | 4/10 | ❌ Aucun contexte sur le processus d'évaluation global |
| ProfilePage | 5/10 | Page existe mais pas de raison claire d'y aller pour employee |
| **Moyenne** | **5.2/10** | ⚠️ Manque de contexte global |

---

### Critère 2 : Peut-il facilement remplir son auto-évaluation ?

| Aspect | Score | Détail |
|--------|-------|--------|
| Trouver le formulaire | 8/10 | Dashboard → "Mes évaluations" → Cliquer "Commencer" |
| UI du formulaire | 6/10 | Fonctionne mais pas de navigation phase claire |
| Progression visible | 7/10 | Barre de progression existe (answeredCount/total) |
| Auto-save | 9/10 | ✅ Fonction bien implémentée |
| Validation/erreurs | 3/10 | ❌ Pas de validation visible avant soumission |
| Feedback après submit | 2/10 | ❌ Aucun toast/confirmation visible |
| **Moyenne** | **5.8/10** | ⚠️ Fonctionnel mais UX rustique |

---

### Critère 3 : Peut-il voir ses évaluations passées / son historique ?

| Aspect | Score | Détail |
|--------|-------|--------|
| Accès au dashboard | 9/10 | "Mon historique" visible en bas |
| Nombre d'évals affichées | 5/10 | Seulement 5 dernières validées |
| Contexte par éval | 4/10 | Manque : manager, commentaires, date de campagne |
| Téléchargement/export | 1/10 | ❌ Lien "Voir PDF" redirige vers form (pas de PDF réel) |
| Filtrage/recherche | 2/10 | ❌ Pas de filtrage pour employee |
| **Moyenne** | **4.2/10** | ❌ Historique peu exploitable |

---

### Critère 4 : La procédure de demande de mobilité/formation est-elle intuitive ?

| Aspect | Score | Détail |
|--------|-------|--------|
| Accès à la page | 0/10 | ❌ Pas de page employee pour créer demande |
| Navigation | N/A | N/A |
| Formulaire | N/A | N/A |
| Clarté du processus | N/A | N/A |
| Confirmation | N/A | N/A |
| **Moyenne** | **0/10** | 🚨 BLOQUANT — Fonctionnalité manquante |

---

### Critère 5 : Y a-t-il assez d'informations contextuelles pour un nouvel employé ?

| Aspect | Score | Détail |
|--------|-------|--------|
| Onboarding lors du login | 2/10 | ❌ Aucun onboarding visible |
| Guide sur le dashboard | 3/10 | ❌ Pas de "premier pas" |
| Aide in-context | 2/10 | ❌ Aucun PageGuide utilisé dans flux employee |
| FAQ/Help | 1/10 | ❌ Pas de sections help visibles |
| Emails guides | 0/10 | ❌ Pas de mention dans code |
| **Moyenne** | **1.6/10** | 🚨 CRITIQUE — Nouvel employé complètement perdu |

---

## Vue d'ensemble finale

### Points d'amélioration groupés par impact

**Impact CRITIQUE (Blockers - Score /10)**
- ❌ Pas de création de demande RH (Score : 0/10)
- ❌ Aucun contexte de processus d'évaluation (Score : 1/10)
- ❌ Pas d'aide pour nouvel employé (Score : 1.6/10)

**Impact ÉLEVÉ (Frictions - Score /10)**
- ⚠️ Formulaire sans navigation claire entre phases (Score : 3/10)
- ⚠️ Feedback utilisateur insuffisant (Score : 2/10)
- ⚠️ Historique peu exploitable (Score : 4.2/10)

**Impact MODÉRÉ (Polish - Score /10)**
- 🟡 Dashboard ambigu pour nouvel arrivant (Score : 6/10)
- 🟡 Interface parfois complexe pour employee (Score : 5.2/10)
- 🟡 Statuts peu clairs (Score : 7/10)

---

## Conclusion

Le parcours employee **remplit les besoins fonctionnels** (connexion → auto-évaluation → historique) mais échoue sur :

1. **Clarté** : Nouvel employé ne comprend pas le processus global
2. **Guidance** : Aucun onboarding ou aide contextuelle
3. **Complétude** : Demandes RH non implémentées
4. **Feedback** : Peu d'indicateurs de succès

### Priorisation des fixes

**Sprint 1 (URGENT)** :
- Créer page de création de demande RH pour employee
- Ajouter PageGuide au formulaire d'évaluation
- Ajouter feedback post-soumission

**Sprint 2 (Important)** :
- Améliorer navigation du formulaire (phases visibles)
- Ajouter timeline du processus
- Enrichir historique

**Sprint 3 (Nice-to-have)** :
- Onboarding email
- Menu utilisateur dans navbar
- Aide contextuelle (FAQ)

---

**Audit terminé** — Prochaine étape : Alignement avec PM/Design pour priorisation.

# Audit Parcours Utilisateur — Rôle Manager

## Résumé exécutif
**Score global : 6.5/10**

L'application NX-RH offre un parcours manager fonctionnel mais avec des **frictions importantes** qui ralentissent la prise de décision et réduisent la visibilité opérationnelle. Le dashboard donne une bonne vue d'ensemble, mais les transitions entre les étapes du workflow sont peu guidées. Les notifications et rappels de deadline sont **absents**, forçant le manager à vérifier manuellement son pipeline d'évaluations.

**Points clés :**
- ✅ Dashboard orienté manager avec KPIs pertinents
- ✅ Filtrage statuts et campagnes fonctionnel
- ⚠️ **Critiques détectés** : pas de notification deadline, progression équipe peu claire
- ❌ Pas d'intégration calendrier/deadline au niveau manager
- ❌ Ergonomie de remplissage d'évaluation peu adaptée au contexte manager

---

## Parcours critique identifié

### Flux de travail manager type

```
Connexion
   ↓
Dashboard (KPIs + liste équipe + évals à faire)
   ↓
Évaluations à mener (liste + filtres)
   ↓
Remplir évaluation (in_progress → submitted)
   ↓
Soumettre & signer
   ↓
Voir progression équipe
```

**Problème dans ce flux :** Le manager ne reçoit PAS de rappels visuels entre le dashboard et la page des évaluations. Si une deadline arrive, il n'y a pas d'alerte.

---

## P0 — Bloquants

### 1. **Pas de notification/rappel sur les deadlines d'évaluation**
- **Impact :** Manager oublie de remplir les évaluations, deadlines ratées
- **Evidence :** 
  - Dashboard : `<span className="text-xs text-slate-400">Deadline : —</span>` (n'affiche pas le deadline)
  - HrFlagsPage : Rappels RH visible, mais pas pour les évaluations
  - Navbar : Notifications génériques, pas d'alerte spécifique "évaluation deadline"
- **Symptôme :** KPI "Rappels deadline" affiche toujours `0`
- **Recommandation :** Ajouter badge rouge sur Navbar quand deadline < 24h, alerte à l'ouverture du dashboard

### 2. **L'état "assignée" vs "en cours" n'est pas clairement visualisé**
- **Impact :** Manager ne sait pas si une évaluation a été commencée par lui
- **Evidence :**
  ```tsx
  // DashboardManagerPage.tsx
  const pending = evaluations.filter(e =>
    e.status === 'assigned' || e.status === 'in_progress'
  )
  // Les deux statuts sont groupés sous "À compléter"
  ```
  Les deux états visuellement identiques mais sémantiquement différents
- **Recommandation :** Utiliser couleurs différentes pour "Pas commencée" vs "En cours"

### 3. **Pas de contexte manager visible lors du remplissage d'évaluation**
- **Impact :** Le manager se sent comme un "évaluatee" lors du remplissage, confusion de contexte
- **Evidence :**
  - EvaluationDetailPage : Mode "fill" utilisé pour tous les évaluateurs (manager, superviseur, RH)
  - Pas d'indication "Vous remplissez l'évaluation de [NOM] en tant que manager"
  - KPI "Équipe en attente" montre ses directs reports mais pas leur statut détaillé
- **Recommandation :** Ajouter breadcrumb/header "Évaluation de {name} — Votre rôle : Évaluateur"

---

## P1 — Frictions importantes

### 1. **Filtrage des évaluations peu efficace pour un manager**
- **Issue :** EvaluationsPage utilise les mêmes filtres que pour Admin/HR
  ```tsx
  if (role === 'manager') return [
    dashboard,
    {
      label: 'Mon Équipe',
      dropdown: [
        { label: 'Mon équipe', href: '/users' },
        { label: 'Organigramme', href: '/org' },
      ],
    },
    ...
  ]
  ```
  Manager voit `/evaluations` mais sans filtrage automatique "ma_team"
- **Symptôme :** Manager voit TOUTES les évaluations de l'organisation, pas juste son équipe
- **Recommandation :** Faire une requête `scope=my_team` lors du chargement initial pour manager

### 2. **Vue équipe (OrgPage) n'affiche pas l'état des évaluations**
- **Issue :** Manager clique sur "Mon équipe" → organigramme, mais ne voit pas les deadlines/progression
- **Evidence :**
  ```tsx
  // OrgTeamsView
  {reports.length === 0 ? (
    <p className="text-xs text-slate-400 italic">Aucun collaborateur direct</p>
  ) : reports.map(r => (
    <div key={r._id} className="flex items-center gap-2">
      <div ...>{initials(r.firstName, r.lastName)}</div>
      <span ...>{r.firstName} {r.lastName}</span>
    </div>
  ))}
  ```
  Pas d'overlay "évaluation en attente", "deadline X jours", etc.
- **Symptôme :** Manager clique sur équipe, ne trouve pas les infos d'évaluation pertinentes
- **Recommandation :** Ajouter indicateurs visuels (badge "1 eval"), hover montre deadline

### 3. **Le KPI "Rappels deadline" est toujours à 0**
- **Issue :** Dashboard affiche `<KpiCard label="Rappels deadline" value={0} ... />`
- **Evidence :** Code brut avec valeur fixe, pas de logique pour détecter deadlines
- **Symptôme :** Manager pense "pas urgent" alors que deadline peut arriver
- **Recommandation :** Implémenter logique : compter évaluations avec deadline < 48h

### 4. **Pas de chemin clair entre "éval soumise" et "validation"**
- **Issue :** Manager remplit évaluation, la soumet, mais ne sait pas où elle va ensuite
- **Evidence :**
  ```tsx
  const mode = useMemo(() => {
    if (['assigned', 'in_progress'].includes(status) && isEvaluator) return 'fill'
    if (status === 'submitted' && (isAdminOrHr || isManager)) return 'review'
    if (['reviewed', 'signed_evaluatee', 'signed_manager', 'signed_hr'].includes(status)) return 'sign'
    return 'readonly'
  }, ...)
  ```
  Mode "review" available pour manager, mais pas d'indication "en attente de validation RH"
- **Symptôme :** Manager voit l'éval soumise mais ne comprend pas le next step
- **Recommandation :** Ajouter tooltip "Évaluation soumise. Attente de signature et validation RH."

### 5. **Pas de trie ou classement par date limite**
- **Issue :** EvaluationsPage affiche liste sans tri par deadline
- **Evidence :** 
  ```tsx
  <select value={campaignFilter} ...>
    <option value="">Toutes les campagnes</option>
  </select>
  ```
  Pas d'option "Trier par deadline" ou "Urgents d'abord"
- **Symptôme :** Manager doit scanner manuellement pour trouver l'éval la plus urgente
- **Recommandation :** Ajouter bouton sort "Par deadline" (croissant/décroissant)

---

## P2 — Améliorations mineures

### 1. **Le lien "Mes évaluations →" depuis le dashboard ne trie pas automatiquement**
- **Issue :** Dashboard montre "Évaluations à compléter" + bouton "Mes évaluations →"
  Mais le bouton redirige vers `/evaluations` sans filtre
- **Recommandation :** Rediriger vers `/evaluations?status=assigned,in_progress` pour cohérence

### 2. **Pas de breadcrumb/historique dans EvaluationDetailPage**
- **Issue :** Manager est seul dans la page d'évaluation sans contexte de navigation
- **Evidence :** `<Breadcrumbs>` est présent mais peut être amélioré
- **Recommandation :** Ajouter "Équipe → {nom} → Évaluation {campaign}"

### 3. **Auto-save pas communiqué au manager**
- **Issue :** EvaluationDetailPage fait `autoSave` tous les 2 secondes mais ne montre pas "Sauvegarde en cours"
- **Evidence :**
  ```tsx
  const autoSave = useCallback((updatedAnswers: Record<string, unknown>) => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await evaluationsApi.updateEvaluation(id!, { answers: updatedAnswers, status: 'in_progress' })
        setLastSavedAt(new Date())
      } catch {}
    }, 2000)
  }, [id])
  ```
  Il y a `lastSavedAt` mais pas d'affichage "Sauvegardé ✓"
- **Recommandation :** Afficher "Dernière sauvegarde : il y a 2 min" ou indicateur vert

### 4. **Actions groupées (archiver, signer RH) non accessibles pour manager**
- **Issue :** Manager n'a pas accès aux actions groupées d'archive/signature HR
- **Evidence :**
  ```tsx
  {isAdminOrHr && selected.length > 0 && (
    <div className="flex items-center gap-2">
      <button onClick={() => setBulkModal('archive')}>Archiver</button>
      <button onClick={() => setBulkModal('sign')}>Signer RH</button>
    </div>
  )}
  ```
- **Recommandation :** Normal (manager ne doit pas archiver), mais clarifier dans UI

### 5. **Pas de confirmation avant soumission d'une évaluation**
- **Issue :** Manager clique "Soumettre", pas de fenêtre "Êtes-vous sûr ?"
- **Evidence :**
  ```tsx
  {/* Pas de confirmation modale visible dans le code */}
  const submitMutation = useMutation({
    mutationFn: () => evaluationsApi.submitEvaluation(id!),
    onSuccess: () => { ... },
  })
  ```
- **Recommandation :** Ajouter modal de confirmation avant `/submit`

---

## Points positifs ✅

### 1. **Dashboard adapté au rôle manager**
- Vue "Évaluations à compléter" et "Mon équipe" en un coup d'œil
- KPIs pertinents (nombre d'évals, équipe en attente)
- Raccourci direct "Mes évaluations →" depuis le dashboard

### 2. **Navigation Navbar bien structurée par rôle**
- Menu "Mon Équipe" dédié au manager
- Accès direct à "À traiter" (évaluations)
- Pas d'options admin polluant l'interface

### 3. **Filtrage et recherche multicolonnes** (Admin/HR)
- Même si manager ne les voit pas bien exploitées
- Statut, campagne, département, recherche libre
- Export CSV pour archivage

### 4. **Mode de lecture adapté à chaque étape**
- "fill" pour remplissage
- "review" pour révision
- "sign" pour signature
- "readonly" pour consultation

### 5. **Auto-save transparent**
- Pas besoin de cliquer "Enregistrer"
- Erreurs réseau gérées silencieusement
- User ne perd pas son travail

### 6. **Progress bar visuelle**
- Sur le dashboard : progression équipe affichée avec barre
- Responsive et claire

---

## Recommandations prioritaires

### 🚨 Immédiat (Sprint 1)
1. **Ajouter notification deadline** (P0)
   - Badge rouge sur Navbar si deadline < 24h
   - Toast au chargement si deadline atteinte
   - Implémentation : Hook `useEvaluationDeadlines()`

2. **Fixer le scope manager dans EvaluationsPage** (P0)
   - Requête API doit utiliser `scope=my_team` pour manager
   - Éviter que le manager voit les évals d'autres équipes

3. **Distinguer "assignée" de "en cours"** (P0)
   - Couleur différente (ex: gris "assignée" vs bleu "en cours")
   - Icône différente (ex: 📋 vs ✏️)

### ⚡ Court terme (Sprint 2)
4. **Ajouter indicateurs d'évaluation dans OrgPage** (P1)
   - Overlay "1 eval en attente" sur avatar du manager
   - Hover montre "Deadline : 3 jours"
   - Clic redirige vers `/evaluations?evaluatee={id}`

5. **Implémenter KPI "Rappels deadline"** (P1)
   - Compter évaluations avec `deadline < 48h`
   - Utiliser couleur "warning" (orange)

6. **Ajouter modal de confirmation avant soumettre** (P2)
   - Message : "Confirmer la soumission de l'évaluation de {name} ?"
   - Buttons : "Annuler" / "Soumettre"

### 📅 Moyen terme (Sprint 3)
7. **Créer vue "Mes évaluations urgentes"** (P1)
   - Shortcut depuis dashboard ou Navbar
   - Tri auto par deadline décroissant
   - Indicateur couleur rouge si overdue

8. **Intégrer calendrier équipe** (P1)
   - Afficher deadlines évaluations sur vue calendrier
   - Événement "Évaluation {name} due in 2 days"

9. **Améliorer le contexte dans EvaluationDetailPage** (P2)
   - Breadcrumb complet : "Équipe → {Name} → Évaluation {Campaign}"
   - Avatar manager + "Vous remplissez" en haut
   - Indicateur "Sauvegardé à 14:32"

---

## Matrice de sévérité

| Enjeu | P0 | P1 | P2 |
|-------|----|----|-----|
| **Pas de deadline visible** | ❌ | | |
| **Scope manager non filtré** | ❌ | | |
| **Assignée vs En cours identiques** | ❌ | | |
| **Filtrage inefficace** | | ❌ | |
| **Vue équipe sans contexte éval** | | ❌ | |
| **KPI deadline toujours 0** | | ❌ | |
| **Pas de chemin post-soumission** | | ❌ | |
| **Pas de tri par deadline** | | ❌ | |
| **Auto-save non communiqué** | | | ❌ |
| **Pas de confirmation submit** | | | ❌ |

---

## Conclusion

L'application NX-RH a des **bases solides** pour un manager (dashboard, filtres, auto-save) mais manque de **"friction reducers"** critiques :
- Les **deadlines** sont invisibles
- La **progression de l'équipe** n'est pas tangible
- Le **flux post-soumission** n'est pas clair

**Score actuel : 6.5/10**
**Score potentiel (après P0+P1) : 8.5/10**

### Focus du prochain sprint :
Mettre en place les **3 P0 + premiers 2 P1** pour obtenir un parcours manager **réellement guidé et sans friction** sur les évaluations.

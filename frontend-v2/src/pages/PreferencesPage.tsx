import { useState, useEffect } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { ChevronLeft, Save } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { authApi } from '../api/auth'
import { cn } from '../utils/cn'

interface NotifDef {
  key: string
  label: string
  roles: string[]
}

const ALL_NOTIFS: NotifDef[] = [
  { key: 'evalAssigned', label: 'Évaluation assignée', roles: ['employee', 'manager', 'director', 'hr', 'admin'] },
  { key: 'deadlineReminder', label: 'Rappel de deadline', roles: ['employee', 'manager', 'director', 'hr', 'admin'] },
  { key: 'managerActionRequired', label: 'Action manager requise', roles: ['manager', 'director', 'hr', 'admin'] },
  { key: 'evalSubmission', label: "Soumission d'évaluation", roles: ['manager', 'director', 'hr', 'admin'] },
  { key: 'campaignLaunch', label: 'Lancement de campagne', roles: ['hr', 'admin'] },
  { key: 'systemAlerts', label: 'Alertes système', roles: ['admin'] },
]

export default function PreferencesPage() {
  const { user } = useAuth()

  const [locale, setLocale] = useState<'fr' | 'en'>('fr')
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system')
  const [notifs, setNotifs] = useState<Record<string, boolean>>({})
  const [toast, setToast] = useState<string>('')

  // Apply theme immediately on change
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark')
    } else if (theme === 'light') {
      document.documentElement.classList.remove('dark')
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      document.documentElement.classList.toggle('dark', prefersDark)
    }
  }, [theme])

  const saveMutation = useMutation({
    mutationFn: () =>
      authApi.updatePreferences({ locale, theme, notificationPrefs: notifs }),
    onSuccess: () => {
      setToast('Préférences sauvegardées')
      setTimeout(() => setToast(''), 3000)
    },
  })

  if (!user) return null

  const visibleNotifs = ALL_NOTIFS.filter((n) => n.roles.includes(user.role))

  function toggleNotif(key: string) {
    setNotifs((prev: Record<string, boolean>) => ({ ...prev, [key]: !prev[key] }))
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/profile" className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">Préférences</h1>
      </div>

      {/* Card Interface */}
      <div className="bg-white rounded-2xl shadow p-6 space-y-6">
        <h2 className="text-base font-semibold text-slate-800">Interface</h2>

        {/* Langue */}
        <div>
          <p className="text-sm font-medium text-slate-700 mb-2">Langue</p>
          <div className="flex gap-3">
            {(['fr', 'en'] as const).map((lang) => (
              <label
                key={lang}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer transition-colors',
                  locale === lang
                    ? 'border-primary-500 bg-primary-50 text-primary-700'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50',
                )}
              >
                <input
                  type="radio"
                  name="language"
                  value={lang}
                  checked={locale === lang}
                  onChange={() => setLocale(lang)}
                  className="sr-only"
                />
                {lang === 'fr' ? '🇫🇷 Français' : '🇬🇧 English'}
              </label>
            ))}
          </div>
        </div>

        {/* Thème */}
        <div>
          <p className="text-sm font-medium text-slate-700 mb-2">Thème</p>
          <div className="flex gap-3">
            {([
              { value: 'light', label: '☀️ Clair' },
              { value: 'dark', label: '🌙 Sombre' },
              { value: 'system', label: '💻 Système' },
            ] as { value: 'light' | 'dark' | 'system'; label: string }[]).map((t) => (
              <label
                key={t.value}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer transition-colors',
                  theme === t.value
                    ? 'border-primary-500 bg-primary-50 text-primary-700'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50',
                )}
              >
                <input
                  type="radio"
                  name="theme"
                  value={t.value}
                  checked={theme === t.value}
                  onChange={() => setTheme(t.value)}
                  className="sr-only"
                />
                {t.label}
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Card Notifications */}
      {visibleNotifs.length > 0 && (
        <div className="bg-white rounded-2xl shadow p-6 space-y-4">
          <h2 className="text-base font-semibold text-slate-800">Notifications e-mail</h2>
          <div className="space-y-3">
            {visibleNotifs.map((n) => (
              <label key={n.key} className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={!!notifs[n.key]}
                  onChange={() => toggleNotif(n.key)}
                  className="w-4 h-4 rounded border-slate-300 text-primary-500 focus:ring-primary-400"
                />
                <span className="text-sm text-slate-700 group-hover:text-slate-900">{n.label}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Sticky save button on mobile, normal on desktop */}
      <div className="sticky bottom-4 sm:static flex justify-end">
        <button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary-500 text-white text-sm font-medium rounded-xl shadow hover:bg-primary-600 disabled:opacity-50 transition-colors"
        >
          <Save className="w-4 h-4" />
          {saveMutation.isPending ? 'Sauvegarde…' : 'Sauvegarder'}
        </button>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-sm font-medium px-5 py-3 rounded-xl shadow-xl animate-fadeIn z-50">
          ✓ {toast}
        </div>
      )}
    </div>
  )
}

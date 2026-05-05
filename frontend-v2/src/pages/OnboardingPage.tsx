import { useState, useRef } from 'react'
import type { ChangeEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useAuth } from '../contexts/AuthContext'
import { usersApi } from '../api/users'
import { campaignsApi } from '../api/campaigns'
import { cn } from '../utils/cn'

const STEP_COUNT = 5

const DEFAULT_CHECKLIST = [
  'Badge d\'accès remis',
  'Ordinateur configuré',
  'Accès email/intranet créés',
  'Présentation à l\'équipe',
  'Formation sécurité effectuée',
]

export default function OnboardingPage() {
  const { user, refreshUser } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState(0)

  // Step 1
  const [firstName, setFirstName] = useState(user?.firstName ?? '')
  const [lastName, setLastName] = useState(user?.lastName ?? '')

  // Step 2
  const fileRef = useRef<HTMLInputElement>(null)
  const [avatarPreview, setAvatarPreview] = useState<string>('')
  const [avatarBase64, setAvatarBase64] = useState<string>('')
  const [avatarError, setAvatarError] = useState<string>('')

  // Step 4
  const [checklist, setChecklist] = useState<boolean[]>(DEFAULT_CHECKLIST.map(() => false))

  // Teammates
  const { data: teammates } = useQuery({
    queryKey: ['onboarding-teammates', user?.department],
    queryFn: () =>
      usersApi.getUsers({ department: user?.department, limit: 4 }).then((r) => r.data),
    enabled: step === 2 && !!user?.department,
  })

  // Active campaign
  const { data: activeCampaign } = useQuery({
    queryKey: ['onboarding-campaign'],
    queryFn: () =>
      campaignsApi.getCampaigns({ status: 'active', limit: 1 }).then((r) => r.data.data?.[0] ?? null),
    enabled: step === 4,
  })

  const updateUserMutation = useMutation({
    mutationFn: () => usersApi.updateUser(user!.id, { firstName, lastName }),
    onSuccess: async () => {
      await usersApi.updateOnboardingStep(user!.id, 0)
      await refreshUser()
      setStep(1)
    },
  })

  const avatarMutation = useMutation({
    mutationFn: (base64: string) => usersApi.updateAvatar(user!.id, base64),
    onSuccess: async () => {
      await usersApi.updateOnboardingStep(user!.id, 1)
      await refreshUser()
      setStep(2)
    },
  })

  const completeMutation = useMutation({
    mutationFn: () => usersApi.completeOnboarding(user!.id),
    onSuccess: async () => {
      await refreshUser()
      navigate('/')
    },
  })

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarError('')
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setAvatarError('Format non supporté. Utilisez JPEG, PNG ou WebP.')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      setAvatarError('Fichier trop volumineux (max 2 Mo).')
      return
    }
    const reader = new FileReader()
    reader.onload = (ev) => {
      const result = ev.target?.result as string
      setAvatarPreview(result)
      setAvatarBase64(result)
    }
    reader.readAsDataURL(file)
  }

  async function goStep(target: number) {
    await usersApi.updateOnboardingStep(user!.id, target - 1)
    setStep(target)
  }

  if (!user) return null

  const initials = `${user.firstName[0] ?? ''}${user.lastName[0] ?? ''}`.toUpperCase()

  const stepTitles = [
    'Complétez votre profil',
    'Photo de profil',
    'Votre équipe',
    'Accès systèmes',
    'Bienvenue !',
  ]

  const stepEmojis = ['👤', '📸', '👥', '✅', '🎉']

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-slate-100 flex flex-col items-center px-4 py-8">
      {/* Header */}
      <div className="mb-8 text-center">
        <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center mx-auto mb-2">
          <span className="text-white font-bold text-sm">NX</span>
        </div>
        <span className="text-lg font-bold text-slate-900">NX-RH</span>
      </div>

      {/* Progress bar */}
      <div className="w-full max-w-lg mb-6">
        <div className="w-full h-1 bg-slate-200 rounded-full">
          <div
            className="bg-primary-500 rounded-full h-1 transition-all duration-500"
            style={{ width: `${((step + 1) / STEP_COUNT) * 100}%` }}
          />
        </div>
        <p className="text-xs text-slate-500 mt-2 text-center">Étape {step + 1} sur {STEP_COUNT}</p>
      </div>

      {/* Step indicators */}
      <div className="flex gap-2 mb-8">
        {Array.from({ length: STEP_COUNT }).map((_, i) => (
          <div
            key={i}
            className={cn(
              'w-2.5 h-2.5 rounded-full transition-colors',
              i === step ? 'bg-primary-500' : i < step ? 'bg-primary-300' : 'bg-slate-200',
            )}
          />
        ))}
      </div>

      {/* Card */}
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-lg">
        {/* Illustration */}
        <div className="text-center text-7xl mb-6">{stepEmojis[step]}</div>

        <h2 className="text-xl font-bold text-slate-900 text-center mb-2">{stepTitles[step]}</h2>

        {/* ── Step 0: Profil ──────────────────────────────────────── */}
        {step === 0 && (
          <div className="space-y-4 mt-4">
            <p className="text-sm text-slate-500 text-center mb-4">
              Assurez-vous que vos informations sont correctes.
            </p>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Prénom</label>
              <input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nom</label>
              <input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
              />
            </div>
          </div>
        )}

        {/* ── Step 1: Avatar ──────────────────────────────────────── */}
        {step === 1 && (
          <div className="flex flex-col items-center gap-4 mt-4">
            <p className="text-sm text-slate-500 text-center">
              Ajoutez une photo pour que vos collègues vous reconnaissent.
            </p>
            {avatarPreview ? (
              <img src={avatarPreview} alt="preview" className="w-24 h-24 rounded-full object-cover ring-4 ring-primary-100" />
            ) : (
              <div className="w-24 h-24 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-3xl font-bold">
                {initials}
              </div>
            )}
            {avatarError && <p className="text-sm text-error-600">{avatarError}</p>}
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleFileChange} />
            <button
              onClick={() => fileRef.current?.click()}
              className="px-4 py-2 border border-slate-300 text-sm font-medium rounded-lg text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Choisir une image
            </button>
          </div>
        )}

        {/* ── Step 2: Équipe ──────────────────────────────────────── */}
        {step === 2 && (
          <div className="mt-4 space-y-3">
            <p className="text-sm text-slate-500 text-center mb-2">
              Voici les membres de votre équipe.
            </p>
            {teammates?.data?.filter((m) => m.id !== user.id).slice(0, 4).map((member) => (
              <div key={member.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50">
                <div className="w-9 h-9 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-sm font-bold shrink-0">
                  {member.firstName[0]}{member.lastName[0]}
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-800">{member.firstName} {member.lastName}</p>
                  <p className="text-xs text-slate-400">{member.position ?? member.role}</p>
                </div>
              </div>
            ))}
            {(!teammates?.data?.length || teammates.data.filter((m) => m.id !== user.id).length === 0) && (
              <p className="text-sm text-slate-400 text-center py-4">Aucun collègue trouvé dans votre département.</p>
            )}
          </div>
        )}

        {/* ── Step 3: Accès systèmes ──────────────────────────────── */}
        {step === 3 && (
          <div className="mt-4 space-y-3">
            <p className="text-sm text-slate-500 text-center mb-2">
              Cochez les accès que vous avez reçus.
            </p>
            {DEFAULT_CHECKLIST.map((item, i) => (
              <label key={i} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors">
                <input
                  type="checkbox"
                  checked={checklist[i]}
                  onChange={() => setChecklist((prev) => prev.map((v, idx) => idx === i ? !v : v))}
                  className="w-4 h-4 rounded border-slate-300 text-primary-500 focus:ring-primary-400"
                />
                <span className="text-sm text-slate-700">{item}</span>
              </label>
            ))}
          </div>
        )}

        {/* ── Step 4: Bienvenue ───────────────────────────────────── */}
        {step === 4 && (
          <div className="mt-4 space-y-4 text-center">
            <p className="text-slate-600 text-sm">
              Votre espace NX-RH est prêt. Bienvenue dans l'équipe !
            </p>
            {activeCampaign && (
              <div className="bg-primary-50 border border-primary-200 rounded-xl p-4 text-left">
                <p className="text-xs font-semibold text-primary-700 uppercase tracking-wide mb-1">Campagne active</p>
                <p className="text-sm font-medium text-primary-800">{activeCampaign.name}</p>
                <p className="text-xs text-primary-600 mt-1">
                  Du {new Date(activeCampaign.startDate).toLocaleDateString('fr-FR')} au {new Date(activeCampaign.endDate).toLocaleDateString('fr-FR')}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Footer buttons */}
        <div className="flex justify-between items-center mt-8 pt-4 border-t border-slate-100">
          <button
            onClick={async () => {
              if (step < STEP_COUNT - 1) await goStep(step + 1)
            }}
            className="text-sm text-slate-400 hover:text-slate-600 transition-colors"
          >
            {step < STEP_COUNT - 1 ? 'Passer cette étape' : ''}
          </button>

          {step === 0 && (
            <button
              onClick={() => updateUserMutation.mutate()}
              disabled={updateUserMutation.isPending}
              className="px-5 py-2.5 bg-primary-500 text-white text-sm font-semibold rounded-xl hover:bg-primary-600 disabled:opacity-50 transition-colors"
            >
              {updateUserMutation.isPending ? 'Sauvegarde…' : 'Suivant →'}
            </button>
          )}

          {step === 1 && (
            <button
              onClick={() => {
                if (avatarBase64) {
                  avatarMutation.mutate(avatarBase64)
                } else {
                  goStep(2)
                }
              }}
              disabled={avatarMutation.isPending}
              className="px-5 py-2.5 bg-primary-500 text-white text-sm font-semibold rounded-xl hover:bg-primary-600 disabled:opacity-50 transition-colors"
            >
              {avatarMutation.isPending ? 'Envoi…' : 'Suivant →'}
            </button>
          )}

          {step === 2 && (
            <button
              onClick={() => goStep(3)}
              className="px-5 py-2.5 bg-primary-500 text-white text-sm font-semibold rounded-xl hover:bg-primary-600 transition-colors"
            >
              Suivant →
            </button>
          )}

          {step === 3 && (
            <button
              onClick={() => goStep(4)}
              className="px-5 py-2.5 bg-primary-500 text-white text-sm font-semibold rounded-xl hover:bg-primary-600 transition-colors"
            >
              Suivant →
            </button>
          )}

          {step === 4 && (
            <button
              onClick={() => completeMutation.mutate()}
              disabled={completeMutation.isPending}
              className="px-5 py-2.5 bg-primary-500 text-white text-sm font-semibold rounded-xl hover:bg-primary-600 disabled:opacity-50 transition-colors"
            >
              {completeMutation.isPending ? 'Finalisation…' : 'Accéder à mon espace →'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

import { PaperAirplane } from 'lucide-react'

export default function AdminMailTestPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
      <div className="p-4 bg-orange-100 text-orange-600 rounded-full">
        <PaperAirplane className="w-8 h-8" />
      </div>
      <h1 className="text-2xl font-bold text-slate-900">Test d'envoi d'email</h1>
      <p className="text-slate-500 text-sm">En cours de développement</p>
      <p className="text-slate-400 text-xs max-w-sm text-center">
        Pour tester l'envoi d'emails, rendez-vous dans{' '}
        <a href="/admin/mail-config" className="text-primary-600 hover:underline">
          Configuration SMTP
        </a>
        .
      </p>
    </div>
  )
}

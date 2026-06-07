import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
      <h1 className="text-6xl font-bold text-slate-300">404</h1>
      <p className="text-xl font-semibold text-slate-700 mt-4">Page introuvable</p>
      <p className="text-slate-500 mt-2">La page que vous cherchez n&apos;existe pas.</p>
      <Link to="/" className="mt-6 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium">
        Retour à l&apos;accueil
      </Link>
    </div>
  )
}

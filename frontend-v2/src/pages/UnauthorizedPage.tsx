import { Link } from "react-router-dom";

export default function UnauthorizedPage() {
  return (
    <div className="flex flex-col items-center justify-center h-screen gap-4">
      <h1 className="text-2xl font-bold text-danger-600">Accès refusé</h1>
      <p className="text-text-muted">
        Vous n'avez pas les droits pour accéder à cette page.
      </p>
      <Link to="/" className="btn-primary">
        Retour à l'accueil
      </Link>
    </div>
  );
}

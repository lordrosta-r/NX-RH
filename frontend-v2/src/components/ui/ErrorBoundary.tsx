import React from "react";
import { AlertTriangle } from "lucide-react";

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[ErrorBoundary]", error, info);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div
          role="alert"
          className="min-h-screen flex items-center justify-center bg-surface p-8"
        >
          <div className="text-center max-w-md">
            <AlertTriangle className="w-16 h-16 text-error-400 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-default mb-2">
              Une erreur est survenue
            </h1>
            <p className="text-sm text-muted mb-6">
              {this.state.error?.message ||
                "Erreur inattendue. Veuillez réessayer."}
            </p>
            <button
              autoFocus
              onClick={this.handleRetry}
              className="px-4 py-2 bg-primary-500 text-white rounded-lg text-sm font-semibold hover:bg-primary-600 transition-colors"
            >
              Réessayer
            </button>
            <a
              href="/"
              className="block mt-3 text-sm text-primary-500 hover:underline"
            >
              Retour à l'accueil
            </a>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;

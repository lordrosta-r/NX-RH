import { CheckCircle, Circle, ChevronRight, Rocket } from "lucide-react";
import { Link } from "react-router-dom";
import { useSetupChecklist } from "../hooks/useSetupChecklist";

export default function AdminSetupWizardPage() {
  const { steps, completed, total, percent, isLoading, allDone } =
    useSetupChecklist();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-600">
        Vérification de la configuration...
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">
          Configuration initiale
        </h1>
        <p className="text-slate-500 mt-1">
          Suivez ces étapes pour mettre en service NX-RH
        </p>
      </div>

      {allDone ? (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-6 flex items-center gap-4 mb-6">
          <CheckCircle size={32} className="text-green-500 flex-shrink-0" />
          <div>
            <p className="font-bold text-green-800">Configuration complète !</p>
            <p className="text-green-600 text-sm">
              Toutes les étapes de configuration ont été effectuées.
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 mb-6">
          <div className="flex items-center gap-3 mb-3">
            <Rocket size={20} className="text-primary-500" />
            <span className="font-bold text-slate-900">
              {percent}% configuré
            </span>
            <span className="text-slate-500 text-sm">
              · {completed}/{total} étapes complètes
            </span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2">
            <div
              className="bg-primary-500 h-2 rounded-full transition-all"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>
      )}

      <div className="space-y-4">
        {steps.map((step) => (
          <div
            key={step.id}
            className={`bg-white rounded-2xl shadow p-6 flex items-start gap-4 ${
              step.done ? "opacity-70" : ""
            }`}
          >
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                step.done ? "bg-green-100" : "bg-slate-100"
              }`}
            >
              {step.done ? (
                <CheckCircle size={20} className="text-green-600" />
              ) : (
                <Circle size={20} className="text-slate-400" />
              )}
            </div>
            <div className="flex-1">
              <h3
                className={`font-bold ${
                  step.done ? "text-slate-500 line-through" : "text-slate-900"
                }`}
              >
                {step.title}
              </h3>
              <p className="text-sm text-slate-500 mt-1">{step.description}</p>
            </div>
            {!step.done && (
              <Link
                to={step.actionHref}
                className="flex items-center gap-1 px-4 py-2 bg-primary-600 text-white text-sm rounded-xl hover:bg-primary-700 transition flex-shrink-0"
              >
                {step.actionLabel} <ChevronRight size={16} />
              </Link>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

import { Link } from "react-router-dom";
import {
  Users,
  BarChart2,
  ClipboardList,
  LogOut,
  AlertCircle,
  Inbox,
  UserX,
  PlayCircle,
  PlusCircle,
  UserPlus,
  Upload,
  SlidersHorizontal,
  Rocket,
  Circle,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../contexts/AuthContext";
import { useDashboardAdmin } from "../hooks/useDashboard";
import { useSetupChecklist } from "../hooks/useSetupChecklist";
import { adminApi } from "../api/admin";
import type { Campaign } from "../types";

// ─── Widget de complétude de la configuration (onboarding admin) ───────────────

function SetupCompletenessCard() {
  const { steps, completed, total, percent, isLoading, allDone } =
    useSetupChecklist();
  if (isLoading || allDone) return null;

  const nextSteps = steps.filter((s) => !s.done).slice(0, 3);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-primary-100 p-6 mb-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Rocket className="w-5 h-5 text-primary-500" />
          <h2 className="text-lg font-semibold text-slate-900">
            Configuration de l&apos;application
          </h2>
        </div>
        <Link
          to="/admin/setup"
          className="text-sm text-primary-600 hover:underline"
        >
          Tout voir →
        </Link>
      </div>
      <div className="flex items-center gap-3 mb-2">
        <span className="text-2xl font-bold text-slate-900">{percent}%</span>
        <span className="text-sm text-slate-500">
          {completed}/{total} étapes complètes
        </span>
      </div>
      <div className="w-full bg-slate-100 rounded-full h-2 mb-4">
        <div
          className="bg-primary-500 h-2 rounded-full transition-all"
          style={{ width: `${percent}%` }}
        />
      </div>
      <ul className="space-y-2">
        {nextSteps.map((step) => (
          <li key={step.id}>
            <Link
              to={step.actionHref}
              className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100 hover:bg-slate-100 transition-colors group"
            >
              <span className="flex items-center gap-2 text-sm font-medium text-slate-800">
                <Circle className="w-4 h-4 text-slate-300" />
                {step.title}
              </span>
              <span className="text-xs text-primary-600 group-hover:underline">
                {step.actionLabel}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─── KPI Card ────────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  icon: Icon,
  colorClass,
  isLoading,
}: {
  label: string;
  value: number | string;
  icon: React.ComponentType<{ className?: string }>;
  colorClass: string;
  isLoading?: boolean;
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-medium text-slate-500">{label}</span>
        <div
          className={`w-10 h-10 rounded-lg flex items-center justify-center ${colorClass}`}
        >
          <Icon className="w-5 h-5" />
        </div>
      </div>
      {isLoading ? (
        <div className="h-8 bg-slate-200 rounded animate-pulse w-16" />
      ) : (
        <p className="text-3xl font-bold text-slate-900">{value ?? "—"}</p>
      )}
    </div>
  );
}

// ─── StatusBadge inline ───────────────────────────────────────────────────────

const statusLabels: Record<string, string> = {
  draft: "Brouillon",
  active: "Active",
  closed: "Clôturée",
  archived: "Archivée",
};

const statusColors: Record<string, string> = {
  draft: "bg-slate-100 text-slate-600",
  active: "bg-success-50 text-success-600",
  closed: "bg-slate-100 text-slate-500",
  archived: "bg-slate-100 text-slate-500",
};

function StatusBadge({ status }: { status: string }) {
  const color = statusColors[status] ?? "bg-slate-100 text-slate-600";
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${color}`}
    >
      {statusLabels[status] ?? status}
    </span>
  );
}

// ─── Campaign columns ─────────────────────────────────────────────────────────

function CampaignTable({
  campaigns,
  isLoading,
}: {
  campaigns: Campaign[];
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-10 bg-slate-200 rounded animate-pulse" />
        ))}
      </div>
    );
  }

  if (campaigns.length === 0) {
    return (
      <p className="text-sm text-slate-600 text-center py-8">
        Aucune campagne active
      </p>
    );
  }

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-slate-100">
          <th className="text-left text-xs font-medium text-slate-500 pb-3">
            Campagne
          </th>
          <th className="text-left text-xs font-medium text-slate-500 pb-3">
            Statut
          </th>
          <th className="text-left text-xs font-medium text-slate-500 pb-3">
            Progression
          </th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-50">
        {campaigns.map((row) => (
          <tr key={row.id} className="hover:bg-slate-50 transition-colors">
            <td className="py-3 pr-4">
              <Link
                to={`/campaigns/${row.id}`}
                className="text-primary-600 hover:underline font-medium"
              >
                {row.name}
              </Link>
            </td>
            <td className="py-3 pr-4">
              <StatusBadge status={row.status} />
            </td>
            <td className="py-3">
              <div className="w-full bg-slate-100 rounded-full h-2">
                <div
                  className="bg-primary-500 h-2 rounded-full"
                  style={{ width: "0%" }}
                />
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardAdminPage() {
  const { user } = useAuth();
  const { campaigns, evaluations, users } = useDashboardAdmin();

  const { data: pendingFlagsCount } = useQuery({
    queryKey: ["hr-flags-pending-count"],
    queryFn: () =>
      adminApi
        .getFlags({ status: "pending" })
        .then((r) => (r.data as { total?: number })?.total ?? 0),
  });

  const isLoading =
    campaigns.isLoading || evaluations.isLoading || users.isLoading;
  const isError = campaigns.isError || evaluations.isError || users.isError;

  if (isLoading) {
    return (
      <div>
        <div className="h-8 w-64 bg-slate-200 rounded animate-pulse mb-8" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-6">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-32 bg-slate-200 rounded-xl animate-pulse"
            />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 h-64 bg-slate-200 rounded-xl animate-pulse" />
          <div className="lg:col-span-4 h-64 bg-slate-200 rounded-xl animate-pulse" />
          <div className="lg:col-span-12 h-40 bg-slate-200 rounded-xl animate-pulse" />
        </div>
      </div>
    );
  }

  if (isError) {
    const refetch = () => {
      campaigns.refetch();
      evaluations.refetch();
      users.refetch();
    };
    return (
      <div className="border-l-4 border-error-500 bg-error-50 p-4 rounded-lg">
        <p className="text-sm text-error-700">
          Impossible de charger les données du tableau de bord.
        </p>
        <button
          onClick={refetch}
          className="mt-2 text-sm text-error-600 underline"
        >
          Réessayer
        </button>
      </div>
    );
  }

  const totalUsers = users.data?.data?.total ?? 0;
  const totalCampaigns = campaigns.data?.data?.total ?? 0;
  const totalEvals = evaluations.data?.data?.total ?? 0;
  const campaignList = campaigns.data?.data?.data ?? [];

  return (
    <div className="bg-slate-50 min-h-full">
      {/* Complétude de la configuration (masqué une fois 100%) */}
      <SetupCompletenessCard />

      {/* Actions requises */}
      <div className="bg-white rounded-xl shadow-sm border border-orange-100 p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <AlertCircle className="w-5 h-5 text-orange-500" />
          <h2 className="text-lg font-semibold text-slate-900">
            Actions requises
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link
            to="/hr/flags?status=pending"
            className="flex items-center justify-between p-4 bg-orange-50 rounded-xl border border-orange-100 hover:bg-orange-100 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <Inbox className="w-5 h-5 text-orange-500" />
              <span className="text-sm font-medium text-slate-800">
                Demandes RH en attente
              </span>
            </div>
            {pendingFlagsCount != null && pendingFlagsCount > 0 && (
              <span className="inline-flex items-center justify-center min-w-[1.5rem] h-6 px-2 bg-orange-500 text-white text-xs font-bold rounded-full">
                {pendingFlagsCount}
              </span>
            )}
          </Link>
          <Link
            to="/users"
            className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100 hover:bg-slate-100 transition-colors"
          >
            <UserX className="w-5 h-5 text-slate-500" />
            <span className="text-sm font-medium text-slate-800">
              Utilisateurs sans manager
            </span>
          </Link>
          <Link
            to="/campaigns?status=active"
            className="flex items-center gap-3 p-4 bg-blue-50 rounded-xl border border-blue-100 hover:bg-blue-100 transition-colors"
          >
            <PlayCircle className="w-5 h-5 text-blue-500" />
            <span className="text-sm font-medium text-slate-800">
              Campagnes actives
            </span>
          </Link>
        </div>
      </div>

      {/* Raccourcis */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 mb-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">
          Raccourcis
        </h2>
        <div className="flex flex-wrap gap-3">
          <Link
            to="/campaigns/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-500 text-white text-sm font-medium rounded-lg hover:bg-primary-600 transition-colors"
          >
            <PlusCircle className="w-4 h-4" />
            Nouvelle campagne
          </Link>
          <Link
            to="/users/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            Ajouter un utilisateur
          </Link>
          <Link
            to="/admin/users/import"
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors"
          >
            <Upload className="w-4 h-4" />
            Importer CSV
          </Link>
          <Link
            to="/admin/settings"
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors"
          >
            <SlidersHorizontal className="w-4 h-4" />
            Paramètres RH
          </Link>
        </div>
      </div>

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
          Tableau de bord · Bonjour, {user?.firstName ?? "..."}
        </h1>
        <button
          disabled
          className="inline-flex items-center px-4 py-2 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-400 cursor-not-allowed"
        >
          Exporter PDF
        </button>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-6">
        <KpiCard
          label="Utilisateurs actifs"
          value={totalUsers}
          icon={Users}
          colorClass="bg-primary-50 text-primary-500"
        />
        <KpiCard
          label="Campagnes actives"
          value={totalCampaigns}
          icon={BarChart2}
          colorClass="bg-success-50 text-success-500"
        />
        <KpiCard
          label="Évaluations non finalisées"
          value={totalEvals}
          icon={ClipboardList}
          colorClass="bg-warning-50 text-warning-500"
        />
        <KpiCard
          label="Offboardings en attente"
          value={0}
          icon={LogOut}
          colorClass="bg-error-50 text-error-500"
        />
      </div>

      {/* Middle row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
        {/* Campagnes actives */}
        <div className="lg:col-span-8 bg-white rounded-xl shadow-sm border border-slate-100 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">
            Campagnes actives
          </h2>
          <div className="overflow-x-auto">
            <CampaignTable
              campaigns={campaignList}
              isLoading={campaigns.isLoading}
            />
          </div>
        </div>

        {/* Actions urgentes */}
        <div className="lg:col-span-4 bg-white rounded-xl shadow-sm border border-slate-100 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">
            Actions urgentes
          </h2>
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 bg-error-50 rounded-lg border border-error-100">
              <AlertCircle className="w-4 h-4 text-error-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-error-700">
                  Évaluations expirées
                </p>
                <p className="text-xs text-error-600 mt-0.5">
                  <Link to="/evaluations" className="underline">
                    Voir les évaluations →
                  </Link>
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-warning-50 rounded-lg border border-warning-100">
              <AlertCircle className="w-4 h-4 text-warning-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-warning-700">
                  Évaluations à signer côté RH
                </p>
                <p className="text-xs text-warning-600 mt-0.5">
                  <Link to="/hr/flags" className="underline">
                    Voir les alertes RH →
                  </Link>
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-error-50 rounded-lg border border-error-100">
              <AlertCircle className="w-4 h-4 text-error-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-error-700">
                  Offboardings non complétés &gt; 30 j
                </p>
                <p className="text-xs text-error-600 mt-0.5">
                  <Link to="/offboarding" className="underline">
                    Voir les offboardings →
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Activité récente */}
      <div className="col-span-12 bg-white rounded-xl shadow-sm border border-slate-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900">
            Activité récente
          </h2>
          <Link
            to="/admin/audit"
            className="text-sm text-primary-600 hover:underline"
          >
            Voir le journal complet →
          </Link>
        </div>
        <p className="text-sm text-slate-600 text-center py-8">
          Journal d'audit disponible en S11
        </p>
      </div>
    </div>
  );
}

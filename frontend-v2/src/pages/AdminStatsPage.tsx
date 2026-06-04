import { useQuery } from "@tanstack/react-query";
import {
  ChartBar,
  Megaphone,
  ClipboardList,
  CheckCircle2,
  Star,
} from "lucide-react";
import { analyticsApi } from "@/api/analytics";
import PageHeader from "@/components/ui/PageHeader";

const STATUS_LABELS: Record<string, string> = {
  assigned: "Assignées",
  in_progress: "En cours",
  submitted: "Soumises",
  reviewed: "Relues",
  signed_evaluatee: "Signées (évalué)",
  signed_manager: "Signées (manager)",
  signed_hr: "Signées (RH)",
  validated: "Validées",
  expired: "Expirées",
  rejected: "Rejetées",
  archived: "Archivées",
};

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
}) {
  return (
    <div className="bg-white rounded-2xl shadow p-5 flex items-center gap-4">
      <div className="p-3 rounded-xl bg-primary-50 text-primary-600">
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold text-slate-900">{value}</p>
        <p className="text-xs text-slate-500">{label}</p>
      </div>
    </div>
  );
}

export default function AdminStatsPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["analytics", "summary"],
    queryFn: () => analyticsApi.getSummary().then((r) => r.data),
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <PageHeader title="Statistiques" subtitle="Vue d'ensemble RH" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-24 bg-slate-100 rounded-2xl animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="p-6">
        <PageHeader title="Statistiques" subtitle="Vue d'ensemble RH" />
        <p className="text-sm text-red-600">
          Impossible de charger les statistiques.
        </p>
      </div>
    );
  }

  const avg =
    data.averageScore ?? (data as { avgScore?: number }).avgScore ?? null;
  const byStatus = data.byStatus ?? {};
  const maxCount = Math.max(
    1,
    ...Object.values(byStatus).map((v) => Number(v) || 0),
  );

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Statistiques"
        subtitle="Vue d'ensemble RH (campagnes & évaluations)"
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={<Megaphone size={20} />}
          label="Campagnes"
          value={data.totalCampaigns}
        />
        <StatCard
          icon={<ChartBar size={20} />}
          label="Campagnes actives"
          value={data.activeCampaigns}
        />
        <StatCard
          icon={<ClipboardList size={20} />}
          label="Évaluations"
          value={data.totalEvaluations}
        />
        <StatCard
          icon={<CheckCircle2 size={20} />}
          label="Taux de complétion"
          value={`${data.completionRate}%`}
        />
      </div>

      {avg != null && (
        <div className="bg-white rounded-2xl shadow p-5 flex items-center gap-4 max-w-xs">
          <div className="p-3 rounded-xl bg-amber-50 text-amber-600">
            <Star size={20} />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900">
              {Math.round(avg)}/100
            </p>
            <p className="text-xs text-slate-500">Score moyen (validées)</p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow p-6">
        <h2 className="text-sm font-semibold text-slate-700 mb-4">
          Évaluations par statut
        </h2>
        <div className="space-y-2">
          {Object.entries(byStatus).map(([status, count]) => (
            <div key={status} className="flex items-center gap-3">
              <span className="w-40 text-xs text-slate-600 truncate">
                {STATUS_LABELS[status] ?? status}
              </span>
              <div className="flex-1 bg-slate-100 rounded-full h-3 overflow-hidden">
                <div
                  className="h-full bg-primary-500 rounded-full"
                  style={{ width: `${(Number(count) / maxCount) * 100}%` }}
                />
              </div>
              <span className="w-8 text-right text-xs font-medium text-slate-700">
                {Number(count)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

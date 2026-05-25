import type { Campaign } from "../../types";

interface CampaignAnalytics {
  statusDistribution?: {
    in_progress?: number;
    submitted?: number;
    validated?: number;
  };
  totalEvaluations?: number;
  completedEvaluations?: number;
}

interface CampaignDetailOverviewProps {
  analytics: CampaignAnalytics | undefined;
  analyticsLoading: boolean;
  campaign: Campaign;
}

export default function CampaignDetailOverview({
  analytics,
  analyticsLoading,
  campaign,
}: CampaignDetailOverviewProps) {
  const statusDist = analytics?.statusDistribution ?? {};
  const kpiTotal = analytics?.totalEvaluations ?? 0;
  const kpiInProgress = statusDist.in_progress ?? 0;
  const kpiSubmitted = statusDist.submitted ?? 0;
  const kpiValidated =
    analytics?.completedEvaluations ?? statusDist.validated ?? 0;

  return (
    <div className="space-y-6">
      {analyticsLoading ? (
        <div className="grid grid-cols-12 gap-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="col-span-6 sm:col-span-3 h-24 bg-gray-200 animate-pulse rounded-xl"
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-12 gap-4">
          {[
            { label: "Total", value: kpiTotal },
            { label: "En cours", value: kpiInProgress },
            { label: "Soumis", value: kpiSubmitted },
            { label: "Validés", value: kpiValidated },
          ].map((kpi) => (
            <div
              key={kpi.label}
              className="col-span-6 sm:col-span-3 bg-white rounded-xl shadow-sm border border-slate-100 p-6 text-center"
            >
              <p className="text-3xl font-bold text-slate-900">{kpi.value}</p>
              <p className="text-sm text-slate-500 mt-1">{kpi.label}</p>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 sm:col-span-8 bg-white rounded-xl shadow-sm border border-slate-100 p-6">
          <p className="text-sm font-medium text-slate-700 mb-3">
            Progression globale
          </p>
          <div className="h-2.5 rounded-full overflow-hidden flex bg-slate-100">
            {kpiTotal > 0 ? (
              <>
                <div
                  className="bg-blue-500"
                  style={{ width: `${(kpiInProgress / kpiTotal) * 100}%` }}
                />
                <div
                  className="bg-amber-500"
                  style={{ width: `${(kpiSubmitted / kpiTotal) * 100}%` }}
                />
                <div
                  className="bg-green-500"
                  style={{ width: `${(kpiValidated / kpiTotal) * 100}%` }}
                />
              </>
            ) : (
              <div className="w-full bg-slate-100" />
            )}
          </div>
          <div className="flex items-center gap-4 mt-3 flex-wrap">
            {[
              { color: "bg-blue-500", label: "En cours" },
              { color: "bg-amber-500", label: "Soumis" },
              { color: "bg-green-500", label: "Validés" },
            ].map((item) => (
              <div
                key={item.label}
                className="flex items-center gap-1.5 text-xs text-slate-500"
              >
                <span className={`w-2.5 h-2.5 rounded-full ${item.color}`} />
                {item.label}
              </div>
            ))}
          </div>
        </div>

        <div className="col-span-12 sm:col-span-4 bg-white rounded-xl shadow-sm border border-slate-100 p-6">
          <p className="text-sm font-medium text-slate-700 mb-3">Répartition</p>
          <div className="space-y-2 text-sm">
            {[
              { label: "En cours", value: kpiInProgress, total: kpiTotal },
              { label: "Soumis", value: kpiSubmitted, total: kpiTotal },
              { label: "Validés", value: kpiValidated, total: kpiTotal },
            ].map((item) => (
              <div
                key={item.label}
                className="flex justify-between text-slate-600"
              >
                <span>{item.label}</span>
                <span className="font-medium text-slate-900">
                  {item.total > 0
                    ? `${Math.round((item.value / item.total) * 100)}%`
                    : "—"}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {(campaign.targetDepartments ?? []).length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
          <p className="text-sm font-medium text-slate-700 mb-3">
            Départements ciblés
          </p>
          <div className="flex flex-wrap gap-2">
            {campaign.targetDepartments!.map((dept) => (
              <span
                key={dept}
                className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-sm"
              >
                {dept}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

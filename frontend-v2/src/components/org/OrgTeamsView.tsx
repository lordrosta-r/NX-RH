import React from "react";
import type { OrgTeamGroup } from "../../types";
import { ROLE_COLORS_HEX, initials } from "./orgUtils";

interface OrgTeamsViewProps {
  data: OrgTeamGroup[];
  toolbar: React.ReactNode;
}

export default function OrgTeamsView({ data, toolbar }: OrgTeamsViewProps) {
  return (
    <div
      className="relative flex-1 flex flex-col"
      style={{ overflow: "hidden" }}
    >
      {toolbar}
      <div className="flex-1 overflow-y-auto p-6 pt-20">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-8">
          {data.map((team) => {
            const mgr = team.manager;
            const reports = team.directReports ?? [];
            const subManagers = team.subManagers ?? [];
            const color = ROLE_COLORS_HEX[mgr.role] ?? "#64748B";
            return (
              <div
                key={mgr._id}
                className="bg-white rounded-xl border border-slate-200 shadow-sm p-4"
              >
                <div className="flex items-center gap-3 mb-3 pb-3 border-b border-slate-100">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0"
                    style={{ backgroundColor: color }}
                  >
                    {initials(mgr.firstName, mgr.lastName)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">
                      {mgr.firstName} {mgr.lastName}
                    </p>
                    <p className="text-xs text-slate-500 truncate">
                      {mgr.department ?? mgr.role}
                    </p>
                  </div>
                </div>
                <div className="space-y-1.5">
                  {reports.length === 0 ? (
                    <p className="text-xs text-slate-500 italic">
                      Aucun collaborateur direct
                    </p>
                  ) : (
                    reports.map((r) => (
                      <div key={r._id} className="flex items-center gap-2">
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-semibold flex-shrink-0"
                          style={{
                            backgroundColor:
                              ROLE_COLORS_HEX[r.role] ?? "#64748B",
                          }}
                        >
                          {initials(r.firstName, r.lastName)}
                        </div>
                        <span className="text-xs text-slate-700 truncate">
                          {r.firstName} {r.lastName}
                        </span>
                      </div>
                    ))
                  )}
                </div>
                {subManagers.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-100">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-1.5">
                      Managers rattachés
                    </p>
                    <div className="space-y-1.5">
                      {subManagers.map((sm) => (
                        <div key={sm._id} className="flex items-center gap-2">
                          <div
                            className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-semibold flex-shrink-0"
                            style={{
                              backgroundColor:
                                ROLE_COLORS_HEX[sm.role] ?? "#64748B",
                            }}
                          >
                            {initials(sm.firstName, sm.lastName)}
                          </div>
                          <span className="text-xs text-slate-700 truncate">
                            {sm.firstName} {sm.lastName}
                          </span>
                          <span className="ml-auto text-[10px] text-slate-400">
                            {sm.department ?? "—"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <p className="text-[10px] text-slate-500 mt-2">
                  {reports.length} membre{reports.length !== 1 ? "s" : ""}
                  {subManagers.length > 0
                    ? ` · ${subManagers.length} manager${subManagers.length !== 1 ? "s" : ""}`
                    : ""}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

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
            const color = ROLE_COLORS_HEX[mgr.role] ?? "var(--ink-3)";
            return (
              <div key={mgr._id} className="tile" style={{ padding: 16 }}>
                <div
                  className="flex items-center gap-3 mb-3 pb-3"
                  style={{ borderBottom: "1px solid var(--line)" }}
                >
                  <div
                    className="avatar flex-shrink-0"
                    style={{ backgroundColor: color }}
                  >
                    {initials(mgr.firstName, mgr.lastName)}
                  </div>
                  <div className="min-w-0">
                    <p className="h3 truncate" style={{ fontSize: 15 }}>
                      {mgr.firstName} {mgr.lastName}
                    </p>
                    <p className="small truncate">
                      {mgr.department ?? mgr.role}
                    </p>
                  </div>
                </div>
                <div className="space-y-1.5">
                  {reports.length === 0 ? (
                    <p className="small" style={{ fontStyle: "italic" }}>
                      Aucun collaborateur direct
                    </p>
                  ) : (
                    reports.map((r) => (
                      <div key={r._id} className="flex items-center gap-2">
                        <div
                          className="avatar flex-shrink-0"
                          style={{
                            width: 24,
                            height: 24,
                            fontSize: 10,
                            backgroundColor:
                              ROLE_COLORS_HEX[r.role] ?? "var(--ink-3)",
                          }}
                        >
                          {initials(r.firstName, r.lastName)}
                        </div>
                        <span
                          className="small truncate"
                          style={{ color: "var(--ink-2)" }}
                        >
                          {r.firstName} {r.lastName}
                        </span>
                      </div>
                    ))
                  )}
                </div>
                {subManagers.length > 0 && (
                  <div
                    className="mt-3 pt-3"
                    style={{ borderTop: "1px solid var(--line)" }}
                  >
                    <p className="eyebrow mb-1.5" style={{ fontSize: 10 }}>
                      Managers rattachés
                    </p>
                    <div className="space-y-1.5">
                      {subManagers.map((sm) => (
                        <div key={sm._id} className="flex items-center gap-2">
                          <div
                            className="avatar flex-shrink-0"
                            style={{
                              width: 24,
                              height: 24,
                              fontSize: 10,
                              backgroundColor:
                                ROLE_COLORS_HEX[sm.role] ?? "var(--ink-3)",
                            }}
                          >
                            {initials(sm.firstName, sm.lastName)}
                          </div>
                          <span
                            className="small truncate"
                            style={{ color: "var(--ink-2)" }}
                          >
                            {sm.firstName} {sm.lastName}
                          </span>
                          <span
                            className="badge grey ml-auto"
                            style={{ fontSize: 10 }}
                          >
                            {sm.department ?? "—"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <p className="small mt-2" style={{ fontSize: 10 }}>
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

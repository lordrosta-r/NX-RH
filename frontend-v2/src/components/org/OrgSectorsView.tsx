import React from "react";
import type { OrgSectorGroup } from "../../types";
import { ROLE_COLORS_HEX, initials } from "./orgUtils";

interface OrgSectorsViewProps {
  data: OrgSectorGroup[];
  toolbar: React.ReactNode;
}

export default function OrgSectorsView({ data, toolbar }: OrgSectorsViewProps) {
  return (
    <div
      className="relative flex-1 flex flex-col"
      style={{ overflow: "hidden" }}
    >
      {toolbar}
      <div className="flex-1 overflow-y-auto p-6 pt-20">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pb-8">
          {data.map((group, i) => {
            const sector = group.sector;
            const users = group.users ?? [];
            const sectorColor = sector?.color ?? "#0D9488";
            return (
              <div
                key={sector?._id ?? `no-sector-${i}`}
                className="bg-white rounded-xl border border-slate-200 shadow-sm p-4"
              >
                <div className="flex items-center gap-2 mb-3 pb-3 border-b border-slate-100">
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: sectorColor }}
                  />
                  <h3 className="text-sm font-semibold text-slate-900 truncate">
                    {sector ? sector.name : "Sans secteur"}
                  </h3>
                  <span className="ml-auto text-xs font-medium text-slate-400">
                    {users.length}
                  </span>
                </div>
                <div className="space-y-1.5">
                  {users.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">
                      Aucun utilisateur
                    </p>
                  ) : (
                    users.map((u) => (
                      <div key={u._id} className="flex items-center gap-2">
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-semibold flex-shrink-0"
                          style={{
                            backgroundColor:
                              ROLE_COLORS_HEX[u.role] ?? "#64748B",
                          }}
                        >
                          {initials(u.firstName, u.lastName)}
                        </div>
                        <span className="text-xs text-slate-700 truncate">
                          {u.firstName} {u.lastName}
                        </span>
                        <span className="text-[10px] text-slate-400 ml-auto capitalize">
                          {u.role}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

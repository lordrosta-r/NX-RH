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
                className="tile"
                style={{ padding: 16 }}
              >
                <div
                  className="flex items-center gap-2 mb-3 pb-3"
                  style={{ borderBottom: "1px solid var(--line)" }}
                >
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: sectorColor }}
                  />
                  <h3 className="h3 truncate" style={{ fontSize: 15 }}>
                    {sector ? sector.name : "Sans secteur"}
                  </h3>
                  <span className="badge grey" style={{ marginLeft: "auto" }}>
                    {users.length}
                  </span>
                </div>
                <div className="space-y-1.5">
                  {users.length === 0 ? (
                    <p className="small" style={{ fontStyle: "italic" }}>
                      Aucun utilisateur
                    </p>
                  ) : (
                    users.map((u) => (
                      <div key={u._id} className="flex items-center gap-2">
                        <div
                          className="avatar flex-shrink-0"
                          style={{
                            width: 24,
                            height: 24,
                            fontSize: 10,
                            backgroundColor:
                              ROLE_COLORS_HEX[u.role] ?? "var(--ink-3)",
                          }}
                        >
                          {initials(u.firstName, u.lastName)}
                        </div>
                        <span
                          className="small truncate"
                          style={{ color: "var(--ink-2)" }}
                        >
                          {u.firstName} {u.lastName}
                        </span>
                        <span
                          className="small capitalize"
                          style={{ marginLeft: "auto", fontSize: 11 }}
                        >
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

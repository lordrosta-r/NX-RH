import client from "./client";
import type {
  Sector,
  OrgTreeNode,
  OrgTeamGroup,
  OrgSectorGroup,
  OrgLegend,
} from "../types";

export const orgApi = {
  getOrgTree: (params?: { view?: "all" }) =>
    client.get<OrgTreeNode[]>("/api/org/tree", { params }),

  getOrgTeams: (params?: { view?: "teams" }) =>
    client.get<OrgTeamGroup[]>("/api/org/tree", {
      params: { view: "teams", ...params },
    }),

  getOrgSectors: () =>
    client.get<OrgSectorGroup[]>("/api/org/tree", {
      params: { view: "sector" },
    }),

  getSectors: () => client.get<Sector[]>("/api/org/sectors"),

  createSector: (data: Partial<Sector>) =>
    client.post<Sector>("/api/org/sectors", data),

  updateSector: (id: string, data: Partial<Sector>) =>
    client.patch<Sector>(`/api/org/sectors/${id}`, data),

  deleteSector: (id: string) => client.delete(`/api/org/sectors/${id}`),

  patchOrgUser: (
    id: string,
    data: {
      managerId?: string | null;
      sectorId?: string | null;
      role?: string;
      dottedLineManagerIds?: string[];
    },
  ) => client.patch(`/api/org/users/${id}`, data),

  getLegend: () => client.get<OrgLegend>("/api/org/legend"),

  updateLegend: (data: OrgLegend) =>
    client.put<OrgLegend>("/api/org/legend", data),
};

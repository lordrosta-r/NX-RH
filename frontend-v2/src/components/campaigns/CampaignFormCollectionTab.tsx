import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Send, X, Check, UserPlus, Users } from "lucide-react";
import { campaignsApi } from "../../api/campaigns";
import { usersApi } from "../../api/users";
import { queryKeys } from "../../lib/queryKeys";
import { Badge } from "../shell";
import type { Campaign, CampaignFormRequest, User } from "../../types";

interface CampaignFormCollectionTabProps {
  campaign: Campaign;
  campaignId: string;
}

type StatusKey = CampaignFormRequest["status"];

const STATUS_TONE: Record<StatusKey, "grey" | "blue" | "green" | "red"> = {
  pending: "grey",
  submitted: "blue",
  accepted: "green",
  declined: "red",
};

function managerIdOf(req: CampaignFormRequest): string {
  return typeof req.managerId === "string" ? req.managerId : req.managerId._id;
}

function managerLabelOf(req: CampaignFormRequest): string | null {
  if (typeof req.managerId === "string") return null;
  const { firstName, lastName, email } = req.managerId;
  const name = [firstName, lastName].filter(Boolean).join(" ").trim();
  return name || email || null;
}

function formTitleOf(req: CampaignFormRequest): string | null {
  if (!req.formId || typeof req.formId === "string") return null;
  return req.formId.title ?? null;
}

export default function CampaignFormCollectionTab({
  campaign,
  campaignId,
}: CampaignFormCollectionTabProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const isDraft = campaign.status === "draft";
  const requests = useMemo(
    () => campaign.formRequests ?? [],
    [campaign.formRequests],
  );

  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: queryKeys.campaigns.detail(campaignId),
    });

  const { data: managers = [] } = useQuery({
    queryKey: ["managers-list"],
    queryFn: () =>
      usersApi
        .getUsers({ role: "manager", limit: 200 })
        .then((r) => r.data.data),
    enabled: isDraft,
  });

  const alreadyRequested = useMemo(
    () => new Set(requests.map(managerIdOf)),
    [requests],
  );

  const availableManagers = useMemo(
    () =>
      managers.filter(
        (m: User) => !alreadyRequested.has(m._id ?? m.id),
      ),
    [managers, alreadyRequested],
  );

  const requestMutation = useMutation({
    mutationFn: (ids: string[]) => campaignsApi.requestForms(campaignId, ids),
    onSuccess: () => {
      setSelectedIds([]);
      invalidate();
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (managerId: string) =>
      campaignsApi.cancelFormRequest(campaignId, managerId),
    onSuccess: invalidate,
  });

  const decideMutation = useMutation({
    mutationFn: (vars: {
      managerId: string;
      decision: "accepted" | "declined";
    }) =>
      campaignsApi.decideFormRequest(
        campaignId,
        vars.managerId,
        vars.decision,
      ),
    onSuccess: invalidate,
  });

  const toggle = (id: string) =>
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );

  return (
    <div className="section-gap">
      <div>
        <h3 className="h3">{t("campaigns.formCollection.title")}</h3>
        <p className="small">{t("campaigns.formCollection.desc")}</p>
      </div>

      {isDraft && (
        <div className="tile">
          <div className="row nxgap-12" style={{ marginBottom: 12 }}>
            <UserPlus
              size={16}
              strokeWidth={1.5}
              aria-hidden="true"
              style={{ color: "var(--ink-3)", flex: "none" }}
            />
            <p className="body" style={{ fontWeight: 600 }}>
              {t("campaigns.formCollection.requestLabel")}
            </p>
          </div>

          {availableManagers.length === 0 ? (
            <p className="small">
              {t("campaigns.formCollection.noManagers")}
            </p>
          ) : (
            <>
              <p className="small" style={{ marginBottom: 8 }}>
                {t("campaigns.formCollection.selectManagers")}
              </p>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                  maxHeight: 280,
                  overflowY: "auto",
                }}
              >
                {availableManagers.map((m: User) => {
                  const mid = m._id ?? m.id;
                  const checked = selectedIds.includes(mid);
                  return (
                    <label
                      key={mid}
                      className="row nxgap-12"
                      style={{
                        padding: "8px 10px",
                        borderRadius: 8,
                        cursor: "pointer",
                        background: checked
                          ? "var(--blue-soft, rgba(0,0,0,0.03))"
                          : "transparent",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggle(mid)}
                      />
                      <span className="body">
                        {[m.firstName, m.lastName]
                          .filter(Boolean)
                          .join(" ")
                          .trim() || m.email}
                      </span>
                    </label>
                  );
                })}
              </div>

              <div style={{ marginTop: 12 }}>
                <button
                  onClick={() => requestMutation.mutate(selectedIds)}
                  disabled={
                    selectedIds.length === 0 || requestMutation.isPending
                  }
                  className="btn btn-primary btn-sm"
                >
                  <Send
                    className="ico"
                    style={{ width: 14, height: 14 }}
                    aria-hidden="true"
                  />
                  {t("campaigns.formCollection.requestBtn", {
                    count: selectedIds.length,
                  })}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {requests.length === 0 ? (
        <div className="tile" style={{ textAlign: "center" }}>
          <Users
            size={40}
            strokeWidth={1.5}
            aria-hidden="true"
            style={{
              display: "block",
              margin: "0 auto 12px",
              color: "var(--line-strong)",
            }}
          />
          <p className="small">{t("campaigns.formCollection.empty")}</p>
        </div>
      ) : (
        <div className="tile" style={{ padding: 0, overflow: "hidden" }}>
          {requests.map((req) => {
            const mid = managerIdOf(req);
            const label =
              managerLabelOf(req) ??
              t("campaigns.formCollection.member", { id: mid.slice(-6) });
            const formTitle = formTitleOf(req);
            return (
              <div
                key={mid}
                className="tbl-row row between"
                style={{ gridTemplateColumns: undefined, display: "flex" }}
              >
                <div style={{ minWidth: 0 }}>
                  <p
                    className="body truncate"
                    style={{ fontWeight: 600, color: "var(--ink)" }}
                  >
                    {label}
                  </p>
                  {formTitle && (
                    <p className="small truncate">
                      {t("campaigns.formCollection.submittedForm", {
                        title: formTitle,
                      })}
                    </p>
                  )}
                </div>
                <div
                  className="row nxgap-12"
                  style={{ flex: "none", gap: 12, alignItems: "center" }}
                >
                  <Badge tone={STATUS_TONE[req.status]}>
                    {t(`campaigns.formCollection.status.${req.status}`)}
                  </Badge>

                  {isDraft && req.status === "pending" && (
                    <button
                      onClick={() => cancelMutation.mutate(mid)}
                      disabled={cancelMutation.isPending}
                      className="btn btn-ghost btn-sm"
                      style={{ padding: 6, color: "var(--red)" }}
                    >
                      <X
                        className="ico"
                        style={{ width: 14, height: 14 }}
                        aria-hidden="true"
                      />
                      {t("campaigns.formCollection.cancel")}
                    </button>
                  )}

                  {isDraft && req.status === "submitted" && (
                    <>
                      <button
                        onClick={() =>
                          decideMutation.mutate({
                            managerId: mid,
                            decision: "accepted",
                          })
                        }
                        disabled={decideMutation.isPending}
                        className="btn btn-secondary btn-sm"
                      >
                        <Check
                          className="ico"
                          style={{ width: 14, height: 14 }}
                          aria-hidden="true"
                        />
                        {t("campaigns.formCollection.accept")}
                      </button>
                      <button
                        onClick={() =>
                          decideMutation.mutate({
                            managerId: mid,
                            decision: "declined",
                          })
                        }
                        disabled={decideMutation.isPending}
                        className="btn btn-ghost btn-sm"
                        style={{ color: "var(--red)" }}
                      >
                        <X
                          className="ico"
                          style={{ width: 14, height: 14 }}
                          aria-hidden="true"
                        />
                        {t("campaigns.formCollection.decline")}
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

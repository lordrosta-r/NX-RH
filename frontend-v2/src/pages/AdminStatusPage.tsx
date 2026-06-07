import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { RefreshCw, Database, Mail, Users, Clock } from "lucide-react";
import { adminApi } from "../api/admin";
import { PageHead, Tile, StatTile, Badge, Callout } from "../components/shell";

type SystemStatus = {
  mongo: { ok: boolean };
  smtp: { ok: boolean; error?: string };
  ldap: { configured: boolean };
  uptime: number;
};

function formatUptime(
  seconds: number,
  units: { day: string; hour: string; minute: string },
): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const parts: string[] = [];
  if (d > 0) parts.push(`${d}${units.day}`);
  if (h > 0) parts.push(`${h}${units.hour}`);
  parts.push(`${m}${units.minute}`);
  return parts.join(" ");
}

type ServiceTone = "green" | "red" | "amber";

function ServiceRow({
  icon: Icon,
  name,
  tone,
  label,
  detail,
}: {
  icon: React.ComponentType<{
    className?: string;
    style?: React.CSSProperties;
  }>;
  name: string;
  tone: ServiceTone;
  label: string;
  detail?: string;
}) {
  return (
    <div
      className="row between wrap"
      style={{
        gap: 12,
        padding: "14px 16px",
        border: "1px solid var(--line)",
        borderRadius: "var(--radius)",
      }}
    >
      <div className="row" style={{ gap: 12, minWidth: 0 }}>
        <Icon
          className="ico"
          style={{ width: 20, height: 20, color: "var(--ink-3)", flex: "none" }}
        />
        <div style={{ minWidth: 0 }}>
          <p style={{ fontSize: 15, fontWeight: 700, color: "var(--ink)" }}>
            {name}
          </p>
          {detail && (
            <p className="small" style={{ marginTop: 2 }}>
              {detail}
            </p>
          )}
        </div>
      </div>
      <Badge dot tone={tone}>
        {label}
      </Badge>
    </div>
  );
}

export default function AdminStatusPage() {
  const { t } = useTranslation();
  const { data, isLoading, isError, refetch, isFetching } =
    useQuery<SystemStatus>({
      queryKey: ["admin-system-status"],
      queryFn: () =>
        adminApi.getSystemStatus().then((r) => r.data as SystemStatus),
      refetchInterval: 30000,
    });

  return (
    <div className="nx-app">
      <PageHead
        eyebrow={t("adminStatus.eyebrow")}
        title={t("adminStatus.title")}
        desc={t("adminStatus.desc")}
        actions={
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="btn btn-ghost"
            aria-label={t("adminStatus.refreshAria")}
          >
            <RefreshCw
              className={`ico ${isFetching ? "animate-spin" : ""}`.trim()}
              style={{ width: 18, height: 18 }}
            />
            {t("adminStatus.refresh")}
          </button>
        }
      />

      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-24 bg-slate-100 rounded-xl animate-pulse"
            />
          ))}
        </div>
      )}

      {isError && (
        <Callout tone="red">
          <p className="body" style={{ color: "var(--ink)" }}>
            {t("adminStatus.error")}
          </p>
        </Callout>
      )}

      {data && (
        <>
          <Tile className="mb-6">
            <h2 className="h2" style={{ marginBottom: 16 }}>
              {t("adminStatus.services.title")}
            </h2>
            <div className="section-gap" style={{ gap: 12 }}>
              <ServiceRow
                icon={Database}
                name="MongoDB"
                tone={data.mongo.ok ? "green" : "red"}
                label={
                  data.mongo.ok
                    ? t("adminStatus.services.operational")
                    : t("adminStatus.services.errorLabel")
                }
              />
              <ServiceRow
                icon={Mail}
                name="SMTP"
                tone={data.smtp.ok ? "green" : "red"}
                label={
                  data.smtp.ok
                    ? t("adminStatus.services.operational")
                    : t("adminStatus.services.errorLabel")
                }
                detail={data.smtp.error}
              />
              <ServiceRow
                icon={Users}
                name="LDAP"
                tone={data.ldap.configured ? "green" : "amber"}
                label={
                  data.ldap.configured
                    ? t("adminStatus.services.operational")
                    : t("adminStatus.services.notConfigured")
                }
              />
            </div>
          </Tile>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatTile
              value={
                <span className="row" style={{ gap: 8 }}>
                  <Clock
                    className="ico"
                    style={{ width: 20, height: 20, color: "var(--ink-3)" }}
                  />
                  {formatUptime(data.uptime, {
                    day: t("adminStatus.uptime.day"),
                    hour: t("adminStatus.uptime.hour"),
                    minute: t("adminStatus.uptime.minute"),
                  })}
                </span>
              }
              label={t("adminStatus.uptime.label")}
              tone="var(--blue)"
            />
          </div>
        </>
      )}
    </div>
  );
}

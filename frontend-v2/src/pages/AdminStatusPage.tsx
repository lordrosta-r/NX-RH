import { useQuery } from "@tanstack/react-query";
import { RefreshCw, Database, Mail, Users, Clock } from "lucide-react";
import { adminApi } from "../api/admin";
import { PageHead, Tile, StatTile, Badge, Callout } from "../components/shell";

type SystemStatus = {
  mongo: { ok: boolean };
  smtp: { ok: boolean; error?: string };
  ldap: { configured: boolean };
  uptime: number;
};

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const parts: string[] = [];
  if (d > 0) parts.push(`${d}j`);
  if (h > 0) parts.push(`${h}h`);
  parts.push(`${m}min`);
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
        eyebrow="Administration"
        title="Santé système"
        desc="État des services et disponibilité de la plateforme."
        actions={
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="btn btn-ghost"
            aria-label="Actualiser le statut système"
          >
            <RefreshCw
              className={`ico ${isFetching ? "animate-spin" : ""}`.trim()}
              style={{ width: 18, height: 18 }}
            />
            Actualiser
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
            Impossible de récupérer le statut système. L&apos;endpoint est
            peut-être indisponible.
          </p>
        </Callout>
      )}

      {data && (
        <>
          <Tile className="mb-6">
            <h2 className="h2" style={{ marginBottom: 16 }}>
              Services
            </h2>
            <div className="section-gap" style={{ gap: 12 }}>
              <ServiceRow
                icon={Database}
                name="MongoDB"
                tone={data.mongo.ok ? "green" : "red"}
                label={data.mongo.ok ? "Opérationnel" : "Erreur"}
              />
              <ServiceRow
                icon={Mail}
                name="SMTP"
                tone={data.smtp.ok ? "green" : "red"}
                label={data.smtp.ok ? "Opérationnel" : "Erreur"}
                detail={data.smtp.error}
              />
              <ServiceRow
                icon={Users}
                name="LDAP"
                tone={data.ldap.configured ? "green" : "amber"}
                label={data.ldap.configured ? "Opérationnel" : "Non configuré"}
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
                  {formatUptime(data.uptime)}
                </span>
              }
              label="Uptime"
              tone="var(--blue)"
            />
          </div>
        </>
      )}
    </div>
  );
}

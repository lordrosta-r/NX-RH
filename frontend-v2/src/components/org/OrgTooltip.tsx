import { Mail, Building2, Users } from "lucide-react";

interface OrgTooltipProps {
  firstName: string;
  lastName: string;
  role: string;
  color: string;
  department?: string;
  email?: string;
  reportCount: number;
  managerName?: string;
}

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  hr: "RH",
  manager: "Responsable",
  employee: "Collaborateur",
};

export default function OrgTooltip({
  firstName,
  lastName,
  role,
  color,
  department,
  email,
  reportCount,
  managerName,
}: OrgTooltipProps) {
  return (
    <div
      className="absolute z-50 p-3 text-left pointer-events-none"
      style={{
        bottom: "110%",
        left: "50%",
        transform: "translateX(-50%)",
        minWidth: 200,
        maxWidth: 260,
        background: "#fff",
        border: "1px solid var(--line)",
        borderRadius: "var(--radius)",
        boxShadow: "var(--shadow-lg)",
      }}
    >
      {/* Arrow */}
      <div
        className="absolute bottom-[-6px] left-1/2 -translate-x-1/2 w-3 h-3 rotate-45"
        style={{
          background: "#fff",
          borderRight: "1px solid var(--line)",
          borderBottom: "1px solid var(--line)",
        }}
      />

      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <div
          className="avatar flex-shrink-0"
          style={{
            width: 28,
            height: 28,
            fontSize: 12,
            backgroundColor: color,
          }}
        >
          {firstName[0]}
          {lastName[0]}
        </div>
        <div>
          <p
            className="body font-semibold leading-none"
            style={{ fontSize: 14, color: "var(--ink)" }}
          >
            {firstName} {lastName}
          </p>
          <span className="badge grey" style={{ marginTop: 4 }}>
            {ROLE_LABELS[role] ?? role}
          </span>
        </div>
      </div>

      <div
        className="pt-2 space-y-1"
        style={{ borderTop: "1px solid var(--line)" }}
      >
        {email && (
          <div
            className="small flex items-center gap-1.5"
            style={{ color: "var(--ink-2)" }}
          >
            <Mail
              size={11}
              className="flex-shrink-0"
              style={{ color: "var(--ink-3)" }}
            />
            <span className="truncate">{email}</span>
          </div>
        )}
        {department && (
          <div
            className="small flex items-center gap-1.5"
            style={{ color: "var(--ink-2)" }}
          >
            <Building2
              size={11}
              className="flex-shrink-0"
              style={{ color: "var(--ink-3)" }}
            />
            <span>{department}</span>
          </div>
        )}
        {managerName && (
          <div
            className="small flex items-center gap-1.5"
            style={{ color: "var(--ink-2)" }}
          >
            <span
              className="small"
              style={{ color: "var(--ink-3)", fontSize: 10 }}
            >
              N+1
            </span>
            <span>{managerName}</span>
          </div>
        )}
        <div
          className="small flex items-center gap-1.5"
          style={{ color: "var(--ink-2)" }}
        >
          <Users
            size={11}
            className="flex-shrink-0"
            style={{ color: "var(--ink-3)" }}
          />
          <span>
            {reportCount} reporté{reportCount !== 1 ? "s" : ""} direct
            {reportCount !== 1 ? "s" : ""}
          </span>
        </div>
      </div>
    </div>
  );
}

import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Settings,
  Mail,
  Server,
  Shield,
  Upload,
  Briefcase,
  Users,
} from "lucide-react";
import type { ReactNode } from "react";
import { PageHead, Tile } from "../components/shell";
import Breadcrumbs from "../components/ui/Breadcrumbs";

// ─── Palette helpers ──────────────────────────────────────────────────────────

const iconColor: Record<string, string> = {
  blue: "var(--blue)",
  green: "var(--green)",
  purple: "var(--blue)",
  orange: "var(--amber)",
  gray: "var(--ink-3)",
  teal: "var(--green)",
};

// ─── Data ─────────────────────────────────────────────────────────────────────

type AdminItem = { label: string; href: string; desc: string };
type AdminSection = {
  id: string;
  title: string;
  icon: ReactNode;
  color: string;
  items: AdminItem[];
};

const adminSections: AdminSection[] = [
  {
    id: "people",
    title: "adminHub.peopleTitle",
    icon: <Users className="w-5 h-5" />,
    color: "blue",
    items: [
      {
        label: "adminHub.peopleAccounts",
        href: "/admin/users",
        desc: "adminHub.peopleAccountsDesc",
      },
      {
        label: "adminHub.peopleStats",
        href: "/admin/stats",
        desc: "adminHub.peopleStatsDesc",
      },
    ],
  },
  {
    id: "system",
    title: "adminHub.sysTitle",
    icon: <Settings className="w-5 h-5" />,
    color: "gray",
    items: [
      {
        label: "adminHub.sysConfig",
        href: "/admin/config",
        desc: "adminHub.sysConfigDesc",
      },
      {
        label: "adminHub.sysStatus",
        href: "/admin/status",
        desc: "adminHub.sysStatusDesc",
      },
      {
        label: "adminHub.sysSetup",
        href: "/admin/setup",
        desc: "adminHub.sysSetupDesc",
      },
    ],
  },
  {
    id: "email",
    title: "adminHub.emailTitle",
    icon: <Mail className="w-5 h-5" />,
    color: "orange",
    items: [
      {
        label: "adminHub.emailSmtp",
        href: "/admin/mail-config",
        desc: "adminHub.emailSmtpDesc",
      },
      {
        label: "adminHub.emailTemplates",
        href: "/admin/mail-templates",
        desc: "adminHub.emailTemplatesDesc",
      },
    ],
  },
  {
    id: "ldap",
    title: "adminHub.ldapTitle",
    icon: <Server className="w-5 h-5" />,
    color: "blue",
    items: [
      {
        label: "adminHub.ldap",
        href: "/admin/ldap",
        desc: "adminHub.ldapDesc",
      },
    ],
  },
  {
    id: "security",
    title: "adminHub.secTitle",
    icon: <Shield className="w-5 h-5" />,
    color: "purple",
    items: [
      {
        label: "adminHub.secAudit",
        href: "/admin/audit",
        desc: "adminHub.secAuditDesc",
      },
      {
        label: "adminHub.secSsl",
        href: "/admin/ssl",
        desc: "adminHub.secSslDesc",
      },
    ],
  },
  {
    id: "imports",
    title: "adminHub.importsTitle",
    icon: <Upload className="w-5 h-5" />,
    color: "green",
    items: [
      {
        label: "adminHub.importsUsers",
        href: "/admin/users/import",
        desc: "adminHub.importsUsersDesc",
      },
      {
        label: "adminHub.importsForms",
        href: "/admin/forms/import",
        desc: "adminHub.importsFormsDesc",
      },
    ],
  },
  {
    id: "hr-settings",
    title: "adminHub.hrTitle",
    icon: <Briefcase className="w-5 h-5" />,
    color: "teal",
    items: [
      {
        label: "adminHub.hrSettings",
        href: "/admin/settings",
        desc: "adminHub.hrSettingsDesc",
      },
    ],
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function AdminHubPage() {
  const { t } = useTranslation();
  return (
    <div className="nx-app">
      <Breadcrumbs
        items={[
          { label: t("common.home"), href: "/" },
          { label: t("eyebrow.administration") },
        ]}
      />

      <PageHead
        eyebrow={t("eyebrow.administration")}
        title={t("adminHub.title")}
        desc={t("adminHub.desc")}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {adminSections.map((section) => (
          <Tile key={section.id}>
            <div className="row" style={{ gap: 12, marginBottom: 16 }}>
              <span
                className="row"
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "var(--radius)",
                  background: "var(--bg-alt)",
                  color: iconColor[section.color],
                  placeItems: "center",
                  flex: "none",
                }}
              >
                {section.icon}
              </span>
              <h2 className="h3">{t(section.title)}</h2>
            </div>
            <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {section.items.map((item) => (
                <li key={item.href}>
                  <Link
                    to={item.href}
                    className="tile-link"
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 2,
                      padding: "10px 12px",
                      borderRadius: "var(--radius)",
                      color: "inherit",
                    }}
                  >
                    <span
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: "var(--ink)",
                      }}
                    >
                      {t(item.label)}
                    </span>
                    <span className="small">{t(item.desc)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </Tile>
        ))}
      </div>
    </div>
  );
}

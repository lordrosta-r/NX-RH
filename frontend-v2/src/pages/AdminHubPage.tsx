import { Link } from "react-router-dom";
import {
  Settings,
  Mail,
  Server,
  Shield,
  Upload,
  Briefcase,
} from "lucide-react";
import type { ReactNode } from "react";
import { PageHead, Tile } from "../components/shell";

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
    id: "system",
    title: "Système",
    icon: <Settings className="w-5 h-5" />,
    color: "gray",
    items: [
      {
        label: "Configuration système",
        href: "/admin/config",
        desc: "Clés et variables d'environnement",
      },
      {
        label: "État du système",
        href: "/admin/status",
        desc: "Santé et disponibilité des services",
      },
      {
        label: "Assistant de configuration",
        href: "/admin/setup",
        desc: "Initialiser la plateforme pas à pas",
      },
    ],
  },
  {
    id: "email",
    title: "E-mail",
    icon: <Mail className="w-5 h-5" />,
    color: "orange",
    items: [
      {
        label: "Configuration e-mail / SMTP",
        href: "/admin/mail-config",
        desc: "Paramètres du serveur d'envoi",
      },
      {
        label: "Modèles d'e-mail",
        href: "/admin/mail-templates",
        desc: "Personnaliser les notifications",
      },
    ],
  },
  {
    id: "ldap",
    title: "Annuaire (LDAP)",
    icon: <Server className="w-5 h-5" />,
    color: "blue",
    items: [
      {
        label: "Annuaire LDAP",
        href: "/admin/ldap",
        desc: "Synchronisation de l'annuaire",
      },
    ],
  },
  {
    id: "security",
    title: "Sécurité & Audit",
    icon: <Shield className="w-5 h-5" />,
    color: "purple",
    items: [
      {
        label: "Journal d'audit",
        href: "/admin/audit",
        desc: "Logs et traçabilité des actions",
      },
    ],
  },
  {
    id: "imports",
    title: "Imports",
    icon: <Upload className="w-5 h-5" />,
    color: "green",
    items: [
      {
        label: "Import utilisateurs",
        href: "/admin/users/import",
        desc: "Importer des comptes en masse",
      },
      {
        label: "Import formulaires",
        href: "/admin/forms/import",
        desc: "Importer des modèles d'évaluation",
      },
    ],
  },
  {
    id: "hr-settings",
    title: "Paramètres RH",
    icon: <Briefcase className="w-5 h-5" />,
    color: "teal",
    items: [
      {
        label: "Paramètres RH",
        href: "/admin/settings",
        desc: "Configuration métier et globale",
      },
    ],
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function AdminHubPage() {
  return (
    <div className="nx-app">
      <PageHead
        eyebrow="Administration"
        title="Configuration"
        desc="Accédez à tous les réglages techniques et administratifs de la plateforme."
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
              <h2 className="h3">{section.title}</h2>
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
                      {item.label}
                    </span>
                    <span className="small">{item.desc}</span>
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

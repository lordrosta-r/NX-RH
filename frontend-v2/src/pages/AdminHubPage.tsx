import { Link } from "react-router-dom";
import {
  Users,
  ClipboardList,
  Briefcase,
  Mail,
  Settings,
  BarChart2,
} from "lucide-react";
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

const adminFamilies = [
  {
    id: "users",
    title: "Utilisateurs & Accès",
    icon: <Users className="w-5 h-5" />,
    color: "blue",
    items: [
      {
        label: "Gestion des utilisateurs",
        href: "/admin/users",
        desc: "Créer, modifier, désactiver",
      },
      {
        label: "Import CSV",
        href: "/admin/users/import",
        desc: "Importer en masse",
      },
      {
        label: "Groupes & équipes",
        href: "/users/groups",
        desc: "Organiser par équipe",
      },
      { label: "Organigramme", href: "/org", desc: "Visualiser la hiérarchie" },
    ],
  },
  {
    id: "campaigns",
    title: "Campagnes & Évaluations",
    icon: <ClipboardList className="w-5 h-5" />,
    color: "green",
    items: [
      {
        label: "Campagnes",
        href: "/campaigns",
        desc: "Créer et gérer les campagnes",
      },
      { label: "Formulaires", href: "/forms", desc: "Templates d'évaluation" },
      {
        label: "Suivi des évaluations",
        href: "/evaluations",
        desc: "Toutes les évaluations",
      },
    ],
  },
  {
    id: "hr",
    title: "RH & Mobilité",
    icon: <Briefcase className="w-5 h-5" />,
    color: "purple",
    items: [
      {
        label: "Demandes de mobilité",
        href: "/mobility",
        desc: "Suivre les demandes",
      },
      {
        label: "Suivi des demandes RH",
        href: "/hr/flags",
        desc: "Flags et alertes RH",
      },
      { label: "Onboarding", href: "/onboarding", desc: "Nouveaux arrivants" },
      { label: "Offboarding", href: "/offboarding", desc: "Départs" },
    ],
  },
  {
    id: "communication",
    title: "Configuration email",
    icon: <Mail className="w-5 h-5" />,
    color: "orange",
    items: [
      {
        label: "Templates email",
        href: "/admin/mail-templates",
        desc: "Personnaliser les emails",
      },
      {
        label: "Test d'envoi",
        href: "/admin/test-mail",
        desc: "Tester la configuration",
      },
      {
        label: "Configuration SMTP",
        href: "/admin/mail-config",
        desc: "Paramètres serveur mail",
      },
    ],
  },
  {
    id: "system",
    title: "Système",
    icon: <Settings className="w-5 h-5" />,
    color: "gray",
    items: [
      {
        label: "Configuration LDAP",
        href: "/admin/ldap",
        desc: "Synchronisation annuaire",
      },
      {
        label: "Journal d'audit",
        href: "/admin/audit",
        desc: "Logs et traçabilité",
      },
      {
        label: "Paramètres généraux",
        href: "/admin/settings",
        desc: "Configuration globale",
      },
    ],
  },
  {
    id: "stats",
    title: "Statistiques",
    icon: <BarChart2 className="w-5 h-5" />,
    color: "teal",
    items: [
      {
        label: "Vue d'ensemble",
        href: "/admin/stats",
        desc: "KPIs et indicateurs globaux",
      },
      {
        label: "Analytics campagnes",
        href: "/analytics",
        desc: "Statistiques des campagnes",
      },
      {
        label: "Import formulaires",
        href: "/admin/forms/import",
        desc: "Importer des modèles",
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
        title="Administration"
        desc="Accédez à toutes les fonctions d'administration de la plateforme."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {adminFamilies.map((family) => (
          <Tile key={family.id}>
            <div className="row" style={{ gap: 12, marginBottom: 16 }}>
              <span
                className="row"
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "var(--radius)",
                  background: "var(--bg-alt)",
                  color: iconColor[family.color],
                  placeItems: "center",
                  flex: "none",
                }}
              >
                {family.icon}
              </span>
              <h2 className="h3">{family.title}</h2>
            </div>
            <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {family.items.map((item) => (
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

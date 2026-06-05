import type { Role } from "../../types";
import type { Perspective } from "../../contexts/PerspectiveContext";

export interface SubLink {
  label: string;
  href: string;
  end?: boolean;
}
export interface MoreItem {
  label: string;
  href: string;
  group: string;
}
export interface PerspectiveNav {
  primary: SubLink[];
  more: MoreItem[];
}

type T = (key: string) => string;

/**
 * Config de navigation par rôle ET perspective.
 * Invariant : toute route présente dans l'ancienne nav reste joignable via
 * `primary` ou `more` d'au moins une perspective (rien n'est retiré).
 */
export function getPerspectiveNav(
  role: Role,
  perspective: Perspective,
  t: T,
): PerspectiveNav {
  const dashboard: SubLink = {
    label: t("nav.dashboard"),
    href: "/",
    end: true,
  };

  // Vue perso (« Mon espace ») — commune à tous les rôles spéciaux + employee.
  const me: PerspectiveNav = {
    primary: [
      dashboard,
      { label: t("nav.myEvaluations"), href: "/evaluations" },
      { label: t("nav.history"), href: "/evaluations/history" },
      { label: t("nav.mobility"), href: "/mobility" },
      { label: t("nav.pdi"), href: "/pdi" },
    ],
    more: [],
  };

  if (role === "employee") return me;
  if (perspective === "me") return me;

  // perspective === "work"
  if (role === "manager") {
    return {
      primary: [
        dashboard,
        { label: t("nav.myTeamLink"), href: "/users" },
        { label: t("nav.org"), href: "/org" },
        { label: t("nav.campaigns"), href: "/campaigns" },
        { label: t("nav.evaluations"), href: "/evaluations" },
      ],
      more: [
        {
          label: t("nav.history"),
          href: "/evaluations/history",
          group: t("nav.evaluations"),
        },
        { label: t("nav.calendar"), href: "/events", group: t("nav.pilotage") },
        {
          label: t("nav.resources"),
          href: "/resources",
          group: t("nav.pilotage"),
        },
      ],
    };
  }

  if (role === "hr") {
    return {
      primary: [
        dashboard,
        { label: t("nav.users"), href: "/users" },
        { label: t("nav.campaigns"), href: "/campaigns" },
        { label: t("nav.evaluations"), href: "/evaluations" },
        { label: t("nav.calendar"), href: "/events" },
      ],
      more: [
        { label: t("nav.org"), href: "/org", group: t("nav.collaborateurs") },
        {
          label: t("nav.offboarding"),
          href: "/offboarding",
          group: t("nav.collaborateurs"),
        },
        { label: t("nav.forms"), href: "/forms", group: t("nav.campaigns") },
        {
          label: t("nav.history"),
          href: "/evaluations/history",
          group: t("nav.evaluations"),
        },
        {
          label: t("nav.hrFlags"),
          href: "/hr/flags",
          group: t("nav.evaluations"),
        },
        {
          label: t("nav.mobility"),
          href: "/mobility",
          group: t("nav.monParcours"),
        },
        { label: t("nav.pdi"), href: "/pdi", group: t("nav.monParcours") },
        {
          label: t("nav.resources"),
          href: "/resources",
          group: t("nav.pilotage"),
        },
        {
          label: t("nav.adminPortal"),
          href: "/admin",
          group: t("nav.administration"),
        },
        {
          label: t("nav.hrSettings"),
          href: "/admin/settings",
          group: t("nav.administration"),
        },
        {
          label: t("nav.auditLog"),
          href: "/admin/audit",
          group: t("nav.administration"),
        },
        {
          label: t("nav.usersImport"),
          href: "/admin/users/import",
          group: t("nav.administration"),
        },
        {
          label: t("nav.formsImport"),
          href: "/admin/forms/import",
          group: t("nav.administration"),
        },
        {
          label: t("nav.mailTemplates"),
          href: "/admin/mail-templates",
          group: t("nav.administration"),
        },
      ],
    };
  }

  // admin
  return {
    primary: [
      dashboard,
      { label: t("nav.users"), href: "/users" },
      { label: t("nav.campaigns"), href: "/campaigns" },
      { label: t("nav.evaluations"), href: "/evaluations" },
      { label: t("nav.calendar"), href: "/events" },
    ],
    more: [
      { label: t("nav.org"), href: "/org", group: t("nav.collaborateurs") },
      {
        label: t("nav.offboarding"),
        href: "/offboarding",
        group: t("nav.collaborateurs"),
      },
      { label: t("nav.forms"), href: "/forms", group: t("nav.campaigns") },
      {
        label: t("nav.history"),
        href: "/evaluations/history",
        group: t("nav.evaluations"),
      },
      {
        label: t("nav.hrFlags"),
        href: "/hr/flags",
        group: t("nav.evaluations"),
      },
      {
        label: t("nav.resources"),
        href: "/resources",
        group: t("nav.pilotage"),
      },
      {
        label: t("nav.analytics"),
        href: "/analytics",
        group: t("nav.pilotage"),
      },
      {
        label: t("nav.mobility"),
        href: "/mobility",
        group: t("nav.monParcours"),
      },
      { label: t("nav.pdi"), href: "/pdi", group: t("nav.monParcours") },
      {
        label: t("nav.adminPortal"),
        href: "/admin",
        group: t("nav.administration"),
      },
      {
        label: t("nav.setupWizard"),
        href: "/admin/setup",
        group: t("nav.administration"),
      },
      {
        label: t("nav.ldap"),
        href: "/admin/ldap",
        group: t("nav.administration"),
      },
      {
        label: t("nav.systemConfig"),
        href: "/admin/config",
        group: t("nav.administration"),
      },
      {
        label: t("nav.mailConfig"),
        href: "/admin/mail-config",
        group: t("nav.administration"),
      },
      {
        label: t("nav.mailTemplates"),
        href: "/admin/mail-templates",
        group: t("nav.administration"),
      },
      {
        label: t("nav.systemStatus"),
        href: "/admin/status",
        group: t("nav.administration"),
      },
      {
        label: t("nav.auditLog"),
        href: "/admin/audit",
        group: t("nav.administration"),
      },
      {
        label: t("nav.usersImport"),
        href: "/admin/users/import",
        group: t("nav.administration"),
      },
      {
        label: t("nav.formsImport"),
        href: "/admin/forms/import",
        group: t("nav.administration"),
      },
      {
        label: t("nav.hrSettings"),
        href: "/admin/settings",
        group: t("nav.administration"),
      },
    ],
  };
}

/** Libellé de la perspective « métier » selon le rôle. */
export function workPerspectiveLabel(role: Role, t: T): string {
  if (role === "manager") return t("nav.myTeam");
  if (role === "hr") return t("nav.perspectiveRh");
  return t("nav.administration");
}

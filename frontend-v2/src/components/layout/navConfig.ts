import type { Role } from "../../types";
import type { Perspective } from "../../contexts/PerspectiveContext";

export interface SubLink {
  label: string;
  href: string;
  end?: boolean;
}
/** Élément primaire « groupe » : rendu comme un dropdown dans la sous-nav. */
export interface NavGroup {
  label: string;
  children: SubLink[];
}
/** Un item primaire est soit un lien direct, soit un groupe (dropdown). */
export type PrimaryItem = SubLink | NavGroup;
export interface MoreItem {
  label: string;
  href: string;
  group: string;
}
export interface PerspectiveNav {
  primary: PrimaryItem[];
  more: MoreItem[];
}

/** Discriminant de l'union PrimaryItem. */
export function isNavGroup(item: PrimaryItem): item is NavGroup {
  return "children" in item;
}

type T = (key: string) => string;

/**
 * Config de navigation par rôle ET perspective.
 * Invariant : toute route présente dans l'ancienne nav reste joignable via
 * `primary` ou `more` d'au moins une perspective (rien n'est retiré).
 *
 * Note : le lien « Aide » a été retiré des menus — il reste joignable via le
 * bouton `?` (HelpCircle → /help) présent dans la barre supérieure pour tous
 * les rôles.
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
        { label: t("nav.toProcess"), href: "/manager/todo" },
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

  // Groupes primaires communs RH / Admin.
  const collaborateurs: NavGroup = {
    label: t("nav.collaborateurs"),
    children: [
      { label: t("nav.users"), href: "/users" },
      { label: t("nav.org"), href: "/org" },
    ],
  };
  const campagnes: NavGroup = {
    label: t("nav.campaigns"),
    children: [
      { label: t("nav.campaigns"), href: "/campaigns", end: true },
      { label: t("nav.forms"), href: "/forms" },
    ],
  };
  const administration: SubLink = {
    label: t("nav.administration"),
    href: "/admin",
  };
  const pilotageMore: MoreItem[] = [
    { label: t("nav.calendar"), href: "/events", group: t("nav.pilotage") },
    { label: t("nav.resources"), href: "/resources", group: t("nav.pilotage") },
    { label: t("nav.analytics"), href: "/analytics", group: t("nav.pilotage") },
  ];

  if (role === "hr") {
    const evaluations: NavGroup = {
      label: t("nav.evaluations"),
      children: [
        { label: t("nav.evaluations"), href: "/evaluations", end: true },
        { label: t("nav.history"), href: "/evaluations/history" },
        { label: t("nav.hrFlags"), href: "/hr/flags" },
      ],
    };
    return {
      // Mobilité / PDI restent joignables via la perspective « Mon espace ».
      primary: [
        dashboard,
        collaborateurs,
        campagnes,
        evaluations,
        administration,
      ],
      more: pilotageMore,
    };
  }

  // admin — pas de perspective « Mon espace » : les Demandes (mobilité) sont
  // une vue de gestion regroupée sous « Évaluations » pour rester joignables.
  const evaluations: NavGroup = {
    label: t("nav.evaluations"),
    children: [
      { label: t("nav.evaluations"), href: "/evaluations", end: true },
      { label: t("nav.history"), href: "/evaluations/history" },
      { label: t("nav.hrFlags"), href: "/hr/flags" },
      { label: t("nav.mobility"), href: "/mobility" },
    ],
  };
  return {
    primary: [
      dashboard,
      collaborateurs,
      campagnes,
      evaluations,
      administration,
    ],
    more: pilotageMore,
  };
}

/** Libellé de la perspective « métier » selon le rôle. */
export function workPerspectiveLabel(role: Role, t: T): string {
  if (role === "manager") return t("nav.myTeam");
  if (role === "hr") return t("nav.perspectiveRh");
  return t("nav.administration");
}

import { useState, useRef, useEffect } from "react";
import { NavLink, Link } from "react-router-dom";
import nxLogo from "../../assets/nx-logo.png";
import {
  ChevronDown,
  LogOut,
  User,
  Menu,
  X,
  Search,
  Globe,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import type { Role } from "../../types";
import { NotificationBell } from "../NotificationBell";
import clsx from "clsx";
import { useTranslation } from "react-i18next";

interface NavItem {
  label: string;
  href?: string;
  dropdown?: { label: string; href: string; separator?: boolean }[];
}

function getNavItems(role: Role, t: (key: string) => string): NavItem[] {
  const dashboard: NavItem = { label: t("nav.dashboard"), href: "/" };

  const pilotage: NavItem = {
    label: t("nav.pilotage"),
    dropdown: [
      { label: t("nav.calendar"), href: "/events" },
      { label: t("nav.resources"), href: "/resources" },
      { label: t("nav.analytics"), href: "/analytics", separator: true },
    ],
  };

  const pilotageNoAnalytics: NavItem = {
    label: t("nav.pilotage"),
    dropdown: [
      { label: t("nav.calendar"), href: "/events" },
      { label: t("nav.resources"), href: "/resources" },
    ],
  };

  const collaborateurs: NavItem = {
    label: t("nav.collaborateurs"),
    dropdown: [
      { label: t("nav.users"), href: "/users" },
      { label: t("nav.org"), href: "/org" },
      { label: t("nav.offboarding"), href: "/offboarding", separator: true },
    ],
  };

  const monParcours: NavItem = {
    label: t("nav.monParcours"),
    dropdown: [
      { label: t("nav.mobility"), href: "/mobility" },
      { label: t("nav.pdi"), href: "/pdi" },
    ],
  };

  if (role === "admin")
    return [
      dashboard,
      collaborateurs,
      {
        label: t("nav.campaigns"),
        dropdown: [
          { label: t("nav.campaigns"), href: "/campaigns" },
          { label: t("nav.forms"), href: "/forms" },
        ],
      },
      {
        label: t("nav.evaluations"),
        dropdown: [
          { label: t("nav.allEvaluations"), href: "/evaluations" },
          { label: t("nav.history"), href: "/evaluations/history" },
        ],
      },
      pilotage,
      {
        label: t("nav.administration"),
        dropdown: [
          { label: t("nav.adminPortal"), href: "/admin" },
          { label: t("nav.auditLog"), href: "/admin/audit" },
          {
            label: t("nav.hrSettings"),
            href: "/admin/settings",
            separator: true,
          },
          { label: t("nav.hrFlags"), href: "/hr/flags" },
          { label: t("nav.mobilityInternal"), href: "/mobility" },
          { label: t("nav.pdi"), href: "/pdi" },
        ],
      },
    ];

  if (role === "hr")
    return [
      dashboard,
      collaborateurs,
      {
        label: t("nav.campaigns"),
        dropdown: [
          { label: t("nav.campaigns"), href: "/campaigns" },
          { label: t("nav.forms"), href: "/forms" },
        ],
      },
      {
        label: t("nav.evaluations"),
        dropdown: [
          { label: t("nav.allEvaluations"), href: "/evaluations" },
          { label: t("nav.history"), href: "/evaluations/history" },
          { label: t("nav.hrFlags"), href: "/hr/flags", separator: true },
          { label: t("nav.mobilityInternal"), href: "/mobility" },
          { label: t("nav.pdi"), href: "/pdi" },
        ],
      },
      pilotageNoAnalytics,
      {
        label: t("nav.administration"),
        dropdown: [
          { label: t("nav.adminPortal"), href: "/admin" },
          {
            label: t("nav.hrSettings"),
            href: "/admin/settings",
            separator: true,
          },
          { label: t("nav.auditLog"), href: "/admin/audit" },
          { label: t("nav.usersImport"), href: "/admin/users/import" },
          { label: t("nav.formsImport"), href: "/admin/forms/import" },
          { label: t("nav.mailTemplates"), href: "/admin/mail-templates" },
        ],
      },
    ];

  if (role === "manager")
    return [
      dashboard,
      {
        label: t("nav.myTeam"),
        dropdown: [
          { label: t("nav.myTeamLink"), href: "/users" },
          { label: t("nav.org"), href: "/org" },
        ],
      },
      { label: t("nav.campaigns"), href: "/campaigns" },
      {
        label: t("nav.evaluations"),
        dropdown: [
          { label: t("nav.toProcess"), href: "/evaluations" },
          { label: t("nav.history"), href: "/evaluations/history" },
        ],
      },
      monParcours,
      pilotageNoAnalytics,
    ];

  // employee
  return [
    dashboard,
    {
      label: t("nav.myEvaluations"),
      dropdown: [
        { label: t("nav.inProgress"), href: "/evaluations" },
        { label: t("nav.history"), href: "/evaluations/history" },
      ],
    },
    monParcours,
  ];
}
function NavDropdown({ item }: { item: NavItem }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900 font-medium py-1 transition-colors focus:outline-none focus-visible:text-primary-600"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        {item.label}
        <ChevronDown
          className={clsx(
            "w-3.5 h-3.5 transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      {open && (
        <div
          className="absolute top-full left-0 mt-2 w-52 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-100 dark:border-slate-700 py-1 z-50"
          role="menu"
        >
          {item.dropdown!.map((d) => (
            <div key={`${d.href}-${d.label}`}>
              {d.separator && (
                <div className="my-1 border-t border-slate-100" />
              )}
              <NavLink
                to={d.href}
                onClick={() => setOpen(false)}
                role="menuitem"
                className={({ isActive }) =>
                  clsx(
                    "block px-4 py-2 text-sm transition-colors",
                    isActive
                      ? "text-primary-600 bg-primary-50 dark:bg-primary-900/20"
                      : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700",
                  )
                }
              >
                {d.label}
              </NavLink>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Navbar({
  onSearchClick,
}: {
  onSearchClick?: () => void;
}) {
  const { t, i18n } = useTranslation();
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const avatarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (avatarRef.current && !avatarRef.current.contains(e.target as Node))
        setAvatarOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setMobileOpen(false);
    }
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, []);

  const navItems = user ? getNavItems(user.role, t) : [];
  const initials = user
    ? `${user.firstName[0] ?? ""}${user.lastName[0] ?? ""}`.toUpperCase()
    : "??";

  async function handleLogout() {
    setAvatarOpen(false);
    await logout();
  }

  function handleToggleLanguage() {
    void i18n.changeLanguage(i18n.language === "fr" ? "en" : "fr");
  }

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-40 h-16 bg-white dark:bg-slate-900 shadow-sm dark:shadow-slate-900/50 border-b border-transparent dark:border-slate-800"
      aria-label="Navigation principale"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between gap-6">
        {/* Logo */}
        <Link to="/" className="flex items-center flex-shrink-0">
          <img src={nxLogo} alt="NanoXplore RH" className="h-8 w-auto" />
        </Link>

        {/* Nav desktop */}
        <div className="hidden md:flex items-center gap-5 flex-1">
          {navItems.map((item) =>
            item.dropdown ? (
              <NavDropdown key={item.label} item={item} />
            ) : (
              <NavLink
                key={item.href}
                to={item.href!}
                end={item.href === "/"}
                className={({ isActive }) =>
                  clsx(
                    "text-sm font-medium transition-colors whitespace-nowrap",
                    isActive
                      ? "text-primary-600"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100",
                  )
                }
              >
                {item.label}
              </NavLink>
            ),
          )}
        </div>

        {/* Zone droite */}
        <div className="flex items-center gap-3">
          {/* Search */}
          <button
            onClick={() => onSearchClick?.()}
            className="p-2 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-300 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label={t("nav.search")}
          >
            <Search className="w-5 h-5" />
          </button>

          {/* Notifications */}
          <NotificationBell />

          {/* Avatar + menu */}
          <div ref={avatarRef} className="relative">
            <button
              onClick={() => setAvatarOpen((v) => !v)}
              data-testid="user-menu-button"
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-300"
              aria-expanded={avatarOpen}
              aria-haspopup="menu"
            >
              <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                <span className="text-primary-700 text-xs font-semibold">
                  {initials}
                </span>
              </div>
              <ChevronDown
                className={clsx(
                  "w-3.5 h-3.5 text-slate-400 transition-transform hidden sm:block",
                  avatarOpen && "rotate-180",
                )}
              />
            </button>

            {avatarOpen && (
              <div
                className="absolute top-full right-0 mt-2 w-52 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-100 dark:border-slate-700 py-1 z-50"
                role="menu"
              >
                {/* Info utilisateur */}
                <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-700">
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {user?.firstName} {user?.lastName}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">
                    {user?.role}
                  </p>
                </div>

                <NavLink
                  to="/profile"
                  onClick={() => setAvatarOpen(false)}
                  role="menuitem"
                  className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                >
                  <User className="w-4 h-4" />
                  {t("nav.profile")}
                </NavLink>

                {/* Language toggle */}
                <button
                  onClick={handleToggleLanguage}
                  role="menuitem"
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                >
                  <Globe className="w-4 h-4 text-slate-500" />
                  {i18n.language === "fr" ? "English" : "Français"}
                </button>

                <div className="border-t border-slate-100 dark:border-slate-700 mt-1 pt-1">
                  <button
                    onClick={handleLogout}
                    role="menuitem"
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    {t("nav.logout")}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Hamburger mobile */}
          <button
            onClick={() => setMobileOpen((v) => !v)}
            className="md:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-300"
            aria-label={mobileOpen ? t("nav.closeMenu") : t("nav.openMenu")}
            aria-expanded={mobileOpen}
            aria-controls="mobile-nav-menu"
          >
            {mobileOpen ? (
              <X className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>

      {/* Menu mobile */}
      {mobileOpen && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 z-30 bg-black/20 md:hidden"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <div
            id="mobile-nav-menu"
            className="md:hidden relative z-40 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 shadow-lg"
          >
            <div className="px-4 py-3 space-y-1">
              {navItems.map((item) =>
                item.href ? (
                  <NavLink
                    key={item.href}
                    to={item.href}
                    end={item.href === "/"}
                    onClick={() => setMobileOpen(false)}
                    className={({ isActive }) =>
                      clsx(
                        "block px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                        isActive
                          ? "bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-400"
                          : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800",
                      )
                    }
                  >
                    {item.label}
                  </NavLink>
                ) : (
                  <div key={item.label}>
                    <p className="px-3 py-1 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                      {item.label}
                    </p>
                    {item.dropdown?.map((d) => (
                      <NavLink
                        key={`${d.href}-${d.label}`}
                        to={d.href}
                        onClick={() => setMobileOpen(false)}
                        className={({ isActive }) =>
                          clsx(
                            "block px-6 py-2 rounded-lg text-sm transition-colors",
                            isActive
                              ? "text-primary-600 bg-primary-50 dark:bg-primary-900/20 dark:text-primary-400"
                              : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800",
                          )
                        }
                      >
                        {d.label}
                      </NavLink>
                    ))}
                  </div>
                ),
              )}
            </div>
          </div>
        </>
      )}
    </nav>
  );
}

import { useState, useRef, useEffect } from "react";
import { NavLink, Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import nxLogo from "../../assets/nx-logo.png";
import { brandingApi } from "../../api/branding";
import {
  ChevronDown,
  LogOut,
  User,
  Globe,
  Search,
  HelpCircle,
  Menu,
  X,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import {
  usePerspective,
  type Perspective,
} from "../../contexts/PerspectiveContext";
import { NotificationBell } from "../NotificationBell";
import {
  getPerspectiveNav,
  workPerspectiveLabel,
  isNavGroup,
  type MoreItem,
} from "./navConfig";
import clsx from "clsx";
import { useTranslation } from "react-i18next";

function useOutsideClose(onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [onClose]);
  return ref;
}

function groupMore(items: MoreItem[]): [string, MoreItem[]][] {
  const map = new Map<string, MoreItem[]>();
  for (const it of items) {
    const arr = map.get(it.group) ?? [];
    arr.push(it);
    map.set(it.group, arr);
  }
  return [...map.entries()];
}

export default function Navbar({
  onSearchClick,
}: {
  onSearchClick?: () => void;
}) {
  const { t, i18n } = useTranslation();
  const { user, logout } = useAuth();
  const { perspective, setPerspective, hasSwitch } = usePerspective();
  const navigate = useNavigate();
  const { data: branding } = useQuery({
    queryKey: ["branding"],
    queryFn: () => brandingApi.get().then((r) => r.data),
    staleTime: 10 * 60 * 1000,
  });
  const brandingLogo = branding?.logo || null;

  const [avatarOpen, setAvatarOpen] = useState(false);
  // Un seul dropdown de sous-nav ouvert à la fois : sa clé (label) ou "__more__".
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  // Drawer de navigation mobile (< 768px).
  const [drawerOpen, setDrawerOpen] = useState(false);

  const avatarRef = useOutsideClose(() => setAvatarOpen(false));
  const subnavRef = useOutsideClose(() => setOpenMenu(null));

  useEffect(() => {
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpenMenu(null);
        setAvatarOpen(false);
        setDrawerOpen(false);
      }
    }
    document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, []);

  // Verrouille le scroll du body quand le drawer est ouvert.
  useEffect(() => {
    document.body.style.overflow = drawerOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [drawerOpen]);

  if (!user) return null;

  const { primary, more } = getPerspectiveNav(user.role, perspective, t);
  const groupedMore = groupMore(more);
  const initials =
    `${user.firstName[0] ?? ""}${user.lastName[0] ?? ""}`.toUpperCase() || "??";

  function switchTo(p: Perspective) {
    setPerspective(p);
    navigate("/");
  }
  async function handleLogout() {
    setAvatarOpen(false);
    await logout();
  }
  function toggleLanguage() {
    void i18n.changeLanguage(i18n.language === "fr" ? "en" : "fr");
  }

  const subLinkClass = ({ isActive }: { isActive: boolean }) =>
    clsx(isActive && "active");

  return (
    <div className="nx-app">
      <header className="app-header" aria-label="Navigation principale">
        {/* Rangée 1 : logo · switch · cloche/avatar */}
        <div className="topbar-main">
          <div className="inner">
            <Link to="/" className="nx-logo-wrap" aria-label="NanoXplore RH">
              <img src={brandingLogo || nxLogo} alt="Logo de l'entreprise" />
            </Link>

            <div className="topbar-center">
              {hasSwitch && (
                <div
                  className="perspective-switch"
                  role="tablist"
                  aria-label={t("nav.changeSpace")}
                >
                  <button
                    role="tab"
                    aria-selected={perspective === "me"}
                    className={clsx(perspective === "me" && "on")}
                    onClick={() => switchTo("me")}
                  >
                    {t("nav.perspectiveMe")}
                  </button>
                  <button
                    role="tab"
                    aria-selected={perspective === "work"}
                    className={clsx(perspective === "work" && "on")}
                    onClick={() => switchTo("work")}
                  >
                    {workPerspectiveLabel(user.role, t)}
                  </button>
                </div>
              )}
            </div>

            <div className="header-right">
              <button
                onClick={() => setDrawerOpen(true)}
                data-testid="mobile-nav-toggle"
                className="icon-btn nav-burger"
                aria-label={t("nav.openMenu")}
                aria-expanded={drawerOpen}
                aria-controls="mobile-nav-drawer"
              >
                <Menu className="w-5 h-5" />
              </button>

              <button
                onClick={() => onSearchClick?.()}
                className="icon-btn"
                aria-label={t("nav.search")}
              >
                <Search className="w-5 h-5" />
              </button>

              {/* Aide — visible pour tous les rôles, admin compris (non masqué) */}
              <Link
                to="/help"
                className="icon-btn"
                aria-label={t("nav.help")}
                title={t("nav.help")}
              >
                <HelpCircle className="w-5 h-5" />
              </Link>

              <NotificationBell />

              <div ref={avatarRef} style={{ position: "relative" }}>
                <button
                  onClick={() => setAvatarOpen((v) => !v)}
                  data-testid="user-menu-button"
                  className="user-chip"
                  aria-expanded={avatarOpen}
                  aria-haspopup="menu"
                >
                  <span className="avatar">{initials}</span>
                  <span
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      lineHeight: 1.15,
                      textAlign: "left",
                    }}
                    className="hidden sm:flex"
                  >
                    <b style={{ fontSize: 14 }}>
                      {user.firstName} {user.lastName}
                    </b>
                    <span
                      style={{ fontSize: 12, color: "var(--ink-3)" }}
                      className="capitalize"
                    >
                      {user.role}
                    </span>
                  </span>
                  <ChevronDown
                    className={clsx(
                      "w-4 h-4 transition-transform hidden sm:block",
                      avatarOpen && "rotate-180",
                    )}
                    style={{ color: "var(--ink-3)" }}
                  />
                </button>

                {avatarOpen && (
                  <div
                    className="menu-pop"
                    style={{ right: 0, width: 240 }}
                    role="menu"
                  >
                    <NavLink
                      to="/profile"
                      role="menuitem"
                      className="menu-item"
                      onClick={() => setAvatarOpen(false)}
                    >
                      <User className="w-[18px] h-[18px]" />
                      {t("nav.profile")}
                    </NavLink>
                    <NavLink
                      to="/org"
                      role="menuitem"
                      className="menu-item"
                      onClick={() => setAvatarOpen(false)}
                    >
                      <User className="w-[18px] h-[18px]" />
                      {t("nav.org")}
                    </NavLink>
                    <button
                      onClick={toggleLanguage}
                      role="menuitem"
                      className="menu-item"
                    >
                      <Globe className="w-[18px] h-[18px]" />
                      {i18n.language === "fr" ? "English" : "Français"}
                    </button>
                    <hr className="divider-h" />
                    <button
                      onClick={handleLogout}
                      role="menuitem"
                      className="menu-item danger"
                    >
                      <LogOut className="w-[18px] h-[18px]" />
                      {t("nav.logout")}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Rangée 2 : sous-nav contextuelle (liens + dropdowns) + « Plus » */}
        <nav className="subnav" aria-label="Navigation secondaire">
          <div className="inner" ref={subnavRef}>
            {primary.map((item) =>
              isNavGroup(item) ? (
                <div key={item.label} style={{ position: "relative" }}>
                  <button
                    className="subnav-link"
                    onClick={() =>
                      setOpenMenu((o) => (o === item.label ? null : item.label))
                    }
                    aria-expanded={openMenu === item.label}
                    aria-haspopup="menu"
                  >
                    {item.label}
                    <ChevronDown
                      className={clsx(
                        "w-3.5 h-3.5 transition-transform",
                        openMenu === item.label && "rotate-180",
                      )}
                      style={{
                        display: "inline",
                        verticalAlign: "middle",
                        marginLeft: 4,
                      }}
                    />
                  </button>
                  {openMenu === item.label && (
                    <div
                      className="menu-pop"
                      style={{ left: 0, width: 240 }}
                      role="menu"
                    >
                      {item.children.map((c) => (
                        <NavLink
                          key={c.href + c.label}
                          to={c.href}
                          end={c.end}
                          role="menuitem"
                          className="menu-item"
                          onClick={() => setOpenMenu(null)}
                        >
                          {c.label}
                        </NavLink>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <NavLink
                  key={item.href + item.label}
                  to={item.href}
                  end={item.end}
                  className={subLinkClass}
                >
                  {item.label}
                </NavLink>
              ),
            )}
            {groupedMore.length > 0 && (
              <div style={{ position: "relative" }}>
                <button
                  className="subnav-link"
                  onClick={() =>
                    setOpenMenu((o) => (o === "__more__" ? null : "__more__"))
                  }
                  aria-expanded={openMenu === "__more__"}
                  aria-haspopup="menu"
                >
                  {t("nav.more")}
                  <ChevronDown
                    className={clsx(
                      "w-3.5 h-3.5 transition-transform",
                      openMenu === "__more__" && "rotate-180",
                    )}
                    style={{
                      display: "inline",
                      verticalAlign: "middle",
                      marginLeft: 4,
                    }}
                  />
                </button>
                {openMenu === "__more__" && (
                  <div
                    className="menu-pop"
                    style={{ left: 0, width: 240 }}
                    role="menu"
                  >
                    {groupedMore.map(([group, items]) => (
                      <div key={group}>
                        <div className="menu-group">{group}</div>
                        {items.map((it) => (
                          <NavLink
                            key={it.href + it.label}
                            to={it.href}
                            role="menuitem"
                            className="menu-item"
                            onClick={() => setOpenMenu(null)}
                          >
                            {it.label}
                          </NavLink>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </nav>
      </header>

      {/* Drawer de navigation mobile (< 768px) — réutilise primary + more. */}
      {drawerOpen && (
        <div
          className="mobile-nav-overlay"
          onClick={() => setDrawerOpen(false)}
          role="presentation"
        >
          <aside
            id="mobile-nav-drawer"
            className="mobile-nav-drawer"
            aria-label="Navigation mobile"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mobile-nav-head">
              {hasSwitch && (
                <div
                  className="perspective-switch"
                  role="tablist"
                  aria-label={t("nav.changeSpace")}
                >
                  <button
                    role="tab"
                    aria-selected={perspective === "me"}
                    className={clsx(perspective === "me" && "on")}
                    onClick={() => {
                      switchTo("me");
                      setDrawerOpen(false);
                    }}
                  >
                    {t("nav.perspectiveMe")}
                  </button>
                  <button
                    role="tab"
                    aria-selected={perspective === "work"}
                    className={clsx(perspective === "work" && "on")}
                    onClick={() => {
                      switchTo("work");
                      setDrawerOpen(false);
                    }}
                  >
                    {workPerspectiveLabel(user.role, t)}
                  </button>
                </div>
              )}
              <button
                onClick={() => setDrawerOpen(false)}
                className="icon-btn"
                aria-label={t("nav.closeMenu")}
                style={{ marginLeft: "auto" }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="mobile-nav-links" aria-label="Liens de navigation">
              {primary.map((item) =>
                isNavGroup(item) ? (
                  <div key={item.label} className="mobile-nav-section">
                    <div className="mobile-nav-group">{item.label}</div>
                    {item.children.map((c) => (
                      <NavLink
                        key={c.href + c.label}
                        to={c.href}
                        end={c.end}
                        className={subLinkClass}
                        onClick={() => setDrawerOpen(false)}
                      >
                        {c.label}
                      </NavLink>
                    ))}
                  </div>
                ) : (
                  <NavLink
                    key={item.href + item.label}
                    to={item.href}
                    end={item.end}
                    className={subLinkClass}
                    onClick={() => setDrawerOpen(false)}
                  >
                    {item.label}
                  </NavLink>
                ),
              )}
              {groupedMore.map(([group, items]) => (
                <div key={group} className="mobile-nav-section">
                  <div className="mobile-nav-group">{group}</div>
                  {items.map((it) => (
                    <NavLink
                      key={it.href + it.label}
                      to={it.href}
                      className={subLinkClass}
                      onClick={() => setDrawerOpen(false)}
                    >
                      {it.label}
                    </NavLink>
                  ))}
                </div>
              ))}
            </nav>
          </aside>
        </div>
      )}
    </div>
  );
}

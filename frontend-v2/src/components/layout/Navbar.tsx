import { useState, useRef, useEffect } from "react";
import { NavLink, Link, useNavigate } from "react-router-dom";
import nxLogo from "../../assets/nx-logo.png";
import { ChevronDown, LogOut, User, Globe, Search } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import {
  usePerspective,
  type Perspective,
} from "../../contexts/PerspectiveContext";
import { NotificationBell } from "../NotificationBell";
import {
  getPerspectiveNav,
  workPerspectiveLabel,
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

  const [avatarOpen, setAvatarOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  const avatarRef = useOutsideClose(() => setAvatarOpen(false));
  const moreRef = useOutsideClose(() => setMoreOpen(false));

  useEffect(() => {
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setMoreOpen(false);
        setAvatarOpen(false);
      }
    }
    document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, []);

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
              <img src={nxLogo} alt="NanoXplore RH" />
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
                onClick={() => onSearchClick?.()}
                className="icon-btn"
                aria-label={t("nav.search")}
              >
                <Search className="w-5 h-5" />
              </button>

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

        {/* Rangée 2 : sous-nav contextuelle + « Plus » */}
        <nav className="subnav" aria-label="Navigation secondaire">
          <div className="inner">
            {primary.map((l) => (
              <NavLink
                key={l.href + l.label}
                to={l.href}
                end={l.end}
                className={subLinkClass}
              >
                {l.label}
              </NavLink>
            ))}
            {groupedMore.length > 0 && (
              <div ref={moreRef} style={{ position: "relative" }}>
                <button
                  className="subnav-link"
                  onClick={() => setMoreOpen((v) => !v)}
                  aria-expanded={moreOpen}
                  aria-haspopup="menu"
                >
                  {t("nav.more")}
                  <ChevronDown
                    className={clsx(
                      "w-3.5 h-3.5 transition-transform",
                      moreOpen && "rotate-180",
                    )}
                    style={{
                      display: "inline",
                      verticalAlign: "middle",
                      marginLeft: 4,
                    }}
                  />
                </button>
                {moreOpen && (
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
                            onClick={() => setMoreOpen(false)}
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
    </div>
  );
}

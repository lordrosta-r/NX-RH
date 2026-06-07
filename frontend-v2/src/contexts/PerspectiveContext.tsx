import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "./AuthContext";

/**
 * Perspective du shell pour les rôles spéciaux (manager / hr / admin) :
 * - "me"   : « Mon espace » (vue collaborateur : dashboard perso + items perso)
 * - "work" : espace métier du rôle (Mon équipe / Pilotage RH / Administration)
 * Le rôle `employee` n'a pas de switch (toujours "me").
 * Défaut = "work" pour conserver le comportement actuel (un manager voit
 * son dashboard d'équipe sur "/").
 */
export type Perspective = "me" | "work";

const STORAGE_KEY = "nx-perspective";

interface PerspectiveContextValue {
  perspective: Perspective;
  setPerspective: (p: Perspective) => void;
  hasSwitch: boolean;
}

const PerspectiveContext = createContext<PerspectiveContextValue | null>(null);

export function PerspectiveProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  // Seuls manager / hr basculent entre « Mon espace » et leur espace métier.
  // L'employé reste sur « Mon espace » ; l'admin est un compte système → toujours
  // sur l'espace métier (pas d'espace perso, pas de switch).
  const hasSwitch = !!user && (user.role === "manager" || user.role === "hr");
  const defaultPerspective: Perspective =
    user?.role === "admin" ? "work" : "me";

  const [perspective, setPerspectiveState] = useState<Perspective>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "me" || stored === "work") return stored;
    return "work";
  });

  const setPerspective = useCallback((p: Perspective) => {
    setPerspectiveState(p);
    localStorage.setItem(STORAGE_KEY, p);
  }, []);

  const value = useMemo<PerspectiveContextValue>(
    () => ({
      perspective: hasSwitch ? perspective : defaultPerspective,
      setPerspective,
      hasSwitch,
    }),
    [hasSwitch, perspective, setPerspective, defaultPerspective],
  );

  return (
    <PerspectiveContext.Provider value={value}>
      {children}
    </PerspectiveContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function usePerspective(): PerspectiveContextValue {
  const ctx = useContext(PerspectiveContext);
  if (!ctx)
    throw new Error("usePerspective must be used within PerspectiveProvider");
  return ctx;
}

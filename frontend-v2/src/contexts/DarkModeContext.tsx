import { createContext, useContext, type ReactNode } from 'react';
import { useDarkMode } from '../hooks/useDarkMode';

const DarkModeContext = createContext<ReturnType<typeof useDarkMode> | null>(null);

export function DarkModeProvider({ children }: { children: ReactNode }) {
  const darkMode = useDarkMode();
  return <DarkModeContext.Provider value={darkMode}>{children}</DarkModeContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useDarkModeContext() {
  const ctx = useContext(DarkModeContext);
  if (!ctx) throw new Error('useDarkModeContext must be used within DarkModeProvider');
  return ctx;
}

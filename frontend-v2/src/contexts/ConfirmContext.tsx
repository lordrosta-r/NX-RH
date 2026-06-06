import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import ConfirmDialog from "../components/ui/ConfirmDialog";

// Confirmation standardisée (KISS) pour toute action destructrice / sensible.
// Usage :
//   const confirm = useConfirm();
//   if (await confirm({ title, description, variant: "danger" })) {
//     mutation.mutate();
//   }
// Un seul <ConfirmDialog> est monté pour toute l'app → backdrop & UX cohérents.

export interface ConfirmOptions {
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "warning";
}

type ConfirmFn = (opts: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<{
    opts: ConfirmOptions;
    resolve: (value: boolean) => void;
  } | null>(null);

  const confirm = useCallback<ConfirmFn>(
    (opts) => new Promise<boolean>((resolve) => setPending({ opts, resolve })),
    [],
  );

  const settle = (result: boolean) => {
    pending?.resolve(result);
    setPending(null);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {pending && (
        <ConfirmDialog
          isOpen
          onClose={() => settle(false)}
          onConfirm={() => settle(true)}
          title={pending.opts.title}
          description={pending.opts.description}
          confirmLabel={pending.opts.confirmLabel}
          cancelLabel={pending.opts.cancelLabel}
          variant={pending.opts.variant}
        />
      )}
    </ConfirmContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx)
    throw new Error("useConfirm doit être utilisé dans un <ConfirmProvider>");
  return ctx;
}

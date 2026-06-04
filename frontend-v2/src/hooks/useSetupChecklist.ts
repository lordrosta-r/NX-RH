import { useQuery } from "@tanstack/react-query";
import { adminApi } from "../api/admin";
import { formsApi } from "../api/forms";
import { campaignsApi } from "../api/campaigns";

export type SetupStepId =
  | "ldap"
  | "hr"
  | "managers"
  | "smtp"
  | "forms"
  | "campaign";

export interface SetupStep {
  id: SetupStepId;
  title: string;
  description: string;
  done: boolean;
  actionLabel: string;
  actionHref: string;
}

/**
 * Calcule l'état d'avancement de la configuration initiale de l'app (onboarding admin).
 * Source unique partagée par le wizard /admin/setup et le widget du dashboard admin.
 */
export function useSetupChecklist() {
  const ldap = useQuery({
    queryKey: ["setup", "ldap-sources"],
    queryFn: () => adminApi.getLdapSources().then((r) => r.data?.sources ?? []),
  });
  const status = useQuery({
    queryKey: ["setup", "status"],
    queryFn: () => adminApi.getSystemStatus().then((r) => r.data),
  });
  const users = useQuery({
    queryKey: ["setup", "users"],
    queryFn: () =>
      adminApi.getAdminUsers({ page: 1, limit: 200 }).then((r) => r.data.data),
  });
  const forms = useQuery({
    queryKey: ["setup", "forms-count"],
    queryFn: () => formsApi.getForms({ limit: 1 }).then((r) => r.data.total),
  });
  const campaigns = useQuery({
    queryKey: ["setup", "campaigns-count"],
    queryFn: () =>
      campaignsApi.getCampaigns({ limit: 1 }).then((r) => r.data.total),
  });

  const isLoading =
    ldap.isLoading ||
    status.isLoading ||
    users.isLoading ||
    forms.isLoading ||
    campaigns.isLoading;

  const userList = users.data ?? [];

  const steps: SetupStep[] = [
    {
      id: "ldap",
      title: "Configurer l'annuaire LDAP",
      description:
        "Connectez un annuaire pour provisionner les utilisateurs (RH, managers, employés).",
      done: (ldap.data?.length ?? 0) > 0,
      actionLabel: "Configurer LDAP",
      actionHref: "/admin/ldap",
    },
    {
      id: "hr",
      title: "Désigner au moins un RH",
      description:
        "Attribuez le rôle RH à un utilisateur pour qu'il gère formulaires et campagnes.",
      done: userList.some((u) => u.role === "hr"),
      actionLabel: "Gérer les rôles",
      actionHref: "/users",
    },
    {
      id: "managers",
      title: "Désigner au moins un manager",
      description:
        "Attribuez le rôle manager pour permettre la relecture et la signature des évaluations.",
      done: userList.some((u) => u.role === "manager"),
      actionLabel: "Gérer les rôles",
      actionHref: "/users",
    },
    {
      id: "smtp",
      title: "Configurer le serveur email",
      description:
        "Nécessaire pour les notifications et rappels aux utilisateurs.",
      done: status.data?.smtp?.ok ?? false,
      actionLabel: "Configurer SMTP",
      actionHref: "/admin/config",
    },
    {
      id: "forms",
      title: "Créer un formulaire",
      description:
        "Au moins un formulaire d'évaluation est nécessaire pour une campagne.",
      done: (forms.data ?? 0) > 0,
      actionLabel: "Créer un formulaire",
      actionHref: "/forms/new",
    },
    {
      id: "campaign",
      title: "Lancer une campagne",
      description:
        "Créez une campagne et rattachez-y un ou plusieurs formulaires.",
      done: (campaigns.data ?? 0) > 0,
      actionLabel: "Créer une campagne",
      actionHref: "/campaigns/new",
    },
  ];

  const completed = steps.filter((s) => s.done).length;
  const total = steps.length;
  const percent = Math.round((completed / total) * 100);

  return {
    steps,
    completed,
    total,
    percent,
    isLoading,
    allDone: completed === total,
  };
}

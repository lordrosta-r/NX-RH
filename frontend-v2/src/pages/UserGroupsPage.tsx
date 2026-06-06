import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { groupsApi } from "../api/groups";
import { useAuth } from "../contexts/AuthContext";
import { toast } from "../hooks/useToast";
import {
  UserGroupsList,
  UserGroupFormModal,
  UserGroupMembersPanel,
} from "../components/users";
import type { UserGroup } from "../types";
import { queryKeys } from "../lib/queryKeys";
import { PageHead, Callout } from "../components/shell";
import { useConfirm } from "../contexts/ConfirmContext";

export default function UserGroupsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const canManage = user?.role === "admin" || user?.role === "hr";
  const confirm = useConfirm();

  const [formModal, setFormModal] = useState<{
    open: boolean;
    group?: UserGroup | null;
  }>({ open: false });
  const [membersModal, setMembersModal] = useState<UserGroup | null>(null);

  const {
    data: groups,
    isLoading,
    isError,
    refetch,
  } = useQuery<UserGroup[]>({
    queryKey: queryKeys.groups.all,
    queryFn: () => groupsApi.list().then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: { name: string; description?: string }) =>
      groupsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.groups.all });
      setFormModal({ open: false });
      toast.success("Groupe créé", "Le groupe a été créé avec succès.");
    },
    onError: () => toast.error("Erreur", "Impossible de créer le groupe."),
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: { name?: string; description?: string };
    }) => groupsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.groups.all });
      setFormModal({ open: false });
      toast.success("Groupe modifié", "Le groupe a été mis à jour.");
    },
    onError: () => toast.error("Erreur", "Impossible de modifier le groupe."),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => groupsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.groups.all });
      toast.success("Groupe supprimé", "Le groupe a été supprimé.");
    },
    onError: () => toast.error("Erreur", "Impossible de supprimer le groupe."),
  });

  const membersMutation = useMutation({
    mutationFn: ({
      id,
      action,
      userIds,
    }: {
      id: string;
      action: "add" | "remove";
      userIds: string[];
    }) => groupsApi.updateMembers(id, action, userIds),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.groups.all }),
    onError: () => toast.error("Erreur", "Impossible de modifier les membres."),
  });

  function handleSaveGroup(data: { name: string; description?: string }) {
    if (formModal.group) {
      updateMutation.mutate({ id: formModal.group._id, data });
    } else {
      createMutation.mutate(data);
    }
  }

  const currentMembersGroup = membersModal
    ? ((groups ?? []).find((g) => g._id === membersModal._id) ?? membersModal)
    : null;

  return (
    <div className="nx-app">
      <PageHead
        title="Groupes d'utilisateurs"
        desc={
          groups !== undefined
            ? `${groups.length} groupe${groups.length !== 1 ? "s" : ""}`
            : undefined
        }
        actions={
          canManage && (
            <button
              onClick={() => setFormModal({ open: true, group: null })}
              className="btn btn-primary"
            >
              <Plus className="ico" style={{ width: 18, height: 18 }} /> Nouveau
              groupe
            </button>
          )
        }
      />

      {isError && (
        <Callout tone="red" style={{ marginBottom: 16 }}>
          <div
            className="row between"
            style={{ alignItems: "center", gap: 12 }}
          >
            <span className="small">
              Erreur lors du chargement des groupes.
            </span>
            <button onClick={() => refetch()} className="btn btn-ghost btn-sm">
              Réessayer
            </button>
          </div>
        </Callout>
      )}

      <UserGroupsList
        groups={groups ?? []}
        isLoading={isLoading}
        canManage={canManage}
        onEdit={(g) => setFormModal({ open: true, group: g })}
        onManageMembers={(g) => setMembersModal(g)}
        onDelete={async (g) => {
          if (
            await confirm({
              title: "Supprimer le groupe ?",
              description: "Cette action est irréversible.",
              variant: "danger",
              confirmLabel: "Supprimer",
            })
          ) {
            deleteMutation.mutate(g._id);
          }
        }}
        onCreateFirst={() => setFormModal({ open: true, group: null })}
      />

      {formModal.open && (
        <UserGroupFormModal
          group={formModal.group}
          onClose={() => setFormModal({ open: false })}
          onSave={handleSaveGroup}
          isPending={createMutation.isPending || updateMutation.isPending}
        />
      )}

      {currentMembersGroup && (
        <UserGroupMembersPanel
          group={currentMembersGroup}
          onClose={() => setMembersModal(null)}
          onAddMember={(userId) =>
            membersMutation.mutate({
              id: currentMembersGroup._id,
              action: "add",
              userIds: [userId],
            })
          }
          onRemoveMember={(userId) =>
            membersMutation.mutate({
              id: currentMembersGroup._id,
              action: "remove",
              userIds: [userId],
            })
          }
        />
      )}
    </div>
  );
}

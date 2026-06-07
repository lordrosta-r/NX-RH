import { useState } from "react";
import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import { usersApi } from "../api/users";
import { exportToCsv } from "../utils/export";
import { useDebounce } from "./useDebounce";
import { toast } from "./useToast";
import type { User } from "../types";
import { queryKeys } from "../lib/queryKeys";

const PER_PAGE = 20;

export function useUsersPage() {
  const queryClient = useQueryClient();

  const [searchInput, setSearchInputRaw] = useState("");
  const search = useDebounce(searchInput, 400);
  const [roleFilter, setRoleFilterRaw] = useState("");
  const [deptFilter, setDeptFilterRaw] = useState("");
  const [statusFilter, setStatusFilterRaw] = useState("");
  const [page, setPage] = useState(1);

  // Reset page when filters change (setter-based, avoids useEffect/setState-in-effect)
  function setSearchInput(v: string) {
    setSearchInputRaw(v);
    setPage(1);
  }
  function setRoleFilter(v: string) {
    setRoleFilterRaw(v);
    setPage(1);
  }
  function setDeptFilter(v: string) {
    setDeptFilterRaw(v);
    setPage(1);
  }
  function setStatusFilter(v: string) {
    setStatusFilterRaw(v);
    setPage(1);
  }

  const [importOpen, setImportOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: queryKeys.users.list({
      search,
      roleFilter,
      deptFilter,
      statusFilter,
      page,
    }),
    queryFn: () =>
      usersApi
        .getUsers({
          q: search || undefined,
          role: roleFilter || undefined,
          department: deptFilter || undefined,
          isActive:
            statusFilter === "active"
              ? true
              : statusFilter === "inactive"
                ? false
                : undefined,
          page,
          limit: PER_PAGE,
        })
        .then((r) => r.data),
    placeholderData: keepPreviousData,
  });

  const departments = Array.from(
    new Set((data?.data ?? []).map((u) => u.department).filter(Boolean)),
  ) as string[];

  const anonymizeMutation = useMutation({
    mutationFn: (id: string) => usersApi.anonymize(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.lists() });
    },
    onError: () =>
      toast.error("Erreur lors de l'anonymisation", "Veuillez réessayer."),
  });

  function handleBulkDeactivate() {
    usersApi
      .bulkAction({ action: "deactivate", userIds: [...selected] })
      .then(() => {
        queryClient.invalidateQueries({ queryKey: queryKeys.users.lists() });
        setSelected(new Set());
        toast.success(
          "Utilisateurs désactivés",
          `${selected.size} utilisateur(s) désactivé(s).`,
        );
      })
      .catch(() =>
        toast.error("Erreur", "Impossible de désactiver les utilisateurs."),
      );
  }

  const updateUserRoleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: User["role"] }) =>
      usersApi.updateUser(userId, { role }).then((r) => r.data.data),
    onMutate: async ({ userId, role }) => {
      const listKey = queryKeys.users.list({
        search,
        roleFilter,
        deptFilter,
        statusFilter,
        page,
      });
      await queryClient.cancelQueries({ queryKey: queryKeys.users.lists() });
      const previous = queryClient.getQueryData<{
        data: User[];
        total: number;
        totalPages: number;
      }>(listKey);
      queryClient.setQueryData<{
        data: User[];
        total: number;
        totalPages: number;
      }>(listKey, (old) =>
        old
          ? {
              ...old,
              data: old.data.map((u) => (u.id === userId ? { ...u, role } : u)),
            }
          : old,
      );
      return { previous, listKey };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous)
        queryClient.setQueryData(context.listKey, context.previous);
      toast.error("Erreur lors du changement de rôle", "Veuillez réessayer.");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.lists() });
    },
  });

  function handleBulkExport() {
    const selectedUsers = (data?.data ?? []).filter((u) =>
      selected.has(u.id ?? ""),
    );
    exportToCsv(
      "users-export.csv",
      selectedUsers.map((u) => ({
        id: u.id,
        firstName: u.firstName,
        lastName: u.lastName,
        email: u.email,
        role: u.role,
        department: u.department ?? "",
        isActive: u.isActive,
      })),
    );
  }

  function toggleSelectAll() {
    const allIds = (data?.data ?? []).map((u) => u.id ?? "");
    if (allIds.every((id) => selected.has(id))) {
      setSelected(new Set());
    } else {
      setSelected(new Set(allIds));
    }
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const hasFilters = !!(search || roleFilter || deptFilter || statusFilter);

  function resetFilters() {
    setSearchInputRaw("");
    setRoleFilterRaw("");
    setDeptFilterRaw("");
    setStatusFilterRaw("");
    setPage(1);
  }

  const totalPages =
    data?.totalPages ?? Math.ceil((data?.total ?? 0) / PER_PAGE);

  function getPageNumbers(): number[] {
    const total = totalPages;
    if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);
    if (page <= 3) return [1, 2, 3, 4, 5];
    if (page >= total - 2)
      return [total - 4, total - 3, total - 2, total - 1, total];
    return [page - 2, page - 1, page, page + 1, page + 2];
  }

  function clearSelection() {
    setSelected(new Set());
  }

  return {
    searchInput,
    setSearchInput,
    roleFilter,
    setRoleFilter,
    deptFilter,
    setDeptFilter,
    statusFilter,
    setStatusFilter,
    hasFilters,
    resetFilters,
    departments,
    page,
    setPage,
    totalPages,
    getPageNumbers,
    data,
    isLoading,
    isError,
    refetch,
    selected,
    toggleSelect,
    toggleSelectAll,
    clearSelection,
    importOpen,
    setImportOpen,
    anonymizeMutation,
    updateUserRoleMutation,
    handleBulkDeactivate,
    handleBulkExport,
  };
}

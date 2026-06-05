import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useUsersPage } from "../hooks/useUsersPage";
import {
  UsersPageHeader,
  UsersFilterBar,
  UsersTable,
  UserAnonymizeModal,
  UserImportModal,
} from "../components/users";
import { useTranslation } from "react-i18next";
import { Callout } from "../components/shell";

export default function UsersPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [confirmText, setConfirmText] = useState("");
  const p = useUsersPage();

  return (
    <div className="nx-app">
      <UsersPageHeader
        total={p.data?.total}
        role={user?.role ?? ""}
        onImportClick={() => p.setImportOpen(true)}
      />
      <UsersFilterBar
        searchInput={p.searchInput}
        onSearchChange={p.setSearchInput}
        roleFilter={p.roleFilter}
        onRoleChange={p.setRoleFilter}
        deptFilter={p.deptFilter}
        onDeptChange={p.setDeptFilter}
        statusFilter={p.statusFilter}
        onStatusChange={p.setStatusFilter}
        departments={p.departments}
        hasFilters={p.hasFilters}
        onReset={p.resetFilters}
      />
      {p.isError && (
        <Callout tone="red" style={{ marginBottom: 16 }}>
          <div className="row between" style={{ gap: 12 }}>
            <span className="small" style={{ color: "var(--ink)" }}>
              {t("users.loadError")}
            </span>
            <button onClick={() => p.refetch()} className="link small">
              {t("users.retry")}
            </button>
          </div>
        </Callout>
      )}
      <UsersTable
        users={p.data?.data ?? []}
        isLoading={p.isLoading}
        currentRole={user?.role ?? ""}
        selected={p.selected}
        page={p.page}
        totalPages={p.totalPages}
        total={p.data?.total}
        pageNumbers={p.getPageNumbers()}
        onOffboard={(id) => p.offboardMutation.mutate(id)}
        onAnonymize={(target) => {
          p.setAnonymizeTarget(target);
          setConfirmText("");
        }}
        onToggleSelect={p.toggleSelect}
        onToggleSelectAll={p.toggleSelectAll}
        onPageChange={p.setPage}
        onBulkDeactivate={p.handleBulkDeactivate}
        onBulkExport={p.handleBulkExport}
        onClearSelection={p.clearSelection}
      />
      {p.anonymizeTarget && (
        <UserAnonymizeModal
          user={p.anonymizeTarget}
          confirmText={confirmText}
          onConfirmChange={setConfirmText}
          isPending={p.anonymizeMutation.isPending}
          onConfirm={() => p.anonymizeMutation.mutate(p.anonymizeTarget!.id)}
          onClose={() => {
            p.setAnonymizeTarget(null);
            setConfirmText("");
          }}
        />
      )}
      {p.importOpen && (
        <UserImportModal onClose={() => p.setImportOpen(false)} />
      )}
    </div>
  );
}

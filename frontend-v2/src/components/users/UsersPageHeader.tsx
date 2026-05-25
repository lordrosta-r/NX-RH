import { Link } from "react-router-dom";
import { Users, Upload, UserPlus } from "lucide-react";
import { useTranslation } from "react-i18next";

interface Props {
  total?: number;
  role: string;
  onImportClick: () => void;
}

export function UsersPageHeader({ total, role, onImportClick }: Props) {
  const { t } = useTranslation();
  const canManage = role === "admin" || role === "hr";

  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          {t("users.title")}
        </h1>
        {total !== undefined && (
          <p className="text-sm text-slate-500 mt-1">
            {t("users.userCount", { count: total })}
          </p>
        )}
      </div>
      {canManage && (
        <div className="flex items-center gap-2">
          <Link
            to="/users/groups"
            className="flex items-center gap-2 px-4 py-2 border border-slate-200 text-slate-700 rounded-md text-sm hover:bg-slate-50 transition"
          >
            <Users size={16} /> {t("users.groups")}
          </Link>
          <button
            onClick={onImportClick}
            className="flex items-center gap-2 px-4 py-2 border border-slate-200 text-slate-700 rounded-md text-sm hover:bg-slate-50 transition"
          >
            <Upload size={16} /> {t("users.importCsv")}
          </button>
          <Link
            to="/users/new"
            className="inline-flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            {t("users.newUser")}
          </Link>
        </div>
      )}
    </div>
  );
}

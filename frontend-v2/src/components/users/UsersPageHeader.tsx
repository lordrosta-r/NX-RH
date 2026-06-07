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
    <div className="row between wrap" style={{ gap: 16, marginBottom: 24 }}>
      <div>
        <h1 className="h1">{t("users.title")}</h1>
        {total !== undefined && (
          <p className="small" style={{ marginTop: 4 }}>
            {t("users.userCount", { count: total })}
          </p>
        )}
      </div>
      {canManage && (
        <div className="row" style={{ gap: 8 }}>
          <Link to="/users/groups" className="btn btn-ghost btn-sm">
            <Users className="ico" /> {t("users.groups")}
          </Link>
          <button onClick={onImportClick} className="btn btn-ghost btn-sm">
            <Upload className="ico" /> {t("users.importCsv")}
          </button>
          <Link to="/users/new" className="btn btn-primary btn-sm">
            <UserPlus className="ico" />
            {t("users.newUser")}
          </Link>
        </div>
      )}
    </div>
  );
}

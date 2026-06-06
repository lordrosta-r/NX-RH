import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Save } from "lucide-react";
import { adminApi } from "../api/admin";
import { toast } from "../hooks/useToast";
import { PageHead, Tile, Callout } from "../components/shell";

const QUERY_KEY = ["departments"] as const;

export default function DepartmentsPage() {
  const queryClient = useQueryClient();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => adminApi.getDepartments().then((r) => r.data.departments),
  });

  const [localList, setLocalList] = useState<string[]>([]);
  const [newName, setNewName] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (data !== undefined) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- hydratation initiale depuis les données serveur
      setLocalList(data);
    }
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: (list: string[]) =>
      adminApi.updateDepartments(list).then((r) => r.data.departments),
    onSuccess: (updated) => {
      setLocalList(updated);
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      toast.success(
        "Enregistré",
        "La liste des départements a été mise à jour.",
      );
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(
        "Erreur",
        msg || "Impossible d'enregistrer les départements.",
      );
    },
  });

  function handleAdd() {
    const trimmed = newName.trim();
    if (!trimmed) return;
    if (localList.includes(trimmed)) {
      toast.error("Doublon", `« ${trimmed} » existe déjà.`);
      return;
    }
    setLocalList((prev) => [...prev, trimmed]);
    setNewName("");
    setSaved(false);
  }

  function handleRename(index: number, value: string) {
    setLocalList((prev) => prev.map((item, i) => (i === index ? value : item)));
    setSaved(false);
  }

  function handleDelete(index: number) {
    setLocalList((prev) => prev.filter((_, i) => i !== index));
    setSaved(false);
  }

  function handleSave() {
    const clean = localList.map((s) => s.trim()).filter(Boolean);
    saveMutation.mutate(clean);
  }

  const isDirty =
    data !== undefined && JSON.stringify(localList) !== JSON.stringify(data);

  return (
    <div className="nx-app">
      <PageHead
        title="Départements"
        desc={
          data !== undefined
            ? `${localList.length} département${localList.length !== 1 ? "s" : ""}`
            : undefined
        }
        actions={
          <button
            onClick={handleSave}
            disabled={saveMutation.isPending || (!isDirty && !saved)}
            className="btn btn-primary"
            style={{ gap: 8 }}
          >
            <Save style={{ width: 16, height: 16 }} />
            {saved ? "Enregistré" : "Enregistrer"}
          </button>
        }
      />

      {isError && (
        <Callout tone="red" style={{ marginBottom: 16 }}>
          <div
            className="row between"
            style={{ alignItems: "center", gap: 12 }}
          >
            <span className="small">
              Erreur lors du chargement des départements.
            </span>
            <button onClick={() => refetch()} className="btn btn-ghost btn-sm">
              Réessayer
            </button>
          </div>
        </Callout>
      )}

      <Tile>
        {isLoading ? (
          <p className="body" style={{ color: "var(--ink-2)" }}>
            Chargement…
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {localList.length === 0 && (
              <p
                className="body"
                style={{ color: "var(--ink-2)", marginBottom: 8 }}
              >
                Aucun département. Ajoutez-en un ci-dessous.
              </p>
            )}

            {localList.map((dept, index) => (
              <div
                key={index}
                className="row"
                style={{ gap: 8, alignItems: "center" }}
              >
                <input
                  className="input"
                  style={{ flex: 1 }}
                  value={dept}
                  onChange={(e) => handleRename(index, e.target.value)}
                  aria-label={`Département ${index + 1}`}
                />
                <button
                  onClick={() => handleDelete(index)}
                  className="btn btn-ghost btn-sm"
                  aria-label={`Supprimer ${dept}`}
                  style={{ color: "var(--red)", flexShrink: 0 }}
                >
                  <Trash2 style={{ width: 16, height: 16 }} />
                </button>
              </div>
            ))}

            <div
              className="row"
              style={{
                gap: 8,
                alignItems: "center",
                marginTop: localList.length > 0 ? 12 : 0,
                borderTop:
                  localList.length > 0 ? "1px solid var(--line)" : "none",
                paddingTop: localList.length > 0 ? 12 : 0,
              }}
            >
              <input
                className="input"
                style={{ flex: 1 }}
                placeholder="Nouveau département…"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAdd();
                }}
              />
              <button
                onClick={handleAdd}
                disabled={!newName.trim()}
                className="btn btn-secondary btn-sm"
                style={{ flexShrink: 0, gap: 6 }}
              >
                <Plus style={{ width: 16, height: 16 }} />
                Ajouter
              </button>
            </div>
          </div>
        )}
      </Tile>
    </div>
  );
}

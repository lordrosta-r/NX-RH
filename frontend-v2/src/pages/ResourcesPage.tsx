import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useDebounce } from "../hooks/useDebounce";
import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import type { LucideIcon } from "lucide-react";
import {
  FileText,
  FileSpreadsheet,
  FileType,
  Play,
  Link as LinkIcon,
  Image as ImageIcon,
  File,
  BookOpen,
  Download,
  Plus,
  X,
  EllipsisVertical,
  Pencil,
  Trash,
  ChevronDown,
  Search,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useConfirm } from "../contexts/ConfirmContext";
import { resourcesApi } from "../api/resources";
import EmptyState from "../components/ui/EmptyState";
import { toast } from "../hooks/useToast";
import { queryKeys } from "../lib/queryKeys";
import type { Resource, ResourceType, Role } from "../types";
import { PageHead, Tile, Badge } from "../components/shell";
import PageGuide from "../components/shared/PageGuide";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatFileSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} Ko`;
  return `${bytes} o`;
}

interface TypeConfig {
  icon: LucideIcon;
  bg: string;
  text: string;
  label: string;
}

const TYPE_CONFIG: Record<ResourceType, TypeConfig> = {
  pdf: {
    icon: FileText,
    bg: "var(--red-soft)",
    text: "var(--red)",
    label: "PDF",
  },
  xlsx: {
    icon: FileSpreadsheet,
    bg: "var(--green-soft)",
    text: "var(--green)",
    label: "Excel",
  },
  doc: {
    icon: FileType,
    bg: "var(--blue-soft)",
    text: "var(--blue)",
    label: "Word",
  },
  video: {
    icon: Play,
    bg: "var(--blue-soft)",
    text: "var(--blue)",
    label: "Vidéo",
  },
  link: {
    icon: LinkIcon,
    bg: "var(--amber-soft)",
    text: "var(--amber)",
    label: "Lien",
  },
  image: {
    icon: ImageIcon,
    bg: "var(--amber-soft)",
    text: "var(--amber)",
    label: "Image",
  },
  other: {
    icon: File,
    bg: "var(--bg-alt-2)",
    text: "var(--ink-2)",
    label: "Autre",
  },
};

function getTypeConfig(type?: ResourceType): TypeConfig {
  if (type && type in TYPE_CONFIG) return TYPE_CONFIG[type];
  return TYPE_CONFIG.other;
}

const AVAILABLE_ROLES: Role[] = ["admin", "hr", "manager", "employee"];
const RESOURCE_TYPES: ResourceType[] = [
  "pdf",
  "xlsx",
  "doc",
  "video",
  "link",
  "image",
  "other",
];

// ─── ResourceCard ─────────────────────────────────────────────────────────────
interface ResourceCardProps {
  resource: Resource;
  isAdminHr: boolean;
  onPublish: (id: string) => void;
  onUnpublish: (id: string) => void;
  onDelete: (id: string) => void;
}

function ResourceCard({
  resource,
  isAdminHr,
  onPublish,
  onUnpublish,
  onDelete,
}: ResourceCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const config = getTypeConfig(resource.type);
  const IconComponent = config.icon;
  const isDraft = resource.status === "draft" || !resource.isPublished;

  useEffect(() => {
    if (!menuOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen]);

  const handleDownload = () => {
    const url = resource.fileUrl || `/api/resources/${resource.id}/download`;
    window.open(url, "_blank");
  };

  const menuItemStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 8,
    width: "100%",
    padding: "9px 14px",
    fontSize: 14,
    color: "var(--ink)",
    textAlign: "left",
    background: "none",
    border: "none",
    cursor: "pointer",
  };

  return (
    <Tile
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 16,
        position: "relative",
      }}
    >
      {/* Type icon */}
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: "var(--radius)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          background: config.bg,
        }}
      >
        <IconComponent style={{ width: 24, height: 24, color: config.text }} />
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <h3 className="h3" style={{ lineHeight: 1.35 }}>
          {resource.title}
        </h3>
        <p className="small" style={{ marginTop: 4 }}>
          {config.label}
          {resource.fileSize !== undefined &&
            ` · ${formatFileSize(resource.fileSize)}`}
        </p>
        <p className="small" style={{ marginTop: 2 }}>
          Visible :{" "}
          {(resource.visibleTo?.length ?? 0) > 0
            ? resource.visibleTo!.join(", ")
            : "Tous"}
        </p>
      </div>

      {/* Status + publish/unpublish */}
      <div className="row between" style={{ gap: 8 }}>
        <Badge tone={isDraft ? "amber" : "green"}>
          {isDraft ? "Brouillon" : "Publié"}
        </Badge>
        {isAdminHr && isDraft && (
          <button onClick={() => onPublish(resource.id)} className="link small">
            Publier
          </button>
        )}
        {isAdminHr && !isDraft && (
          <button
            onClick={() => onUnpublish(resource.id)}
            className="link small"
          >
            Dépublier
          </button>
        )}
      </div>

      {/* Download */}
      <button onClick={handleDownload} className="btn btn-primary btn-block">
        <Download className="ico" style={{ width: 16, height: 16 }} />
        Télécharger
      </button>

      {/* Admin menu */}
      {isAdminHr && (
        <div ref={menuRef} style={{ position: "absolute", top: 12, right: 12 }}>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="btn btn-ghost btn-sm"
            style={{ padding: 6 }}
            aria-label="Actions"
          >
            <EllipsisVertical
              className="ico"
              style={{ width: 16, height: 16 }}
            />
          </button>
          {menuOpen && (
            <div
              style={{
                position: "absolute",
                right: 0,
                top: 36,
                zIndex: 20,
                background: "#fff",
                borderRadius: "var(--radius)",
                border: "1px solid var(--line)",
                boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                minWidth: 140,
                padding: "6px 0",
              }}
            >
              <button
                style={menuItemStyle}
                onClick={() => {
                  setMenuOpen(false);
                  navigate(`/documents/${resource.id}`);
                }}
              >
                <Pencil className="ico" style={{ width: 14, height: 14 }} />
                Modifier
              </button>
              <button
                style={{ ...menuItemStyle, color: "var(--red)" }}
                onClick={() => {
                  setMenuOpen(false);
                  onDelete(resource.id);
                }}
              >
                <Trash className="ico" style={{ width: 14, height: 14 }} />
                Supprimer
              </button>
            </div>
          )}
        </div>
      )}
    </Tile>
  );
}

// ─── Skeleton Card ────────────────────────────────────────────────────────────
function ResourceCardSkeleton() {
  return (
    <Tile
      style={{ display: "flex", flexDirection: "column", gap: 16 }}
      className="animate-pulse"
    >
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: "var(--radius)",
          background: "var(--bg-alt-2)",
        }}
      />
      <div
        style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}
      >
        <div
          style={{
            height: 16,
            background: "var(--bg-alt-2)",
            borderRadius: 4,
            width: "75%",
          }}
        />
        <div
          style={{
            height: 12,
            background: "var(--bg-alt-2)",
            borderRadius: 4,
            width: "50%",
          }}
        />
        <div
          style={{
            height: 12,
            background: "var(--bg-alt-2)",
            borderRadius: 4,
            width: "40%",
          }}
        />
      </div>
      <div
        style={{
          height: 20,
          background: "var(--bg-alt-2)",
          borderRadius: 999,
          width: 80,
        }}
      />
      <div
        style={{
          height: 36,
          background: "var(--bg-alt-2)",
          borderRadius: "var(--radius)",
        }}
      />
    </Tile>
  );
}

// ─── New Resource Slide-Over ──────────────────────────────────────────────────
interface NewResourceSlideOverProps {
  open: boolean;
  onClose: () => void;
}

function NewResourceSlideOver({ open, onClose }: NewResourceSlideOverProps) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [type, setType] = useState<ResourceType>("other");
  const [description, setDescription] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [visibleTo, setVisibleTo] = useState<string[]>([]);
  const [status, setStatus] = useState<"published" | "draft">("draft");

  const { mutate, isPending, reset } = useMutation({
    mutationFn: (data: Partial<Resource>) =>
      resourcesApi.createResource(data).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.resources.lists() });
      handleReset();
      onClose();
    },
  });

  const handleReset = () => {
    setTitle("");
    setType("other");
    setDescription("");
    setFileUrl("");
    setVisibleTo([]);
    setStatus("draft");
    reset();
  };

  const toggleRole = (role: string) => {
    setVisibleTo((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role],
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutate({
      title,
      type,
      description,
      fileUrl,
      visibleTo,
      status,
      isPublished: status === "published",
    });
  };

  if (!open) return null;

  return (
    <div
      className="nx-app"
      style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex" }}
    >
      <div
        style={{ flex: 1, background: "rgba(0,0,0,0.4)" }}
        onClick={onClose}
      />
      <div
        style={{
          width: "100%",
          maxWidth: 512,
          background: "#fff",
          boxShadow: "var(--shadow-lg)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header */}
        <div
          className="row between"
          style={{
            padding: "16px 24px",
            borderBottom: "1px solid var(--line)",
            flexShrink: 0,
          }}
        >
          <h2 className="h2">Nouvelle ressource</h2>
          <button
            onClick={onClose}
            className="btn btn-ghost btn-sm"
            style={{ padding: 6 }}
            aria-label="Fermer"
          >
            <X className="ico" style={{ width: 20, height: 20 }} />
          </button>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            minHeight: 0,
          }}
        >
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "20px 24px",
              display: "flex",
              flexDirection: "column",
              gap: 20,
            }}
          >
            {/* Title */}
            <div className="field">
              <label htmlFor="resource-title">
                Titre <span style={{ color: "var(--red)" }}>*</span>
              </label>
              <input
                id="resource-title"
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="input"
                placeholder="Nom de la ressource"
                aria-label="Titre de la ressource"
              />
            </div>

            {/* Type */}
            <div className="field">
              <label htmlFor="resource-type">Type</label>
              <select
                id="resource-type"
                value={type}
                onChange={(e) => setType(e.target.value as ResourceType)}
                className="input"
                aria-label="Type de ressource"
              >
                {RESOURCE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {TYPE_CONFIG[t].label}
                  </option>
                ))}
              </select>
            </div>

            {/* Description */}
            <div className="field">
              <label htmlFor="resource-description">Description</label>
              <textarea
                id="resource-description"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="input"
                style={{ resize: "none" }}
                placeholder="Description de la ressource"
                aria-label="Description de la ressource"
              />
            </div>

            {/* File URL */}
            <div className="field">
              <label htmlFor="resource-url">URL du fichier</label>
              <input
                id="resource-url"
                type="text"
                value={fileUrl}
                onChange={(e) => setFileUrl(e.target.value)}
                className="input"
                placeholder="https://..."
                aria-label="URL du fichier"
              />
            </div>

            {/* Visible to */}
            <fieldset style={{ border: "none", padding: 0, margin: 0 }}>
              <legend
                className="small"
                style={{
                  fontWeight: 600,
                  color: "var(--ink-2)",
                  marginBottom: 8,
                }}
              >
                Visible pour
              </legend>
              <div className="row wrap" style={{ gap: 12 }}>
                {AVAILABLE_ROLES.map((role) => (
                  <label
                    key={role}
                    className="row"
                    style={{ gap: 8, cursor: "pointer" }}
                  >
                    <input
                      type="checkbox"
                      checked={visibleTo.includes(role)}
                      onChange={() => toggleRole(role)}
                      aria-label={`Visible pour ${role}`}
                    />
                    <span
                      className="small"
                      style={{ textTransform: "capitalize" }}
                    >
                      {role}
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            {/* Status toggle */}
            <div className="field">
              <label htmlFor="resource-status">Statut</label>
              <div className="row" style={{ gap: 12, alignItems: "center" }}>
                <button
                  id="resource-status"
                  type="button"
                  onClick={() =>
                    setStatus((s) =>
                      s === "published" ? "draft" : "published",
                    )
                  }
                  style={{
                    position: "relative",
                    display: "inline-flex",
                    height: 24,
                    width: 44,
                    alignItems: "center",
                    borderRadius: 999,
                    border: "none",
                    cursor: "pointer",
                    transition: "background 0.15s",
                    background:
                      status === "published"
                        ? "var(--blue)"
                        : "var(--line-strong)",
                  }}
                  role="switch"
                  aria-checked={status === "published"}
                  aria-label="Statut de publication"
                >
                  <span
                    style={{
                      display: "inline-block",
                      height: 16,
                      width: 16,
                      borderRadius: "50%",
                      background: "#fff",
                      boxShadow: "var(--shadow-sm)",
                      transition: "transform 0.15s",
                      transform:
                        status === "published"
                          ? "translateX(24px)"
                          : "translateX(4px)",
                    }}
                  />
                </button>
                <span className="small">
                  {status === "published" ? "Publié" : "Brouillon"}
                </span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div
            className="row"
            style={{
              justifyContent: "flex-end",
              gap: 12,
              padding: "16px 24px",
              borderTop: "1px solid var(--line)",
              flexShrink: 0,
            }}
          >
            <button type="button" onClick={onClose} className="btn btn-ghost">
              Annuler
            </button>
            <button
              type="submit"
              disabled={isPending || !title.trim()}
              className="btn btn-primary"
            >
              {isPending ? "Création..." : "Créer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── ResourcesPage ────────────────────────────────────────────────────────────
export default function ResourcesPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const isAdminHr = user?.role === "admin" || user?.role === "hr";

  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 400);
  const [showNewSlideOver, setShowNewSlideOver] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.resources.lists(),
    queryFn: () =>
      resourcesApi
        .getResources({
          category: typeFilter !== "all" ? typeFilter : undefined,
          publishedOnly: !isAdminHr
            ? true
            : statusFilter === "published"
              ? true
              : undefined,
          search: debouncedSearch || undefined,
        })
        .then((r) => r.data),
    placeholderData: keepPreviousData,
  });

  // Client-side draft filter for admin/hr.
  // Pour les non-admin/hr : on applique aussi visibleTo[] — une ressource
  // « réservée managers » ne doit pas fuir vers les employés. visibleTo vide =
  // visible par tous les rôles.
  const resources = (data?.data ?? []).filter((resource) => {
    if (!isAdminHr) {
      if (!resource.isPublished || resource.status === "draft") return false;
      const visibleTo = resource.visibleTo ?? [];
      return (
        visibleTo.length === 0 || (!!user && visibleTo.includes(user.role))
      );
    }
    if (statusFilter === "draft")
      return resource.status === "draft" || !resource.isPublished;
    if (statusFilter === "published")
      return resource.status === "published" || resource.isPublished;
    return true;
  });

  const { mutate: publishResource } = useMutation({
    mutationFn: (id: string) => resourcesApi.publishResource(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.resources.lists() });
      toast.success("Ressource publiée");
    },
    onError: () =>
      toast.error("Erreur lors de la publication", "Veuillez réessayer."),
  });

  const { mutate: unpublishResource } = useMutation({
    mutationFn: (id: string) => resourcesApi.unpublishResource(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.resources.lists() });
      toast.success("Ressource dépubliée");
    },
    onError: () =>
      toast.error("Erreur lors de la dépublication", "Veuillez réessayer."),
  });

  const { mutate: deleteResource } = useMutation({
    mutationFn: (id: string) => resourcesApi.deleteResource(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.resources.lists() });
      toast.success("Ressource supprimée");
    },
    onError: () =>
      toast.error("Erreur lors de la suppression", "Veuillez réessayer."),
  });

  const handleDeleteResource = async (id: string) => {
    if (
      await confirm({
        title: "Supprimer la ressource ?",
        description: "Cette action est irréversible.",
        variant: "danger",
        confirmLabel: "Supprimer",
      })
    )
      deleteResource(id);
  };

  return (
    <div
      className="nx-app"
      style={{ display: "flex", flexDirection: "column", gap: 24 }}
    >
      <PageHead
        eyebrow={t("eyebrow.hrDocuments")}
        title={t("pageHead.resourcesTitle")}
        desc={t("pageHead.resourcesDesc")}
        actions={
          isAdminHr && (
            <button
              onClick={() => setShowNewSlideOver(true)}
              className="btn btn-primary"
            >
              <Plus className="ico" style={{ width: 18, height: 18 }} />
              Nouvelle ressource
            </button>
          )
        }
      />

      <PageGuide
        id="resources"
        title={t("guides.resources.title")}
        color="blue"
        steps={t("guides.resources.steps", { returnObjects: true }) as string[]}
      />

      {/* Filters — admin/hr only */}
      {isAdminHr && (
        <div className="row wrap" style={{ gap: 12, alignItems: "center" }}>
          {/* Type */}
          <div style={{ position: "relative" }}>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="input"
              style={{ paddingRight: 32, appearance: "none" }}
              aria-label="Filtrer par type"
            >
              <option value="all">Tous les types</option>
              {RESOURCE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {TYPE_CONFIG[t].label}
                </option>
              ))}
            </select>
            <ChevronDown
              className="ico"
              style={{
                position: "absolute",
                right: 10,
                top: "50%",
                transform: "translateY(-50%)",
                width: 16,
                height: 16,
                color: "var(--ink-3)",
                pointerEvents: "none",
              }}
            />
          </div>

          {/* Status */}
          <div style={{ position: "relative" }}>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input"
              style={{ paddingRight: 32, appearance: "none" }}
              aria-label="Filtrer par statut"
            >
              <option value="all">Tous les statuts</option>
              <option value="published">Publiés</option>
              <option value="draft">Brouillons</option>
            </select>
            <ChevronDown
              className="ico"
              style={{
                position: "absolute",
                right: 10,
                top: "50%",
                transform: "translateY(-50%)",
                width: 16,
                height: 16,
                color: "var(--ink-3)",
                pointerEvents: "none",
              }}
            />
          </div>

          {/* Search */}
          <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
            <Search
              className="ico"
              style={{
                position: "absolute",
                left: 12,
                top: "50%",
                transform: "translateY(-50%)",
                width: 16,
                height: 16,
                color: "var(--ink-3)",
              }}
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher..."
              className="input"
              style={{ paddingLeft: 36, paddingRight: 36 }}
              aria-label="Rechercher une ressource"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                style={{
                  position: "absolute",
                  right: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--ink-3)",
                  display: "flex",
                }}
                aria-label="Effacer la recherche"
              >
                <X className="ico" style={{ width: 16, height: 16 }} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Grid */}
      {isLoading ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: 24,
          }}
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <ResourceCardSkeleton key={i} />
          ))}
        </div>
      ) : resources.length === 0 ? (
        <EmptyState
          icon={<BookOpen className="w-8 h-8" />}
          title={t("pageHead.resourcesEmpty")}
          description={t("pageHead.resourcesEmptyDesc")}
          action={
            isAdminHr
              ? {
                  label: "Ajouter une ressource",
                  onClick: () => setShowNewSlideOver(true),
                }
              : undefined
          }
        />
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: 24,
          }}
        >
          {resources.map((resource) => (
            <ResourceCard
              key={resource.id}
              resource={resource}
              isAdminHr={!!isAdminHr}
              onPublish={publishResource}
              onUnpublish={unpublishResource}
              onDelete={handleDeleteResource}
            />
          ))}
        </div>
      )}

      {/* New resource slide-over */}
      <NewResourceSlideOver
        open={showNewSlideOver}
        onClose={() => setShowNewSlideOver(false)}
      />
    </div>
  );
}

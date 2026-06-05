import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
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
  Download,
  ArrowLeft,
  Pencil,
  CircleAlert,
  X,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { resourcesApi } from "../api/resources";
import type { Resource, ResourceType, Role } from "../types";
import { queryKeys } from "../lib/queryKeys";
import { PageHead, Tile, Badge, Callout } from "../components/shell";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatFileSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} Ko`;
  return `${bytes} o`;
}

function formatDate(iso?: string): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(iso));
}

interface TypeConfig {
  icon: LucideIcon;
  tone: "blue" | "green" | "amber" | "red" | "grey";
  label: string;
}

const TYPE_CONFIG: Record<ResourceType, TypeConfig> = {
  pdf: { icon: FileText, tone: "red", label: "PDF" },
  xlsx: { icon: FileSpreadsheet, tone: "green", label: "Excel" },
  doc: { icon: FileType, tone: "blue", label: "Word" },
  video: { icon: Play, tone: "grey", label: "Vidéo" },
  link: { icon: LinkIcon, tone: "amber", label: "Lien" },
  image: { icon: ImageIcon, tone: "grey", label: "Image" },
  other: { icon: File, tone: "grey", label: "Autre" },
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

// ─── Loading Skeleton ─────────────────────────────────────────────────────────
function DetailSkeleton() {
  return (
    <div className="nx-app">
      <div className="row" style={{ justifyContent: "center", padding: 96 }}>
        <div className="w-8 h-8 border-4 border-[#1b1b78] border-t-transparent rounded-full animate-spin" />
      </div>
    </div>
  );
}

// ─── Edit Slide-Over ──────────────────────────────────────────────────────────
interface EditResourceSlideOverProps {
  resource: Resource;
  open: boolean;
  onClose: () => void;
}

function EditResourceSlideOver({
  resource,
  open,
  onClose,
}: EditResourceSlideOverProps) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState(resource.title);
  const [description, setDescription] = useState(resource.description ?? "");
  const [type, setType] = useState<ResourceType>(resource.type ?? "other");
  const [visibleTo, setVisibleTo] = useState<string[]>(
    resource.visibleTo ?? [],
  );

  const { mutate, isPending } = useMutation({
    mutationFn: (data: Partial<Resource>) =>
      resourcesApi.updateResource(resource.id, data).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.resources.detail(resource.id),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.resources.lists() });
      onClose();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutate({ title, description, type, visibleTo });
  };

  const toggleRole = (role: string) => {
    setVisibleTo((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role],
    );
  };

  if (!open) return null;

  return (
    <div className="nx-app fixed inset-0 z-50 flex">
      <div
        className="flex-1"
        style={{ background: "rgba(0,0,0,0.4)" }}
        onClick={onClose}
      />
      <div
        className="w-full max-w-lg flex flex-col"
        style={{
          background: "#fff",
          boxShadow: "var(--shadow, 0 10px 30px rgba(0,0,0,0.2))",
        }}
      >
        {/* Header */}
        <div
          className="row between flex-shrink-0"
          style={{
            padding: "16px 24px",
            borderBottom: "1px solid var(--line)",
          }}
        >
          <h2 className="h3">Modifier la ressource</h2>
          <button
            onClick={onClose}
            className="btn btn-ghost btn-sm"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div
            className="flex-1 overflow-y-auto"
            style={{
              padding: "20px 24px",
              display: "flex",
              flexDirection: "column",
              gap: 20,
            }}
          >
            {/* Title */}
            <div className="field">
              <label htmlFor="res-title">
                Titre <span style={{ color: "var(--red)" }}>*</span>
              </label>
              <input
                id="res-title"
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="input"
                aria-label="Titre de la ressource"
              />
            </div>

            {/* Type */}
            <div className="field">
              <label htmlFor="res-type">Type</label>
              <select
                id="res-type"
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
              <label htmlFor="res-desc">Description</label>
              <textarea
                id="res-desc"
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="input"
                aria-label="Description de la ressource"
              />
            </div>

            {/* Visible to */}
            <div className="field">
              <label>Visible pour</label>
              <div className="row wrap" style={{ gap: 12 }}>
                {AVAILABLE_ROLES.map((role) => (
                  <label
                    key={role}
                    className="row"
                    style={{ gap: 8, cursor: "pointer", alignItems: "center" }}
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
            </div>
          </div>

          {/* Footer */}
          <div
            className="row between flex-shrink-0"
            style={{
              justifyContent: "flex-end",
              gap: 12,
              padding: "16px 24px",
              borderTop: "1px solid var(--line)",
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
              {isPending ? "Enregistrement..." : "Enregistrer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── ResourceDetailPage ───────────────────────────────────────────────────────
export default function ResourceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isAdminHr = user?.role === "admin" || user?.role === "hr";
  const [showEditSlideOver, setShowEditSlideOver] = useState(false);

  const {
    data: resource,
    isLoading,
    isError,
  } = useQuery({
    queryKey: queryKeys.resources.detail(id ?? ""),
    queryFn: () => resourcesApi.getResource(id!).then((r) => r.data),
    enabled: !!id,
    placeholderData: keepPreviousData,
  });

  const { mutate: publishResource, isPending: isPublishing } = useMutation({
    mutationFn: () => resourcesApi.publishResource(id!),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.resources.detail(id ?? ""),
      }),
  });

  const { mutate: unpublishResource, isPending: isUnpublishing } = useMutation({
    mutationFn: () => resourcesApi.unpublishResource(id!),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.resources.detail(id ?? ""),
      }),
  });

  if (isLoading) return <DetailSkeleton />;

  if (isError || !resource) {
    return (
      <div className="nx-app">
        <button
          onClick={() => navigate("/resources")}
          className="btn btn-ghost btn-sm"
          style={{ marginBottom: 16 }}
        >
          <ArrowLeft className="w-4 h-4" />
          Retour
        </button>
        <Callout tone="red">
          <div className="row" style={{ gap: 12, alignItems: "center" }}>
            <CircleAlert className="w-5 h-5 flex-shrink-0" />
            <span className="small" style={{ fontWeight: 600 }}>
              Ressource introuvable
            </span>
            <button
              onClick={() => navigate("/resources")}
              className="link"
              style={{
                marginLeft: "auto",
                background: "none",
                border: "none",
                cursor: "pointer",
              }}
            >
              Retour à la liste
            </button>
          </div>
        </Callout>
      </div>
    );
  }

  const isDraft = resource.status === "draft" || !resource.isPublished;

  // 404 inline: draft resource for non-admin/hr users
  if (isDraft && !isAdminHr) {
    return (
      <div className="nx-app">
        <button
          onClick={() => navigate("/resources")}
          className="btn btn-ghost btn-sm"
          style={{ marginBottom: 16 }}
        >
          <ArrowLeft className="w-4 h-4" />
          Retour
        </button>
        <Callout tone="red">
          <div className="row" style={{ gap: 12, alignItems: "center" }}>
            <CircleAlert className="w-5 h-5 flex-shrink-0" />
            <span className="small" style={{ fontWeight: 600 }}>
              Cette ressource n'est pas disponible (404).
            </span>
            <button
              onClick={() => navigate("/resources")}
              className="link"
              style={{
                marginLeft: "auto",
                background: "none",
                border: "none",
                cursor: "pointer",
              }}
            >
              Retour à la liste
            </button>
          </div>
        </Callout>
      </div>
    );
  }

  const config = getTypeConfig(resource.type);
  const IconComponent = config.icon;

  const handleDownload = () => {
    const url = resource.fileUrl || `/api/resources/${id}/download`;
    window.open(url, "_blank");
  };

  return (
    <>
      <div className="nx-app">
        {/* Back */}
        <button
          onClick={() => navigate("/resources")}
          className="btn btn-ghost btn-sm"
          style={{ marginBottom: 12 }}
        >
          <ArrowLeft className="w-4 h-4" />
          Retour
        </button>

        {/* Page header */}
        <PageHead
          eyebrow="Ressource"
          title={
            <span
              className="row"
              style={{ gap: 12, alignItems: "center", flexWrap: "wrap" }}
            >
              {resource.title}
              <Badge tone={isDraft ? "amber" : "green"}>
                {isDraft ? "Brouillon" : "Publié"}
              </Badge>
            </span>
          }
          actions={
            isAdminHr ? (
              <>
                <button
                  onClick={() => setShowEditSlideOver(true)}
                  className="btn btn-ghost btn-sm"
                >
                  <Pencil className="w-4 h-4" />
                  Modifier
                </button>
                {isDraft ? (
                  <button
                    onClick={() => publishResource()}
                    disabled={isPublishing}
                    className="btn btn-primary btn-sm"
                  >
                    {isPublishing ? "Publication..." : "Publier"}
                  </button>
                ) : (
                  <button
                    onClick={() => unpublishResource()}
                    disabled={isUnpublishing}
                    className="btn btn-ghost btn-sm"
                  >
                    {isUnpublishing ? "Dépublication..." : "Dépublier"}
                  </button>
                )}
              </>
            ) : undefined
          }
        />

        {/* Meta row */}
        <div
          className="row wrap"
          style={{ gap: 12, alignItems: "center", marginBottom: 16 }}
        >
          <Badge tone={config.tone}>
            <IconComponent className="w-4 h-4" style={{ marginRight: 6 }} />
            {config.label}
          </Badge>
          <span className="small" style={{ color: "var(--ink-3)" }}>
            {resource.fileSize !== undefined &&
              `Taille : ${formatFileSize(resource.fileSize)}`}
            {resource.createdAt &&
              `${resource.fileSize !== undefined ? " · " : ""}Publié le ${formatDate(resource.createdAt)}`}
          </span>
        </div>

        {/* Visible for chips */}
        {(resource.visibleTo?.length ?? 0) > 0 && (
          <div
            className="row wrap"
            style={{ gap: 8, alignItems: "center", marginBottom: 16 }}
          >
            <span className="small" style={{ color: "var(--ink-3)" }}>
              Visible pour :
            </span>
            {resource.visibleTo!.map((role) => (
              <Badge key={role} tone="blue">
                <span style={{ textTransform: "capitalize" }}>{role}</span>
              </Badge>
            ))}
          </div>
        )}

        {/* Detail card */}
        <Tile>
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {resource.description && (
              <div>
                <h2 className="h3" style={{ marginBottom: 8 }}>
                  Description
                </h2>
                <p className="body" style={{ whiteSpace: "pre-wrap" }}>
                  {resource.description}
                </p>
              </div>
            )}
            {resource.content && (
              <div>
                <h2 className="h3" style={{ marginBottom: 8 }}>
                  Contenu
                </h2>
                <p className="body" style={{ whiteSpace: "pre-wrap" }}>
                  {resource.content}
                </p>
              </div>
            )}

            {/* Download button */}
            <div>
              <button onClick={handleDownload} className="btn btn-primary">
                <Download className="w-5 h-5" />
                Télécharger le fichier
              </button>
            </div>
          </div>
        </Tile>
      </div>

      {/* Edit slide-over */}
      {showEditSlideOver && (
        <EditResourceSlideOver
          resource={resource}
          open={showEditSlideOver}
          onClose={() => setShowEditSlideOver(false)}
        />
      )}
    </>
  );
}

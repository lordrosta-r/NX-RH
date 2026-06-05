/**
 * Composants de présentation "institutionnels" partagés (design NX Design).
 * À utiliser à l'intérieur d'un conteneur `.nx-app` (styles dans styles/app.css).
 */
import type { CSSProperties, ReactNode } from "react";

type Tone = "blue" | "green" | "amber" | "red" | "grey";

export function Badge({
  tone = "grey",
  dot = false,
  children,
}: {
  tone?: Tone;
  dot?: boolean;
  children: ReactNode;
}) {
  return (
    <span className={`badge ${tone}`}>
      {dot && <span className="dot" />}
      {children}
    </span>
  );
}

export function Bar({
  pct,
  tone,
  height = 8,
}: {
  pct: number;
  tone?: string;
  height?: number;
}) {
  return (
    <div className="track" style={{ height }}>
      <i
        style={{
          width: `${Math.max(0, Math.min(100, pct))}%`,
          background: tone,
        }}
      />
    </div>
  );
}

export function StatTile({
  value,
  label,
  tone,
  sub,
}: {
  value: ReactNode;
  label: ReactNode;
  tone?: string;
  sub?: ReactNode;
}) {
  return (
    <div className="stat-tile">
      <div className="stat-value" style={tone ? { color: tone } : undefined}>
        {value}
      </div>
      <div className="stat-label">{label}</div>
      {sub != null && (
        <div className="stat-sub" style={tone ? { color: tone } : undefined}>
          {sub}
        </div>
      )}
    </div>
  );
}

export function Tile({
  children,
  className = "",
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div className={`tile ${className}`.trim()} style={style}>
      {children}
    </div>
  );
}

export function Callout({
  tone = "blue",
  children,
  className = "",
  style,
}: {
  tone?: "blue" | "amber" | "green" | "red";
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  const cls = tone === "blue" ? "callout" : `callout ${tone}`;
  return (
    <div className={`${cls} ${className}`.trim()} style={style}>
      {children}
    </div>
  );
}

export function PageHead({
  eyebrow,
  title,
  desc,
  actions,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  desc?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="page-head">
      <div
        className="row between wrap"
        style={{ gap: 16, alignItems: "flex-end" }}
      >
        <div style={{ flex: "1 1 360px", minWidth: 0 }}>
          {eyebrow && <p className="eyebrow">{eyebrow}</p>}
          <h1 className="h1" style={{ marginTop: eyebrow ? 8 : 0 }}>
            {title}
          </h1>
          {desc && (
            <p className="body" style={{ marginTop: 6 }}>
              {desc}
            </p>
          )}
        </div>
        {actions && (
          <div className="row wrap" style={{ gap: 12 }}>
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}

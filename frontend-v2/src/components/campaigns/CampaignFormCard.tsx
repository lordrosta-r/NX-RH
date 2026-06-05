interface CampaignFormCardProps {
  title: string;
  children: React.ReactNode;
}

export default function CampaignFormCard({
  title,
  children,
}: CampaignFormCardProps) {
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid var(--line)",
        borderRadius: "var(--radius-lg)",
      }}
    >
      <div
        style={{ padding: "16px 24px", borderBottom: "1px solid var(--line)" }}
      >
        <h2 className="eyebrow">{title}</h2>
      </div>
      <div
        style={{
          padding: "24px",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
        }}
      >
        {children}
      </div>
    </div>
  );
}

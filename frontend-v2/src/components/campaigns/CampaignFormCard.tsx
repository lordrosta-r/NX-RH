interface CampaignFormCardProps {
  title: string;
  children: React.ReactNode;
}

export default function CampaignFormCard({
  title,
  children,
}: CampaignFormCardProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100">
      <div className="px-6 py-4 border-b border-slate-100">
        <h2 className="text-sm font-semibold text-slate-800 uppercase tracking-wide">
          {title}
        </h2>
      </div>
      <div className="p-6 space-y-4">{children}</div>
    </div>
  );
}

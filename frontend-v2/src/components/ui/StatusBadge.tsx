const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  draft:    { label: 'Brouillon', className: 'bg-slate-100 text-slate-600' },
  active:   { label: 'Active',    className: 'bg-success-50 text-success-700' },
  closed:   { label: 'Clôturée', className: 'bg-warning-50 text-warning-700' },
  archived: { label: 'Archivée', className: 'bg-slate-100 text-slate-500' },
}

export function StatusBadge({ status }: { status?: string }) {
  const config = status ? STATUS_CONFIG[status] : undefined
  if (!config) return null
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  )
}

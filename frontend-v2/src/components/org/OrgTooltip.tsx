import { Mail, Building2, Users } from 'lucide-react'

interface OrgTooltipProps {
  firstName: string
  lastName: string
  role: string
  color: string
  department?: string
  email?: string
  reportCount: number
  managerName?: string
}

const ROLE_LABELS: Record<string, string> = {
  admin:    'Admin',
  hr:       'RH',
  manager:  'Manager',
  employee: 'Employé',
}

export default function OrgTooltip({
  firstName,
  lastName,
  role,
  color,
  department,
  email,
  reportCount,
  managerName,
}: OrgTooltipProps) {
  return (
    <div
      className="absolute z-50 bg-white border border-slate-200 rounded-xl shadow-xl p-3 text-left pointer-events-none"
      style={{
        bottom: '110%',
        left: '50%',
        transform: 'translateX(-50%)',
        minWidth: 200,
        maxWidth: 260,
      }}
    >
      {/* Arrow */}
      <div
        className="absolute bottom-[-6px] left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-r border-b border-slate-200 rotate-45"
      />

      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
          style={{ backgroundColor: color }}
        >
          {firstName[0]}{lastName[0]}
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-800 leading-none">{firstName} {lastName}</p>
          <p className="text-xs text-slate-500 mt-0.5">{ROLE_LABELS[role] ?? role}</p>
        </div>
      </div>

      <div className="border-t border-slate-100 pt-2 space-y-1">
        {email && (
          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <Mail size={11} className="text-slate-400 flex-shrink-0" />
            <span className="truncate">{email}</span>
          </div>
        )}
        {department && (
          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <Building2 size={11} className="text-slate-400 flex-shrink-0" />
            <span>{department}</span>
          </div>
        )}
        {managerName && (
          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <span className="text-slate-500 text-[10px]">N+1</span>
            <span>{managerName}</span>
          </div>
        )}
        <div className="flex items-center gap-1.5 text-xs text-slate-600">
          <Users size={11} className="text-slate-400 flex-shrink-0" />
          <span>{reportCount} reporté{reportCount !== 1 ? 's' : ''} direct{reportCount !== 1 ? 's' : ''}</span>
        </div>
      </div>
    </div>
  )
}

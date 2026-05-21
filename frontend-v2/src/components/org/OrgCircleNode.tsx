import { memo, useState } from 'react'
import { Handle, Position } from '@xyflow/react'
import type { NodeProps, Node } from '@xyflow/react'
import type { OrgNodeData } from '../../hooks/useOrgLayout'
import OrgTooltip from './OrgTooltip'

const ROLE_LABELS: Record<string, string> = {
  admin:    'Admin',
  hr:       'RH',
  manager:  'Manager',
  employee: 'Employé',
}

function OrgCircleNode({ data, selected }: NodeProps<Node<OrgNodeData>>) {
  const [showTooltip, setShowTooltip] = useState(false)
  const [tooltipTimer, setTooltipTimer] = useState<ReturnType<typeof setTimeout> | null>(null)

  const { size, color, initials, firstName, lastName, role, hasNoManager, reportCount } = data

  const fullName = `${firstName} ${lastName}`
  const truncatedName = fullName.length > 14 ? fullName.slice(0, 13) + '…' : fullName

  const handleMouseEnter = () => {
    const timer = setTimeout(() => setShowTooltip(true), 300)
    setTooltipTimer(timer)
  }

  const handleMouseLeave = () => {
    if (tooltipTimer) clearTimeout(tooltipTimer)
    setTooltipTimer(null)
    setShowTooltip(false)
  }

  const fontSize = size >= 72 ? 18 : size >= 64 ? 16 : size >= 56 ? 14 : 12

  return (
    <div
      className="flex flex-col items-center cursor-pointer select-none relative"
      style={{ width: size + 60, paddingBottom: 4 }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />

      {/* Circle */}
      <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
        {/* Orange dashed ring for no-manager (admin/hr view) */}
        {hasNoManager && (
          <div
            className="absolute inset-0 rounded-full border-2 border-dashed border-orange-400"
            style={{ width: size + 6, height: size + 6, left: -3, top: -3 }}
          />
        )}

        {/* Main circle */}
        <div
          className="rounded-full flex items-center justify-center font-semibold text-white transition-all duration-200"
          style={{
            width: size,
            height: size,
            backgroundColor: color,
            fontSize,
            boxShadow: selected
              ? `0 0 0 3px white, 0 0 0 5px ${color}`
              : '0 1px 4px rgba(0,0,0,0.15)',
            transform: showTooltip ? 'scale(1.05)' : 'scale(1)',
          }}
        >
          {initials}
        </div>
      </div>

      {/* Name */}
      <span className="mt-1.5 text-xs font-medium text-slate-700 text-center leading-tight" style={{ maxWidth: size + 40 }}>
        {truncatedName}
      </span>

      {/* Role badge */}
      <span
        className="mt-0.5 text-[9px] font-medium px-1.5 py-0.5 rounded-full text-white"
        style={{ backgroundColor: color, opacity: 0.85 }}
      >
        {ROLE_LABELS[role] ?? role}
      </span>

      {/* Tooltip */}
      {showTooltip && (
        <OrgTooltip
          firstName={firstName}
          lastName={lastName}
          role={role}
          color={color}
          department={data.department}
          email={data.email}
          reportCount={reportCount}
        />
      )}
    </div>
  )
}

export default memo(OrgCircleNode)

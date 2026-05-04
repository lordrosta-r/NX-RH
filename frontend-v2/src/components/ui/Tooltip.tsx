import React, { useState, useId } from 'react'
import clsx from 'clsx'

export interface TooltipProps {
  content: string
  placement?: 'top' | 'bottom' | 'left' | 'right'
  children: React.ReactElement
}

const PLACEMENT_CLASSES = {
  top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
  bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
  left: 'right-full top-1/2 -translate-y-1/2 mr-2',
  right: 'left-full top-1/2 -translate-y-1/2 ml-2',
}

export default function Tooltip({ content, placement = 'top', children }: TooltipProps) {
  const [visible, setVisible] = useState(false)
  const id = useId()

  const child = React.cloneElement(children, {
    'aria-describedby': id,
    onMouseEnter: (e: React.MouseEvent) => {
      setVisible(true)
      children.props.onMouseEnter?.(e)
    },
    onMouseLeave: (e: React.MouseEvent) => {
      setVisible(false)
      children.props.onMouseLeave?.(e)
    },
    onFocus: (e: React.FocusEvent) => {
      setVisible(true)
      children.props.onFocus?.(e)
    },
    onBlur: (e: React.FocusEvent) => {
      setVisible(false)
      children.props.onBlur?.(e)
    },
  })

  return (
    <div className="relative inline-flex">
      {child}
      {visible && (
        <div
          id={id}
          role="tooltip"
          className={clsx(
            'absolute z-50 bg-slate-900 text-white text-xs font-medium px-2.5 py-1.5 rounded-lg shadow-lg max-w-xs whitespace-nowrap pointer-events-none animate-fadeIn',
            PLACEMENT_CLASSES[placement]
          )}
        >
          {content}
        </div>
      )}
    </div>
  )
}

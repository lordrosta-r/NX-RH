// PaletteIcon — theme cycle indicator (stroke, 24×24 grid)
export default function PaletteIcon({ size = 18, color = 'currentColor', strokeWidth = 2 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <circle cx="9"  cy="10" r="1" />
      <circle cx="15" cy="10" r="1" />
      <circle cx="12" cy="15" r="1" />
    </svg>
  )
}

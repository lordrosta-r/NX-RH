// ChevronRightIcon — Inline arrow for "Explore Growth →" style links
export default function ChevronRightIcon({ size = 16, color = 'currentColor', strokeWidth = 2 }) {
  return (
    <svg
      width={size} height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="9 18 15 12 9 6" />
    </svg>
  )
}

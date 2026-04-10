// SparklesIcon — Growth / auto_awesome (used in dashboard quick cards)
export default function SparklesIcon({ size = 18, color = 'currentColor', strokeWidth = 2 }) {
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
      <path d="M12 2l1.09 6.26L19 9l-5.91.74L12 16l-1.09-6.26L5 9l5.91-.74L12 2z" />
      <path d="M5 14l.74 3.26L9 18l-3.26.74L5 22l-.74-3.26L1 18l3.26-.74L5 14z" />
      <path d="M19 14l.74 3.26L23 18l-3.26.74L19 22l-.74-3.26L15 18l3.26-.74L19 14z" />
    </svg>
  )
}

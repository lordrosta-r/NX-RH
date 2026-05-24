export function ErrorMessage({ id, message }: { id?: string; message?: string }) {
  if (!message) return null
  return (
    <p id={id} role="alert" className="mt-1 text-xs text-error-600">
      {message}
    </p>
  )
}

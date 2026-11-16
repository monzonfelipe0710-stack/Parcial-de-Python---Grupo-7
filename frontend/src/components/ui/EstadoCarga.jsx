export function EstadoCarga({ mensaje = 'Cargando información' }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-center justify-center gap-3 rounded-lg border border-papel-200 bg-white px-6 py-12 text-texto-suave"
    >
      <span
        aria-hidden="true"
        className="h-5 w-5 animate-spin rounded-full border-2 border-tinta-700 border-t-transparent"
      />
      <span>{mensaje}</span>
    </div>
  )
}

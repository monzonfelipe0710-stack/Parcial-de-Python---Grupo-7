const BASE =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-md border px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 aria-disabled:cursor-wait aria-disabled:opacity-60'

const VARIANTES = {
  primario: 'border-tinta-900 bg-tinta-900 text-white hover:bg-tinta-700',
  acento: 'border-dorado-700 bg-dorado-700 text-white hover:bg-dorado-600',
  secundario: 'border-papel-300 bg-white text-tinta-900 hover:bg-papel-100',
  peligro: 'border-peligro-700 bg-peligro-700 text-white hover:bg-red-800'
}

export function clasesBoton(variante = 'primario', extra = '') {
  return `${BASE} ${VARIANTES[variante]} ${extra}`.trim()
}

export function Boton({
  variante = 'primario',
  cargando = false,
  disabled = false,
  type = 'button',
  className = '',
  onClick,
  children,
  ...resto
}) {
  function alHacerClic(evento) {
    if (cargando) {
      evento.preventDefault()
      return
    }
    if (onClick) {
      onClick(evento)
    }
  }

  return (
    <button
      type={type}
      disabled={disabled}
      aria-busy={cargando || undefined}
      onClick={alHacerClic}
      className={clasesBoton(variante, className)}
      {...resto}
      aria-disabled={cargando || resto['aria-disabled'] || undefined}
    >
      {cargando ? (
        <span
          aria-hidden="true"
          className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
      ) : null}
      {children}
      {cargando ? <span className="sr-only"> (en curso)</span> : null}
    </button>
  )
}

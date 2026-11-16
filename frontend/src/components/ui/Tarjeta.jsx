export function Tarjeta({ titulo, descripcion, acciones, children, className = '', idTitulo }) {
  const tieneEncabezado = titulo || acciones
  return (
    <section
      aria-labelledby={titulo ? idTitulo : undefined}
      className={`rounded-lg border border-papel-200 bg-white p-5 shadow-sm sm:p-6 ${className}`}
    >
      {tieneEncabezado ? (
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            {titulo ? (
              <h2 id={idTitulo} className="text-xl font-semibold">
                {titulo}
              </h2>
            ) : null}
            {descripcion ? <p className="mt-1 text-sm text-texto-suave">{descripcion}</p> : null}
          </div>
          {acciones ? <div className="flex flex-wrap gap-2">{acciones}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  )
}

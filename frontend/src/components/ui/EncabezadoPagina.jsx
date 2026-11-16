export function EncabezadoPagina({ titulo, descripcion, acciones }) {
  return (
    <header className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-papel-300 pb-5">
      <div className="max-w-3xl">
        <h1 className="text-3xl font-semibold leading-tight">{titulo}</h1>
        {descripcion ? <p className="mt-2 text-texto-suave">{descripcion}</p> : null}
      </div>
      {acciones ? <div className="flex flex-wrap gap-2">{acciones}</div> : null}
    </header>
  )
}

export function EstadoVacio({ titulo, descripcion, children }) {
  return (
    <div className="rounded-lg border border-dashed border-papel-300 bg-white px-6 py-12 text-center">
      <h2 className="text-xl font-semibold">{titulo}</h2>
      {descripcion ? <p className="mx-auto mt-2 max-w-prose text-texto-suave">{descripcion}</p> : null}
      {children ? <div className="mt-6 flex justify-center">{children}</div> : null}
    </div>
  )
}

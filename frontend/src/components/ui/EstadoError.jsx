import { Boton } from './Boton.jsx'

export function EstadoError({ titulo = 'No se pudo cargar la información', mensaje, onReintentar }) {
  return (
    <div
      role="alert"
      className="rounded-lg border border-peligro-700 bg-peligro-100 px-6 py-8 text-center"
    >
      <h2 className="text-xl font-semibold text-peligro-700">{titulo}</h2>
      {mensaje ? <p className="mx-auto mt-2 max-w-prose text-texto">{mensaje}</p> : null}
      {onReintentar ? (
        <div className="mt-6 flex justify-center">
          <Boton variante="secundario" onClick={onReintentar}>
            Reintentar
          </Boton>
        </div>
      ) : null}
    </div>
  )
}

import { ESTADOS_CONTRATO } from '../../config/campos.js'

const CLASES = {
  borrador: 'border-papel-300 bg-papel-100 text-texto',
  pendiente_revision: 'border-alerta-700 bg-alerta-100 text-alerta-700',
  aprobado: 'border-exito-700 bg-exito-100 text-exito-700'
}

const PUNTOS = {
  borrador: 'bg-texto-suave',
  pendiente_revision: 'bg-alerta-700',
  aprobado: 'bg-exito-700'
}

export function InsigniaEstado({ estado }) {
  const definicion = ESTADOS_CONTRATO[estado]
  if (!definicion) {
    return null
  }
  return (
    <span
      className={`inline-flex items-center gap-2 whitespace-nowrap rounded-full border px-3 py-1 text-sm font-semibold ${CLASES[estado]}`}
    >
      <span aria-hidden="true" className={`h-2 w-2 rounded-full ${PUNTOS[estado]}`} />
      {definicion.etiqueta}
    </span>
  )
}

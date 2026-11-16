import { formatearFechaHora } from '../lib/formato.js'
import { Tarjeta } from '../components/ui/Tarjeta.jsx'

function DatoResumen({ rotulo, valor }) {
  return (
    <div>
      <dt className="text-sm font-semibold text-tinta-900">{rotulo}</dt>
      <dd className="mt-0.5 break-words text-texto">{valor}</dd>
    </div>
  )
}

export function Trazabilidad({ contrato }) {
  const historial = contrato.historial ?? []
  const revision = contrato.revision

  return (
    <Tarjeta
      titulo="Trazabilidad"
      idTitulo="titulo-trazabilidad"
      descripcion="Registro de la información proporcionada y de las acciones realizadas sobre el contrato."
    >
      <dl className="grid gap-4 sm:grid-cols-2">
        <DatoResumen rotulo="Creado por" valor={contrato.creadoPor} />
        <DatoResumen rotulo="Fecha de creación" valor={formatearFechaHora(contrato.creadoEn)} />
        {revision ? (
          <>
            <DatoResumen rotulo="Aprobado por" valor={revision.profesional} />
            <DatoResumen rotulo="Fecha de aprobación" valor={formatearFechaHora(revision.fecha)} />
          </>
        ) : (
          <DatoResumen rotulo="Aprobación" valor="Sin aprobación registrada" />
        )}
      </dl>

      <h3 className="mb-3 mt-8 text-lg font-semibold">Historial de acciones</h3>
      {historial.length === 0 ? (
        <p className="text-texto-suave">No hay acciones registradas para este contrato.</p>
      ) : (
        <ol aria-label="Historial de acciones del contrato" className="space-y-3">
          {historial.map((evento, indice) => (
            <li
              key={`${evento.fecha}-${indice}`}
              className="rounded-md border border-papel-200 bg-papel-50 px-4 py-3"
            >
              <p className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-texto-suave">
                <time dateTime={evento.fecha}>{formatearFechaHora(evento.fecha)}</time>
                <span>Usuario: {evento.usuario}</span>
              </p>
              <p className="mt-1 text-texto">{evento.accion}</p>
            </li>
          ))}
        </ol>
      )}
    </Tarjeta>
  )
}

export default Trazabilidad

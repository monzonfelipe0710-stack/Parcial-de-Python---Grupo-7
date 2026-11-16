import { InsigniaEstado } from '../components/ui/InsigniaEstado.jsx'
import { clasesBoton } from '../components/ui/Boton.jsx'
import { Enlace } from '../lib/router.jsx'
import { formatearFechaHora } from '../lib/formato.js'
import { leerValor } from '../lib/datosContrato.js'

const TEXTO_SIN_DEFINIR = 'Sin definir'

function obtenerNombreParte(contrato, seccion) {
  const nombre = leerValor(contrato.datos, seccion, 'nombre').trim()
  return nombre === '' ? TEXTO_SIN_DEFINIR : nombre
}

function AccionesContrato({ contrato, className = '' }) {
  const esBorrador = contrato.estado === 'borrador'
  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      <Enlace
        a={`/contratos/${encodeURIComponent(contrato.id)}`}
        className={clasesBoton('secundario')}
        aria-label={`Ver detalle del contrato ${contrato.id}`}
      >
        Ver detalle
      </Enlace>
      {esBorrador ? (
        <Enlace
          a={`/contratos/nuevo?borrador=${encodeURIComponent(contrato.id)}`}
          className={clasesBoton('primario')}
          aria-label={`Continuar el borrador ${contrato.id}`}
        >
          Continuar
        </Enlace>
      ) : null}
    </div>
  )
}

function TablaEscritorio({ contratos, mostrarAcciones }) {
  return (
    <div className="hidden md:block">
      <div
        role="region"
        aria-label="Listado de contratos, desplazable horizontalmente"
        tabIndex={0}
        className="overflow-x-auto rounded-lg border border-papel-200 bg-white shadow-sm"
      >
        <table className="w-full min-w-3xl border-collapse text-left text-sm">
          <caption className="sr-only">
            Listado de contratos con sus partes, estado y última actualización
          </caption>
          <thead className="bg-papel-100 text-tinta-900">
            <tr>
              <th scope="col" className="px-4 py-3 font-semibold">
                Identificador
              </th>
              <th scope="col" className="px-4 py-3 font-semibold">
                Partes
              </th>
              <th scope="col" className="px-4 py-3 font-semibold">
                Estado
              </th>
              <th scope="col" className="px-4 py-3 font-semibold">
                Creado por
              </th>
              <th scope="col" className="px-4 py-3 font-semibold">
                Última actualización
              </th>
              {mostrarAcciones ? (
                <th scope="col" className="px-4 py-3 font-semibold">
                  Acciones
                </th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {contratos.map((contrato) => (
              <tr key={contrato.id} className="border-t border-papel-200 align-top">
                <th scope="row" className="px-4 py-3 font-semibold text-tinta-900">
                  {contrato.id}
                </th>
                <td className="px-4 py-3">
                  <p>
                    <span className="text-texto-suave">Contratante: </span>
                    {obtenerNombreParte(contrato, 'parte_contratante')}
                  </p>
                  <p className="mt-1">
                    <span className="text-texto-suave">Prestadora: </span>
                    {obtenerNombreParte(contrato, 'parte_prestadora')}
                  </p>
                </td>
                <td className="px-4 py-3">
                  <InsigniaEstado estado={contrato.estado} />
                </td>
                <td className="px-4 py-3">{contrato.creadoPor}</td>
                <td className="px-4 py-3">{formatearFechaHora(contrato.actualizadoEn)}</td>
                {mostrarAcciones ? (
                  <td className="px-4 py-3">
                    <AccionesContrato contrato={contrato} />
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function TarjetasMovil({ contratos, mostrarAcciones }) {
  return (
    <ul aria-label="Listado de contratos" className="space-y-4 md:hidden">
      {contratos.map((contrato) => (
        <li key={contrato.id} className="rounded-lg border border-papel-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <p className="text-lg font-semibold text-tinta-900">{contrato.id}</p>
            <InsigniaEstado estado={contrato.estado} />
          </div>
          <dl className="mt-3 space-y-2 text-sm">
            <div>
              <dt className="text-texto-suave">Contratante</dt>
              <dd>{obtenerNombreParte(contrato, 'parte_contratante')}</dd>
            </div>
            <div>
              <dt className="text-texto-suave">Prestadora</dt>
              <dd>{obtenerNombreParte(contrato, 'parte_prestadora')}</dd>
            </div>
            <div>
              <dt className="text-texto-suave">Creado por</dt>
              <dd>{contrato.creadoPor}</dd>
            </div>
            <div>
              <dt className="text-texto-suave">Última actualización</dt>
              <dd>{formatearFechaHora(contrato.actualizadoEn)}</dd>
            </div>
          </dl>
          {mostrarAcciones ? <AccionesContrato contrato={contrato} className="mt-4" /> : null}
        </li>
      ))}
    </ul>
  )
}

export default function TablaContratos({ contratos, mostrarAcciones = true }) {
  return (
    <>
      <TablaEscritorio contratos={contratos} mostrarAcciones={mostrarAcciones} />
      <TarjetasMovil contratos={contratos} mostrarAcciones={mostrarAcciones} />
    </>
  )
}

import { EncabezadoPagina } from '../components/ui/EncabezadoPagina.jsx'
import { Aviso } from '../components/ui/Aviso.jsx'
import { EstadoCarga } from '../components/ui/EstadoCarga.jsx'
import { EstadoVacio } from '../components/ui/EstadoVacio.jsx'
import { EstadoError } from '../components/ui/EstadoError.jsx'
import TablaContratos from '../features/TablaContratos.jsx'
import { listarContratos } from '../api/contratosApi.js'
import { useSesion } from '../lib/sesion.jsx'
import { useCarga } from '../lib/useCarga.js'

function ListadoPendientes() {
  const { datos, cargando, error, recargar } = useCarga(() => listarContratos(), [])

  if (cargando) {
    return <EstadoCarga mensaje="Cargando contratos pendientes de revisión" />
  }
  if (error) {
    return (
      <EstadoError
        titulo="No se pudieron cargar los contratos pendientes"
        mensaje={error.message}
        onReintentar={recargar}
      />
    )
  }

  const pendientes = (datos ?? []).filter((contrato) => contrato.estado === 'pendiente_revision')

  if (pendientes.length === 0) {
    return (
      <EstadoVacio
        titulo="No hay contratos pendientes de revisión"
        descripcion="Cuando un contrato generado quede a la espera de revisión, aparecerá en este listado."
      />
    )
  }

  return (
    <>
      <p aria-live="polite" className="mb-4 text-sm text-texto-suave">
        {pendientes.length === 1
          ? '1 contrato pendiente de revisión'
          : `${pendientes.length} contratos pendientes de revisión`}
      </p>
      <TablaContratos contratos={pendientes} mostrarAcciones />
    </>
  )
}

export default function RevisionPage() {
  const { usuario } = useSesion()
  const esProfesional = usuario?.rol === 'profesional'

  return (
    <div>
      <EncabezadoPagina
        titulo="Revisión profesional"
        descripcion="Contratos generados que esperan la revisión de un profesional autorizado. La aprobación se realiza en el detalle de cada contrato."
      />
      {esProfesional ? (
        <ListadoPendientes />
      ) : (
        <Aviso tipo="info" titulo="Sección para el profesional autorizado">
          Esta sección corresponde al profesional autorizado. Su cuenta actual no tiene ese rol, por lo que
          no puede ver ni aprobar los contratos pendientes de revisión.
        </Aviso>
      )}
    </div>
  )
}

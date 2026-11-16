import { useState } from 'react'
import { EncabezadoPagina } from '../components/ui/EncabezadoPagina.jsx'
import { CampoFormulario } from '../components/ui/CampoFormulario.jsx'
import { Boton, clasesBoton } from '../components/ui/Boton.jsx'
import { EstadoCarga } from '../components/ui/EstadoCarga.jsx'
import { EstadoVacio } from '../components/ui/EstadoVacio.jsx'
import { EstadoError } from '../components/ui/EstadoError.jsx'
import TablaContratos from '../features/TablaContratos.jsx'
import { listarContratos } from '../api/contratosApi.js'
import { ESTADOS_CONTRATO } from '../config/campos.js'
import { leerValor } from '../lib/datosContrato.js'
import { Enlace } from '../lib/router.jsx'
import { useCarga } from '../lib/useCarga.js'

const OPCIONES_ESTADO = [
  { valor: '', etiqueta: 'Todos los estados' },
  ...Object.entries(ESTADOS_CONTRATO).map(([valor, definicion]) => ({
    valor,
    etiqueta: definicion.etiqueta
  }))
]

function normalizarTexto(texto) {
  return String(texto ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
}

function contratoCoincideConBusqueda(contrato, busquedaNormalizada) {
  if (busquedaNormalizada === '') {
    return true
  }
  const textosBuscables = [
    contrato.id,
    leerValor(contrato.datos, 'parte_contratante', 'nombre'),
    leerValor(contrato.datos, 'parte_prestadora', 'nombre'),
    contrato.creadoPor
  ]
  return textosBuscables.some((texto) => normalizarTexto(texto).includes(busquedaNormalizada))
}

function textoContador(cantidad) {
  if (cantidad === 1) {
    return '1 contrato encontrado'
  }
  return `${cantidad} contratos encontrados`
}

export default function ContratosPage() {
  const { datos, cargando, error, recargar } = useCarga(() => listarContratos(), [])
  const [busqueda, setBusqueda] = useState('')
  const [estadoFiltro, setEstadoFiltro] = useState('')

  const hayFiltrosActivos = busqueda.trim() !== '' || estadoFiltro !== ''
  const busquedaNormalizada = normalizarTexto(busqueda)

  const contratosFiltrados = (datos ?? []).filter((contrato) => {
    const coincideEstado = estadoFiltro === '' || contrato.estado === estadoFiltro
    return coincideEstado && contratoCoincideConBusqueda(contrato, busquedaNormalizada)
  })

  function limpiarFiltros() {
    setBusqueda('')
    setEstadoFiltro('')
    document.getElementById('busqueda-contratos')?.focus()
  }

  const botonNuevo = (
    <Enlace a="/contratos/nuevo" className={clasesBoton('acento')}>
      Nuevo contrato
    </Enlace>
  )

  function renderizarContenido() {
    if (cargando) {
      return <EstadoCarga mensaje="Cargando contratos" />
    }
    if (error) {
      return (
        <EstadoError
          titulo="No se pudieron cargar los contratos"
          mensaje={error.message}
          onReintentar={recargar}
        />
      )
    }
    if (!datos || datos.length === 0) {
      return (
        <EstadoVacio
          titulo="Todavía no hay contratos"
          descripcion="Cuando se solicite un contrato, aparecerá en este listado."
        >
          {botonNuevo}
        </EstadoVacio>
      )
    }
    return (
      <>
        <p aria-live="polite" className="mb-4 text-sm text-texto-suave">
          {textoContador(contratosFiltrados.length)}
        </p>
        {contratosFiltrados.length === 0 ? (
          <EstadoVacio
            titulo="No hay resultados para la búsqueda"
            descripcion="Ningún contrato coincide con el texto o el estado seleccionados. Modifique los criterios o limpie los filtros."
          >
            <Boton variante="secundario" onClick={limpiarFiltros}>
              Limpiar filtros
            </Boton>
          </EstadoVacio>
        ) : (
          <TablaContratos contratos={contratosFiltrados} mostrarAcciones />
        )}
      </>
    )
  }

  const mostrarFiltros = !cargando && !error && datos && datos.length > 0

  return (
    <div>
      <EncabezadoPagina
        titulo="Contratos"
        descripcion="Consulte los contratos solicitados, su estado y su trazabilidad."
        acciones={botonNuevo}
      />

      {mostrarFiltros ? (
        <form
          role="search"
          aria-label="Buscar y filtrar contratos"
          onSubmit={(evento) => evento.preventDefault()}
          className="mb-6 grid gap-4 rounded-lg border border-papel-200 bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-[2fr_1fr_auto] lg:items-end"
        >
          <CampoFormulario
            id="busqueda-contratos"
            etiqueta="Buscar contratos"
            tipo="text"
            valor={busqueda}
            onChange={(evento) => setBusqueda(evento.target.value)}
            ayuda="Busque por identificador, contratante, prestadora o creador."
            autoComplete="off"
          />
          <CampoFormulario
            id="filtro-estado-contratos"
            etiqueta="Estado"
            tipo="select"
            valor={estadoFiltro}
            onChange={(evento) => setEstadoFiltro(evento.target.value)}
            opciones={OPCIONES_ESTADO}
          />
          {hayFiltrosActivos ? (
            <div className="sm:col-span-2 lg:col-span-1">
              <Boton variante="secundario" onClick={limpiarFiltros}>
                Limpiar filtros
              </Boton>
            </div>
          ) : null}
        </form>
      ) : null}

      {renderizarContenido()}
    </div>
  )
}

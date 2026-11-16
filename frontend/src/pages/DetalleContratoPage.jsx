import { useEffect, useRef, useState } from 'react'
import { ESTADOS_CONTRATO, MODELO_CONTRATO, SECCIONES } from '../config/campos.js'
import { aprobarContrato, exportarContrato, obtenerContrato } from '../api/contratosApi.js'
import { campoVacio } from '../lib/datosContrato.js'
import { formatearFecha, formatearImporte } from '../lib/formato.js'
import { Enlace } from '../lib/router.jsx'
import { usePerfil } from '../lib/perfil.jsx'
import { useCarga } from '../lib/useCarga.js'
import { Aviso } from '../components/ui/Aviso.jsx'
import { Boton, clasesBoton } from '../components/ui/Boton.jsx'
import { EncabezadoPagina } from '../components/ui/EncabezadoPagina.jsx'
import { EstadoCarga } from '../components/ui/EstadoCarga.jsx'
import { EstadoError } from '../components/ui/EstadoError.jsx'
import { EstadoVacio } from '../components/ui/EstadoVacio.jsx'
import { InsigniaEstado } from '../components/ui/InsigniaEstado.jsx'
import { Tarjeta } from '../components/ui/Tarjeta.jsx'
import VistaPreviaContrato from '../features/VistaPreviaContrato.jsx'
import Trazabilidad from '../features/Trazabilidad.jsx'

function formatearValorCampo(campo, valor) {
  if (campoVacio(valor)) {
    return 'Sin definir'
  }
  if (campo.tipo === 'date') {
    return formatearFecha(valor) || String(valor)
  }
  if (campo.clave.startsWith('importe')) {
    return formatearImporte(valor) || String(valor)
  }
  return String(valor)
}

function ResumenContrato({ datos }) {
  return (
    <Tarjeta
      titulo="Resumen del contrato"
      idTitulo="titulo-resumen"
      descripcion="Datos proporcionados, agrupados por sección."
    >
      <div className="space-y-6">
        {SECCIONES.map((seccion) => (
          <section key={seccion.clave} aria-labelledby={`resumen-${seccion.clave}`}>
            <h3 id={`resumen-${seccion.clave}`} className="mb-3 border-b border-papel-200 pb-1 text-lg font-semibold">
              {seccion.titulo}
            </h3>
            <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
              {seccion.campos.map((campo) => {
                const valor = datos?.[seccion.clave]?.[campo.clave]
                const sinDefinir = campoVacio(valor)
                return (
                  <div key={campo.clave} className={campo.tipo === 'textarea' ? 'sm:col-span-2' : ''}>
                    <dt className="text-sm font-semibold text-tinta-900">{campo.etiqueta}</dt>
                    <dd
                      className={`mt-0.5 whitespace-pre-line break-words ${
                        sinDefinir ? 'italic text-texto-suave' : 'text-texto'
                      }`}
                    >
                      {formatearValorCampo(campo, valor)}
                    </dd>
                  </div>
                )
              })}
            </dl>
          </section>
        ))}
      </div>
    </Tarjeta>
  )
}

function mensajeDeError(error, textoPorDefecto) {
  if (error && error.message) {
    return error.message
  }
  return textoPorDefecto
}

function BloqueRevision({ contrato, alActualizar, perfil, setResultado }) {
  const [confirmando, setConfirmando] = useState(false)
  const [aprobando, setAprobando] = useState(false)
  const [errorAprobacion, setErrorAprobacion] = useState('')
  const zonaConfirmacion = useRef(null)
  const botonAprobar = useRef(null)
  const devolverFoco = useRef(false)

  useEffect(() => {
    if (confirmando && zonaConfirmacion.current) {
      zonaConfirmacion.current.focus()
    }
    if (!confirmando && devolverFoco.current && botonAprobar.current) {
      devolverFoco.current = false
      botonAprobar.current.focus()
    }
  }, [confirmando])

  function cancelar() {
    devolverFoco.current = true
    setConfirmando(false)
  }

  async function aprobar() {
    setAprobando(true)
    setErrorAprobacion('')
    try {
      const actualizado = await aprobarContrato(contrato.id, perfil)
      setConfirmando(false)
      setResultado({
        enfocar: true,
        tipo: 'exito',
        titulo: 'Contrato aprobado',
        mensaje: `El contrato ${actualizado.id} fue aprobado por ${actualizado.revision?.profesional ?? 'un profesional autorizado'}.`
      })
      alActualizar(actualizado)
    } catch (error) {
      setErrorAprobacion(mensajeDeError(error, 'No se pudo aprobar el contrato.'))
    } finally {
      setAprobando(false)
    }
  }

  if (contrato.estado === 'borrador') {
    return (
      <div className="space-y-4">
        <Aviso tipo="info" titulo="Contrato en borrador">
          Un borrador no puede revisarse ni exportarse hasta que se genere el contrato.
        </Aviso>
        <Enlace a={`/contratos/nuevo?borrador=${encodeURIComponent(contrato.id)}`} className={clasesBoton('primario', 'w-full')}>
          Continuar editando
        </Enlace>
      </div>
    )
  }

  if (contrato.estado === 'pendiente_revision') {
    if (perfil !== 'profesional') {
      return <Aviso tipo="info" titulo="Pendiente de revisión por un profesional autorizado" />
    }

    return (
      <div className="space-y-4">
        {errorAprobacion ? (
          <Aviso tipo="peligro" titulo="No se pudo aprobar el contrato">
            {errorAprobacion}
          </Aviso>
        ) : null}
        {confirmando ? (
          <div
            ref={zonaConfirmacion}
            tabIndex={-1}
            role="group"
            aria-labelledby="titulo-confirmar-aprobacion"
            className="space-y-4 rounded-md border border-papel-300 bg-papel-50 p-4"
          >
            <p id="titulo-confirmar-aprobacion" className="font-semibold text-tinta-900">
              Confirme la aprobación del contrato {contrato.id}
            </p>
            <p className="text-sm text-texto-suave">
              Al aprobarlo, el contrato queda revisado por un profesional autorizado y habilitado para su exportación.
            </p>
            <div className="flex flex-wrap gap-2">
              <Boton variante="primario" cargando={aprobando} onClick={aprobar}>
                Confirmar aprobación
              </Boton>
              <Boton variante="secundario" disabled={aprobando} onClick={cancelar}>
                Cancelar
              </Boton>
            </div>
          </div>
        ) : (
          <Boton
            ref={botonAprobar}
            variante="primario"
            className="w-full"
            onClick={() => {
              setErrorAprobacion('')
              setResultado(null)
              setConfirmando(true)
            }}
          >
            Aprobar contrato
          </Boton>
        )}
      </div>
    )
  }

  return null
}

function BloqueExportacion({ contrato, setResultado }) {
  const [exportando, setExportando] = useState('')
  const [errorExportacion, setErrorExportacion] = useState('')
  const aprobado = contrato.estado === 'aprobado'

  async function exportar(formato) {
    setExportando(formato)
    setErrorExportacion('')
    setResultado(null)
    try {
      const respuesta = await exportarContrato(contrato.id, formato)
      setResultado({
        tipo: 'info',
        titulo: `Exportación a ${formato.toUpperCase()}`,
        mensaje: respuesta.mensaje
      })
    } catch (error) {
      setErrorExportacion(mensajeDeError(error, 'No se pudo exportar el contrato.'))
    } finally {
      setExportando('')
    }
  }

  return (
    <div className="space-y-3 border-t border-papel-200 pt-4">
      <h3 className="text-lg font-semibold">Exportación</h3>
      {aprobado ? (
        <p id="ayuda-exportacion" className="text-sm text-texto-suave">
          El contrato aprobado puede exportarse a DOCX o PDF.
        </p>
      ) : (
        <p id="ayuda-exportacion" className="text-sm text-texto-suave">
          Solo los contratos aprobados se exportan. Este contrato no está aprobado.
        </p>
      )}
      {errorExportacion ? (
        <Aviso tipo="peligro" titulo="No se pudo exportar el contrato">
          {errorExportacion}
        </Aviso>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Boton
          variante="acento"
          disabled={!aprobado || exportando === 'pdf'}
          cargando={exportando === 'docx'}
          aria-describedby="ayuda-exportacion"
          onClick={() => exportar('docx')}
        >
          Exportar a DOCX
        </Boton>
        <Boton
          variante="acento"
          disabled={!aprobado || exportando === 'docx'}
          cargando={exportando === 'pdf'}
          aria-describedby="ayuda-exportacion"
          onClick={() => exportar('pdf')}
        >
          Exportar a PDF
        </Boton>
      </div>
    </div>
  )
}

function PanelAcciones({ contrato, alActualizar }) {
  const { perfil } = usePerfil()
  const [resultado, setResultado] = useState(null)
  const zonaResultado = useRef(null)

  useEffect(() => {
    if (resultado?.enfocar && zonaResultado.current) {
      zonaResultado.current.focus()
    }
  }, [resultado])

  return (
    <Tarjeta titulo="Acciones" idTitulo="titulo-acciones" descripcion="Opciones disponibles según el estado del contrato y su perfil.">
      <div className="space-y-4">
        {resultado ? (
          <div ref={zonaResultado} tabIndex={-1}>
            <Aviso tipo={resultado.tipo} titulo={resultado.titulo} rol="alert">
              {resultado.mensaje}
            </Aviso>
          </div>
        ) : null}
        <BloqueRevision
          contrato={contrato}
          alActualizar={alActualizar}
          perfil={perfil}
          setResultado={setResultado}
        />
        <BloqueExportacion contrato={contrato} setResultado={setResultado} />
      </div>
    </Tarjeta>
  )
}

function EnlaceVolver() {
  return (
    <nav aria-label="Navegación de la página" className="mb-4">
      <Enlace
        a="/contratos"
        className="inline-flex min-h-11 items-center text-sm font-semibold text-tinta-700 underline underline-offset-4 hover:text-tinta-900"
      >
        Volver al listado
      </Enlace>
    </nav>
  )
}

function describirModelo(codigo) {
  if (codigo === MODELO_CONTRATO.codigo) {
    return `Modelo ${codigo}: ${MODELO_CONTRATO.nombre}`
  }
  return `Modelo ${codigo}`
}

export default function DetalleContratoPage({ parametros }) {
  const identificador = parametros.id
  const { datos, cargando, error, recargar } = useCarga(() => obtenerContrato(identificador), [identificador])
  const [contratoActualizado, setContratoActualizado] = useState(null)

  function reintentar() {
    setContratoActualizado(null)
    recargar()
  }

  if (cargando) {
    return (
      <>
        <EnlaceVolver />
        <EncabezadoPagina titulo={`Contrato ${identificador}`} />
        <EstadoCarga mensaje="Cargando el contrato" />
      </>
    )
  }

  if (error) {
    if (error.codigo === 404) {
      return (
        <>
          <EnlaceVolver />
          <EncabezadoPagina titulo={`Contrato ${identificador}`} />
          <EstadoVacio
            titulo="Contrato no encontrado"
            descripcion="El contrato solicitado no existe o fue eliminado. Verifique el identificador o vuelva al listado."
          >
            <Enlace a="/contratos" className={clasesBoton('primario')}>
              Volver al listado
            </Enlace>
          </EstadoVacio>
        </>
      )
    }
    return (
      <>
        <EnlaceVolver />
        <EncabezadoPagina titulo={`Contrato ${identificador}`} />
        <EstadoError
          titulo="No se pudo cargar el contrato"
          mensaje={mensajeDeError(error, 'Ocurrió un error inesperado. Intente nuevamente.')}
          onReintentar={reintentar}
        />
      </>
    )
  }

  const contrato = contratoActualizado ?? datos
  if (!contrato) {
    return null
  }
  const definicionEstado = ESTADOS_CONTRATO[contrato.estado]

  return (
    <>
      <EnlaceVolver />
      <EncabezadoPagina titulo={`Contrato ${contrato.id}`} descripcion={describirModelo(contrato.modelo)} />
      <div className="-mt-4 mb-8 flex flex-wrap items-center gap-3">
        <InsigniaEstado estado={contrato.estado} />
        {definicionEstado ? <p className="text-texto-suave">{definicionEstado.descripcion}</p> : null}
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-3">
        <div className="lg:col-start-3 lg:row-start-1">
          <PanelAcciones contrato={contrato} alActualizar={setContratoActualizado} />
        </div>
        <div className="min-w-0 space-y-6 lg:col-span-2 lg:col-start-1 lg:row-start-1">
          <ResumenContrato datos={contrato.datos} />
          <VistaPreviaContrato datos={contrato.datos} modelo={contrato.modelo} />
          <Trazabilidad contrato={contrato} />
        </div>
      </div>
    </>
  )
}

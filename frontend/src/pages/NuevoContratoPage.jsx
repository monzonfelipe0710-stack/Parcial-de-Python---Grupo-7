import { useEffect, useMemo, useRef, useState } from 'react'
import { MODELO_CONTRATO, SECCIONES } from '../config/campos.js'
import {
  ErrorApi,
  generarContrato,
  guardarBorrador,
  obtenerContrato
} from '../api/contratosApi.js'
import { Aviso } from '../components/ui/Aviso.jsx'
import { Boton, clasesBoton } from '../components/ui/Boton.jsx'
import { EncabezadoPagina } from '../components/ui/EncabezadoPagina.jsx'
import { EstadoCarga } from '../components/ui/EstadoCarga.jsx'
import { EstadoError } from '../components/ui/EstadoError.jsx'
import { actualizarCampo, crearDatosVacios, detectarCamposFaltantes, normalizarDatos } from '../lib/datosContrato.js'
import { validarContrato } from '../lib/validaciones.js'
import { Enlace, navegar } from '../lib/router.jsx'
import { useCarga } from '../lib/useCarga.js'
import { AsistenteChat } from '../features/AsistenteChat.jsx'
import { FormularioContrato } from '../features/FormularioContrato.jsx'
import { PanelFaltantes, enfocarCampo } from '../features/PanelFaltantes.jsx'

const MENSAJE_ERROR_INESPERADO = 'Ocurrió un error inesperado. Intente nuevamente.'

const TITULO_PAGINA = 'Nuevo contrato'
const DESCRIPCION_PAGINA = `Modelo ${MODELO_CONTRATO.codigo} ${MODELO_CONTRATO.nombre}. Describa el contrato al asistente y complete los datos en el formulario.`

function textoDeError(error) {
  if (error instanceof ErrorApi) {
    return error.message
  }
  return MENSAJE_ERROR_INESPERADO
}

function crearTodasLasClaves() {
  const claves = new Set()
  SECCIONES.forEach((seccion) => {
    seccion.campos.forEach((campo) => {
      claves.add(`${seccion.clave}.${campo.clave}`)
    })
  })
  return claves
}

function buscarCampo(claveSeccion, claveCampo) {
  const seccion = SECCIONES.find((elemento) => elemento.clave === claveSeccion)
  const campo = seccion?.campos.find((elemento) => elemento.clave === claveCampo)
  return { seccion, campo }
}

function armarProblemas(datos) {
  const problemas = []
  detectarCamposFaltantes(datos).forEach((faltante) => {
    problemas.push({
      seccion: faltante.seccion,
      clave: faltante.clave,
      tituloSeccion: faltante.tituloSeccion,
      etiqueta: faltante.etiqueta,
      mensaje: 'Campo obligatorio sin completar.'
    })
  })
  const errores = validarContrato(datos)
  Object.keys(errores).forEach((llave) => {
    const [claveSeccion, claveCampo] = llave.split('.')
    const { seccion, campo } = buscarCampo(claveSeccion, claveCampo)
    if (seccion && campo) {
      problemas.push({
        seccion: seccion.clave,
        clave: campo.clave,
        tituloSeccion: seccion.titulo,
        etiqueta: campo.etiqueta,
        mensaje: errores[llave]
      })
    }
  })
  return problemas
}

function ResumenProblemas({ problemas }) {
  const referencia = useRef(null)

  useEffect(() => {
    if (referencia.current) {
      referencia.current.focus()
    }
  }, [problemas])

  const cantidad = problemas.length
  const textoCantidad =
    cantidad === 1 ? 'Hay 1 campo con problemas.' : `Hay ${cantidad} campos con problemas.`

  return (
    <div ref={referencia} tabIndex={-1}>
      <Aviso tipo="peligro" titulo="No se puede generar el contrato todavía">
        <p>{textoCantidad} Corrija los siguientes campos e intente nuevamente.</p>
        <ul className="mt-2">
          {problemas.map((problema) => (
            <li key={`${problema.seccion}.${problema.clave}.${problema.mensaje}`} className="py-1">
              <button
                type="button"
                onClick={() => enfocarCampo(problema.seccion, problema.clave)}
                className="min-h-11 text-left font-semibold underline underline-offset-2"
              >
                {problema.etiqueta} ({problema.tituloSeccion})
              </button>
              <span className="block">{problema.mensaje}</span>
            </li>
          ))}
        </ul>
      </Aviso>
    </div>
  )
}

function EditorContrato({ contratoInicial }) {
  const [datos, setDatos] = useState(() =>
    contratoInicial ? normalizarDatos(contratoInicial.datos) : crearDatosVacios()
  )
  const [idContrato, setIdContrato] = useState(contratoInicial?.id ?? null)
  const [erroresVisibles, setErroresVisibles] = useState(() => new Set())
  const [guardando, setGuardando] = useState(false)
  const [generando, setGenerando] = useState(false)
  const [mensajeGuardado, setMensajeGuardado] = useState('')
  const [errorAccion, setErrorAccion] = useState('')
  const [problemas, setProblemas] = useState([])
  const montado = useRef(true)

  useEffect(() => {
    montado.current = true
    return () => {
      montado.current = false
    }
  }, [])

  const errores = useMemo(() => validarContrato(datos), [datos])

  function limpiarMensajes() {
    setMensajeGuardado('')
    setErrorAccion('')
    setProblemas([])
  }

  function alCambiar(seccion, clave, valor) {
    setDatos((actuales) => actualizarCampo(actuales, seccion, clave, valor))
    setMensajeGuardado('')
  }

  function alSalirCampo(seccion, clave) {
    const llave = `${seccion}.${clave}`
    setErroresVisibles((actuales) => {
      if (actuales.has(llave)) {
        return actuales
      }
      const nuevas = new Set(actuales)
      nuevas.add(llave)
      return nuevas
    })
  }

  async function manejarGuardarBorrador() {
    limpiarMensajes()
    setGuardando(true)
    try {
      const contrato = await guardarBorrador({ id: idContrato, datos })
      setIdContrato(contrato.id)
      setMensajeGuardado(`Borrador ${contrato.id} guardado correctamente.`)
    } catch (error) {
      setErrorAccion(textoDeError(error))
    } finally {
      setGuardando(false)
    }
  }

  async function manejarGenerarContrato() {
    limpiarMensajes()
    setErroresVisibles(crearTodasLasClaves())
    const problemasDetectados = armarProblemas(datos)
    if (problemasDetectados.length > 0) {
      setProblemas(problemasDetectados)
      return
    }
    setGenerando(true)
    try {
      const contrato = await generarContrato({ id: idContrato, datos })
      if (montado.current) {
        navegar(`/contratos/${contrato.id}`)
      }
    } catch (error) {
      setErrorAccion(textoDeError(error))
      setGenerando(false)
    }
  }

  const botonesAccion = (
    <>
      <Boton
        variante="secundario"
        onClick={manejarGuardarBorrador}
        cargando={guardando}
        disabled={generando}
      >
        {guardando ? 'Guardando borrador' : 'Guardar borrador'}
      </Boton>
      <Boton
        variante="primario"
        onClick={manejarGenerarContrato}
        cargando={generando}
        disabled={guardando}
      >
        {generando ? 'Generando contrato' : 'Generar contrato'}
      </Boton>
    </>
  )

  return (
    <>
      <EncabezadoPagina
        titulo={TITULO_PAGINA}
        descripcion={DESCRIPCION_PAGINA}
        acciones={botonesAccion}
      />

      <div className="mb-6 space-y-4">
        <Aviso tipo="info" titulo="Revisión profesional pendiente">
          El contrato generado queda pendiente de revisión y aprobación por un profesional
          autorizado antes de considerarse definitivo.
        </Aviso>
        {mensajeGuardado ? <Aviso tipo="exito" rol="alert">{mensajeGuardado}</Aviso> : null}
        {errorAccion ? (
          <Aviso tipo="peligro" titulo="No se pudo completar la operación">
            {errorAccion}
          </Aviso>
        ) : null}
        {problemas.length > 0 ? <ResumenProblemas problemas={problemas} /> : null}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] xl:items-start">
        <div className="space-y-6">
          <AsistenteChat datos={datos} alActualizarDatos={setDatos} />
          <PanelFaltantes datos={datos} />
        </div>
        <div className="space-y-6">
          <FormularioContrato
            datos={datos}
            alCambiar={alCambiar}
            errores={errores}
            erroresVisibles={erroresVisibles}
            alSalirCampo={alSalirCampo}
          />
          <div className="flex flex-wrap justify-end gap-2">
            {botonesAccion}
          </div>
        </div>
      </div>
    </>
  )
}

function CargadorBorrador({ idBorrador }) {
  const { datos, cargando, error, recargar } = useCarga(
    () => obtenerContrato(idBorrador),
    [idBorrador]
  )

  if (cargando) {
    return (
      <>
        <EncabezadoPagina titulo={TITULO_PAGINA} descripcion={DESCRIPCION_PAGINA} />
        <EstadoCarga mensaje="Cargando el borrador" />
      </>
    )
  }

  if (error) {
    return (
      <>
        <EncabezadoPagina titulo={TITULO_PAGINA} descripcion={DESCRIPCION_PAGINA} />
        <EstadoError
          titulo="No se pudo cargar el borrador"
          mensaje={textoDeError(error)}
          onReintentar={recargar}
        />
      </>
    )
  }

  if (datos.estado !== 'borrador') {
    return (
      <>
        <EncabezadoPagina titulo={TITULO_PAGINA} descripcion={DESCRIPCION_PAGINA} />
        <Aviso tipo="alerta" titulo="Este contrato ya no es un borrador">
          <p>
            El contrato {datos.id} ya fue generado y no admite cambios desde este formulario.
            Consulte su detalle para ver los datos y el estado de la revisión.
          </p>
          <div className="mt-3">
            <Enlace a={`/contratos/${datos.id}`} className={clasesBoton('secundario')}>
              Ver detalle del contrato
            </Enlace>
          </div>
        </Aviso>
      </>
    )
  }

  return <EditorContrato contratoInicial={datos} />
}

export default function NuevoContratoPage({ consulta }) {
  const idBorrador = consulta.get('borrador')

  if (idBorrador) {
    return <CargadorBorrador key={idBorrador} idBorrador={idBorrador} />
  }

  return <EditorContrato contratoInicial={null} />
}

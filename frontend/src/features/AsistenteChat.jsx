import { useEffect, useRef, useState } from 'react'
import { MODELO_CONTRATO } from '../config/campos.js'
import { enviarMensajeAsistente } from '../api/contratosApi.js'
import { Aviso } from '../components/ui/Aviso.jsx'
import { Boton } from '../components/ui/Boton.jsx'
import { CampoFormulario } from '../components/ui/CampoFormulario.jsx'
import { Tarjeta } from '../components/ui/Tarjeta.jsx'

const MENSAJE_INICIAL = {
  id: 0,
  rol: 'asistente',
  texto: `El único modelo disponible es ${MODELO_CONTRATO.codigo}, ${MODELO_CONTRATO.nombre}. Describa en lenguaje natural el contrato que necesita.`
}

const MENSAJE_ERROR_GENERICO = 'No se pudo obtener la respuesta del asistente.'

function ordenarParaApi(mensajes) {
  return mensajes.map((mensaje) => ({ rol: mensaje.rol, texto: mensaje.texto }))
}

function BurbujaMensaje({ mensaje }) {
  const esUsuario = mensaje.rol === 'usuario'
  return (
    <div className={`flex ${esUsuario ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[90%] rounded-lg border px-4 py-3 text-sm ${
          esUsuario
            ? 'border-tinta-900 bg-tinta-900 text-white'
            : 'border-papel-300 bg-papel-100 text-texto'
        }`}
      >
        <p className={`mb-1 text-xs font-semibold ${esUsuario ? 'text-papel-200' : 'text-texto-suave'}`}>
          {esUsuario ? 'Usted' : 'Asistente'}
        </p>
        <p className="whitespace-pre-wrap break-words">{mensaje.texto}</p>
      </div>
    </div>
  )
}

export function AsistenteChat({ datos }) {
  const [mensajes, setMensajes] = useState([MENSAJE_INICIAL])
  const [texto, setTexto] = useState('')
  const [escribiendo, setEscribiendo] = useState(false)
  const [envioFallido, setEnvioFallido] = useState(null)
  const contadorMensajes = useRef(1)
  const contenedorLog = useRef(null)

  useEffect(() => {
    const contenedor = contenedorLog.current
    if (contenedor) {
      contenedor.scrollTop = contenedor.scrollHeight
    }
  }, [mensajes, escribiendo])

  function siguienteId() {
    const id = contadorMensajes.current
    contadorMensajes.current += 1
    return id
  }

  async function solicitarRespuesta(mensajeUsuario, historial) {
    setEscribiendo(true)
    setEnvioFallido(null)
    try {
      const resultado = await enviarMensajeAsistente({
        mensaje: mensajeUsuario,
        historial: ordenarParaApi(historial),
        datos
      })
      setMensajes((anteriores) => [
        ...anteriores,
        { id: siguienteId(), rol: 'asistente', texto: resultado.respuesta }
      ])
    } catch (error) {
      setEnvioFallido({
        mensaje: error?.message || MENSAJE_ERROR_GENERICO,
        mensajeUsuario,
        historial
      })
    } finally {
      setEscribiendo(false)
    }
  }

  function enviar() {
    const mensajeUsuario = texto.trim()
    if (!mensajeUsuario || escribiendo) {
      return
    }
    const historial = [...mensajes, { id: siguienteId(), rol: 'usuario', texto: mensajeUsuario }]
    setMensajes(historial)
    setTexto('')
    solicitarRespuesta(mensajeUsuario, historial)
  }

  function reenviar() {
    if (!envioFallido || escribiendo) {
      return
    }
    solicitarRespuesta(envioFallido.mensajeUsuario, envioFallido.historial)
  }

  function alPresionarTecla(evento) {
    if (evento.key === 'Enter' && !evento.shiftKey && !evento.nativeEvent.isComposing) {
      evento.preventDefault()
      enviar()
    }
  }

  return (
    <Tarjeta
      titulo="Asistente de contratos"
      descripcion="Solicite el contrato en lenguaje natural."
      idTitulo="titulo-asistente"
    >
      <Aviso tipo="info">
        Asistente en modo simulado: no interpreta el texto todavía; complete los datos en el
        formulario.
      </Aviso>

      <div
        ref={contenedorLog}
        role="log"
        aria-live="polite"
        aria-label="Conversación con el asistente"
        tabIndex={0}
        className="mt-4 max-h-96 min-h-40 space-y-3 overflow-y-auto rounded-md border border-papel-200 bg-papel-50 p-3"
      >
        {mensajes.map((mensaje) => (
          <BurbujaMensaje key={mensaje.id} mensaje={mensaje} />
        ))}
        {escribiendo ? (
          <p className="px-1 text-sm italic text-texto-suave">El asistente está escribiendo</p>
        ) : null}
      </div>

      {envioFallido ? (
        <div
          role="alert"
          className="mt-3 rounded-md border-l-4 border-peligro-700 bg-peligro-100 px-4 py-3 text-sm text-peligro-700"
        >
          <p className="font-semibold">No se pudo enviar el mensaje</p>
          <p className="mt-1">{envioFallido.mensaje}</p>
          <div className="mt-3">
            <Boton variante="secundario" onClick={reenviar} disabled={escribiendo}>
              Reenviar mensaje
            </Boton>
          </div>
        </div>
      ) : null}

      <div className="mt-4">
        <CampoFormulario
          id="mensaje-asistente"
          etiqueta="Mensaje para el asistente"
          tipo="textarea"
          filas={3}
          valor={texto}
          onChange={(evento) => setTexto(evento.target.value)}
          onKeyDown={alPresionarTecla}
          ayuda="Presione Enter para enviar. Presione Mayúsculas y Enter para insertar un salto de línea."
        />
        <div className="mt-3 flex justify-end">
          <Boton
            variante="primario"
            onClick={enviar}
            cargando={escribiendo}
            aria-disabled={texto.trim() === '' || undefined}
          >
            Enviar
          </Boton>
        </div>
      </div>
    </Tarjeta>
  )
}

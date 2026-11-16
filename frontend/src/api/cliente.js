const URL_CONFIGURADA = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'
export const URL_API = URL_CONFIGURADA.replace(/\/+$/, '')

export class ErrorApi extends Error {
  constructor(mensaje, codigo = 500, detalle = null) {
    super(mensaje)
    this.name = 'ErrorApi'
    this.codigo = codigo
    this.detalle = detalle
  }
}

async function ejecutarFetch(ruta, opciones = {}, tiempoLimite = 15000) {
  const controlador = new AbortController()
  const temporizador = setTimeout(() => controlador.abort(), tiempoLimite)
  const encabezados = new Headers(opciones.headers ?? {})
  const opcionesFetch = { ...opciones, headers: encabezados, signal: controlador.signal }

  if (opciones.body && !encabezados.has('Content-Type')) {
    encabezados.set('Content-Type', 'application/json')
  }

  try {
    const respuesta = await fetch(`${URL_API}${ruta}`, opcionesFetch)
    if (!respuesta.ok) {
      let contenido
      try {
        contenido = await respuesta.json()
      } catch {
        contenido = null
      }
      const detalle = contenido?.detail ?? contenido
      const mensaje =
        typeof detalle === 'string'
          ? detalle
          : detalle?.message ?? `El backend respondió con el código ${respuesta.status}.`
      throw new ErrorApi(mensaje, respuesta.status, detalle)
    }

    return respuesta
  } catch (error) {
    if (error instanceof ErrorApi) {
      throw error
    }
    if (error?.name === 'AbortError') {
      throw new ErrorApi('Se agotó el tiempo de espera del backend.', 408)
    }
    throw new ErrorApi('No se pudo conectar con el backend.', 503, error)
  } finally {
    clearTimeout(temporizador)
  }
}

export async function solicitarApi(ruta, opciones = {}) {
  const { tiempoLimite = 15000, ...opcionesFetch } = opciones
  const respuesta = await ejecutarFetch(ruta, opcionesFetch, tiempoLimite)
  if (respuesta.status === 204) {
    return null
  }
  return respuesta.json()
}

export async function descargarArchivo(ruta, nombreArchivo) {
  const respuesta = await ejecutarFetch(ruta, {}, 30000)
  const archivo = await respuesta.blob()
  const urlTemporal = window.URL.createObjectURL(archivo)
  const enlace = document.createElement('a')
  enlace.href = urlTemporal
  enlace.download = nombreArchivo
  document.body.appendChild(enlace)
  enlace.click()
  enlace.remove()
  setTimeout(() => window.URL.revokeObjectURL(urlTemporal), 0)
  return nombreArchivo
}

export async function consultarEstadoBackend() {
  return solicitarApi('/api/estado', { tiempoLimite: 4000 })
}

export const URL_API = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

export async function consultarEstadoBackend() {
  const controlador = new AbortController()
  const temporizador = setTimeout(() => controlador.abort(), 4000)
  try {
    const respuesta = await fetch(`${URL_API}/api/estado`, { signal: controlador.signal })
    if (!respuesta.ok) {
      throw new Error(`El backend respondió con el código ${respuesta.status}.`)
    }
    return await respuesta.json()
  } finally {
    clearTimeout(temporizador)
  }
}

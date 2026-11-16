import { descargarArchivo, ErrorApi, solicitarApi } from './cliente.js'

export { ErrorApi }

function codificarId(id) {
  return encodeURIComponent(id)
}

export async function obtenerModelo() {
  return solicitarApi('/api/modelo')
}

export async function listarContratos() {
  return solicitarApi('/api/contratos')
}

export async function obtenerContrato(id) {
  return solicitarApi(`/api/contratos/${codificarId(id)}`)
}

export async function guardarBorrador({ id, datos }) {
  const cuerpo = JSON.stringify({ datos })
  if (id) {
    return solicitarApi(`/api/contratos/${codificarId(id)}/borrador`, {
      method: 'PUT',
      body: cuerpo
    })
  }
  return solicitarApi('/api/contratos/borradores', {
    method: 'POST',
    body: cuerpo
  })
}

export async function generarContrato({ id, datos }) {
  const cuerpo = JSON.stringify({ datos })
  if (id) {
    return solicitarApi(`/api/contratos/${codificarId(id)}/generar`, {
      method: 'POST',
      body: cuerpo
    })
  }
  return solicitarApi('/api/contratos/generar', {
    method: 'POST',
    body: cuerpo
  })
}

export async function aprobarContrato(id, perfil = 'empleado') {
  return solicitarApi(`/api/contratos/${codificarId(id)}/aprobar`, {
    method: 'POST',
    headers: { 'X-Perfil': perfil }
  })
}

export async function exportarContrato(id, formato) {
  const consulta = new URLSearchParams({ formato })
  const nombreArchivo = `contrato-${id}.${formato}`
  await descargarArchivo(
    `/api/contratos/${codificarId(id)}/exportar?${consulta.toString()}`,
    nombreArchivo
  )
  return {
    formato,
    simulado: false,
    mensaje: `El contrato se descargó en formato ${formato.toUpperCase()}.`
  }
}

export async function enviarMensajeAsistente({ mensaje, historial, datos }) {
  return solicitarApi(
    '/api/asistente/mensaje',
    {
      method: 'POST',
      body: JSON.stringify({ mensaje, historial, datos }),
      tiempoLimite: 270000
    }
  )
}

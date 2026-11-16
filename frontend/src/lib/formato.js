const MESES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre'
]

function partesFecha(iso) {
  const coincidencia = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso ?? ''))
  if (!coincidencia) {
    return null
  }
  return {
    anio: Number(coincidencia[1]),
    mes: Number(coincidencia[2]),
    dia: Number(coincidencia[3])
  }
}

export function formatearFecha(iso) {
  const partes = partesFecha(iso)
  if (!partes) {
    return ''
  }
  const dia = String(partes.dia).padStart(2, '0')
  const mes = String(partes.mes).padStart(2, '0')
  return `${dia}/${mes}/${partes.anio}`
}

export function formatearFechaLarga(iso) {
  const partes = partesFecha(iso)
  if (!partes) {
    return ''
  }
  return `${partes.dia} de ${MESES[partes.mes - 1]} de ${partes.anio}`
}

export function formatearFechaHora(iso) {
  const fecha = new Date(iso)
  if (Number.isNaN(fecha.getTime())) {
    return ''
  }
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(fecha)
}

export function formatearImporte(valor) {
  const numero = Number(valor)
  if (valor === '' || valor === null || valor === undefined || !Number.isFinite(numero)) {
    return ''
  }
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 2
  }).format(numero)
}

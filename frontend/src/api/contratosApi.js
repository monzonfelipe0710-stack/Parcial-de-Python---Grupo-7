import { MODELO_CONTRATO } from '../config/campos.js'
import { CONTRATOS_INICIALES, USUARIOS_SIMULADOS } from '../mocks/datosSimulados.js'
import { detectarCamposFaltantes, normalizarDatos } from '../lib/datosContrato.js'
import { validarContrato } from '../lib/validaciones.js'

const CLAVE_ALMACEN = 'contratos_simulados_v1'

export class ErrorApi extends Error {
  constructor(mensaje, codigo = 500, detalle = null) {
    super(mensaje)
    this.name = 'ErrorApi'
    this.codigo = codigo
    this.detalle = detalle
  }
}

export function modoSimulacion() {
  const consulta = window.location.hash.split('?')[1] ?? ''
  return new URLSearchParams(consulta).get('simular') ?? ''
}

function esperar() {
  const milisegundos = modoSimulacion() === 'lento' ? 2500 : 450
  return new Promise((resolver) => setTimeout(resolver, milisegundos))
}

async function iniciarLlamada() {
  await esperar()
  if (modoSimulacion() === 'error') {
    throw new ErrorApi('No se pudo conectar con el servicio de contratos.', 503)
  }
}

function copiar(valor) {
  return JSON.parse(JSON.stringify(valor))
}

function cargarAlmacen() {
  try {
    const guardado = window.localStorage.getItem(CLAVE_ALMACEN)
    if (guardado) {
      return JSON.parse(guardado)
    }
  } catch {
    return copiar(CONTRATOS_INICIALES)
  }
  return copiar(CONTRATOS_INICIALES)
}

function guardarAlmacen(contratos) {
  try {
    window.localStorage.setItem(CLAVE_ALMACEN, JSON.stringify(contratos))
  } catch {
    return
  }
}

function ahora() {
  return new Date().toISOString()
}

function generarId(contratos) {
  const mayor = contratos.reduce((acumulado, contrato) => {
    const numero = Number(contrato.id.replace('CTR-', ''))
    return Number.isFinite(numero) && numero > acumulado ? numero : acumulado
  }, 0)
  return `CTR-${String(mayor + 1).padStart(3, '0')}`
}

export function restablecerDatosSimulados() {
  guardarAlmacen(copiar(CONTRATOS_INICIALES))
}

export async function obtenerModelo() {
  await iniciarLlamada()
  return { ...MODELO_CONTRATO }
}

export async function listarContratos() {
  await iniciarLlamada()
  if (modoSimulacion() === 'vacio') {
    return []
  }
  return cargarAlmacen().sort((a, b) => b.actualizadoEn.localeCompare(a.actualizadoEn))
}

export async function obtenerContrato(id) {
  await iniciarLlamada()
  const contrato = cargarAlmacen().find((elemento) => elemento.id === id)
  if (!contrato) {
    throw new ErrorApi('No se encontró el contrato solicitado.', 404)
  }
  return contrato
}

export async function guardarBorrador({ id, datos }) {
  await iniciarLlamada()
  const contratos = cargarAlmacen()
  const datosNormalizados = normalizarDatos(datos)
  const usuario = USUARIOS_SIMULADOS.empleado
  const existente = id ? contratos.find((elemento) => elemento.id === id) : null

  if (existente) {
    if (existente.estado !== 'borrador') {
      throw new ErrorApi('Solo se pueden modificar contratos en estado borrador.', 409)
    }
    existente.datos = datosNormalizados
    existente.actualizadoEn = ahora()
    existente.historial.push({
      fecha: existente.actualizadoEn,
      usuario,
      accion: 'Borrador guardado'
    })
    guardarAlmacen(contratos)
    return copiar(existente)
  }

  const momento = ahora()
  const nuevo = {
    id: generarId(contratos),
    modelo: MODELO_CONTRATO.codigo,
    estado: 'borrador',
    creadoPor: usuario,
    creadoEn: momento,
    actualizadoEn: momento,
    datos: datosNormalizados,
    revision: null,
    historial: [{ fecha: momento, usuario, accion: 'Borrador creado' }]
  }
  contratos.push(nuevo)
  guardarAlmacen(contratos)
  return copiar(nuevo)
}

export async function generarContrato({ id, datos }) {
  await iniciarLlamada()
  const datosNormalizados = normalizarDatos(datos)
  const faltantes = detectarCamposFaltantes(datosNormalizados)
  if (faltantes.length > 0) {
    throw new ErrorApi('Faltan datos obligatorios para generar el contrato.', 422, { faltantes })
  }
  const errores = validarContrato(datosNormalizados)
  if (Object.keys(errores).length > 0) {
    throw new ErrorApi('Los datos tienen inconsistencias.', 422, { errores })
  }

  const contratos = cargarAlmacen()
  const usuario = USUARIOS_SIMULADOS.empleado
  const momento = ahora()
  let contrato = id ? contratos.find((elemento) => elemento.id === id) : null

  if (contrato && contrato.estado !== 'borrador') {
    throw new ErrorApi('El contrato ya fue generado.', 409)
  }

  if (!contrato) {
    contrato = {
      id: generarId(contratos),
      modelo: MODELO_CONTRATO.codigo,
      estado: 'borrador',
      creadoPor: usuario,
      creadoEn: momento,
      actualizadoEn: momento,
      datos: datosNormalizados,
      revision: null,
      historial: [{ fecha: momento, usuario, accion: 'Datos del contrato cargados como borrador' }]
    }
    contratos.push(contrato)
  }

  contrato.datos = datosNormalizados
  contrato.estado = 'pendiente_revision'
  contrato.actualizadoEn = momento
  contrato.historial.push({
    fecha: momento,
    usuario,
    accion: 'Contrato generado y enviado a revisión'
  })
  guardarAlmacen(contratos)
  return copiar(contrato)
}

export async function aprobarContrato(id) {
  await iniciarLlamada()
  const contratos = cargarAlmacen()
  const contrato = contratos.find((elemento) => elemento.id === id)
  if (!contrato) {
    throw new ErrorApi('No se encontró el contrato solicitado.', 404)
  }
  if (contrato.estado !== 'pendiente_revision') {
    throw new ErrorApi('Solo se pueden aprobar contratos pendientes de revisión.', 409)
  }
  const momento = ahora()
  const profesional = USUARIOS_SIMULADOS.profesional
  contrato.estado = 'aprobado'
  contrato.actualizadoEn = momento
  contrato.revision = { profesional, fecha: momento }
  contrato.historial.push({
    fecha: momento,
    usuario: profesional,
    accion: 'Contrato aprobado por profesional autorizado'
  })
  guardarAlmacen(contratos)
  return copiar(contrato)
}

export async function exportarContrato(id, formato) {
  await iniciarLlamada()
  const contrato = cargarAlmacen().find((elemento) => elemento.id === id)
  if (!contrato) {
    throw new ErrorApi('No se encontró el contrato solicitado.', 404)
  }
  if (contrato.estado !== 'aprobado') {
    throw new ErrorApi('Solo se pueden exportar contratos aprobados.', 409)
  }
  return {
    formato,
    simulado: true,
    mensaje: `Exportación a ${formato.toUpperCase()} simulada. El archivo real lo generará el backend.`
  }
}

export async function enviarMensajeAsistente({ datos }) {
  await iniciarLlamada()
  const faltantes = detectarCamposFaltantes(normalizarDatos(datos))
  if (faltantes.length === 0) {
    return {
      respuesta:
        'Los datos necesarios están completos. Revise las validaciones y genere el contrato para enviarlo a revisión.',
      faltantes: []
    }
  }
  const porSeccion = {}
  faltantes.forEach((faltante) => {
    porSeccion[faltante.tituloSeccion] = porSeccion[faltante.tituloSeccion] ?? []
    porSeccion[faltante.tituloSeccion].push(faltante.etiqueta)
  })
  const lineas = Object.keys(porSeccion).map(
    (titulo) => `${titulo}: ${porSeccion[titulo].join(', ')}.`
  )
  return {
    respuesta: `Todavía faltan datos obligatorios. ${lineas.join(' ')}`,
    faltantes
  }
}

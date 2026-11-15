import { SECCIONES } from '../config/campos.js'
import { campoVacio } from './datosContrato.js'

function soloDigitos(valor) {
  return String(valor).replace(/[\s.\-]/g, '')
}

function esFechaValida(valor) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor ?? '')) {
    return false
  }
  const [anio, mes, dia] = valor.split('-').map(Number)
  const fecha = new Date(Date.UTC(anio, mes - 1, dia))
  return (
    fecha.getUTCFullYear() === anio &&
    fecha.getUTCMonth() === mes - 1 &&
    fecha.getUTCDate() === dia
  )
}

function validarDocumentoPersonaOEmpresa(valor) {
  const digitos = soloDigitos(valor)
  if (!/^\d+$/.test(digitos)) {
    return 'Use solo números, puntos o guiones.'
  }
  if (digitos.length === 7 || digitos.length === 8 || digitos.length === 11) {
    return ''
  }
  return 'Debe tener 7 u 8 dígitos (DNI) o 11 dígitos (CUIT).'
}

function validarDni(valor) {
  const digitos = soloDigitos(valor)
  if (!/^\d+$/.test(digitos)) {
    return 'Use solo números o puntos.'
  }
  if (digitos.length === 7 || digitos.length === 8) {
    return ''
  }
  return 'Debe tener 7 u 8 dígitos.'
}

function validarFecha(valor) {
  return esFechaValida(valor) ? '' : 'Ingrese una fecha válida.'
}

function validarImporte(valor) {
  const numero = Number(valor)
  if (!Number.isFinite(numero)) {
    return 'Ingrese un importe numérico.'
  }
  if (numero <= 0) {
    return 'El importe debe ser mayor que cero.'
  }
  return ''
}

function validarCantidadCuotas(valor) {
  const numero = Number(valor)
  if (!Number.isInteger(numero)) {
    return 'Ingrese un número entero.'
  }
  if (numero < 1) {
    return 'Debe haber al menos una cuota.'
  }
  return ''
}

const VALIDADORES_POR_CAMPO = {
  'contrato.fecha_celebracion': validarFecha,
  'parte_contratante.documento': validarDocumentoPersonaOEmpresa,
  'parte_contratante.documento_representante': validarDni,
  'parte_prestadora.documento': validarDocumentoPersonaOEmpresa,
  'plazo.fecha_inicio': validarFecha,
  'plazo.fecha_fin': validarFecha,
  'honorarios.importe_total': validarImporte,
  'honorarios.cantidad_cuotas': validarCantidadCuotas,
  'honorarios.importe_cuota': validarImporte
}

export function validarCampo(seccion, clave, valor) {
  if (campoVacio(valor)) {
    return ''
  }
  const validador = VALIDADORES_POR_CAMPO[`${seccion}.${clave}`]
  return validador ? validador(String(valor).trim()) : ''
}

export function validarCoherencia(datos) {
  const errores = {}
  const inicio = datos?.plazo?.fecha_inicio
  const fin = datos?.plazo?.fecha_fin
  if (esFechaValida(inicio) && esFechaValida(fin) && fin <= inicio) {
    errores['plazo.fecha_fin'] =
      'La fecha de finalización debe ser posterior a la fecha de inicio.'
  }

  const honorarios = datos?.honorarios ?? {}
  const total = Number(honorarios.importe_total)
  const cuotas = Number(honorarios.cantidad_cuotas)
  const importeCuota = Number(honorarios.importe_cuota)
  const hayTresDatos =
    !campoVacio(honorarios.importe_total) &&
    !campoVacio(honorarios.cantidad_cuotas) &&
    !campoVacio(honorarios.importe_cuota)
  const datosNumericosValidos =
    hayTresDatos && total > 0 && Number.isInteger(cuotas) && cuotas >= 1 && importeCuota > 0
  if (datosNumericosValidos) {
    const diferencia = Math.abs(cuotas * importeCuota - total)
    if (Math.round(diferencia * 100) > 1) {
      errores['honorarios.importe_cuota'] =
        'La cantidad de cuotas por el importe de cada cuota no coincide con el importe total.'
    }
  }
  return errores
}

export function validarContrato(datos) {
  const errores = {}
  SECCIONES.forEach((seccion) => {
    seccion.campos.forEach((campo) => {
      const mensaje = validarCampo(
        seccion.clave,
        campo.clave,
        datos?.[seccion.clave]?.[campo.clave]
      )
      if (mensaje) {
        errores[`${seccion.clave}.${campo.clave}`] = mensaje
      }
    })
  })
  const coherencia = validarCoherencia(datos)
  Object.keys(coherencia).forEach((clave) => {
    if (!errores[clave]) {
      errores[clave] = coherencia[clave]
    }
  })
  return errores
}

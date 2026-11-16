import { SECCIONES } from '../config/campos.js'

export function crearDatosVacios() {
  const datos = {}
  SECCIONES.forEach((seccion) => {
    datos[seccion.clave] = {}
    seccion.campos.forEach((campo) => {
      datos[seccion.clave][campo.clave] = ''
    })
  })
  return datos
}

export function leerValor(datos, seccion, clave) {
  const valor = datos?.[seccion]?.[clave]
  if (valor === undefined || valor === null) {
    return ''
  }
  return String(valor)
}

export function actualizarCampo(datos, seccion, clave, valor) {
  return {
    ...datos,
    [seccion]: {
      ...datos[seccion],
      [clave]: valor
    }
  }
}

export function normalizarDatos(datos) {
  const base = crearDatosVacios()
  SECCIONES.forEach((seccion) => {
    seccion.campos.forEach((campo) => {
      base[seccion.clave][campo.clave] = leerValor(datos, seccion.clave, campo.clave)
    })
  })
  return base
}

export function campoVacio(valor) {
  return valor === undefined || valor === null || String(valor).trim() === ''
}

export function detectarCamposFaltantes(datos) {
  const faltantes = []
  SECCIONES.forEach((seccion) => {
    seccion.campos.forEach((campo) => {
      if (campoVacio(datos?.[seccion.clave]?.[campo.clave])) {
        faltantes.push({
          seccion: seccion.clave,
          tituloSeccion: seccion.titulo,
          clave: campo.clave,
          etiqueta: campo.etiqueta
        })
      }
    })
  })
  return faltantes
}

export function contarCampos(datos) {
  let total = 0
  let completos = 0
  SECCIONES.forEach((seccion) => {
    seccion.campos.forEach((campo) => {
      total += 1
      if (!campoVacio(datos?.[seccion.clave]?.[campo.clave])) {
        completos += 1
      }
    })
  })
  return { total, completos }
}

export function idCampo(seccion, clave) {
  return `campo-${seccion}-${clave}`
}

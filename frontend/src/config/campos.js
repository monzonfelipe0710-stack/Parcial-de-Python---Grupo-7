export const MODELO_CONTRATO = {
  codigo: 'CONT-001',
  nombre: 'Contrato de Prestación de Servicios Profesionales'
}

export const SECCIONES = [
  {
    clave: 'contrato',
    titulo: 'Datos del contrato',
    campos: [
      { clave: 'ciudad', etiqueta: 'Ciudad de celebración', tipo: 'text' },
      { clave: 'fecha_celebracion', etiqueta: 'Fecha de celebración', tipo: 'date' }
    ]
  },
  {
    clave: 'parte_contratante',
    titulo: 'Parte contratante',
    campos: [
      { clave: 'nombre', etiqueta: 'Razón social o nombre', tipo: 'text' },
      {
        clave: 'documento',
        etiqueta: 'CUIT o DNI',
        tipo: 'text',
        ayuda: 'DNI de 7 u 8 dígitos o CUIT de 11 dígitos.'
      },
      { clave: 'domicilio', etiqueta: 'Domicilio', tipo: 'text' },
      { clave: 'representante', etiqueta: 'Nombre y apellido del representante', tipo: 'text' },
      {
        clave: 'documento_representante',
        etiqueta: 'DNI del representante',
        tipo: 'text',
        ayuda: 'DNI de 7 u 8 dígitos.'
      },
      { clave: 'cargo_representante', etiqueta: 'Cargo del representante', tipo: 'text' }
    ]
  },
  {
    clave: 'parte_prestadora',
    titulo: 'Parte prestadora',
    campos: [
      { clave: 'nombre', etiqueta: 'Nombre y apellido o razón social', tipo: 'text' },
      {
        clave: 'documento',
        etiqueta: 'DNI o CUIT',
        tipo: 'text',
        ayuda: 'DNI de 7 u 8 dígitos o CUIT de 11 dígitos.'
      },
      { clave: 'domicilio', etiqueta: 'Domicilio', tipo: 'text' }
    ]
  },
  {
    clave: 'objeto',
    titulo: 'Objeto del contrato',
    campos: [
      {
        clave: 'servicio',
        etiqueta: 'Descripción de los servicios profesionales',
        tipo: 'textarea'
      }
    ]
  },
  {
    clave: 'plazo',
    titulo: 'Plazo de vigencia',
    campos: [
      { clave: 'fecha_inicio', etiqueta: 'Fecha de inicio', tipo: 'date' },
      { clave: 'fecha_fin', etiqueta: 'Fecha de finalización', tipo: 'date' }
    ]
  },
  {
    clave: 'honorarios',
    titulo: 'Honorarios y forma de pago',
    campos: [
      { clave: 'importe_total', etiqueta: 'Importe total', tipo: 'number', ayuda: 'En pesos.' },
      { clave: 'cantidad_cuotas', etiqueta: 'Cantidad de cuotas', tipo: 'number' },
      {
        clave: 'importe_cuota',
        etiqueta: 'Importe de cada cuota',
        tipo: 'number',
        ayuda: 'En pesos.'
      },
      { clave: 'vencimiento', etiqueta: 'Vencimiento de las cuotas', tipo: 'text' }
    ]
  }
]

export const ESTADOS_CONTRATO = {
  borrador: { etiqueta: 'Borrador', descripcion: 'Datos en recopilación' },
  pendiente_revision: {
    etiqueta: 'Pendiente de revisión',
    descripcion: 'Generado, a la espera de un profesional autorizado'
  },
  aprobado: {
    etiqueta: 'Aprobado',
    descripcion: 'Revisado y aprobado por un profesional autorizado'
  }
}

export const PERFILES = {
  empleado: { etiqueta: 'Empleado' },
  profesional: { etiqueta: 'Profesional autorizado' }
}

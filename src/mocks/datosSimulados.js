export const CONTRATOS_INICIALES = [
  {
    id: 'CTR-001',
    modelo: 'CONT-001',
    estado: 'aprobado',
    creadoPor: 'Carolina Suárez',
    creadoEn: '2026-10-02T09:15:00',
    actualizadoEn: '2026-10-05T16:40:00',
    datos: {
      contrato: { ciudad: 'Córdoba', fecha_celebracion: '2026-10-02' },
      parte_contratante: {
        nombre: 'Constructora Ribera S.A.',
        documento: '30-70123456-5',
        domicilio: 'Av. Colón 1020, Córdoba',
        representante: 'Julián Andrés Paredes',
        documento_representante: '27.345.120',
        cargo_representante: 'Presidente'
      },
      parte_prestadora: {
        nombre: 'Valeria Noemí Sosa',
        documento: '31.220.457',
        domicilio: 'Calle Belgrano 310, Córdoba'
      },
      objeto: {
        servicio:
          'Asesoramiento contable mensual y preparación de declaraciones impositivas de la contratante.'
      },
      plazo: { fecha_inicio: '2026-11-01', fecha_fin: '2027-04-30' },
      honorarios: {
        importe_total: '2400000',
        cantidad_cuotas: '6',
        importe_cuota: '400000',
        vencimiento: 'Hasta el día 10 de cada mes'
      }
    },
    revision: {
      profesional: 'Paula Herrera',
      fecha: '2026-10-05T16:40:00'
    },
    historial: [
      { fecha: '2026-10-02T09:15:00', usuario: 'Carolina Suárez', accion: 'Datos del contrato cargados como borrador' },
      { fecha: '2026-10-02T10:05:00', usuario: 'Carolina Suárez', accion: 'Contrato generado a partir del modelo CONT-001' },
      { fecha: '2026-10-05T16:40:00', usuario: 'Paula Herrera', accion: 'Contrato aprobado por profesional autorizado' }
    ]
  },
  {
    id: 'CTR-002',
    modelo: 'CONT-001',
    estado: 'pendiente_revision',
    creadoPor: 'Carolina Suárez',
    creadoEn: '2026-11-03T11:00:00',
    actualizadoEn: '2026-11-03T11:50:00',
    datos: {
      contrato: { ciudad: 'Mendoza', fecha_celebracion: '2026-11-03' },
      parte_contratante: {
        nombre: 'Bodega Los Álamos S.R.L.',
        documento: '30-68451203-9',
        domicilio: 'Ruta 40 km 12, Luján de Cuyo, Mendoza',
        representante: 'Sergio Daniel Molina',
        documento_representante: '24.118.902',
        cargo_representante: 'Socio gerente'
      },
      parte_prestadora: {
        nombre: 'Estudio Técnico Andino S.A.',
        documento: '30-71560984-2',
        domicilio: 'Calle San Martín 455, Mendoza'
      },
      objeto: {
        servicio:
          'Relevamiento y documentación de procesos administrativos de la contratante, con entrega de un informe final.'
      },
      plazo: { fecha_inicio: '2026-12-01', fecha_fin: '2027-02-28' },
      honorarios: {
        importe_total: '1500000',
        cantidad_cuotas: '3',
        importe_cuota: '500000',
        vencimiento: 'Último día hábil de cada mes'
      }
    },
    revision: null,
    historial: [
      { fecha: '2026-11-03T11:00:00', usuario: 'Carolina Suárez', accion: 'Datos del contrato cargados como borrador' },
      { fecha: '2026-11-03T11:50:00', usuario: 'Carolina Suárez', accion: 'Contrato generado y enviado a revisión' }
    ]
  },
  {
    id: 'CTR-003',
    modelo: 'CONT-001',
    estado: 'pendiente_revision',
    creadoPor: 'Ramiro Beltrán',
    creadoEn: '2026-11-10T14:20:00',
    actualizadoEn: '2026-11-10T15:05:00',
    datos: {
      contrato: { ciudad: 'Salta', fecha_celebracion: '2026-11-10' },
      parte_contratante: {
        nombre: 'Clínica Santa Lucía S.A.',
        documento: '30-59876543-1',
        domicilio: 'Av. Belgrano 780, Salta',
        representante: 'Mónica Beatriz Aguirre',
        documento_representante: '20.554.671',
        cargo_representante: 'Directora administrativa'
      },
      parte_prestadora: {
        nombre: 'Diego Hernán Luna',
        documento: '33.912.044',
        domicilio: 'Calle Zuviría 112, Salta'
      },
      objeto: {
        servicio:
          'Mantenimiento y soporte del sistema informático de turnos de la contratante.'
      },
      plazo: { fecha_inicio: '2026-12-01', fecha_fin: '2027-11-30' },
      honorarios: {
        importe_total: '3600000',
        cantidad_cuotas: '12',
        importe_cuota: '300000',
        vencimiento: 'Hasta el día 5 de cada mes'
      }
    },
    revision: null,
    historial: [
      { fecha: '2026-11-10T14:20:00', usuario: 'Ramiro Beltrán', accion: 'Datos del contrato cargados como borrador' },
      { fecha: '2026-11-10T15:05:00', usuario: 'Ramiro Beltrán', accion: 'Contrato generado y enviado a revisión' }
    ]
  },
  {
    id: 'CTR-004',
    modelo: 'CONT-001',
    estado: 'borrador',
    creadoPor: 'Ramiro Beltrán',
    creadoEn: '2026-11-12T10:30:00',
    actualizadoEn: '2026-11-12T10:45:00',
    datos: {
      contrato: { ciudad: 'Tucumán', fecha_celebracion: '2026-11-12' },
      parte_contratante: {
        nombre: 'Textil del Norte S.A.',
        documento: '30-64120987-6',
        domicilio: 'Calle Maipú 640, San Miguel de Tucumán',
        representante: '',
        documento_representante: '',
        cargo_representante: ''
      },
      parte_prestadora: {
        nombre: 'Gabriela Inés Ortiz',
        documento: '',
        domicilio: ''
      },
      objeto: { servicio: 'Diseño de la identidad visual de la contratante.' },
      plazo: { fecha_inicio: '', fecha_fin: '' },
      honorarios: {
        importe_total: '',
        cantidad_cuotas: '',
        importe_cuota: '',
        vencimiento: ''
      }
    },
    revision: null,
    historial: [
      { fecha: '2026-11-12T10:30:00', usuario: 'Ramiro Beltrán', accion: 'Datos del contrato cargados como borrador' },
      { fecha: '2026-11-12T10:45:00', usuario: 'Ramiro Beltrán', accion: 'Borrador guardado con datos incompletos' }
    ]
  },
  {
    id: 'CTR-005',
    modelo: 'CONT-001',
    estado: 'borrador',
    creadoPor: 'Carolina Suárez',
    creadoEn: '2026-11-13T17:10:00',
    actualizadoEn: '2026-11-13T17:10:00',
    datos: {
      contrato: { ciudad: 'Resistencia', fecha_celebracion: '' },
      parte_contratante: {
        nombre: '',
        documento: '',
        domicilio: '',
        representante: '',
        documento_representante: '',
        cargo_representante: ''
      },
      parte_prestadora: { nombre: '', documento: '', domicilio: '' },
      objeto: { servicio: '' },
      plazo: { fecha_inicio: '', fecha_fin: '' },
      honorarios: {
        importe_total: '',
        cantidad_cuotas: '',
        importe_cuota: '',
        vencimiento: ''
      }
    },
    revision: null,
    historial: [
      { fecha: '2026-11-13T17:10:00', usuario: 'Carolina Suárez', accion: 'Borrador creado con datos incompletos' }
    ]
  },
  {
    id: 'CTR-006',
    modelo: 'CONT-001',
    estado: 'aprobado',
    creadoPor: 'Ramiro Beltrán',
    creadoEn: '2026-09-15T08:45:00',
    actualizadoEn: '2026-09-18T12:10:00',
    datos: {
      contrato: { ciudad: 'Neuquén', fecha_celebracion: '2026-09-15' },
      parte_contratante: {
        nombre: 'Patagonia Servicios Energéticos S.A.',
        documento: '30-70998123-4',
        domicilio: 'Av. Argentina 2200, Neuquén',
        representante: 'Lorena Patricia Vidal',
        documento_representante: '26.771.340',
        cargo_representante: 'Gerente general'
      },
      parte_prestadora: {
        nombre: 'Tomás Ezequiel Funes',
        documento: '34.005.771',
        domicilio: 'Calle Roca 98, Neuquén'
      },
      objeto: {
        servicio:
          'Capacitación del personal de la contratante en seguridad e higiene laboral.'
      },
      plazo: { fecha_inicio: '2026-10-01', fecha_fin: '2026-12-31' },
      honorarios: {
        importe_total: '900000',
        cantidad_cuotas: '3',
        importe_cuota: '300000',
        vencimiento: 'Hasta el día 15 de cada mes'
      }
    },
    revision: {
      profesional: 'Paula Herrera',
      fecha: '2026-09-18T12:10:00'
    },
    historial: [
      { fecha: '2026-09-15T08:45:00', usuario: 'Ramiro Beltrán', accion: 'Datos del contrato cargados como borrador' },
      { fecha: '2026-09-15T09:30:00', usuario: 'Ramiro Beltrán', accion: 'Contrato generado a partir del modelo CONT-001' },
      { fecha: '2026-09-18T12:10:00', usuario: 'Paula Herrera', accion: 'Contrato aprobado por profesional autorizado' }
    ]
  }
]

export const USUARIOS_SIMULADOS = {
  empleado: 'Carolina Suárez',
  profesional: 'Paula Herrera'
}

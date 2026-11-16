import { SECCIONES } from '../config/campos.js'
import { CLAUSULAS_FIJAS, CLAUSULA_JURISDICCION } from '../config/clausulasPlantilla.js'
import { leerValor } from '../lib/datosContrato.js'
import { formatearFechaLarga, formatearImporte } from '../lib/formato.js'
import { Aviso } from '../components/ui/Aviso.jsx'
import { Tarjeta } from '../components/ui/Tarjeta.jsx'

const ORDEN_CLAUSULAS_FIJAS = ['CUARTA', 'QUINTA', 'SEXTA', 'SEPTIMA', 'OCTAVA', 'NOVENA']

function quitarTildes(texto) {
  return texto.replace('É', 'E')
}

function ordenarClausulasFijas() {
  const todas = [...CLAUSULAS_FIJAS, CLAUSULA_JURISDICCION]
  return todas.sort(
    (a, b) =>
      ORDEN_CLAUSULAS_FIJAS.indexOf(quitarTildes(a.numero)) -
      ORDEN_CLAUSULAS_FIJAS.indexOf(quitarTildes(b.numero))
  )
}

const CLAUSULAS_ORDENADAS = ordenarClausulasFijas()

function buscarEtiqueta(seccion, clave) {
  const definicionSeccion = SECCIONES.find((elemento) => elemento.clave === seccion)
  const definicionCampo = definicionSeccion?.campos.find((elemento) => elemento.clave === clave)
  return definicionCampo ? definicionCampo.etiqueta : clave
}

function Resaltado({ children }) {
  return (
    <span className="break-words border-b border-dorado-700 bg-dorado-100 px-1">
      <span className="sr-only">dato: </span>
      {children}
    </span>
  )
}

function Pendiente({ etiqueta }) {
  return (
    <span className="break-words rounded-sm border border-dashed border-alerta-700 bg-alerta-100 px-1 text-alerta-700">
      [pendiente: {etiqueta}]
    </span>
  )
}

function Dato({ datos, seccion, clave, formatear }) {
  const valor = leerValor(datos, seccion, clave).trim()
  if (valor === '') {
    return <Pendiente etiqueta={buscarEtiqueta(seccion, clave)} />
  }
  const texto = formatear ? formatear(valor) || valor : valor
  return <Resaltado>{texto}</Resaltado>
}

function LineaDato({ datos, seccion, clave, formatear }) {
  return (
    <p>
      {buscarEtiqueta(seccion, clave)}: <Dato datos={datos} seccion={seccion} clave={clave} formatear={formatear} />
    </p>
  )
}

function separarFechaCelebracion(datos) {
  const fechaLarga = formatearFechaLarga(leerValor(datos, 'contrato', 'fecha_celebracion'))
  const coincidencia = /^(\d+) de (\S+) de (\d+)$/.exec(fechaLarga)
  if (!coincidencia) {
    return null
  }
  return { dia: coincidencia[1], mes: coincidencia[2], anio: coincidencia[3] }
}

function TituloClausula({ numero, titulo }) {
  return (
    <h4 className="mb-2 font-serif text-base font-bold tracking-wide text-tinta-900">
      {numero}: {titulo}
    </h4>
  )
}

function LugarYFecha({ datos }) {
  const fecha = separarFechaCelebracion(datos)
  return (
    <p>
      En la ciudad de <Dato datos={datos} seccion="contrato" clave="ciudad" />,{' '}
      {fecha ? (
        <>
          a los <Resaltado>{fecha.dia}</Resaltado> días del mes de <Resaltado>{fecha.mes}</Resaltado> de{' '}
          <Resaltado>{fecha.anio}</Resaltado>
        </>
      ) : (
        <>
          a los <Pendiente etiqueta={buscarEtiqueta('contrato', 'fecha_celebracion')} />
        </>
      )}
      , entre:
    </p>
  )
}

function ParteContratante({ datos }) {
  return (
    <section aria-label="Parte contratante">
      <p>
        <strong>PARTE CONTRATANTE:</strong> <Dato datos={datos} seccion="parte_contratante" clave="nombre" />, DNI/CUIT
        N.º <Dato datos={datos} seccion="parte_contratante" clave="documento" />, con domicilio en{' '}
        <Dato datos={datos} seccion="parte_contratante" clave="domicilio" />, representada en este acto por{' '}
        <Dato datos={datos} seccion="parte_contratante" clave="representante" />, DNI{' '}
        <Dato datos={datos} seccion="parte_contratante" clave="documento_representante" />, en su carácter de{' '}
        <Dato datos={datos} seccion="parte_contratante" clave="cargo_representante" />, en adelante denominada
        &quot;LA CONTRATANTE&quot;.
      </p>
    </section>
  )
}

function PartePrestadora({ datos }) {
  return (
    <section aria-label="Parte prestadora">
      <p>
        <strong>PARTE PRESTADORA:</strong> <Dato datos={datos} seccion="parte_prestadora" clave="nombre" />, DNI/CUIT
        N.º <Dato datos={datos} seccion="parte_prestadora" clave="documento" />, con domicilio en{' '}
        <Dato datos={datos} seccion="parte_prestadora" clave="domicilio" />, en adelante denominada &quot;EL
        PRESTADOR&quot;.
      </p>
      <p className="mt-3">
        Ambas partes acuerdan celebrar el presente Contrato de Prestación de Servicios Profesionales, sujeto a las
        siguientes cláusulas:
      </p>
    </section>
  )
}

function ClausulaObjeto({ datos }) {
  return (
    <section aria-label="Cláusula primera" className="space-y-2">
      <TituloClausula numero="PRIMERA" titulo="OBJETO DEL CONTRATO" />
      <p>LA CONTRATANTE encomienda a EL PRESTADOR la realización de los siguientes servicios profesionales:</p>
      <p className="whitespace-pre-line">
        <Dato datos={datos} seccion="objeto" clave="servicio" />
      </p>
      <p>
        EL PRESTADOR acepta realizar las actividades descriptas conforme a las condiciones establecidas en el presente
        documento.
      </p>
    </section>
  )
}

function ClausulaPlazo({ datos }) {
  return (
    <section aria-label="Cláusula segunda" className="space-y-1">
      <TituloClausula numero="SEGUNDA" titulo="PLAZO DE VIGENCIA" />
      <p>
        El presente contrato comenzará su vigencia el día{' '}
        <Dato datos={datos} seccion="plazo" clave="fecha_inicio" formatear={formatearFechaLarga} /> y finalizará el día{' '}
        <Dato datos={datos} seccion="plazo" clave="fecha_fin" formatear={formatearFechaLarga} />, salvo renovación o
        rescisión conforme a las condiciones aquí establecidas.
      </p>
    </section>
  )
}

function ClausulaHonorarios({ datos }) {
  return (
    <section aria-label="Cláusula tercera" className="space-y-2">
      <TituloClausula numero="TERCERA" titulo="HONORARIOS Y FORMA DE PAGO" />
      <p>
        LA CONTRATANTE abonará a EL PRESTADOR la suma total de{' '}
        <Dato datos={datos} seccion="honorarios" clave="importe_total" formatear={formatearImporte} />.
      </p>
      <p>
        La modalidad de pago será: <Dato datos={datos} seccion="honorarios" clave="cantidad_cuotas" /> cuotas
        mensuales, iguales y consecutivas, de{' '}
        <Dato datos={datos} seccion="honorarios" clave="importe_cuota" formatear={formatearImporte} /> cada una, con
        vencimiento <Dato datos={datos} seccion="honorarios" clave="vencimiento" />.
      </p>
      <p>
        Los pagos deberán realizarse mediante transferencia bancaria a la cuenta indicada por EL PRESTADOR.
      </p>
    </section>
  )
}

function ClausulaFija({ clausula }) {
  return (
    <section aria-label={`Cláusula ${clausula.numero.toLowerCase()}`} className="space-y-2">
      <TituloClausula numero={clausula.numero} titulo={clausula.titulo} />
      {clausula.introduccion ? <p>{clausula.introduccion}</p> : null}
      {clausula.items ? (
        <ul className="list-disc space-y-1 pl-6">
          {clausula.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : null}
      {clausula.texto ? <p>{clausula.texto}</p> : null}
    </section>
  )
}

function BloqueFirma({ rotulo, children }) {
  return (
    <div>
      <div aria-hidden="true" className="h-16 border-b border-texto" />
      <p className="mt-2 font-semibold text-tinta-900">Firma de {rotulo}</p>
      <div className="mt-2 space-y-1">{children}</div>
    </div>
  )
}

function Firmas({ datos }) {
  return (
    <section aria-label="Firmas de las partes" className="grid gap-10 pt-6 sm:grid-cols-2">
      <BloqueFirma rotulo="LA CONTRATANTE">
        <LineaDato datos={datos} seccion="parte_contratante" clave="nombre" />
        <LineaDato datos={datos} seccion="parte_contratante" clave="documento" />
      </BloqueFirma>
      <BloqueFirma rotulo="EL PRESTADOR">
        <LineaDato datos={datos} seccion="parte_prestadora" clave="nombre" />
        <LineaDato datos={datos} seccion="parte_prestadora" clave="documento" />
      </BloqueFirma>
    </section>
  )
}

export function VistaPreviaContrato({ datos, modelo }) {
  return (
    <Tarjeta
      titulo="Vista previa del contrato"
      idTitulo="titulo-vista-previa"
      descripcion={modelo ? `Modelo ${modelo}` : undefined}
    >
      <div className="space-y-3">
        <Aviso tipo="info">
          Vista previa informativa y simplificada. No muestra la duración del contrato en meses ni expresa en letras los
          importes y la cantidad de cuotas. El documento definitivo se genera sobre la plantilla Word aprobada.
        </Aviso>
        <p className="text-sm text-texto-suave">
          Los datos variables aparecen con fondo resaltado y subrayado, y los lectores de pantalla los anuncian con la
          palabra dato. Las cláusulas CUARTA a NOVENA son contenido fijo y de solo
          lectura.
        </p>
      </div>
      <article
        aria-label="Documento del contrato"
        className="mx-auto mt-5 max-w-3xl space-y-6 border border-papel-300 bg-white px-5 py-8 font-serif text-base leading-relaxed text-texto shadow-sm sm:px-12 sm:py-12"
      >
        <header className="space-y-3 text-center">
          <p className="font-serif text-lg font-bold tracking-widest text-tinta-900">ACOSTA &amp; ASOCIADOS</p>
          <h3 className="text-xl font-bold leading-snug sm:text-2xl">
            CONTRATO DE PRESTACIÓN DE SERVICIOS PROFESIONALES
          </h3>
        </header>
        <LugarYFecha datos={datos} />
        <ParteContratante datos={datos} />
        <PartePrestadora datos={datos} />
        <ClausulaObjeto datos={datos} />
        <ClausulaPlazo datos={datos} />
        <ClausulaHonorarios datos={datos} />
        {CLAUSULAS_ORDENADAS.map((clausula) => (
          <ClausulaFija key={clausula.numero} clausula={clausula} />
        ))}
        <Firmas datos={datos} />
      </article>
    </Tarjeta>
  )
}

export default VistaPreviaContrato

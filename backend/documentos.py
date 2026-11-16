
import os
from datetime import date
from decimal import Decimal
from pathlib import Path

from docx import Document

from backend import validaciones


RAIZ_PROYECTO = Path(__file__).resolve().parent.parent
RUTA_PLANTILLA = RAIZ_PROYECTO / "plantillas" / "contrato_ejemplo_CONT-001(1).docx"
RUTA_EXPEDIENTE = (
    RAIZ_PROYECTO / "documentos_referencia" / "expediente_ejemplo_EXP-001(1).docx"
)
DIRECTORIO_GENERADOS = Path(
    os.environ.get(
        "DOCUMENTOS_GENERADOS_DIR",
        RAIZ_PROYECTO / "documentos_generados",
    )
)

MESES = (
    "enero",
    "febrero",
    "marzo",
    "abril",
    "mayo",
    "junio",
    "julio",
    "agosto",
    "septiembre",
    "octubre",
    "noviembre",
    "diciembre",
)


def leer_documento(ruta):
    documento = Document(ruta)
    texto = ""

    for parrafo in documento.paragraphs:
        texto += parrafo.text + "\n"

    for tabla in documento.tables:
        for fila in tabla.rows:
            for celda in fila.cells:
                texto += celda.text + " "
            texto += "\n"

    return texto


def cargar_documentos():
    return {
        "plantilla": leer_documento(RUTA_PLANTILLA),
        "expediente": leer_documento(RUTA_EXPEDIENTE),
    }


def cargar_documentos_para_ia():
    plantilla = Document(RUTA_PLANTILLA)
    clausulas = []
    incluir = False

    for parrafo in plantilla.paragraphs:
        if parrafo.text.startswith("CUARTA: OBLIGACIONES DEL PRESTADOR"):
            incluir = True
        if incluir:
            clausulas.append(parrafo.text)
        if parrafo.text.startswith("NOVENA: ACEPTACIÓN"):
            break

    return {
        "plantilla": "\n".join(clausulas),
        "expediente": (
            "Contexto jurídico general: reclamo comercial relacionado con demoras "
            "en servicios de transporte y pérdida parcial de carga. Es únicamente "
            "contexto; no se deben copiar partes, documentos, domicilios, fechas, "
            "identificadores ni hechos del expediente en un contrato nuevo."
        ),
    }


def _parrafos_de_celda(celda):
    yield from celda.paragraphs
    for tabla in celda.tables:
        for fila in tabla.rows:
            for celda_anidada in fila.cells:
                yield from _parrafos_de_celda(celda_anidada)


def _parrafos_del_documento(documento):
    yield from documento.paragraphs
    for tabla in documento.tables:
        for fila in tabla.rows:
            for celda in fila.cells:
                yield from _parrafos_de_celda(celda)


def _reemplazar_una_vez(parrafo, original, reemplazo, inicio_busqueda=0):
    ejecuciones = parrafo.runs
    texto = "".join(ejecucion.text for ejecucion in ejecuciones)
    inicio = texto.find(original, inicio_busqueda)

    if inicio < 0:
        return False

    fin = inicio + len(original)
    posiciones = []
    cursor = 0
    for ejecucion in ejecuciones:
        posiciones.append((cursor, cursor + len(ejecucion.text)))
        cursor += len(ejecucion.text)

    indice_inicio = next(
        indice
        for indice, (desde, hasta) in enumerate(posiciones)
        if desde <= inicio < hasta
    )
    indice_fin = next(
        indice
        for indice, (desde, hasta) in enumerate(posiciones)
        if desde < fin <= hasta
    )
    prefijo = ejecuciones[indice_inicio].text[: inicio - posiciones[indice_inicio][0]]
    sufijo = ejecuciones[indice_fin].text[fin - posiciones[indice_fin][0] :]

    ejecuciones[indice_inicio].text = prefijo + reemplazo
    if indice_inicio == indice_fin:
        ejecuciones[indice_inicio].text += sufijo
    else:
        ejecuciones[indice_fin].text = sufijo
        for indice in range(indice_inicio + 1, indice_fin):
            ejecuciones[indice].text = ""

    return True


def _reemplazar_en_parrafo(parrafo, original, reemplazo):
    if not original:
        return 0

    texto = "".join(ejecucion.text for ejecucion in parrafo.runs)
    if original == reemplazo:
        return texto.count(original)

    posiciones = []
    inicio_busqueda = 0
    while True:
        inicio = texto.find(original, inicio_busqueda)
        if inicio < 0:
            break
        posiciones.append(inicio)
        inicio_busqueda = inicio + len(original)

    for inicio in reversed(posiciones):
        _reemplazar_una_vez(parrafo, original, reemplazo, inicio)

    return len(posiciones)


def _reemplazar_en_documento(documento, original, reemplazo):
    cantidad = 0
    for parrafo in _parrafos_del_documento(documento):
        cantidad += _reemplazar_en_parrafo(parrafo, original, reemplazo)
    if cantidad == 0:
        raise ValueError(
            f"No se encontró el texto variable esperado en la plantilla: {original}"
        )


def _buscar_parrafo(documento, inicio_texto):
    for parrafo in documento.paragraphs:
        if parrafo.text.startswith(inicio_texto):
            return parrafo
    raise ValueError(f"No se encontró el párrafo de plantilla: {inicio_texto}")


def _fecha_larga(valor):
    fecha = date.fromisoformat(str(valor))
    return f"{fecha.day} de {MESES[fecha.month - 1]} de {fecha.year}"


def _formatear_importe(valor):
    numero = Decimal(str(valor))
    entero, separador, decimales = format(numero, "f").partition(".")
    entero_agrupado = f"{int(entero):,}".replace(",", ".")
    decimales = decimales.rstrip("0")
    return f"{entero_agrupado},{decimales}" if separador and decimales else entero_agrupado


def generar_documento_contrato(contrato):
    datos = contrato["datos"]

    # Barrera final: nunca se genera el documento con datos faltantes o inválidos,
    # así no se cuelan datos de ejemplo de la plantilla.
    faltantes = validaciones.detectar_campos_faltantes(datos)
    errores = validaciones.validar_contrato(datos)
    if faltantes or errores:
        raise ValueError(
            "No se puede generar el contrato: hay datos faltantes o inválidos."
        )

    documento = Document(RUTA_PLANTILLA)

    parrafo_lugar = _buscar_parrafo(documento, "En la ciudad de ")
    if not _reemplazar_en_parrafo(parrafo_lugar, "Rosario", datos["contrato"]["ciudad"]):
        raise ValueError("No se encontró la ciudad de ejemplo en la plantilla.")
    _reemplazar_en_parrafo(parrafo_lugar, "15", str(
        date.fromisoformat(datos["contrato"]["fecha_celebracion"]).day
    ))
    _reemplazar_en_parrafo(
        parrafo_lugar,
        "marzo",
        MESES[date.fromisoformat(datos["contrato"]["fecha_celebracion"]).month - 1],
    )
    _reemplazar_en_parrafo(
        parrafo_lugar,
        "2026",
        str(date.fromisoformat(datos["contrato"]["fecha_celebracion"]).year),
    )

    contratante = datos["parte_contratante"]
    prestadora = datos["parte_prestadora"]
    _reemplazar_en_documento(
        documento, "Distribuidora del Litoral S.R.L.", contratante["nombre"]
    )
    _reemplazar_en_documento(documento, "30-71234567-8", contratante["documento"])
    _reemplazar_en_documento(
        documento,
        "Av. San Martín 1250, Rosario, Santa Fe",
        contratante["domicilio"],
    )
    _reemplazar_en_documento(
        documento,
        "Marcos Ezequiel Ibarra, DNI 28.456.789, en su carácter de socio gerente",
        (
            f"{contratante['representante']}, DNI "
            f"{contratante['documento_representante']}, en su carácter de "
            f"{contratante['cargo_representante']}"
        ),
    )
    _reemplazar_en_documento(documento, "Lucía Belén Fernández", prestadora["nombre"])
    _reemplazar_en_documento(documento, "35.678.901", prestadora["documento"])
    _reemplazar_en_documento(
        documento,
        "Calle Mitre 845, 3.º B, Rosario, Santa Fe",
        prestadora["domicilio"],
    )
    _reemplazar_en_documento(
        documento,
        (
            "Desarrollo e implementación de una API REST en Python (FastAPI) para la "
            "gestión de pedidos y stock, incluyendo documentación técnica, pruebas "
            "automatizadas y despliegue en el entorno productivo de LA CONTRATANTE."
        ),
        datos["objeto"]["servicio"],
    )

    parrafo_plazo = _buscar_parrafo(
        documento, "El presente contrato tendrá una duración de "
    )
    if len(parrafo_plazo.runs) < 7:
        raise ValueError("La estructura del párrafo de plazo cambió.")
    parrafo_plazo.runs[0].text = "El presente contrato tendrá vigencia desde el día "
    parrafo_plazo.runs[1].text = _fecha_larga(datos["plazo"]["fecha_inicio"])
    parrafo_plazo.runs[2].text = " hasta el día "
    parrafo_plazo.runs[3].text = _fecha_larga(datos["plazo"]["fecha_fin"])
    parrafo_plazo.runs[4].text = ""
    parrafo_plazo.runs[5].text = ""

    honorarios = datos["honorarios"]
    parrafo_total = _buscar_parrafo(
        documento, "LA CONTRATANTE abonará a EL PRESTADOR la suma total de "
    )
    _reemplazar_en_parrafo(
        parrafo_total,
        "$ 4.800.000",
        f"$ {_formatear_importe(honorarios['importe_total'])}",
    )
    _reemplazar_en_parrafo(parrafo_total, " (", "")
    _reemplazar_en_parrafo(
        parrafo_total,
        "pesos cuatro millones ochocientos mil",
        "",
    )
    _reemplazar_en_parrafo(parrafo_total, ").", ".")

    parrafo_pago = _buscar_parrafo(documento, "La modalidad de pago será: ")
    _reemplazar_en_parrafo(
        parrafo_pago,
        (
            "seis (6) cuotas mensuales, iguales y consecutivas, de $ 800.000 "
            "cada una, con vencimiento entre el 1 y el 5 de cada mes"
        ),
        (
            f"{honorarios['cantidad_cuotas']} cuotas mensuales, iguales y "
            f"consecutivas, de $ {_formatear_importe(honorarios['importe_cuota'])} "
            f"cada una, con vencimiento {honorarios['vencimiento']}"
        ),
    )

    tabla_firmas = documento.tables[0]
    celdas = (tabla_firmas.rows[0].cells[0], tabla_firmas.rows[0].cells[1])
    _reemplazar_en_parrafo(
        celdas[0].paragraphs[1],
        "Distribuidora del Litoral S.R.L.",
        contratante["nombre"],
    )
    _reemplazar_en_parrafo(
        celdas[0].paragraphs[2],
        "30-71234567-8",
        contratante["documento"],
    )
    _reemplazar_en_parrafo(
        celdas[1].paragraphs[1],
        "Lucía Belén Fernández",
        prestadora["nombre"],
    )
    _reemplazar_en_parrafo(
        celdas[1].paragraphs[2],
        "35.678.901",
        prestadora["documento"],
    )

    DIRECTORIO_GENERADOS.mkdir(parents=True, exist_ok=True)
    ruta_salida = DIRECTORIO_GENERADOS / f"{contrato['id']}.docx"
    documento.save(ruta_salida)
    return ruta_salida


def generar_documento_pdf(contrato):
    from reportlab.lib.pagesizes import A4
    from reportlab.pdfgen import canvas

    ruta_docx = DIRECTORIO_GENERADOS / f"{contrato['id']}.docx"
    ruta_pdf = DIRECTORIO_GENERADOS / f"{contrato['id']}.pdf"
    documento = Document(ruta_docx)

    lienzo = canvas.Canvas(str(ruta_pdf), pagesize=A4)
    _, alto = A4
    texto = lienzo.beginText(40, alto - 40)
    texto.setFont("Helvetica", 10)

    for parrafo in documento.paragraphs:
        linea = parrafo.text or ""
        if texto.getY() < 40:
            lienzo.drawText(texto)
            lienzo.showPage()
            texto = lienzo.beginText(40, alto - 40)
            texto.setFont("Helvetica", 10)
        texto.textLine(linea)

    lienzo.drawText(texto)
    lienzo.save()
    return ruta_pdf

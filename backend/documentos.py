
from docx import Document

# Función para leer documentos Word
def leer_documento(ruta):

    documento = Document(ruta)

    texto = ""

    # Leer los párrafos
    for parrafo in documento.paragraphs:
        texto += parrafo.text + "\n"

    # Leer las tablas
    for tabla in documento.tables:
        for fila in tabla.rows:
            for celda in fila.cells:
                texto += celda.text + " "
            texto += "\n"

    return texto


# Función para cargar los documentos del proyecto
def cargar_documentos():

    # Leemos la plantilla contractual
    plantilla = leer_documento(
        "plantillas/contrato_ejemplo_CONT-001(1).docx"
    )

    # Leemos el expediente de referencia
    expediente = leer_documento(
        "documentos_referencia/expediente_ejemplo_EXP-001(1).docx"
    )

    # Devolvemos los documentos por separado
    return {
        "plantilla": plantilla,
        "expediente": expediente
    }

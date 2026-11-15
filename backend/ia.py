
import requests
import json

from backend.campos_contrato import CAMPOS_CONTRATO


URL_OLLAMA = "http://localhost:11434/api/chat"


# Instrucciones generales del asistente
INSTRUCCIONES = """
Sos el asistente documental de Acosta & Asociados.

Ayudás a los empleados a preparar contratos.

Reglas:
- Identificá el tipo de contrato solicitado.
- Solicitá los datos obligatorios que falten.
- No inventes información.
- No modifiques las cláusulas aprobadas.
- No brindes asesoramiento legal.
- Todo contrato debe ser revisado por un profesional.
- Utilizá el historial para recordar los datos proporcionados.
- La plantilla es la única fuente autorizada de cláusulas.
- El expediente solo aporta información contextual.
- No copies datos de ejemplo de los documentos a contratos nuevos.
- Solicitá únicamente los campos definidos en CAMPOS_CONTRATO.
- No solicites información que ya está establecida en la plantilla.

Respondé siempre en español y de manera clara.
"""


# Función para consultar al asistente
def consultar_ia(mensaje, historial=None, documentos=None):

    instrucciones = INSTRUCCIONES

    if documentos:
        instrucciones += "\nPLANTILLA:\n" + documentos["plantilla"]
        instrucciones += "\nEXPEDIENTE:\n" + documentos["expediente"]

    mensajes = [
        {"role": "system", "content": instrucciones}
    ]

    mensajes.extend(historial or [])
    mensajes.append({"role": "user", "content": mensaje})

    respuesta = requests.post(
        URL_OLLAMA,
        json={
            "model": "llama3.2:3b",
            "messages": mensajes,
            "stream": False
        },
        timeout=120
    )

    respuesta.raise_for_status()

    return respuesta.json()["message"]["content"]


# Función para extraer datos del mensaje
def extraer_datos(mensaje):

    instrucciones = f"""
    Extraé únicamente los datos que aparezcan explícitamente
    en el mensaje del usuario.

    Devolvé un objeto JSON con estas secciones y claves:
    {json.dumps(CAMPOS_CONTRATO, ensure_ascii=False)}

    Usá exactamente los nombres de las secciones y claves indicados.
    Si un dato no aparece, omitilo.
    No inventes ni completes información.
    No uses valores como "no disponible".
    """

    respuesta = requests.post(
        URL_OLLAMA,
        json={
            "model": "llama3.2:3b",
            "format": "json",
            "messages": [
                {"role": "system", "content": instrucciones},
                {"role": "user", "content": mensaje}
            ],
            "stream": False,
            "options": {"temperature": 0}
        },
        timeout=120
    )

    respuesta.raise_for_status()

    contenido = respuesta.json()["message"]["content"]

    try:
        datos = json.loads(contenido)
    except (json.JSONDecodeError, TypeError) as error:
        raise ValueError("La IA no devolvió un JSON válido.") from error

    if not isinstance(datos, dict):
        raise ValueError("La respuesta debe ser un objeto JSON.")

    # Valores que Python debe descartar
    invalidos = {
        "", "no disponible", "no informado",
        "desconocido", "ninguno", "null", "n/a"
    }

    # También descartar las etiquetas descriptivas de los campos
    invalidos.update(
        nombre.lower()
        for campos in CAMPOS_CONTRATO.values()
        for nombre in campos.values()
    )

    resultado = {}

    # Filtrar secciones, campos y valores no permitidos
    for seccion, campos in datos.items():

        if seccion not in CAMPOS_CONTRATO or not isinstance(campos, dict):
            continue

        for clave, valor in campos.items():

            if clave not in CAMPOS_CONTRATO[seccion] or valor is None:
                continue

            if isinstance(valor, str):
                valor = valor.strip()

            if str(valor).lower() in invalidos:
                continue

            resultado.setdefault(seccion, {})[clave] = valor

    return resultado


import requests
import json
import re
import unicodedata
from datetime import date

from backend.campos_contrato import CAMPOS_CONTRATO


URL_OLLAMA = "http://localhost:11434/api/chat"
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
ABREVIATURAS_DE_DOMICILIO = (
    "av",
    "avda",
    "bv",
    "bvar",
    "gral",
    "dr",
    "dra",
    "ing",
    "pje",
    "pte",
    "pres",
    "sta",
    "sto",
    "cnel",
    "tte",
    "prof",
    "dpto",
    "depto",
    "nro",
    "km",
)
PALABRAS_DE_INICIO_DE_ORACION = ("el", "la", "los", "las", "y", "su", "sus")


def _normalizar_para_comparar(valor):
    normalizado = unicodedata.normalize("NFD", str(valor).casefold())
    return "".join(
        caracter
        for caracter in normalizado
        if not unicodedata.combining(caracter) and caracter.isalnum()
    )


def _valor_respaldado_por_mensaje(valor, mensaje, clave, contexto=""):
    if isinstance(valor, bool) or not isinstance(valor, (str, int, float)):
        return False

    valor_texto = str(valor).strip()
    mensaje_normalizado = _normalizar_para_comparar(mensaje)
    texto_con_contexto = _normalizar_para_comparar(f"{mensaje} {contexto}")

    if clave in ("documento", "documento_representante"):
        if (
            clave == "documento_representante"
            and "representante" not in texto_con_contexto
        ):
            return False
        digitos_valor = "".join(caracter for caracter in valor_texto if caracter.isdigit())
        digitos_mensaje = "".join(caracter for caracter in mensaje if caracter.isdigit())
        return bool(digitos_valor) and digitos_valor in digitos_mensaje

    if clave == "domicilio" and not any(
        referencia in texto_con_contexto for referencia in ("domicilio", "direccion")
    ):
        return False

    if clave == "ciudad":
        contexto_ciudad = any(
            referencia in texto_con_contexto
            for referencia in (
                "ciudad",
                "celebracion",
                "firmamos",
                "firmara",
                "contratoseraen",
                "contratosecelebra",
            )
        )
        contexto_domicilio = any(
            referencia in texto_con_contexto
            for referencia in ("domicilio", "direccion")
        )
        contexto_contrato = any(
            referencia in texto_con_contexto
            for referencia in ("celebracion", "firmamos", "firmara")
        )
        if not contexto_ciudad or (contexto_domicilio and not contexto_contrato):
            return False

    valor_normalizado = _normalizar_para_comparar(valor_texto)
    if valor_normalizado and valor_normalizado in mensaje_normalizado:
        return True

    if clave in ("fecha_celebracion", "fecha_inicio", "fecha_fin"):
        try:
            fecha = date.fromisoformat(valor_texto)
        except ValueError:
            return False
        fecha_en_espanol = (
            f"{fecha.day} de {MESES[fecha.month - 1]} de {fecha.year}"
        )
        return _normalizar_para_comparar(fecha_en_espanol) in mensaje_normalizado

    return False


def _cortar_domicilio(valor):
    for fin_de_oracion in re.finditer(r"\.\s+", valor):
        palabra_anterior = re.search(r"(\w+)$", valor[: fin_de_oracion.start()])
        if palabra_anterior is None:
            continue

        palabra_siguiente = re.match(r"\w+", valor[fin_de_oracion.end() :])
        anterior = palabra_anterior.group(1).casefold()
        siguiente = ""
        if palabra_siguiente is not None:
            siguiente = palabra_siguiente.group(0).casefold()

        if anterior in ABREVIATURAS_DE_DOMICILIO:
            continue

        if len(anterior) == 1 and siguiente not in PALABRAS_DE_INICIO_DE_ORACION:
            continue

        valor = valor[: fin_de_oracion.start()]
        break

    otro_domicilio = re.search(
        r"(?:,\s*|\s+)(?:y\s+)?(?:el\s+)?domicilio\b",
        valor,
        flags=re.IGNORECASE,
    )
    if otro_domicilio:
        valor = valor[: otro_domicilio.start()]

    return valor.strip().rstrip(".").strip()


def _domicilios_explicitos(mensaje):
    domicilios = {}
    expresiones = (
        (
            "parte_contratante",
            r"\bdomicilio\s+(?:de\s+)?(?:la\s+)?parte\s+contratante"
            r"\s*(?:\bes\b\s*:?|:|=)\s*(?P<valor>[^;\n]+)",
        ),
        (
            "parte_prestadora",
            r"\bdomicilio\s+(?:de\s+)?(?:la\s+)?parte\s+prestadora"
            r"\s*(?:\bes\b\s*:?|:|=)\s*(?P<valor>[^;\n]+)",
        ),
    )

    for seccion, expresion in expresiones:
        coincidencia = re.search(expresion, mensaje, flags=re.IGNORECASE)
        if coincidencia:
            valor = _cortar_domicilio(coincidencia.group("valor"))
            if valor:
                domicilios[seccion] = valor

    return domicilios


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
- No reutilices valores de ejemplo ni presentes datos que no estén en la conversación.
- Solicitá únicamente los campos definidos en CAMPOS_CONTRATO.
- No solicites información que ya está establecida en la plantilla.
- Para DNI y CUIT, devolvé solamente el número, sin la etiqueta del documento.

Respondé siempre en español y de manera clara.
"""


# Función para consultar al asistente
def consultar_ia(
    mensaje,
    historial=None,
    documentos=None,
    campos_faltantes=None,
    errores_validacion=None,
):

    instrucciones = INSTRUCCIONES

    if documentos:
        instrucciones += "\nPLANTILLA:\n" + documentos["plantilla"]
        instrucciones += "\nEXPEDIENTE:\n" + documentos["expediente"]

    if campos_faltantes:
        instrucciones += (
            "\nDATOS OBLIGATORIOS PENDIENTES:\n"
            + "\n".join(f"- {campo}" for campo in campos_faltantes)
            + "\nPedí al empleado que complete esos datos, de forma natural. "
            "No afirmes que el contrato está listo."
        )

    if errores_validacion:
        instrucciones += (
            "\nDATOS QUE DEBEN CORREGIRSE:\n"
            + "\n".join(f"- {error}" for error in errores_validacion)
            + "\nExplicá qué dato debe corregirse sin proponer un valor inventado."
        )

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
def extraer_datos(mensaje, contexto=""):

    instrucciones = f"""
    Extraé únicamente los datos que aparezcan explícitamente
    en el mensaje del usuario.

    Devolvé un objeto JSON con estas secciones y claves:
    {json.dumps(CAMPOS_CONTRATO, ensure_ascii=False)}

    Usá exactamente los nombres de las secciones y claves indicados.
    Si un dato no aparece, omitilo.
    No inventes ni completes información.
    No uses valores como "no disponible".
    Si hay una pregunta previa del asistente, usala solo para saber
    a qué campo corresponde la respuesta del usuario.
    Tomá los valores únicamente del mensaje del usuario.
    """

    mensajes = [{"role": "system", "content": instrucciones}]
    if contexto:
        mensajes.append({"role": "assistant", "content": contexto})
    mensajes.append({"role": "user", "content": mensaje})

    respuesta = requests.post(
        URL_OLLAMA,
        json={
            "model": "llama3.2:3b",
            "format": "json",
            "messages": mensajes,
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

            if clave in ("documento", "documento_representante") and isinstance(
                valor, str
            ):
                valor = re.sub(
                    r"^(?:DNI|CUIT|CUIL)\b\s*",
                    "",
                    valor,
                    count=1,
                    flags=re.IGNORECASE,
                )
                valor = re.sub(
                    r"^N[\W_]*(?:RO)?[\W_]*",
                    "",
                    valor,
                    count=1,
                    flags=re.IGNORECASE,
                ).strip()

            if not _valor_respaldado_por_mensaje(
                valor, mensaje, clave, contexto=contexto
            ):
                continue

            if str(valor).lower() in invalidos:
                continue

            resultado.setdefault(seccion, {})[clave] = valor

    for seccion, campos in _domicilios_explicitos(mensaje).items():
        resultado.setdefault(seccion, {})["domicilio"] = campos

    return resultado


import requests
import json
import re
import unicodedata
from datetime import date
from decimal import Decimal, InvalidOperation

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
MESES_POR_NOMBRE = {nombre: numero for numero, nombre in enumerate(MESES, start=1)}
MESES_POR_NOMBRE["setiembre"] = 9

CLAVES_DE_FECHA = ("fecha_celebracion", "fecha_inicio", "fecha_fin")
CLAVES_NUMERICAS = ("importe_total", "cantidad_cuotas", "importe_cuota")
CLAVES_COMPARTIDAS = set(CAMPOS_CONTRATO["parte_contratante"]) & set(
    CAMPOS_CONTRATO["parte_prestadora"]
)
PALABRAS_DE_SECCION = {
    "parte_contratante": "contratante",
    "parte_prestadora": "prestador",
}
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

PATRON_FECHA_ISO = r"(?<!\d)(?P<anio>\d{4})-(?P<mes>\d{1,2})-(?P<dia>\d{1,2})(?!\d)"
PATRON_FECHA_NUMERICA = (
    r"(?<!\d)(?P<dia>\d{1,2})[/.\-](?P<mes>\d{1,2})[/.\-](?P<anio>\d{4})(?!\d)"
)
PATRON_FECHA_LARGA = (
    r"(?<!\d)(?P<dia>\d{1,2})\s*(?:\.?º|°|ro)?\s+de\s+(?P<mes>"
    + "|".join(MESES_POR_NOMBRE)
    + r")\s+(?:de|del)\s+(?P<anio>\d{4})(?!\d)"
)
PATRONES_DE_FECHA = (PATRON_FECHA_ISO, PATRON_FECHA_NUMERICA, PATRON_FECHA_LARGA)


def _solo_digitos(texto):
    return "".join(caracter for caracter in texto if caracter.isdigit())


def _crear_fecha(coincidencia):
    mes = coincidencia.group("mes")
    if mes.isdigit():
        numero_mes = int(mes)
    else:
        numero_mes = MESES_POR_NOMBRE[mes.casefold()]

    try:
        return date(
            int(coincidencia.group("anio")),
            numero_mes,
            int(coincidencia.group("dia")),
        )
    except ValueError:
        return None


def _interpretar_fecha(valor):
    if not isinstance(valor, str):
        return None

    texto = valor.strip()
    for patron in PATRONES_DE_FECHA:
        coincidencia = re.fullmatch(patron, texto, flags=re.IGNORECASE)
        if coincidencia:
            return _crear_fecha(coincidencia)

    return None


def _fechas_del_mensaje(mensaje):
    fechas = set()
    for patron in PATRONES_DE_FECHA:
        for coincidencia in re.finditer(patron, mensaje, flags=re.IGNORECASE):
            fecha = _crear_fecha(coincidencia)
            if fecha is not None:
                fechas.add(fecha)
    return fechas


def _interpretar_numero(valor):
    if isinstance(valor, bool):
        return None

    if isinstance(valor, (int, float)):
        texto = str(valor)
    elif isinstance(valor, str):
        texto = valor.replace("$", "").replace(" ", "").strip()
    else:
        return None

    if "," in texto:
        texto = texto.replace(".", "").replace(",", ".")
    elif re.fullmatch(r"\d{1,3}(?:\.\d{3})+", texto):
        texto = texto.replace(".", "")

    try:
        numero = Decimal(texto)
    except InvalidOperation:
        return None

    if not numero.is_finite():
        return None

    return numero


def _numeros_del_mensaje(mensaje):
    numeros = set()
    for texto in re.findall(r"\d+(?:[.,\-/]\d+)*", mensaje):
        if "-" in texto or "/" in texto:
            continue
        numero = _interpretar_numero(texto)
        if numero is not None:
            numeros.add(numero)
    return numeros


def _numero_como_texto(numero):
    return format(numero.normalize(), "f")


def _normalizar_valor(valor, clave):
    if clave in CLAVES_DE_FECHA:
        return _interpretar_fecha(valor).isoformat()

    if clave in CLAVES_NUMERICAS:
        return _numero_como_texto(_interpretar_numero(valor))

    return valor


def _normalizar_para_comparar(valor):
    normalizado = unicodedata.normalize("NFD", str(valor).casefold())
    return "".join(
        caracter
        for caracter in normalizado
        if not unicodedata.combining(caracter) and caracter.isalnum()
    )


def _valor_respaldado_por_mensaje(valor, mensaje, clave, seccion=None, contexto=""):
    if isinstance(valor, bool) or not isinstance(valor, (str, int, float)):
        return False

    valor_texto = str(valor).strip()
    mensaje_normalizado = _normalizar_para_comparar(mensaje)
    texto_con_contexto = _normalizar_para_comparar(f"{mensaje} {contexto}")

    if clave in CLAVES_COMPARTIDAS and seccion in PALABRAS_DE_SECCION:
        if PALABRAS_DE_SECCION[seccion] not in texto_con_contexto:
            return False

    if clave in ("documento", "documento_representante"):
        if (
            clave == "documento_representante"
            and "representante" not in texto_con_contexto
        ):
            return False
        digitos_valor = _solo_digitos(valor_texto)
        documentos_del_mensaje = {
            _solo_digitos(documento)
            for documento in re.findall(r"\d+(?:[.\-]\d+)*", mensaje)
        }
        return bool(digitos_valor) and digitos_valor in documentos_del_mensaje

    if clave in CLAVES_DE_FECHA:
        fecha = _interpretar_fecha(valor)
        return fecha is not None and fecha in _fechas_del_mensaje(mensaje)

    if clave in CLAVES_NUMERICAS:
        numero = _interpretar_numero(valor)
        return numero is not None and numero in _numeros_del_mensaje(mensaje)

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
    return bool(valor_normalizado) and valor_normalizado in mensaje_normalizado


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
    Escribí las fechas con formato AAAA-MM-DD.
    Escribí los importes y la cantidad de cuotas como números,
    sin símbolos ni separadores de miles.
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
                valor, mensaje, clave, seccion, contexto
            ):
                continue

            valor = _normalizar_valor(valor, clave)

            if str(valor).lower() in invalidos:
                continue

            resultado.setdefault(seccion, {})[clave] = valor

    for seccion, campos in _domicilios_explicitos(mensaje).items():
        resultado.setdefault(seccion, {})["domicilio"] = campos

    return resultado

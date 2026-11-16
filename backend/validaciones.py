import re
from collections.abc import Mapping
from datetime import date
from decimal import Decimal, InvalidOperation

from backend.campos_contrato import CAMPOS_CONTRATO


def _datos_seccion(datos, seccion):
    """Devuelve los datos de una sección si tienen la estructura esperada."""

    valor = datos.get(seccion, {})
    return valor if isinstance(valor, Mapping) else {}


def _esta_vacio(valor):
    return valor is None or str(valor).strip() == ""


def detectar_campos_faltantes(datos):
    """Identifica los campos obligatorios que todavía están vacíos."""

    faltantes = {}

    for seccion, campos in CAMPOS_CONTRATO.items():
        datos_seccion = _datos_seccion(datos, seccion)

        for clave, nombre_campo in campos.items():
            if _esta_vacio(datos_seccion.get(clave)):
                faltantes.setdefault(seccion, []).append(nombre_campo)

    return faltantes


def solo_digitos(valor):
    """Elimina espacios, puntos y guiones de un documento."""

    return str(valor).replace(" ", "").replace(".", "").replace("-", "")


def _cuit_tiene_digito_verificador_valido(digitos):
    ponderaciones = (5, 4, 3, 2, 7, 6, 5, 4, 3, 2)
    suma = sum(int(digito) * peso for digito, peso in zip(digitos[:10], ponderaciones))
    resto = suma % 11
    verificador = 11 - resto

    if verificador == 11:
        verificador = 0
    elif verificador == 10:
        verificador = 9

    return int(digitos[-1]) == verificador


def validar_documento(valor, permitir_cuit=True):
    texto = str(valor).strip()
    patrones_dni = (r"\d{7,8}", r"\d{1,2}(?:\.\d{3}){2}")
    patrones_cuit = (
        r"\d{11}",
        r"\d{2}-\d{8}-\d",
        r"\d{2}\.\d{8}-\d",
    )
    formatos_validos = patrones_dni + (patrones_cuit if permitir_cuit else ())

    if not any(re.fullmatch(patron, texto) for patron in formatos_validos):
        digitos = solo_digitos(texto)

        if not digitos.isdigit():
            return "El documento debe contener solamente números y separadores válidos."

        if permitir_cuit:
            return "Debe tener 7 u 8 dígitos (DNI) o 11 dígitos (CUIT) con formato válido."
        return "Debe tener 7 u 8 dígitos de DNI con formato válido."

    digitos = solo_digitos(texto)

    if len(digitos) == 11 and not _cuit_tiene_digito_verificador_valido(digitos):
        return "El CUIT no tiene un dígito verificador válido."

    return None


def validar_fecha(valor):
    """Comprueba que la fecha exista y tenga formato AAAA-MM-DD."""

    texto = str(valor)

    if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", texto):
        return "Ingrese una fecha válida con formato AAAA-MM-DD."

    try:
        date.fromisoformat(texto)
    except ValueError:
        return "Ingrese una fecha válida con formato AAAA-MM-DD."

    return None


def validar_importe(valor):
    try:
        numero = Decimal(str(valor))
    except (InvalidOperation, ValueError, TypeError):
        return "Ingrese un importe numérico válido."

    if not numero.is_finite():
        return "Ingrese un importe numérico válido."

    if numero <= 0:
        return "El importe debe ser mayor que cero."

    return None


def validar_cantidad_cuotas(valor):
    try:
        numero = Decimal(str(valor))
    except (InvalidOperation, ValueError, TypeError):
        return "Ingrese una cantidad de cuotas válida."

    if not numero.is_finite():
        return "Ingrese una cantidad de cuotas válida."

    if numero != numero.to_integral_value():
        return "La cantidad de cuotas debe ser un número entero."

    if numero < 1:
        return "Debe haber al menos una cuota."

    return None


def validar_contrato(datos):
    """Comprueba formatos y coherencia sin confundir faltantes con errores."""

    errores = {}
    validadores = {
        ("contrato", "fecha_celebracion"): validar_fecha,
        ("parte_contratante", "documento"): validar_documento,
        ("parte_contratante", "documento_representante"):
            lambda valor: validar_documento(valor, permitir_cuit=False),
        ("parte_prestadora", "documento"): validar_documento,
        ("plazo", "fecha_inicio"): validar_fecha,
        ("plazo", "fecha_fin"): validar_fecha,
        ("honorarios", "importe_total"): validar_importe,
        ("honorarios", "cantidad_cuotas"): validar_cantidad_cuotas,
        ("honorarios", "importe_cuota"): validar_importe,
    }

    for (seccion, clave), validador in validadores.items():
        valor = _datos_seccion(datos, seccion).get(clave)

        if _esta_vacio(valor):
            continue

        mensaje = validador(valor)
        if mensaje:
            errores[f"{seccion}.{clave}"] = mensaje

    datos_plazo = _datos_seccion(datos, "plazo")
    inicio = datos_plazo.get("fecha_inicio")
    fin = datos_plazo.get("fecha_fin")

    if not _esta_vacio(inicio) and not _esta_vacio(fin):
        if (
            validar_fecha(inicio) is None
            and validar_fecha(fin) is None
            and date.fromisoformat(str(fin)) <= date.fromisoformat(str(inicio))
        ):
            errores["plazo.fecha_fin"] = (
                "La fecha de finalización debe ser posterior "
                "a la fecha de inicio."
            )

    honorarios = _datos_seccion(datos, "honorarios")
    total = honorarios.get("importe_total")
    cuotas = honorarios.get("cantidad_cuotas")
    importe_cuota = honorarios.get("importe_cuota")
    claves_honorarios = (
        "honorarios.importe_total",
        "honorarios.cantidad_cuotas",
        "honorarios.importe_cuota",
    )

    if (
        all(not _esta_vacio(valor) for valor in (total, cuotas, importe_cuota))
        and not any(clave in errores for clave in claves_honorarios)
    ):
        diferencia = abs(
            Decimal(str(total))
            - Decimal(str(cuotas)) * Decimal(str(importe_cuota))
        )

        if diferencia > Decimal("0.01"):
            errores["honorarios.importe_cuota"] = (
                "La cantidad de cuotas por el importe de cada cuota "
                "no coincide con el importe total."
            )

    return errores

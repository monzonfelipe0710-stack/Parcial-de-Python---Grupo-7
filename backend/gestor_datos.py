
from backend.campos_contrato import CAMPOS_CONTRATO


# Crear una estructura vacía para almacenar los datos
def crear_datos_contrato():

    datos = {}

    for seccion, campos in CAMPOS_CONTRATO.items():
        datos[seccion] = {}

        for clave in campos:
            datos[seccion][clave] = ""

    return datos


# Actualizar los datos proporcionados por el empleado
def actualizar_datos(datos_actuales, nuevos_datos, sobrescribir=False):

    for seccion, campos in nuevos_datos.items():

        # Comprobar que la sección exista
        if seccion not in CAMPOS_CONTRATO:
            continue

        for clave, valor in campos.items():

            # Comprobar que el campo esté permitido
            if clave not in CAMPOS_CONTRATO[seccion]:
                continue

            # Guardar el dato si tiene contenido
            if valor is not None and str(valor).strip() != "":
                if isinstance(valor, (int, float)) and not isinstance(valor, bool):
                    valor = str(valor)

                valor_actual = datos_actuales[seccion].get(clave)
                # Por defecto no se pisa lo ya cargado; "sobrescribir" se usa
                # solo con datos que Python ya supervisó y aprobó.
                if (
                    sobrescribir
                    or valor_actual is None
                    or str(valor_actual).strip() == ""
                ):
                    datos_actuales[seccion][clave] = valor

    return datos_actuales

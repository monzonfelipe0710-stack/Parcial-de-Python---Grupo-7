
from backend.campos_contrato import CAMPOS_CONTRATO


# Verificar qué datos obligatorios faltan
def detectar_campos_faltantes(datos):

    faltantes = {}

    # Recorremos las secciones del contrato
    for seccion, campos in CAMPOS_CONTRATO.items():

        # Obtenemos los datos de esa sección
        datos_seccion = datos.get(seccion, {})

        # Revisamos cada campo obligatorio
        for clave, nombre_campo in campos.items():

            valor = datos_seccion.get(clave)

            # Si el campo está vacío, lo registramos
            if valor is None or str(valor).strip() == "":
                faltantes.setdefault(seccion, []).append(nombre_campo)

    return faltantes

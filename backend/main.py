from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any, Literal

import requests
from fastapi import FastAPI, Header, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

from backend import almacen, documentos, gestor_datos, ia, validaciones
from backend.campos_contrato import CAMPOS_CONTRATO, MODELO_CONTRATO


class DatosContratoRequest(BaseModel):
    datos: dict[str, Any]


class MensajeHistorial(BaseModel):
    rol: Literal["usuario", "asistente"]
    texto: str


class MensajeAsistenteRequest(BaseModel):
    mensaje: str = Field(min_length=1)
    historial: list[MensajeHistorial] = Field(default_factory=list)
    datos: dict[str, Any] = Field(default_factory=dict)


@asynccontextmanager
async def lifespan(_app):
    almacen.inicializar_base_datos()
    yield


app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "OPTIONS"],
    allow_headers=["Content-Type", "X-Perfil"],
)


def _normalizar_datos(datos):
    normalizados = gestor_datos.crear_datos_contrato()
    secciones_validas = {
        seccion: campos
        for seccion, campos in datos.items()
        if seccion in CAMPOS_CONTRATO and isinstance(campos, dict)
    }
    return gestor_datos.actualizar_datos(normalizados, secciones_validas)


def _obtener_contrato_o_404(identificador):
    contrato = almacen.obtener_contrato(identificador)
    if contrato is None:
        raise HTTPException(status_code=404, detail="No se encontró el contrato solicitado.")
    return contrato


def _agregar_evento(contrato, usuario, accion):
    momento = almacen.fecha_actual()
    contrato["actualizadoEn"] = momento
    contrato["historial"].append(
        {"fecha": momento, "usuario": usuario, "accion": accion}
    )


def _validar_para_generar(datos):
    faltantes = validaciones.detectar_campos_faltantes(datos)
    errores = validaciones.validar_contrato(datos)
    if faltantes or errores:
        raise HTTPException(
            status_code=422,
            detail={
                "message": "El contrato tiene datos faltantes o inválidos.",
                "faltantes": faltantes,
                "errores": errores,
            },
        )


def _guardar_borrador(datos, identificador=None):
    datos_normalizados = _normalizar_datos(datos)
    if identificador is None:
        return almacen.crear_contrato(
            modelo=MODELO_CONTRATO["codigo"],
            estado="borrador",
            creado_por="Empleado",
            datos=datos_normalizados,
            accion="Borrador creado",
        )

    contrato = _obtener_contrato_o_404(identificador)
    if contrato["estado"] != "borrador":
        raise HTTPException(
            status_code=409,
            detail="Solo se pueden modificar contratos en estado borrador.",
        )
    contrato["datos"] = datos_normalizados
    _agregar_evento(contrato, "Empleado", "Borrador guardado")
    return almacen.guardar_contrato(contrato)


def _generar_contrato(datos, identificador=None):
    datos_normalizados = _normalizar_datos(datos)
    _validar_para_generar(datos_normalizados)

    if identificador is None:
        contrato = almacen.crear_contrato(
            modelo=MODELO_CONTRATO["codigo"],
            estado="borrador",
            creado_por="Empleado",
            datos=datos_normalizados,
            accion="Datos del contrato cargados como borrador",
        )
    else:
        contrato = _obtener_contrato_o_404(identificador)
        if contrato["estado"] != "borrador":
            raise HTTPException(
                status_code=409,
                detail="Solo se pueden generar contratos en estado borrador.",
            )
        contrato["datos"] = datos_normalizados

    try:
        documentos.generar_documento_contrato(contrato)
    except (OSError, ValueError, KeyError) as error:
        raise HTTPException(
            status_code=500,
            detail=f"No se pudo generar el documento Word: {error}",
        ) from error

    contrato["estado"] = "pendiente_revision"
    _agregar_evento(
        contrato,
        "Empleado",
        "Contrato generado y enviado a revisión",
    )
    return almacen.guardar_contrato(contrato)


@app.get("/")
def inicio():
    return {"mensaje": "Sistema de contratos de Acosta & Asociados"}


@app.get("/api/estado")
def estado():
    return {"estado": "Backend funcionando correctamente"}


@app.get("/api/modelo")
def obtener_modelo():
    return dict(MODELO_CONTRATO)


@app.get("/api/contratos")
def listar_contratos():
    return almacen.listar_contratos()


@app.post("/api/contratos/borradores")
def crear_borrador(solicitud: DatosContratoRequest):
    return _guardar_borrador(solicitud.datos)


@app.put("/api/contratos/{identificador}/borrador")
def actualizar_borrador(identificador: str, solicitud: DatosContratoRequest):
    return _guardar_borrador(solicitud.datos, identificador)


@app.post("/api/contratos/generar")
def generar_contrato(solicitud: DatosContratoRequest):
    return _generar_contrato(solicitud.datos)


@app.post("/api/contratos/{identificador}/generar")
def generar_borrador(identificador: str, solicitud: DatosContratoRequest):
    return _generar_contrato(solicitud.datos, identificador)


@app.get("/api/contratos/{identificador}")
def obtener_contrato(identificador: str):
    return _obtener_contrato_o_404(identificador)


@app.post("/api/asistente/mensaje")
def conversar_con_asistente(solicitud: MensajeAsistenteRequest):
    mensaje = solicitud.mensaje.strip()
    if not mensaje:
        raise HTTPException(status_code=422, detail="El mensaje no puede estar vacío.")

    datos = _normalizar_datos(solicitud.datos)

    historial = [
        {
            "role": "assistant" if item.rol == "asistente" else "user",
            "content": item.texto,
        }
        for item in solicitud.historial
    ]
    if (
        historial
        and historial[-1]["role"] == "user"
        and historial[-1]["content"].strip() == mensaje
    ):
        historial.pop()

    pregunta_previa = ""
    for item in reversed(historial):
        if item["role"] == "assistant":
            pregunta_previa = item["content"]
            break

    try:
        extraidos = ia.extraer_datos(mensaje, contexto=pregunta_previa)
    except ValueError:
        # JSON inválido o incompleto: no se inventa nada, se deja todo pendiente
        # y el asistente vuelve a pedir los datos que falten.
        extraidos = {}
    except requests.RequestException as error:
        raise HTTPException(
            status_code=502,
            detail=f"No se pudieron extraer los datos con Ollama: {error}",
        ) from error

    # Python decide qué propuestas de la IA cumplen las reglas y pueden guardarse.
    aceptados, rechazados = validaciones.supervisar_datos_propuestos(datos, extraidos)
    gestor_datos.actualizar_datos(datos, aceptados, sobrescribir=True)

    faltantes = validaciones.detectar_campos_faltantes(datos)
    errores = validaciones.validar_contrato(datos)
    for clave, motivo in rechazados.items():
        errores.setdefault(clave, motivo)
    campos_pendientes = [
        f"{seccion}: {nombre}"
        for seccion, nombres in faltantes.items()
        for nombre in nombres
    ]
    problemas = [
        f"{clave}: {detalle}"
        for clave, detalle in errores.items()
    ]

    try:
        texto_respuesta = ia.consultar_ia(
            mensaje=mensaje,
            historial=historial,
            documentos=documentos.cargar_documentos_para_ia(),
            campos_faltantes=campos_pendientes,
            errores_validacion=problemas,
            datos_actuales=datos,
        )
    except (requests.RequestException, KeyError, OSError) as error:
        raise HTTPException(
            status_code=502,
            detail=f"No se pudo obtener una respuesta de Ollama: {error}",
        ) from error

    return {
        "respuesta": texto_respuesta,
        "faltantes": faltantes,
        "errores": errores,
        "datos": datos,
    }


@app.post("/api/contratos/{identificador}/aprobar")
def aprobar_contrato(
    identificador: str,
    perfil: str = Header(default="empleado", alias="X-Perfil"),
):
    if perfil != "profesional":
        raise HTTPException(
            status_code=403,
            detail="Solo un profesional autorizado puede aprobar contratos.",
        )

    contrato = _obtener_contrato_o_404(identificador)
    if contrato["estado"] != "pendiente_revision":
        raise HTTPException(
            status_code=409,
            detail="Solo se pueden aprobar contratos pendientes de revisión.",
        )

    momento = almacen.fecha_actual()
    contrato["estado"] = "aprobado"
    contrato["actualizadoEn"] = momento
    contrato["revision"] = {
        "profesional": "Profesional autorizado",
        "fecha": momento,
    }
    contrato["historial"].append(
        {
            "fecha": momento,
            "usuario": "Profesional autorizado",
            "accion": "Contrato aprobado por profesional autorizado",
        }
    )
    return almacen.guardar_contrato(contrato)


@app.get("/api/contratos/{identificador}/exportar")
def exportar_contrato(
    identificador: str,
    formato: Literal["docx", "pdf"] = Query(...),
):
    contrato = _obtener_contrato_o_404(identificador)
    if contrato["estado"] != "aprobado":
        raise HTTPException(
            status_code=409,
            detail="Solo se pueden exportar contratos aprobados.",
        )

    if formato == "pdf":
        ruta_docx = documentos.DIRECTORIO_GENERADOS / f"{identificador}.docx"
        if not ruta_docx.is_file():
            raise HTTPException(status_code=404, detail="No se encontró el documento Word generado.")
        try:
            ruta = documentos.generar_documento_pdf(contrato)
        except Exception as error:
            raise HTTPException(status_code=500, detail=f"No se pudo generar el PDF: {error}") from error
        media_type = "application/pdf"
        nombre = f"contrato-{identificador}.pdf"
    else:
        ruta = documentos.DIRECTORIO_GENERADOS / f"{identificador}.docx"
        if not ruta.is_file():
            raise HTTPException(status_code=404, detail="No se encontró el documento Word generado.")
        media_type = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        nombre = f"contrato-{identificador}.docx"

    return FileResponse(path=Path(ruta), media_type=media_type, filename=nombre)
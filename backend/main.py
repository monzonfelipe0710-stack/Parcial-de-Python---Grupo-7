from contextlib import asynccontextmanager
from typing import Any, Literal

import requests
from fastapi import Depends, FastAPI, Header, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel, Field

from backend import almacen, autenticacion, documentos, gestor_datos, ia, validaciones
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


class RegistroRequest(BaseModel):
    nombre: str = Field(min_length=2)
    email: str = Field(min_length=3)
    password: str = Field(min_length=1)
    rol: Literal["empleado", "profesional"] = "empleado"


class LoginRequest(BaseModel):
    email: str = Field(min_length=3)
    password: str = Field(min_length=1)


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
    allow_headers=["Content-Type", "Authorization"],
)


def _token_de_cabecera(authorization):
    if not authorization:
        return None
    partes = authorization.split(" ", 1)
    if len(partes) != 2 or partes[0].lower() != "bearer":
        return None
    return partes[1].strip() or None


def usuario_actual(authorization: str | None = Header(default=None)) -> dict:
    """Dependencia que exige una sesión válida (Authorization: Bearer)."""

    token = _token_de_cabecera(authorization)
    usuario = autenticacion.usuario_por_token(token) if token else None
    if usuario is None:
        raise HTTPException(
            status_code=401,
            detail="Se requiere iniciar sesión.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return usuario


def requerir_profesional(usuario: dict = Depends(usuario_actual)) -> dict:
    """Dependencia que exige que la cuenta sea de un profesional autorizado."""

    if usuario.get("rol") != "profesional":
        raise HTTPException(
            status_code=403,
            detail="Solo un profesional autorizado puede realizar esta acción.",
        )
    return usuario


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


def _datos_usuario(usuario):
    if isinstance(usuario, dict):
        return {
            "id": usuario.get("id"),
            "nombre": usuario.get("nombre") or "Empleado",
            "rol": usuario.get("rol"),
        }
    return {"id": None, "nombre": usuario or "Empleado", "rol": None}


def _auditar(usuario, accion, detalle=None):
    """Registra en la auditoría. Se ignora si no hay un usuario real (llamadas internas)."""

    if not isinstance(usuario, dict):
        return
    almacen.registrar_evento(usuario, accion, detalle)


def _campos_aportados(datos, previos=None):
    """Lista los campos con datos que cambiaron respecto de la versión previa."""

    campos = []
    for seccion, claves in CAMPOS_CONTRATO.items():
        for clave in claves:
            nuevo = (datos.get(seccion) or {}).get(clave, "")
            if nuevo is None or str(nuevo).strip() == "":
                continue
            anterior = (previos or {}).get(seccion, {}).get(clave, "")
            if str(nuevo) != str(anterior or ""):
                campos.append(f"{seccion}.{clave}")
    return campos


def _agregar_evento(contrato, usuario, accion, campos=None):
    momento = almacen.fecha_actual()
    datos_usuario = _datos_usuario(usuario)
    contrato["actualizadoEn"] = momento
    evento = {
        "fecha": momento,
        "usuario": datos_usuario["nombre"],
        "accion": accion,
    }
    if datos_usuario["id"] is not None:
        evento["usuarioId"] = datos_usuario["id"]
    if datos_usuario["rol"]:
        evento["rol"] = datos_usuario["rol"]
    if campos:
        evento["campos"] = campos
    contrato["historial"].append(evento)


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


def _guardar_borrador(datos, identificador=None, usuario=None):
    datos_normalizados = _normalizar_datos(datos)
    datos_usuario = _datos_usuario(usuario)

    if identificador is None:
        return almacen.crear_contrato(
            modelo=MODELO_CONTRATO["codigo"],
            estado="borrador",
            creado_por=datos_usuario["nombre"],
            datos=datos_normalizados,
            accion="Borrador creado",
            usuario_id=datos_usuario["id"],
            rol=datos_usuario["rol"],
            campos=_campos_aportados(datos_normalizados),
        )

    contrato = _obtener_contrato_o_404(identificador)
    if contrato["estado"] != "borrador":
        raise HTTPException(
            status_code=409,
            detail="Solo se pueden modificar contratos en estado borrador.",
        )
    campos = _campos_aportados(datos_normalizados, contrato.get("datos"))
    contrato["datos"] = datos_normalizados
    _agregar_evento(contrato, usuario, "Borrador guardado", campos=campos)
    return almacen.guardar_contrato(contrato)


def _generar_contrato(datos, identificador=None, usuario=None):
    datos_normalizados = _normalizar_datos(datos)
    _validar_para_generar(datos_normalizados)
    datos_usuario = _datos_usuario(usuario)

    if identificador is None:
        contrato = almacen.crear_contrato(
            modelo=MODELO_CONTRATO["codigo"],
            estado="borrador",
            creado_por=datos_usuario["nombre"],
            datos=datos_normalizados,
            accion="Datos del contrato cargados como borrador",
            usuario_id=datos_usuario["id"],
            rol=datos_usuario["rol"],
            campos=_campos_aportados(datos_normalizados),
        )
        campos = None
    else:
        contrato = _obtener_contrato_o_404(identificador)
        if contrato["estado"] != "borrador":
            raise HTTPException(
                status_code=409,
                detail="Solo se pueden generar contratos en estado borrador.",
            )
        campos = _campos_aportados(datos_normalizados, contrato.get("datos"))
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
        usuario,
        "Contrato generado y enviado a revisión",
        campos=campos,
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


# --- Autenticación ---


@app.post("/api/auth/registro", status_code=201)
def registrar_cuenta(solicitud: RegistroRequest):
    try:
        usuario = autenticacion.registrar_usuario(
            nombre=solicitud.nombre,
            email=solicitud.email,
            password=solicitud.password,
            rol=solicitud.rol,
        )
    except autenticacion.ErrorAutenticacion as error:
        raise HTTPException(status_code=error.codigo, detail=error.mensaje) from error

    token = autenticacion.crear_sesion(usuario["id"])
    _auditar(usuario, "Registro de cuenta")
    return {"usuario": usuario, "token": token}


@app.post("/api/auth/login")
def iniciar_sesion(solicitud: LoginRequest):
    try:
        usuario, token = autenticacion.iniciar_sesion(
            email=solicitud.email,
            password=solicitud.password,
        )
    except autenticacion.ErrorAutenticacion as error:
        raise HTTPException(status_code=error.codigo, detail=error.mensaje) from error

    _auditar(usuario, "Inicio de sesión")
    return {"usuario": usuario, "token": token}


@app.post("/api/auth/logout")
def cerrar_sesion(authorization: str | None = Header(default=None)):
    autenticacion.cerrar_sesion(_token_de_cabecera(authorization))
    return {"mensaje": "Sesión cerrada."}


@app.get("/api/auth/yo")
def obtener_usuario_actual(usuario: dict = Depends(usuario_actual)):
    return usuario


@app.get("/api/auditoria")
def obtener_auditoria(usuario: dict = Depends(requerir_profesional)):
    return almacen.listar_auditoria()


@app.get("/api/contratos")
def listar_contratos(usuario: dict = Depends(usuario_actual)):
    return almacen.listar_contratos()


@app.post("/api/contratos/borradores")
def crear_borrador(
    solicitud: DatosContratoRequest,
    usuario: dict = Depends(usuario_actual),
):
    return _guardar_borrador(solicitud.datos, usuario=usuario)


@app.put("/api/contratos/{identificador}/borrador")
def actualizar_borrador(
    identificador: str,
    solicitud: DatosContratoRequest,
    usuario: dict = Depends(usuario_actual),
):
    return _guardar_borrador(solicitud.datos, identificador, usuario=usuario)


@app.post("/api/contratos/generar")
def generar_contrato(
    solicitud: DatosContratoRequest,
    usuario: dict = Depends(usuario_actual),
):
    return _generar_contrato(solicitud.datos, usuario=usuario)


@app.post("/api/contratos/{identificador}/generar")
def generar_borrador(
    identificador: str,
    solicitud: DatosContratoRequest,
    usuario: dict = Depends(usuario_actual),
):
    return _generar_contrato(solicitud.datos, identificador, usuario=usuario)


@app.get("/api/contratos/{identificador}")
def obtener_contrato(
    identificador: str,
    usuario: dict = Depends(usuario_actual),
):
    return _obtener_contrato_o_404(identificador)


@app.post("/api/asistente/mensaje")
def conversar_con_asistente(
    solicitud: MensajeAsistenteRequest,
    usuario: dict = Depends(usuario_actual),
):
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

    # Auditoría: quién envió el mensaje, qué se aceptó y cuándo.
    _auditar(
        usuario,
        "Mensaje al asistente",
        detalle={
            "mensaje": mensaje,
            "datosAceptados": aceptados,
            "datosRechazados": rechazados,
        },
    )

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
    usuario: dict = Depends(requerir_profesional),
):
    contrato = _obtener_contrato_o_404(identificador)
    if contrato["estado"] != "pendiente_revision":
        raise HTTPException(
            status_code=409,
            detail="Solo se pueden aprobar contratos pendientes de revisión.",
        )

    momento = almacen.fecha_actual()
    contrato["estado"] = "aprobado"
    contrato["revision"] = {
        "profesional": usuario["nombre"],
        "fecha": momento,
    }
    _agregar_evento(contrato, usuario, "Contrato aprobado por profesional autorizado")
    contrato = almacen.guardar_contrato(contrato)
    _auditar(
        usuario,
        "Contrato aprobado",
        detalle={"contrato": identificador},
    )
    return contrato


@app.get("/api/contratos/{identificador}/exportar")
def exportar_contrato(
    identificador: str,
    formato: Literal["docx", "pdf"] = Query(...),
    usuario: dict = Depends(usuario_actual),
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

    contenido = documentos.leer_archivo_generado(ruta)
    return Response(
        content=contenido,
        media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename="{nombre}"'},
    )
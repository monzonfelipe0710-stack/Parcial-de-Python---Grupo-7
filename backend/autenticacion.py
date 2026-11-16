
import hashlib
import hmac
import os
import re
import secrets
from datetime import datetime, timedelta, timezone

from backend import almacen


ROLES_VALIDOS = ("empleado", "profesional")
ITERACIONES = 120_000
DIAS_SESION = 7
LONGITUD_MINIMA_PASSWORD = 8
PATRON_EMAIL = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


class ErrorAutenticacion(Exception):
    """Error de autenticación con el código HTTP sugerido."""

    def __init__(self, mensaje, codigo=400):
        super().__init__(mensaje)
        self.mensaje = mensaje
        self.codigo = codigo


def _hash_password(password):
    sal = os.urandom(16)
    derivada = hashlib.pbkdf2_hmac(
        "sha256", password.encode("utf-8"), sal, ITERACIONES
    )
    return f"pbkdf2_sha256${ITERACIONES}${sal.hex()}${derivada.hex()}"


def verificar_password(password, almacenado):
    """Compara una contraseña con el hash guardado."""

    try:
        algoritmo, iteraciones, sal_hex, hash_hex = str(almacenado).split("$")
        if algoritmo != "pbkdf2_sha256":
            return False
        derivada = hashlib.pbkdf2_hmac(
            "sha256",
            str(password).encode("utf-8"),
            bytes.fromhex(sal_hex),
            int(iteraciones),
        )
    except (ValueError, TypeError):
        return False

    return hmac.compare_digest(derivada.hex(), hash_hex)


def _usuario_publico(usuario):
    if usuario is None:
        return None
    return {
        "id": usuario["id"],
        "nombre": usuario["nombre"],
        "email": usuario["email"],
        "rol": usuario["rol"],
        "creadoEn": usuario.get("creadoEn") or usuario.get("creado_en"),
    }


def registrar_usuario(nombre, email, password, rol="empleado"):
    """Valida los datos, guarda la contraseña hasheada y devuelve el usuario."""

    nombre = str(nombre).strip()
    email = str(email).strip().casefold()
    rol = str(rol).strip().casefold()

    if len(nombre) < 2:
        raise ErrorAutenticacion("Ingrese un nombre de al menos 2 caracteres.")

    if not PATRON_EMAIL.fullmatch(email):
        raise ErrorAutenticacion("Ingrese un correo electrónico válido.")

    if len(str(password)) < LONGITUD_MINIMA_PASSWORD:
        raise ErrorAutenticacion(
            f"La contraseña debe tener al menos {LONGITUD_MINIMA_PASSWORD} caracteres."
        )

    if rol not in ROLES_VALIDOS:
        raise ErrorAutenticacion("El rol seleccionado no es válido.")

    if almacen.obtener_usuario_por_email(email) is not None:
        raise ErrorAutenticacion("Ya existe una cuenta con ese correo.", 409)

    usuario = almacen.crear_usuario(
        nombre=nombre,
        email=email,
        password_hash=_hash_password(password),
        rol=rol,
    )
    return _usuario_publico(usuario)


def autenticar(email, password):
    """Verifica credenciales y devuelve el usuario o lanza ErrorAutenticacion."""

    email = str(email).strip().casefold()
    usuario = almacen.obtener_usuario_por_email(email)

    if usuario is None or not verificar_password(password, usuario["password_hash"]):
        raise ErrorAutenticacion("Correo o contraseña incorrectos.", 401)

    return _usuario_publico(usuario)


def crear_sesion(usuario_id):
    """Genera un token de sesión y lo guarda en SQLite."""

    token = secrets.token_urlsafe(32)
    creado = datetime.now(timezone.utc)
    expira = creado + timedelta(days=DIAS_SESION)
    almacen.guardar_sesion(
        token=token,
        usuario_id=usuario_id,
        creado_en=creado.isoformat(timespec="seconds"),
        expira_en=expira.isoformat(timespec="seconds"),
    )
    return token


def usuario_por_token(token):
    """Devuelve el usuario de una sesión válida o None."""

    if not token:
        return None

    sesion = almacen.obtener_sesion(token)
    if sesion is None:
        return None

    try:
        if datetime.fromisoformat(sesion["expira_en"]) < datetime.now(timezone.utc):
            almacen.eliminar_sesion(token)
            return None
    except (ValueError, TypeError):
        almacen.eliminar_sesion(token)
        return None

    return _usuario_publico(almacen.obtener_usuario_por_id(sesion["usuario_id"]))


def cerrar_sesion(token):
    if token:
        almacen.eliminar_sesion(token)


def iniciar_sesion(email, password):
    """Autentica y devuelve (usuario, token)."""

    usuario = autenticar(email, password)
    token = crear_sesion(usuario["id"])
    return usuario, token

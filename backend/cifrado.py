
import base64
import hashlib
import os

try:  # La dependencia es opcional: sin ella el sistema funciona en claro.
    from cryptography.fernet import Fernet, InvalidToken
except ImportError:  # pragma: no cover - depende del entorno
    Fernet = None

    class InvalidToken(Exception):
        pass


NOMBRE_VARIABLE_CLAVE = "CLAVE_CIFRADO"


def _clave():
    return os.environ.get(NOMBRE_VARIABLE_CLAVE, "").strip()


def cifrado_activo():
    """El cifrado se activa solo si hay clave configurada y cryptography disponible."""

    return bool(_clave()) and Fernet is not None


def _fernet():
    clave = _clave().encode("utf-8")
    try:
        return Fernet(clave)
    except (ValueError, TypeError):
        # Acepta cualquier secreto: deriva una clave válida de 32 bytes.
        derivada = base64.urlsafe_b64encode(hashlib.sha256(clave).digest())
        return Fernet(derivada)


def cifrar_bytes(datos):
    if not cifrado_activo():
        return datos
    return _fernet().encrypt(bytes(datos))


def descifrar_bytes(datos):
    if not cifrado_activo():
        return bytes(datos)
    try:
        return _fernet().decrypt(bytes(datos))
    except (InvalidToken, ValueError, TypeError):
        # Compatibilidad con datos guardados antes de activar el cifrado.
        return bytes(datos)


def cifrar_texto(texto):
    if not cifrado_activo():
        return texto
    return base64.urlsafe_b64encode(cifrar_bytes(str(texto).encode("utf-8"))).decode(
        "ascii"
    )


def descifrar_texto(texto):
    if not cifrado_activo():
        return texto

    try:
        crudo = base64.urlsafe_b64decode(str(texto).encode("ascii"))
    except (ValueError, TypeError):
        return texto

    try:
        return _fernet().decrypt(crudo).decode("utf-8")
    except (InvalidToken, ValueError, TypeError):
        return texto

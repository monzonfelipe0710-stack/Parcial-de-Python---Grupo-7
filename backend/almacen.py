
import json
import sqlite3
from datetime import datetime, timezone
from pathlib import Path

from backend import cifrado

RUTA_BASE_DATOS = Path(__file__).resolve().parent / "contratos.sqlite3"


def conectar():
    conexion = sqlite3.connect(RUTA_BASE_DATOS)
    conexion.row_factory = sqlite3.Row
    return conexion


def inicializar_base_datos():
    with conectar() as conexion:
        conexion.execute(
            """
            CREATE TABLE IF NOT EXISTS contratos (
                id TEXT PRIMARY KEY,
                contenido TEXT NOT NULL
            )
            """
        )
        conexion.execute(
            """
            CREATE TABLE IF NOT EXISTS usuarios (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nombre TEXT NOT NULL,
                email TEXT NOT NULL UNIQUE,
                password_hash TEXT NOT NULL,
                rol TEXT NOT NULL,
                creado_en TEXT NOT NULL
            )
            """
        )
        conexion.execute(
            """
            CREATE TABLE IF NOT EXISTS sesiones (
                token TEXT PRIMARY KEY,
                usuario_id INTEGER NOT NULL,
                creado_en TEXT NOT NULL,
                expira_en TEXT NOT NULL,
                FOREIGN KEY (usuario_id) REFERENCES usuarios (id)
            )
            """
        )
        conexion.execute(
            """
            CREATE TABLE IF NOT EXISTS auditoria (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                usuario_id INTEGER,
                usuario_nombre TEXT,
                rol TEXT,
                accion TEXT NOT NULL,
                detalle TEXT,
                fecha TEXT NOT NULL
            )
            """
        )


def fecha_actual():
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def _siguiente_numero(conexion):
    fila = conexion.execute(
        "SELECT id FROM contratos ORDER BY id DESC LIMIT 1"
    ).fetchone()
    if not fila:
        return 1
    try:
        return int(str(fila["id"]).split("-")[-1]) + 1
    except ValueError:
        return conexion.execute("SELECT COUNT(*) FROM contratos").fetchone()[0] + 1


def _serializar(contrato):
    return cifrado.cifrar_texto(json.dumps(contrato, ensure_ascii=False))


def _deserializar(contenido):
    return json.loads(cifrado.descifrar_texto(contenido))


def crear_contrato(
    modelo,
    estado,
    creado_por,
    datos,
    accion,
    usuario_id=None,
    rol=None,
    campos=None,
):
    momento = fecha_actual()
    with conectar() as conexion:
        numero = _siguiente_numero(conexion)
        evento = {"fecha": momento, "usuario": creado_por, "accion": accion}
        if usuario_id is not None:
            evento["usuarioId"] = usuario_id
        if rol:
            evento["rol"] = rol
        if campos:
            evento["campos"] = list(campos)
        contrato = {
            "id": f"CTR-{numero:03d}",
            "modelo": modelo,
            "estado": estado,
            "creadoPor": creado_por,
            "creadoEn": momento,
            "actualizadoEn": momento,
            "datos": datos,
            "revision": None,
            "historial": [evento],
        }
        conexion.execute(
            "INSERT INTO contratos (id, contenido) VALUES (?, ?)",
            (contrato["id"], _serializar(contrato)),
        )
    return contrato


def guardar_contrato(contrato):
    with conectar() as conexion:
        conexion.execute(
            "INSERT OR REPLACE INTO contratos (id, contenido) VALUES (?, ?)",
            (contrato["id"], _serializar(contrato)),
        )
    return contrato


def obtener_contrato(identificador):
    with conectar() as conexion:
        fila = conexion.execute(
            "SELECT contenido FROM contratos WHERE id = ?",
            (identificador,),
        ).fetchone()
    if not fila:
        return None
    return _deserializar(fila["contenido"])


def listar_contratos():
    with conectar() as conexion:
        filas = conexion.execute(
            "SELECT contenido FROM contratos ORDER BY id DESC"
        ).fetchall()
    return [_deserializar(fila["contenido"]) for fila in filas]


# --- Usuarios y sesiones ---


def crear_usuario(nombre, email, password_hash, rol):
    momento = fecha_actual()
    with conectar() as conexion:
        cursor = conexion.execute(
            """
            INSERT INTO usuarios (nombre, email, password_hash, rol, creado_en)
            VALUES (?, ?, ?, ?, ?)
            """,
            (nombre, email, password_hash, rol, momento),
        )
        usuario_id = cursor.lastrowid
    return {
        "id": usuario_id,
        "nombre": nombre,
        "email": email,
        "rol": rol,
        "creadoEn": momento,
    }


def obtener_usuario_por_email(email):
    with conectar() as conexion:
        fila = conexion.execute(
            "SELECT * FROM usuarios WHERE email = ?",
            (email,),
        ).fetchone()
    return dict(fila) if fila else None


def obtener_usuario_por_id(usuario_id):
    with conectar() as conexion:
        fila = conexion.execute(
            "SELECT * FROM usuarios WHERE id = ?",
            (usuario_id,),
        ).fetchone()
    return dict(fila) if fila else None


def guardar_sesion(token, usuario_id, creado_en, expira_en):
    with conectar() as conexion:
        conexion.execute(
            """
            INSERT OR REPLACE INTO sesiones (token, usuario_id, creado_en, expira_en)
            VALUES (?, ?, ?, ?)
            """,
            (token, usuario_id, creado_en, expira_en),
        )


def obtener_sesion(token):
    with conectar() as conexion:
        fila = conexion.execute(
            "SELECT * FROM sesiones WHERE token = ?",
            (token,),
        ).fetchone()
    return dict(fila) if fila else None


def eliminar_sesion(token):
    with conectar() as conexion:
        conexion.execute("DELETE FROM sesiones WHERE token = ?", (token,))


# --- Auditoría ---


def registrar_evento(usuario, accion, detalle=None):
    """Guarda en la auditoría quién hizo qué, con detalle opcional."""

    momento = fecha_actual()
    usuario = usuario or {}
    detalle_json = (
        cifrado.cifrar_texto(json.dumps(detalle, ensure_ascii=False))
        if detalle is not None
        else None
    )
    with conectar() as conexion:
        conexion.execute(
            """
            INSERT INTO auditoria (usuario_id, usuario_nombre, rol, accion, detalle, fecha)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (
                usuario.get("id"),
                usuario.get("nombre"),
                usuario.get("rol"),
                accion,
                detalle_json,
                momento,
            ),
        )
    return {
        "fecha": momento,
        "usuario": usuario.get("nombre"),
        "accion": accion,
        "detalle": detalle,
    }


def listar_auditoria():
    with conectar() as conexion:
        filas = conexion.execute(
            "SELECT * FROM auditoria ORDER BY id DESC"
        ).fetchall()

    eventos = []
    for fila in filas:
        evento = dict(fila)
        if evento.get("detalle"):
            evento["detalle"] = json.loads(cifrado.descifrar_texto(evento["detalle"]))
        eventos.append(evento)
    return eventos


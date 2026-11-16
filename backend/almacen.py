
import json
import sqlite3
from datetime import datetime, timezone
from pathlib import Path

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


def crear_contrato(modelo, estado, creado_por, datos, accion):
    momento = fecha_actual()
    with conectar() as conexion:
        numero = _siguiente_numero(conexion)
        contrato = {
            "id": f"CTR-{numero:03d}",
            "modelo": modelo,
            "estado": estado,
            "creadoPor": creado_por,
            "creadoEn": momento,
            "actualizadoEn": momento,
            "datos": datos,
            "revision": None,
            "historial": [{"fecha": momento, "usuario": creado_por, "accion": accion}],
        }
        conexion.execute(
            "INSERT INTO contratos (id, contenido) VALUES (?, ?)",
            (contrato["id"], json.dumps(contrato, ensure_ascii=False)),
        )
    return contrato


def guardar_contrato(contrato):
    with conectar() as conexion:
        conexion.execute(
            "INSERT OR REPLACE INTO contratos (id, contenido) VALUES (?, ?)",
            (contrato["id"], json.dumps(contrato, ensure_ascii=False)),
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
    return json.loads(fila["contenido"])


def listar_contratos():
    with conectar() as conexion:
        filas = conexion.execute(
            "SELECT contenido FROM contratos ORDER BY id DESC"
        ).fetchall()
    return [json.loads(fila["contenido"]) for fila in filas]

import tempfile
import unittest
from pathlib import Path
from unittest.mock import Mock, patch

from docx import Document
from fastapi import HTTPException

from backend import almacen, documentos, gestor_datos, ia, validaciones
from backend.main import (
    MensajeAsistenteRequest,
    MensajeHistorial,
    _generar_contrato,
    conversar_con_asistente,
)


DATOS_VALIDOS = {
    "contrato": {"ciudad": "Rosario", "fecha_celebracion": "2026-03-15"},
    "parte_contratante": {
        "nombre": "Empresa de prueba S.A.",
        "documento": "20-12345678-6",
        "domicilio": "Calle A 123",
        "representante": "Persona Uno",
        "documento_representante": "12345678",
        "cargo_representante": "Directora",
    },
    "parte_prestadora": {
        "nombre": "Profesional de prueba",
        "documento": "12345678",
        "domicilio": "Calle B 456",
    },
    "objeto": {"servicio": "Servicio de prueba"},
    "plazo": {"fecha_inicio": "2026-04-01", "fecha_fin": "2026-09-30"},
    "honorarios": {
        "importe_total": "4800000",
        "cantidad_cuotas": "6",
        "importe_cuota": "800000",
        "vencimiento": "hasta el día 5 de cada mes",
    },
}


class BackendTests(unittest.TestCase):
    def test_extracted_values_must_be_grounded_in_the_current_user_message(self):
        mensaje = "Empresa Delta S.R.L., CUIT 20-12345678-6."

        self.assertTrue(
            ia._valor_respaldado_por_mensaje(
                "CUIT 20-12345678-6",
                mensaje,
                "documento",
            )
        )
        self.assertFalse(
            ia._valor_respaldado_por_mensaje(
                "del representante",
                mensaje,
                "documento_representante",
            )
        )
        self.assertFalse(
            ia._valor_respaldado_por_mensaje(
                "Rosario",
                "El domicilio de la empresa es San Martín 123, Rosario.",
                "ciudad",
            )
        )
        self.assertTrue(
            ia._valor_respaldado_por_mensaje(
                "Rosario",
                "La ciudad de celebración del contrato es Rosario.",
                "ciudad",
            )
        )

    def test_explicit_party_address_is_extracted_without_model_guessing(self):
        respuesta_modelo = Mock()
        respuesta_modelo.json.return_value = {"message": {"content": "{}"}}
        mensaje = (
            "El domicilio de la parte contratante es San Martín 123, "
            "Rosario, Provincia de Santa Fe."
        )

        with patch.object(ia.requests, "post", return_value=respuesta_modelo):
            datos = ia.extraer_datos(mensaje)

        self.assertEqual(
            datos,
            {
                "parte_contratante": {
                    "domicilio": "San Martín 123, Rosario, Provincia de Santa Fe"
                }
            },
        )

    def test_partial_data_accumulates_without_overwriting_existing_values(self):
        datos = gestor_datos.crear_datos_contrato()
        gestor_datos.actualizar_datos(
            datos,
            {"parte_contratante": {"nombre": "Empresa de prueba S.A."}},
        )
        gestor_datos.actualizar_datos(
            datos,
            {
                "plazo": {"fecha_inicio": "2026-04-01"},
                "otra_seccion": {"campo": "ignorado"},
            },
        )

        self.assertEqual(
            datos["parte_contratante"]["nombre"],
            "Empresa de prueba S.A.",
        )
        self.assertEqual(datos["plazo"]["fecha_inicio"], "2026-04-01")
        self.assertNotIn("otra_seccion", datos)

    def test_missing_and_invalid_contract_data_are_reported_separately(self):
        datos = gestor_datos.crear_datos_contrato()
        self.assertTrue(validaciones.detectar_campos_faltantes(datos))
        self.assertEqual(validaciones.validar_contrato(datos), {})

        datos["parte_contratante"]["documento"] = "20-12345678-9"
        datos["plazo"]["fecha_inicio"] = "2026-02-30"
        datos["honorarios"]["importe_total"] = "0"
        errores = validaciones.validar_contrato(datos)

        self.assertIn("parte_contratante.documento", errores)
        self.assertIn("plazo.fecha_inicio", errores)
        self.assertIn("honorarios.importe_total", errores)

    def test_sqlite_store_persists_contracts(self):
        directorio = tempfile.mkdtemp()
        try:
            ruta = Path(directorio) / "contratos.sqlite3"
            with patch.object(almacen, "RUTA_BASE_DATOS", ruta):
                almacen.inicializar_base_datos()
                contrato = almacen.crear_contrato(
                    modelo="CONT-001",
                    estado="borrador",
                    creado_por="Empleado",
                    datos=DATOS_VALIDOS,
                    accion="Borrador creado",
                )

                self.assertEqual(
                    almacen.obtener_contrato(contrato["id"])["datos"],
                    DATOS_VALIDOS,
                )
                self.assertEqual(len(almacen.listar_contratos()), 1)
        finally:
            import shutil
            shutil.rmtree(directorio, ignore_errors=True)

    def test_generated_docx_replaces_sample_data_and_keeps_fixed_clause(self):
        with tempfile.TemporaryDirectory() as directorio:
            with patch.object(
                documentos,
                "DIRECTORIO_GENERADOS",
                Path(directorio),
            ):
                contrato = {"id": "CTR-001", "datos": DATOS_VALIDOS}
                ruta = documentos.generar_documento_contrato(contrato)
                salida = Document(ruta)
                texto = "\n".join(parrafo.text for parrafo in salida.paragraphs)
                texto += "\n" + "\n".join(
                    celda.text
                    for tabla in salida.tables
                    for fila in tabla.rows
                    for celda in fila.cells
                )

        self.assertIn("Empresa de prueba S.A.", texto)
        self.assertIn("Servicio de prueba", texto)
        self.assertIn("4.800.000", texto)
        self.assertIn("Rosario, Provincia de Santa Fe", texto)
        self.assertIn("Mantener la confidencialidad", texto)
        self.assertNotIn("Distribuidora del Litoral S.R.L.", texto)
        self.assertNotIn("pesos cuatro millones ochocientos mil", texto)

    def test_ai_context_excludes_template_and_dossier_sample_data(self):
        contexto = documentos.cargar_documentos_para_ia()

        self.assertIn("CUARTA: OBLIGACIONES DEL PRESTADOR", contexto["plantilla"])
        self.assertIn("JURISDICCIÓN", contexto["plantilla"])
        self.assertNotIn("Distribuidora del Litoral S.R.L.", contexto["plantilla"])
        self.assertNotIn("30-71234567-8", contexto["plantilla"])
        self.assertNotIn("Transportes Río Paraná S.A.", contexto["expediente"])

    def test_assistant_merges_extracted_data_and_removes_duplicate_last_turn(self):
        solicitud = MensajeAsistenteRequest(
            mensaje="El servicio será soporte técnico.",
            historial=[
                MensajeHistorial(rol="asistente", texto="¿Qué servicio necesita?"),
                MensajeHistorial(
                    rol="usuario",
                    texto="El servicio será soporte técnico.",
                ),
            ],
            datos={"contrato": {"ciudad": "Rosario"}},
        )

        with (
            patch.object(
                ia,
                "extraer_datos",
                return_value={"objeto": {"servicio": "Soporte técnico."}},
            ),
            patch.object(
                ia,
                "consultar_ia",
                return_value="¿Cuál es la fecha de celebración?",
            ) as consultar,
            patch.object(documentos, "cargar_documentos_para_ia", return_value={}),
        ):
            resultado = conversar_con_asistente(solicitud)

        self.assertEqual(resultado["datos"]["contrato"]["ciudad"], "Rosario")
        self.assertEqual(
            resultado["datos"]["objeto"]["servicio"],
            "Soporte técnico.",
        )
        self.assertEqual(
            consultar.call_args.kwargs["historial"],
            [{"role": "assistant", "content": "¿Qué servicio necesita?"}],
        )

    def test_generation_rejects_missing_required_fields(self):
        with self.assertRaises(HTTPException) as resultado:
            _generar_contrato({})

        self.assertEqual(resultado.exception.status_code, 422)

    def test_supervision_rejects_invalid_grounded_data(self):
        datos = gestor_datos.crear_datos_contrato()

        aceptados, rechazados = validaciones.supervisar_datos_propuestos(
            datos,
            {"parte_contratante": {"documento": "20-12345678-9"}},
        )

        self.assertEqual(aceptados, {})
        self.assertIn("parte_contratante.documento", rechazados)

    def test_supervision_does_not_overwrite_valid_collected_data(self):
        datos = gestor_datos.crear_datos_contrato()
        datos["contrato"]["ciudad"] = "Rosario"

        aceptados, _ = validaciones.supervisar_datos_propuestos(
            datos, {"contrato": {"ciudad": "Cordoba"}}
        )

        self.assertEqual(aceptados, {})

    def test_supervision_allows_fixing_an_invalid_collected_value(self):
        datos = gestor_datos.crear_datos_contrato()
        datos["parte_contratante"]["documento"] = "20-12345678-9"

        aceptados, _ = validaciones.supervisar_datos_propuestos(
            datos, {"parte_contratante": {"documento": "20-12345678-6"}}
        )
        gestor_datos.actualizar_datos(datos, aceptados, sobrescribir=True)

        self.assertEqual(
            datos["parte_contratante"]["documento"], "20-12345678-6"
        )

    def test_supervision_ignores_unknown_sections_and_fields(self):
        aceptados, rechazados = validaciones.supervisar_datos_propuestos(
            {},
            {
                "seccion_inventada": {"campo": "valor"},
                "contrato": {"campo_inventado": "valor"},
            },
        )

        self.assertEqual(aceptados, {})
        self.assertEqual(rechazados, {})

    def test_model_json_wrapped_in_text_is_parsed(self):
        contenido = '```json\n{"contrato": {"ciudad": "Rosario"}}\n```'

        self.assertEqual(
            ia._parsear_json(contenido),
            {"contrato": {"ciudad": "Rosario"}},
        )

    def test_invalid_model_json_is_not_converted_into_fake_data(self):
        respuesta_modelo = Mock()
        respuesta_modelo.json.return_value = {"message": {"content": "no es json"}}

        with patch.object(ia.requests, "post", return_value=respuesta_modelo):
            with self.assertRaises(ValueError):
                ia.extraer_datos("Empresa de prueba S.A.")

    def test_assistant_continues_when_extraction_returns_invalid_json(self):
        solicitud = MensajeAsistenteRequest(mensaje="Hola", historial=[], datos={})

        with (
            patch.object(
                ia, "extraer_datos", side_effect=ValueError("json inválido")
            ),
            patch.object(
                ia, "consultar_ia", return_value="¿Cuál es la ciudad del contrato?"
            ),
            patch.object(documentos, "cargar_documentos_para_ia", return_value={}),
        ):
            resultado = conversar_con_asistente(solicitud)

        self.assertEqual(resultado["respuesta"], "¿Cuál es la ciudad del contrato?")
        self.assertTrue(resultado["faltantes"])

    def test_document_generation_refuses_incomplete_data(self):
        with tempfile.TemporaryDirectory() as directorio:
            with patch.object(
                documentos, "DIRECTORIO_GENERADOS", Path(directorio)
            ):
                with self.assertRaises(ValueError):
                    documentos.generar_documento_contrato(
                        {"id": "CTR-X", "datos": {}}
                    )

    def test_assistant_does_not_store_invalid_data_proposed_by_model(self):
        solicitud = MensajeAsistenteRequest(
            mensaje="El CUIT del contratante es 20-12345678-9",
            historial=[],
            datos={},
        )

        with (
            patch.object(
                ia,
                "extraer_datos",
                return_value={
                    "parte_contratante": {"documento": "20-12345678-9"}
                },
            ),
            patch.object(
                ia,
                "consultar_ia",
                return_value="Ese CUIT no es válido, ¿me lo puede confirmar?",
            ),
            patch.object(documentos, "cargar_documentos_para_ia", return_value={}),
        ):
            resultado = conversar_con_asistente(solicitud)

        self.assertEqual(
            resultado["datos"]["parte_contratante"]["documento"], ""
        )
        self.assertIn("parte_contratante.documento", resultado["errores"])


if __name__ == "__main__":
    unittest.main()

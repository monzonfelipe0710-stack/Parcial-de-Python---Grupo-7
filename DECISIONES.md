# Decisiones tomadas (Proyecto: Automatización de documentación contractual)

Este archivo resume qué se implementó y **por qué se eligió así**, de forma simple, para usarlo como contexto y que se pueda explicar fácilmente.

## 1. Objetivo y alcance
- **Qué pide el TP:** que un empleado cargue datos (con ayuda de IA), el sistema controle/valide la información y genere un contrato usando la **plantilla aprobada**, quedando pendiente de revisión profesional.
- **Decisión:** priorizar una solución **simple que cumpla** todos los pasos (datos → validación → borrador/generación → revisión → exportación) antes que agregar complejidad.

## 2. Backend (FastAPI) y estructura
- **Qué se hizo:** API con FastAPI en `backend/main.py` con endpoints para modelo, borradores, generar/enviar a revisión, listar/detalle, asistente, aprobar y exportar.
- **Por qué:** FastAPI es liviano, claro y se integra fácil con el frontend; define rutas y validación básica de entrada sin mucho código.
- **Por qué no otro:** no se usó un framework más pesado ni microservicios porque el alcance es un TP y se busca sencillez.

## 3. Almacenamiento (SQLite)
- **Qué se hizo:** `backend/almacen.py` guarda contratos en SQLite (`contratos.sqlite3`) con funciones para crear, guardar, obtener y listar (incluye `creadoPor`, fechas, estado, datos, revisión e historial).
- **Por qué:** SQLite no requiere servidor, es persistente y con pocas líneas cumple lo que la API y las pruebas necesitan.
- **Por qué no otro:** no se usó base en memoria (se perderían datos) ni un esquema de muchas tablas/ORM complejo, para mantener el código corto y fácil de explicar.

## 4. Modelo de datos y acumulación
- **Qué se hizo:** `campos_contrato.py` define los campos del contrato; `gestor_datos.py` crea la estructura vacía y acumula datos parciales sin pisar lo ya cargado (solo secciones/campos permitidos).
- **Por qué:** tener una estructura única evita errores entre IA, validaciones y generación; permite completar el contrato en varios mensajes.

## 5. IA conversacional (Ollama + Llama 3.2:3B)
- **Qué se hizo:** `backend/ia.py` extrae datos del mensaje a JSON con la estructura de `CAMPOS_CONTRATO`, filtra valores no respaldados por el mensaje y consulta al modelo con historial/contexto e instrucciones de no inventar ni modificar cláusulas. El endpoint del asistente combina extracción + acumulación + faltantes/errores.
- **Por qué:** se aprovecha el modelo local existente (como pide la consigna) y **Python controla** qué datos se aceptan, los faltantes y las validaciones; así se reduce el riesgo de inventar información.
- **Por qué no otro:** no se entrenó ni se cambió de modelo (pedido explícito); no se confió solo en el texto libre del modelo para guardar datos, por eso hay extracción estructurada y filtros.

## 6. Validaciones
- **Qué se hizo:** `validaciones.py` detecta campos faltantes y valida formatos/coherencia (DNI/CUIT, fechas, importes, cuotas, fecha fin > inicio, total vs cuotas) separando faltantes de errores.
- **Por qué:** garantiza que el contrato se genere con datos completos y coherentes, y permite pedir correcciones claras al usuario.

## 7. Generación de documentos (DOCX y PDF)
- **Qué se hizo:** `documentos.py` genera el `.docx` **a partir de la plantilla** en `plantillas/`, reemplazando los datos de ejemplo por los datos reales y conservando las cláusulas fijas. Para PDF se genera un archivo simple desde el texto del DOCX generado (usando `reportlab`).
- **Por qué (DOCX):** usar la plantilla aprobada asegura que las cláusulas no se modifiquen y mantiene el formato esperado.
- **Por qué (PDF simple):** cumple la exportación pedida con poco código y sin depender de conversiones complejas de Word; prioriza simplicidad.
- **Por qué no otro:** no se armó el contrato “desde cero” en código para no alterar cláusulas ni el formato legal.

## 8. Revisión y permisos
- **Qué se hizo:** solo contratos en borrador se editan/generan; al generar pasan a “pendiente de revisión”; solo perfil profesional puede aprobar; solo aprobados se exportan.
- **Por qué:** respeta el flujo del enunciado: generación automática pero control y aprobación humana.

## 9. Pruebas y ajustes menores
- **Qué se hizo:** se ejecutan los tests de `backend/tests/test_backend.py` (extracción/grounding, acumulación, validaciones, SQLite, generación DOCX, contexto IA, asistente). Se completó el almacén para cumplir lo que usan la API/tests y se ajustó la limpieza del test de SQLite en Windows.
- **Por qué:** verificar de forma rápida que las partes principales funcionan sin agregar una suite compleja.

## 10. Cómo ejecutarlo (resumen)
- **Requisitos:** `pip install -r requirements.txt` (fastapi, uvicorn, python-docx, requests, reportlab).
- **Backend:** `uvicorn backend.main:app --reload` (lee `plantillas/`, guarda en `documentos_generados/`).
- **IA:** requiere Ollama local con `llama3.2:3b` en `http://localhost:11434`. Sin Ollama funcionan CRUD, validaciones y generación/exportación DOCX/PDF (no el chat).
- **Exportación:** DOCX y PDF disponibles para contratos aprobados.

## 11. Refuerzo de la supervisión de Python sobre la IA
- **Qué se hizo:** se separó con más claridad el rol de cada parte. La IA (Llama 3.2:3B) **comprende y propone** datos; Python **decide** si esos datos cumplen las reglas y recién ahí los incorpora al contrato.
  - `validaciones.py`: nueva función `supervisar_datos_propuestos()` que, antes de guardar, comprueba que la sección y el campo existan en `CAMPOS_CONTRATO`, valida cada valor con `validar_campo()` y decide si se acepta. No pisa un dato válido ya recopilado, pero **sí permite corregir** un dato cargado que era inválido. Los datos rechazados se informan para volver a preguntarlos.
  - `validaciones.py`: `validar_campo()` centraliza las validaciones por campo (DNI/CUIT, fechas, importes, cuotas, texto) y `validar_contrato()` ahora la reutiliza. Se agregó coherencia entre fecha de celebración y fecha de inicio.
  - `gestor_datos.actualizar_datos()`: parámetro `sobrescribir` (por defecto `False`), que solo se usa con datos ya supervisados por Python.
  - `ia.py`: `extraer_datos()` interpreta JSON aunque venga con texto o cercas de código; si no puede, lanza error controlado y **no inventa datos**. `consultar_ia()` recibe `datos_actuales` para recordar lo ya cargado y no volver a pedirlo.
  - `main.py`: el endpoint del asistente aplica la supervisión y, si el modelo devuelve JSON inválido, continúa la conversación dejando todo pendiente (sin datos ficticios).
  - `documentos.py`: barrera final que impide generar el DOCX si hay datos faltantes o inválidos (defensa extra además del control de `main.py`). Se eliminó una definición duplicada de `generar_documento_pdf`.
- **Por qué:** la regla fundamental es que la IA propone y Python controla. Así se evita que datos inventados, inválidos o de ejemplo terminen en el contrato, sin cambiar el modelo ni la arquitectura.
- **Revisión profesional:** se mantiene igual. Un contrato generado queda `pendiente_revision` y solo un perfil profesional puede aprobarlo; ni la IA ni las validaciones lo aprueban automáticamente.

## 12. Login, trazabilidad y confidencialidad

- **Qué se hizo:** se agregaron cuentas y sesiones reales en el backend, auditoría de acciones y cifrado opcional en disco.
  - `autenticacion.py`: registro y login con contraseñas hasheadas (PBKDF2-SHA256, 120.000 iteraciones) y **token de sesión aleatorio** guardado en SQLite (`sesiones`), con vencimiento a 7 días. Los roles (`empleado`/`profesional`) salen de la cuenta.
  - `main.py`: endpoints `/api/auth/registro`, `/api/auth/login`, `/api/auth/logout`, `/api/auth/yo`. Los endpoints de contratos y asistente exigen `Authorization: Bearer`; `/api/estado` y `/api/modelo` quedan públicos. Aprobar exige rol profesional. Se eliminó el header falsificable `X-Perfil`.
  - `almacen.py`: tablas `usuarios`, `sesiones` y `auditoria`. El historial del contrato guarda el **usuario real**, su rol y **qué campos aportó**. La auditoría registra quién hizo qué, cuándo y con qué detalle (incluidos los mensajes al asistente y los datos aceptados).
  - `cifrado.py` + `documentos.py` + `almacen.py`: cifrado **opcional** (Fernet, vía `CLAVE_CIFRADO`) del contenido de los contratos y de los DOCX/PDF generados. Sin clave, todo sigue funcionando en claro (compatible con datos previos).
- **Por qué:** sin login, el rol se podía falsificar desde el navegador; además no se sabía quién aportó cada dato ni quién aprobó. El cifrado protege la información sensible (datos de clientes) si alguien accede al archivo de disco.
- **Por qué así:** token simple en SQLite para no sumar dependencias (más allá de `cryptography`, usada solo para el cifrado opcional); el cifrado es opcional para no romper entornos sin la clave ni los datos ya guardados.



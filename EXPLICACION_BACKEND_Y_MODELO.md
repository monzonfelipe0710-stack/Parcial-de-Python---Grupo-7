# Documentación del backend y del modelo de IA

**Proyecto:** Sistema inteligente de generación de contratos — Acosta & Asociados

Este documento explica **qué decisiones se tomaron en el backend y en el modelo de IA, por qué se tomaron y por qué no se eligió otra cosa**. Está escrito en lenguaje simple, para leerlo y explicarlo. **No incluye el frontend**, porque no forma parte de lo que se va a evaluar.

---

## 1. El objetivo (para encuadrar todo)

El sistema tiene que lograr que un empleado, conversando en lenguaje natural, cargue los datos de un contrato; que el sistema **controle** esos datos; que **genere el contrato** usando una plantilla aprobada; y que el contrato quede **pendiente de revisión** por un profesional. La IA ayuda a entender y completar, pero **no decide**.

Todas las decisiones que siguen se toman pensando en eso: **que sea simple, que no invente datos y que el contrato salga con las cláusulas correctas.**

---

## 2. Resumen de decisiones (tabla rápida)

| Tema | Decisión | Por qué (en una línea) |
|---|---|---|
| Framework del backend | **FastAPI** | Liviano, claro y con validación de entrada sin mucho código. |
| Base de datos | **SQLite** | No necesita servidor, es persistente y alcanza para el alcance. |
| Modelo de IA | **Ollama + Llama 3.2:3B local** | Local (confidencialidad), sin costo por uso y corre en una PC común. |
| Rol de la IA | **Propone** datos, no decide | Los modelos "alucinan"; por eso Python supervisa. |
| Extracción | **JSON estructurado** | Evita interpretar texto libre y encaja con los campos del contrato. |
| Anti-invención | **Anclaje al mensaje (grounding)** | Solo se acepta un valor si aparece en lo que escribió el empleado. |
| Control final | **Supervisión de Python** | Ningún dato se guarda sin pasar las validaciones. |
| Validaciones | **Formato + coherencia** | Evita generar contratos con datos incompletos o incoherentes. |
| Generación | **Desde la plantilla aprobada** | No se alteran las cláusulas legales ni el formato. |
| Aprobación | **Humana y solo profesional** | Es el requisito del flujo: la IA no aprueba nada. |
| Login | **Token en SQLite** | Cumple "quién entra" sin sumar dependencias pesadas. |
| Trazabilidad | **Tabla de auditoría** | Permite saber quién hizo qué, cuándo y con qué datos. |
| Confidencialidad | **Cifrado opcional en disco** | Protege datos sensibles sin romper entornos sin clave. |
| Búsqueda en documentos | **Sin RAG ni embeddings** | El contexto es chico; agregarlo sería complejidad innecesaria. |

---

## 3. Cómo está armado el backend

El backend es una API hecha con **FastAPI** (Python) y guarda todo en **SQLite**. Cada archivo tiene una única responsabilidad:

| Archivo | Responsabilidad |
|---|---|
| `backend/main.py` | La API: endpoints, sesión y el flujo completo. |
| `backend/ia.py` | Habla con Ollama: **conversar** y **extraer datos**. |
| `backend/campos_contrato.py` | La lista oficial de los **18 campos** (6 secciones) del contrato. |
| `backend/gestor_datos.py` | Crea la estructura vacía y **acumula** datos parciales. |
| `backend/validaciones.py` | Valida formatos y coherencia, y **supervisa** lo que propone la IA. |
| `backend/documentos.py` | Lee la plantilla y **genera** el DOCX (y un PDF simple). |
| `backend/almacen.py` | Guarda contratos, usuarios, sesiones y auditoría en SQLite. |
| `backend/autenticacion.py` | Registro, login, contraseñas y tokens. |
| `backend/cifrado.py` | Cifrado **opcional** en disco. |
| `backend/tests/test_backend.py` | Pruebas automáticas (24 en total). |

### Flujo completo, paso a paso

1. El empleado escribe un mensaje.
2. El backend le pide al modelo que **extraiga** solo los datos explícitos, en JSON.
3. **Python revisa** lo propuesto (¿existe el campo? ¿el valor es válido? ¿está en el mensaje?) y recién ahí lo guarda.
4. Si faltan datos, el asistente los **pide**; si hay errores, pide corregirlos.
5. Con todo completo, se **genera el DOCX** desde la plantilla.
6. El contrato queda **pendiente de revisión**.
7. Un usuario **profesional** lo aprueba.
8. Aprobado, se puede **exportar a DOCX o PDF**.

---

## 4. Decisiones del backend, una por una

### 4.1 Framework: FastAPI

- **Qué se hizo:** la API se construyó con FastAPI en `main.py` (endpoints de modelo, borradores, generar, listar/detalle, asistente, aprobar y exportar).
- **Por qué:** es liviano, el código queda claro y valida los datos de entrada sin escribir mucho a mano.
- **Por qué no otra cosa:** no se usó un framework más pesado ni microservicios porque el alcance es acotado y se prioriza la simplicidad.

### 4.2 Base de datos: SQLite

- **Qué se hizo:** `almacen.py` guarda todo en un archivo `contratos.sqlite3` (contratos, usuarios, sesiones, auditoría).
- **Por qué:** no requiere instalar ni administrar un servidor, es persistente y con pocas líneas cubre lo que necesita la API.
- **Por qué no otra cosa:** no se usó base en memoria (se perderían los datos al reiniciar) ni un ORM/esquema complejo, para mantener el código corto y explicable.

### 4.3 Un único modelo de datos (`campos_contrato.py`)

- **Qué se hizo:** se definieron **6 secciones y 18 campos** en un solo lugar, y todos los módulos (IA, validaciones, gestor, documentos) usan esa misma definición.
- **Por qué:** si cada parte tuviera su propia lista de campos, aparecerían errores de nombres y desajustes. Una sola fuente evita eso.
- **Por qué no otra cosa:** no se repartió la definición por módulo porque genera inconsistencias.

### 4.4 Acumulación de datos parciales (`gestor_datos.py`)

- **Qué se hizo:** se crea una estructura vacía y se van **acumulando** los datos a medida que el empleado responde, **sin pisar** lo ya cargado (salvo que Python lo autorice con `sobrescribir`).
- **Por qué:** el contrato se completa en **varios mensajes**; hay que poder recordar lo anterior y no perderlo.
- **Por qué no otra cosa:** no se pide todo de una sola vez porque el empleado escribe naturalmente y de a poco.

### 4.5 La IA: Ollama + Llama 3.2:3B (decisión central)

Esta es la decisión más importante y conviene explicarla bien. Ver la sección 5 completa.

---

## 5. El modelo de IA en detalle

### 5.1 ¿Qué es Ollama?

Es un programa que **ejecuta modelos de IA localmente**, en la propia computadora y sin internet. El backend le manda los mensajes a una dirección local (`http://localhost:11434/api/chat`) y recibe la respuesta.

### 5.2 ¿Qué es Llama 3.2:3B?

Es un modelo de lenguaje de Meta. El "3B" significa **3.000 millones de parámetros**: es un modelo chico, moderno y que entiende bien el español.

### 5.3 ¿Por qué se eligió Llama 3.2:3B?

- **Es local:** no se manda información de clientes a ningún servicio externo. En un estudio jurídico, la **confidencialidad** es lo primero.
- **No tiene costo por uso:** no se paga por consulta ni se depende de una suscripción o de una API externa.
- **Corre en una PC común:** no hace falta una placa de video potente ni un servidor especial.
- **Alcanza para la tarea:** las tareas son acotadas (charlar y extraer datos de un formulario de 18 campos). No se necesita razonamiento complejo.
- **Ya estaba disponible y era el pedido:** no se buscaba entrenar un modelo desde cero ni cambiarlo.

### 5.4 ¿Por qué no un modelo más grande o uno en la nube?

- Uno más grande **pediría más hardware** y sería más lento, sin una mejora real para esta tarea.
- Uno en la nube **mandaría datos sensibles afuera** y tendría **costo por uso**.
- El problema no era el modelo, sino **cómo lo controlamos**. Por eso la solución no es "un modelo mejor", sino **supervisar con Python**.

### 5.5 Las dos tareas del modelo

1. **Conversar** (`consultar_ia`): responde al empleado, pide los datos que faltan y aclara errores. Se le pasan instrucciones fijas, el historial de la charla y los datos ya cargados (para no volver a pedirlos).
2. **Extraer datos** (`extraer_datos`): recibe el mensaje y devuelve un **JSON** con las secciones y claves del contrato.

### 5.6 Parámetros y detalles elegidos a propósito

- **`temperature: 0` al extraer:** buscamos la respuesta **más predecible y repetible**, no creatividad. Para "leer datos de un texto" queremos cero imaginación.
- **`format: json`:** obliga al modelo a responder en JSON válido, en vez de texto libre.
- **Timeout de 120 segundos:** si el modelo se cuelga, el sistema no queda trabado.
- **Interpretación tolerante del JSON (`_parsear_json`):** aunque el modelo agregue texto o "cercas" de código (``` ```json ```), Python lo limpia e interpreta.
- **Si el JSON viene mal, no se inventa nada:** se deja todo pendiente y el asistente vuelve a preguntar.
- **Instrucciones fijas del sistema:** no inventar, no modificar cláusulas, no dar asesoramiento legal, usar solo la plantilla como fuente de cláusulas y no copiar datos de ejemplo del expediente.

### 5.7 ¿Por qué no se entrenó un modelo propio?

- Entrenar requiere datos, tiempo, hardware y conocimiento experto, y no era el objetivo.
- Se aprovecha el modelo existente y se construye **el sistema alrededor de él** (la parte que sí aporta valor: el control y las validaciones).

---

## 6. La regla central: **la IA propone, Python controla**

Los modelos de lenguaje a veces **inventan** datos que no estaban en la conversación ("alucinación"). Por eso **nunca** guardamos directamente lo que devuelve el modelo. Hay dos barreras:

### 6.1 Anclaje al mensaje (grounding) — `ia.py`

La función `_valor_respaldado_por_mensaje()` comprueba que el valor propuesto **realmente aparezca en el mensaje del empleado**. Si el modelo se inventa un domicilio, un CUIT o una fecha, se descarta. Hay reglas especiales:

- **DNI/CUIT:** se comparan solo los **dígitos** (ignora puntos y guiones).
- **Fechas:** se comparan como **fechas reales**, en varios formatos.
- **Importes y cuotas:** se comparan como **números**.
- **Domicilio y ciudad:** se exige que el mensaje mencione "domicilio", "dirección" o "ciudad de celebración", para **no confundir** un domicilio con la ciudad del contrato.
- **Campos compartidos** (por ejemplo `documento` en contratante y prestador): se exige que el mensaje aclare **de quién** es el dato.

### 6.2 Supervisión de Python — `validaciones.supervisar_datos_propuestos()`

Antes de guardar, Python revisa cada dato propuesto:

- La sección y el campo deben **existir** en `CAMPOS_CONTRATO`.
- El valor debe **pasar las validaciones** del sistema.
- **No se pisa** un dato válido ya cargado.
- **Sí se permite corregir** un dato que estaba cargado pero era inválido.
- Los datos **rechazados** se informan para volver a preguntarlos.

> Analogía para la presentación: la IA es como un empleado que **anota** lo que escucha; Python es el **supervisor** que revisa esas notas antes de pasarlas en limpio.

---

## 7. Validaciones (`validaciones.py`)

- **Qué se hizo:** se validan formatos y coherencia, **separando** "falta un dato" de "el dato está mal".
- **Formatos:**
  - **DNI/CUIT:** cantidad de dígitos y, en CUIT, se verifica el **dígito verificador** (módulo 11).
  - **Fechas:** deben existir y tener formato `AAAA-MM-DD`.
  - **Importes:** numéricos, mayores a cero y con máximo dos decimales.
  - **Cuotas:** número entero y al menos 1.
  - **Texto libre:** no puede estar vacío ni ser solo símbolos.
- **Coherencia (reglas cruzadas):**
  - La **fecha de fin** debe ser **posterior** a la de inicio.
  - La **fecha de inicio** no puede ser **anterior** a la fecha de celebración.
  - **Total = cuotas × importe de cuota** (con una tolerancia de centavos).
- **Por qué:** garantiza que el contrato se genere con datos completos y coherentes, y permite pedir correcciones claras.
- **Por qué no otra cosa:** no se dejó toda la validación "al criterio de la IA", porque no es confiable para reglas exactas como un dígito verificador.

---

## 8. Generación de documentos (`documentos.py`)

- **Qué se hizo:** se genera el `.docx` a partir de la **plantilla aprobada** (`plantillas/…`), reemplazando los **datos de ejemplo** por los datos reales y conservando las **cláusulas fijas**. El PDF se arma desde el texto del Word con `reportlab`.
- **Por qué (plantilla):** usar la plantilla aprobada asegura que **las cláusulas legales no se modifiquen** y que el formato sea el esperado.
- **Por qué (PDF simple):** cumple la exportación pedida con poco código, sin depender de conversiones complejas de Word.
- **Por qué no otra cosa:** no se redacta el contrato "desde cero" en código, porque se podrían alterar cláusulas o el formato legal.
- **Barrera final:** antes de generar, `documentos.py` vuelve a comprobar que no falten datos ni haya errores; si algo falla, **no genera** el Word. Es una defensa extra además del control en `main.py`.
- **El expediente es solo contexto:** sirve para que el asistente entienda el dominio, pero sus datos de ejemplo **nunca** se copian a un contrato nuevo.

---

## 9. Flujo de estados y revisión humana

- **Qué se hizo:** solo los contratos en **borrador** se editan/generan; al generar pasan a **"pendiente de revisión"**; solo un **profesional** aprueba; y solo los **aprobados** se exportan.
- **Por qué:** respeta el flujo del enunciado: **generación automática, pero control y aprobación humana**.
- **Por qué no otra cosa:** ni la IA ni las validaciones aprueban; aprobar es una decisión de una persona con el rol adecuado.

---

## 10. Login, trazabilidad y confidencialidad

Estas mejoras atacan tres problemas: **quién entra**, **quién hizo qué** y **qué pasa si alguien accede al archivo**.

### 10.1 Login y roles (`autenticacion.py`)

- **Qué se hizo:** registro y login con contraseñas **hasheadas** (PBKDF2-SHA256, 120.000 iteraciones, sal aleatoria). Al iniciar sesión se genera un **token aleatorio** (`secrets.token_urlsafe(32)`) guardado en la tabla `sesiones`, que **vence a los 7 días**. Los roles (`empleado` / `profesional`) salen de la **cuenta**.
- **Por qué:** antes el rol se mandaba en un header (`X-Perfil`) que **cualquiera podía falsificar**. Ahora la identidad y el rol son confiables.
- **Por qué así:** token simple en SQLite, sin sumar dependencias de JWT ni manejo de cookies entre puertos.
- **Protección de endpoints:** los de contratos y asistente exigen sesión; `/api/estado` y `/api/modelo` quedan públicos; **aprobar exige rol profesional**.

### 10.2 Trazabilidad / auditoría

- **Qué se hizo:** la tabla `auditoria` registra **quién** hizo qué y **cuándo**: registros, inicios de sesión, cada **mensaje al asistente** (texto y datos aceptados) y las aprobaciones. El **historial del contrato** guarda el **usuario real** (ya no el literal "Empleado"), su rol y **qué campos aportó**.
- **Por qué:** permite reconstruir qué pasó con cada contrato y quién aportó cada dato.

### 10.3 Confidencialidad: cifrado en reposo (`cifrado.py`)

- **Qué se hizo:** cifrado **opcional** con Fernet. Se activa solo si se define la variable de entorno `CLAVE_CIFRADO` y está instalada la librería `cryptography`. Cuando está activo, se cifran **el contenido de los contratos en SQLite** y **los DOCX/PDF generados**.
- **Por qué:** si alguien accede al archivo de disco, los datos de clientes no quedan legibles.
- **Por qué opcional:** para no romper entornos que no tienen la clave ni los datos ya guardados en claro (es **compatible** con lo anterior).
- **CORS:** restringido a `localhost` (los puertos del frontend), para que solo la app local pueda llamar a la API.

---

## 11. Otras decisiones

- **Sin RAG ni embeddings:** no se agregó una base vectorial porque el conjunto de documentos es chico y se pasa entero como contexto. Agregarla sería **complejidad innecesaria**.
- **Lenguaje del asistente:** español, porque es el idioma de trabajo.
- **Pruebas automáticas:** 24 tests cubren extracción/anclaje, acumulación, validaciones, SQLite, generación DOCX, contexto de IA, asistente, login, cifrado y auditoría. **Por qué:** verificar rápido lo importante sin armar una suite compleja.

---

## 12. Limitaciones conocidas (ser honestos)

- El modelo es **chico**: puede equivocarse con frases ambiguas. Por eso el empleado **revisa** lo cargado antes de generar.
- La **aprobación final es humana**: ni la IA ni las validaciones aprueban.
- El **cifrado depende de la clave**: si se pierde `CLAVE_CIFRADO`, no se pueden descifrar los datos.
- El **PDF** es una exportación simple (texto del Word), no una conversión perfecta de formato.

---

## 13. Preguntas que puede hacer el profesor (y respuesta corta)

- **¿Por qué Llama 3.2:3B y no uno más grande?** Porque corre local (confidencialidad), no tiene costo y alcanza para charlar y extraer 18 campos; el control lo hace Python.
- **¿La IA puede inventar datos?** Puede intentarlo, pero el **anclaje al mensaje** y la **supervisión de Python** lo impiden.
- **¿Cómo evitan que se cambien las cláusulas?** El contrato se arma **desde la plantilla aprobada**; el sistema solo reemplaza datos.
- **¿Quién aprueba el contrato?** Un usuario con rol **profesional**, autenticado. Nunca la IA.
- **¿Por qué SQLite?** Es simple, persistente y no necesita servidor.
- **¿Por qué no usan RAG?** Porque el contexto es chico; sería complejidad innecesaria.
- **¿Qué pasa si Ollama no está encendido?** Todo funciona (carga, validaciones, almacenamiento, generación/exportación) **menos el chat** con el asistente.
- **¿Cómo saben quién hizo qué?** Por la **tabla de auditoría** y por el **historial del contrato** con el usuario real.

---

## 14. Cómo ejecutarlo (resumen)

1. Instalar dependencias: `pip install -r requirements.txt` (fastapi, uvicorn, python-docx, requests, reportlab, cryptography).
2. Tener Ollama con el modelo `llama3.2:3b` disponible.
3. Levantar el backend: `uvicorn backend.main:app --reload`.
4. (Opcional) Definir `CLAVE_CIFRADO` para activar el cifrado en disco.

# Explicación simple del backend y del modelo de IA

Este documento explica, en lenguaje sencillo, **cómo funciona el backend** del sistema de contratos de Acosta & Asociados y **cómo se usa el modelo de IA** (Ollama + Llama 3.2:3B). Está pensado para leerlo en voz alta en una presentación. No cubre el frontend.

---

## 1. En una frase

El empleado conversa en lenguaje natural, **la IA interpreta y propone datos**, **Python decide si esos datos son válidos**, se completan los 18 campos del contrato, se genera el documento Word a partir de la plantilla aprobada y el contrato queda **pendiente de revisión profesional**.

---

## 2. El flujo completo, paso a paso

1. El empleado escribe, por ejemplo: *"El servicio es soporte técnico, con la empresa Delta S.R.L., CUIT 30-71234567-8."*
2. El backend le pide al modelo que **extraiga** de ese mensaje solo los datos que aparecen explícitamente, en formato JSON con las secciones y claves del contrato.
3. **Python revisa** lo que propuso la IA (¿el campo existe?, ¿el valor es válido?, ¿el valor está respaldado por el mensaje?) y recién ahí lo guarda.
4. Si faltan datos, el asistente **los pide de forma natural**. Si hay datos mal cargados, pide corregirlos.
5. Cuando están todos los datos, el sistema **genera el documento Word** reemplazando los datos de ejemplo de la plantilla por los reales. Las cláusulas fijas no se tocan.
6. El contrato pasa a estado **"pendiente de revisión"**.
7. Un usuario con rol **profesional** lo revisa y lo **aprueba**.
8. Recién aprobado, el contrato se puede **exportar a DOCX o PDF**.

---

## 3. Cómo está organizado el backend

El backend está hecho con **FastAPI** (Python) y SQLite. Cada archivo tiene una responsabilidad clara:

| Archivo | Qué hace |
|---|---|
| `backend/main.py` | La API: define los endpoints (rutas), controla la sesión y arma el flujo completo. |
| `backend/ia.py` | Habla con Ollama. Dos tareas: **conversar** y **extraer datos** en JSON. |
| `backend/campos_contrato.py` | La "lista oficial" de los 18 campos del contrato, agrupados en 6 secciones. |
| `backend/gestor_datos.py` | Crea la estructura vacía y acumula datos parciales sin pisar lo ya cargado. |
| `backend/validaciones.py` | Controla formatos y coherencia (DNI/CUIT, fechas, importes, cuotas). |
| `backend/documentos.py` | Lee la plantilla y genera el DOCX (y un PDF simple). |
| `backend/almacen.py` | Guarda todo en SQLite: contratos, usuarios, sesiones y auditoría. |
| `backend/autenticacion.py` | Registro, inicio de sesión, contraseñas y tokens. |
| `backend/cifrado.py` | Cifrado opcional en disco (solo si hay una clave configurada). |
| `backend/tests/test_backend.py` | Pruebas automáticas de todas las partes anteriores. |

**¿Por qué FastAPI?** Es liviano, claro y define rutas con muy poco código. **¿Por qué SQLite?** No necesita servidor, es persistente y con pocas líneas alcanza para este trabajo.

---

## 4. La idea central: **la IA propone, Python controla**

Este es el punto más importante del proyecto.

Los modelos de lenguaje (como Llama) a veces **inventan** ("alucinan") datos que no estaban en la conversación. Por eso **nunca** guardamos directamente lo que devuelve el modelo. Hay dos barreras:

### a) El "anclaje" al mensaje (grounding)

En `ia.py`, la función `_valor_respaldado_por_mensaje()` comprueba que el valor que propone la IA **realmente aparezca en el mensaje del empleado**. Si el modelo se inventa un domicilio, un CUIT o una fecha, ese dato se descarta. Hay reglas especiales para:

- **Documentos (DNI/CUIT):** se comparan solo los dígitos.
- **Fechas:** se comparan como fechas reales, en varios formatos.
- **Importes y cuotas:** se comparan como números.
- **Domicilios y ciudad:** se exige que el mensaje mencione "domicilio", "dirección" o "ciudad de celebración", para no confundirlos entre sí.

### b) La supervisión de Python

En `validaciones.py`, la función `supervisar_datos_propuestos()` revisa cada dato propuesto:

- La sección y el campo deben existir en `CAMPOS_CONTRATO`.
- El valor debe pasar las validaciones del sistema.
- **No se pisa** un dato válido ya cargado.
- **Sí se permite corregir** un dato que estaba cargado pero era inválido.
- Los datos rechazados se informan para volver a preguntarlos.

Además, `documentos.py` tiene una **barrera final**: si falta algún dato o hay un error, directamente **no genera** el Word. Así nunca se cuela un dato de ejemplo de la plantilla en un contrato real.

> Analogía: la IA es como un empleado que anota lo que escucha; Python es el supervisor que revisa esas notas antes de pasarlas en limpio.

---

## 5. El modelo: Ollama + Llama 3.2:3B

### ¿Qué es Ollama?

Ollama es un programa que **ejecuta modelos de IA localmente**, en la propia computadora, sin internet. El backend le manda mensajes a una dirección local (`http://localhost:11434/api/chat`) y recibe la respuesta del modelo.

### ¿Qué es Llama 3.2:3B?

Es un modelo de lenguaje de Meta. El "3B" significa que tiene unos **3.000 millones de parámetros**. Es un modelo chico, moderno y que entiende bien el español.

### ¿Por qué elegimos Llama 3.2:3B?

- **Es local:** no se envía información de clientes a ningún servicio externo. En un estudio jurídico, la **confidencialidad** es clave.
- **No tiene costo por uso:** no se paga por consulta ni depende de una suscripción.
- **Corre en una PC común:** no hace falta una placa de video potente ni un servidor especial.
- **Alcanza para la tarea:** las tareas son acotadas (conversar y extraer datos de un formulario de 18 campos), no requiere razonamiento complejo.
- **Ya estaba disponible:** era el modelo pedido/disponible en el proyecto, y no se buscaba entrenar uno desde cero.

### ¿Por qué no uno más grande o uno en la nube?

- Un modelo más grande pediría más hardware y sería más lento, sin una mejora real para esta tarea.
- Un servicio en la nube enviaría datos sensibles afuera y tendría costo por uso.
- Cambiar el modelo no era necesario: el problema no es el modelo, sino **cómo lo controlamos** (por eso está la supervisión de Python).

### Cómo usamos el modelo (dos tareas distintas)

1. **Conversar** (`consultar_ia`): responde al empleado, pide los datos que faltan y aclara errores. Se le pasan instrucciones fijas (no inventar, no modificar cláusulas, no dar asesoramiento legal), el historial de la charla y los datos ya cargados para que no los vuelva a pedir.
2. **Extraer datos** (`extraer_datos`): recibe el mensaje y devuelve un JSON con las secciones y claves de `CAMPOS_CONTRATO`.

Detalles finos que tomamos a propósito:

- **`temperature: 0`** al extraer: buscamos la respuesta más predecible y repetible, no creatividad.
- **`format: json`**: obliga al modelo a responder en JSON válido.
- **Timeout de 120 segundos**: si el modelo se cuelga, el sistema no queda trabado.
- **Interpretación tolerante del JSON**: aunque el modelo agregue texto o "cercas" de código, Python lo limpia y lo interpreta.
- **Si el JSON viene mal**, no se inventa nada: se deja todo pendiente y el asistente vuelve a preguntar.

---

## 6. Seguridad y trazabilidad (backend)

Estas mejoras atacan tres problemas: **quién entra**, **quién hizo qué** y **qué pasa si alguien accede al archivo**.

### a) Inicio de sesión y roles

- Hay **registro** y **login**. La contraseña **nunca** se guarda en texto: se guarda un *hash* (PBKDF2-SHA256 con 120.000 iteraciones).
- Al iniciar sesión se genera un **token aleatorio** que se guarda en la tabla `sesiones` y vence a los **7 días**. El frontend lo manda en la cabecera `Authorization: Bearer`.
- Los roles salen de la **cuenta** (`empleado` o `profesional`), no de un selector que cualquiera podía cambiar.
- **Solo un profesional autenticado** puede aprobar contratos. Los endpoints de contratos y asistente exigen sesión; `/api/estado` y `/api/modelo` quedan públicos.

### b) Trazabilidad (auditoría)

- La tabla `auditoria` registra **quién** hizo qué y **cuándo**: registros, inicios de sesión, cada mensaje enviado al asistente (con el texto y los datos aceptados) y las aprobaciones.
- El **historial de cada contrato** ahora guarda el **usuario real** (no el literal "Empleado"), su rol y **qué campos aportó** en cada paso.

### c) Confidencialidad (cifrado en disco)

- El cifrado es **opcional**: se activa solo si se configura la variable de entorno `CLAVE_CIFRADO` y está instalada la librería `cryptography`.
- Cuando está activo, se cifran **el contenido de los contratos en SQLite** y **los DOCX/PDF generados**.
- Si no hay clave, el sistema funciona igual que antes (compatible con datos ya guardados en texto plano).

---

## 7. Otras decisiones de diseño

- **La plantilla es la única fuente de cláusulas.** El sistema no redacta el contrato desde cero: reemplaza los datos variables en la plantilla aprobada. Así no se alteran las cláusulas legales.
- **El expediente es solo contexto.** Sirve para que el asistente entienda el dominio, pero sus datos de ejemplo **nunca** se copian a un contrato nuevo.
- **Validaciones separadas de faltantes.** "Falta un dato" y "el dato está mal" son cosas distintas y se informan por separado.
- **Sin RAG ni embeddings.** No se agregó una base vectorial porque el conjunto de documentos es chico y se pasa entero como contexto; agregarla sería complejidad innecesaria.
- **PDF simple.** El PDF se arma desde el texto del Word con `reportlab`, priorizando simplicidad sobre una conversión compleja.

---

## 8. Limitaciones conocidas

- El modelo es chico: puede equivocarse al interpretar frases ambiguas. Por eso el empleado **siempre revisa** lo cargado antes de generar.
- La aprobación final es **humana**: ni la IA ni las validaciones aprueban un contrato.
- El cifrado depende de que la clave (`CLAVE_CIFRADO`) se guarde bien; si se pierde, no se pueden descifrar los datos.

---

## 9. Cómo se ejecuta (resumen)

1. Instalar dependencias: `pip install -r requirements.txt`.
2. Tener Ollama con el modelo `llama3.2:3b` disponible.
3. Levantar el backend: `uvicorn backend.main:app --reload`.
4. (Opcional) Definir `CLAVE_CIFRADO` para activar el cifrado en disco.

Sin Ollama funcionan la carga manual de datos, las validaciones, el almacenamiento y la generación/exportación de documentos; lo único que no funciona es el chat con el asistente.

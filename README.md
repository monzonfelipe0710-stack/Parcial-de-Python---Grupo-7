Te dejo un contexto listo para pasarle a Alfonso. La idea es que puedan dividirse el trabajo sin pisarse y que cada uno sepa qué falta.

Alfonso, te paso el estado del proyecto para que podamos dividir lo que falta.

**Proyecto: Sistema inteligente de generación de contratos para Acosta & Asociados.**

Estamos usando Python para el backend y Ollama con el modelo **Llama 3.2:3B** para la inteligencia artificial. El modelo se ejecuta localmente.

### Lo que ya tenemos del modelo

- `ia.py`: se conecta con Ollama y permite conversar con el modelo.
- La IA puede interpretar mensajes del empleado y extraer datos en formato JSON.
- Tiene instrucciones para no inventar información, no modificar cláusulas y utilizar el historial de conversación.
- `campos_contrato.py`: define los 18 campos que debe completar el contrato.
- Probamos que la IA extraiga datos y que Python los reciba correctamente.

### Lo que falta para completar el modelo y su funcionamiento

1. **Conversación completa:** lograr que el empleado pueda responder varias preguntas y que la IA recuerde los datos anteriores.
2. **Detección de información faltante:** cuando falten datos, el sistema debe pedirlos de manera natural.
3. **Integración con Python:** conectar extracción de datos, almacenamiento, validaciones y respuestas de la IA.
4. **Control de respuestas:** comprobar que la IA no invente datos ni utilice información del expediente como si fueran datos de un contrato nuevo.
5. **Pruebas:** probar conversaciones completas, respuestas parciales, datos incorrectos y mensajes ambiguos.

### Lo que ya tenemos del backend

- `gestor_datos.py`: acumula los datos que el empleado proporciona.
- `validaciones.py`: detecta campos faltantes y estamos ampliándolo para validar documentos, fechas e importes.
- `documentos.py`: lee la plantilla del contrato y el expediente.
- `main.py`: tiene una API básica con FastAPI, pero todavía falta desarrollar los endpoints que necesita el frontend.

### División propuesta

**Alfonso:**\
Podés trabajar en revisar y completar el funcionamiento conversacional de la IA, las instrucciones del modelo y las pruebas de extracción de datos. La idea es que el modelo interprete correctamente los mensajes y pueda trabajar con información parcial sin inventar nada.

**Yo:**\
Voy a completar las validaciones de Python, la lógica de gestión de datos, la API con FastAPI, la generación del contrato Word y la conexión con el frontend.

**Importante:** tenemos que acordar cómo se pasan los datos entre `ia.py`, `gestor_datos.py` y `main.py`, para que las dos partes funcionen juntas.

El objetivo es que el empleado escriba normalmente, la IA interprete lo que necesita, Python controle los datos y el sistema genere el contrato usando la plantilla aprobada. Después debe quedar pendiente de revisión profesional.

No queremos entrenar un modelo desde cero ni cambiar Llama por ahora. Queremos aprovechar el modelo existente y construir correctamente el sistema alrededor de él.

**Una recomendación para organizarse:** antes de que trabajen por separado, acuerden que `extraer_datos()` devuelva un diccionario con las mismas secciones y claves de `CAMPOS_CONTRATO`. Así, lo que haga Alfonso se puede conectar directamente con lo que hagas vos, sin tener que adaptar todo después.
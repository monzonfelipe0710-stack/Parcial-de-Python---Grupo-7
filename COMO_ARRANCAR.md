# Cómo arrancar el proyecto

Guía con **todo lo que hay que tener y ejecutar** para levantar el sistema completo
(backend + modelo de IA + frontend).

---

## 1. Requisitos previos (una sola vez)

| Herramienta | Versión usada | Cómo verificar |
|---|---|---|
| Python | 3.12 | `py -3.12 --version` |
| Node.js | 24.x (trae npm) | `node --version` |
| Ollama | 0.33.x | `ollama --version` |

> **Importante:** el proyecto se usa con **Python 3.12**. Si tenés varias versiones,
> usá siempre `py -3.12`.

---

## 2. Instalar dependencias (una sola vez)

### Backend (Python)
Desde la raíz del proyecto:

```powershell
py -3.12 -m pip install -r requirements.txt
```

Instala: `fastapi`, `uvicorn`, `python-docx`, `requests`, `reportlab`, `cryptography`.

### Frontend (Node)
```powershell
cd frontend
npm install
```

### Modelo de IA (Ollama)
El asistente usa el modelo **`llama3.2:3b`**. Hay que descargarlo una vez:

```powershell
ollama pull llama3.2:3b
```

> Son ~2 GB. Se descarga una sola vez y queda guardado en la máquina.

---

## 3. Configuración (una sola vez)

- **Frontend:** ya existe `frontend/.env` con la URL del backend:
  ```
  VITE_API_URL=http://localhost:8000
  ```
  (si no estuviera, copialo desde `frontend/.env.example`).

- **Cifrado en disco (opcional):** solo si querés cifrar los contratos y documentos
  guardados. Definí la variable antes de levantar el backend:
  ```powershell
  $env:CLAVE_CIFRADO = "una-clave-secreta-larga"
  ```
  Si no la definís, todo funciona igual pero **sin cifrar**. Guardá bien esa clave:
  si se pierde, no se pueden descifrar los datos ya guardados.

---

## 4. Arrancar (cada vez)

Necesitás **3 cosas encendidas**, en este orden:

### Paso 1 — Ollama (el modelo)
Abrí Ollama (el ícono de la barra de tareas) o, si no está corriendo:
```powershell
ollama serve
```
Verificá que responde: `ollama list` debe mostrar `llama3.2:3b`.

### Paso 2 — Backend (API)
En una terminal, desde la raíz del proyecto:
```powershell
py -3.12 -m uvicorn backend.main:app --reload --port 8000
```
- API: http://localhost:8000
- Documentación interactiva: http://localhost:8000/docs

### Paso 3 — Frontend (la app)
En **otra** terminal:
```powershell
cd frontend
npm run dev
```
- App: http://localhost:5173

Abrí **http://localhost:5173** en el navegador.

> **Atajo:** también podés usar los scripts `arrancar_backend.bat` y
> `arrancar_frontend.bat` (doble clic). Igual necesitás Ollama encendido.

---

## 5. Primer uso

1. Entrá a http://localhost:5173 → pantalla de **Acceso**.
2. **Registrate** (elegí rol `empleado` o `profesional`).
   - Los roles salen de la cuenta (ya no hay selector de perfil).
3. Iniciá sesión y empezá a cargar un contrato conversando con el asistente.
4. Para **aprobar** un contrato necesitás una cuenta con rol `profesional`.

> No hay usuarios creados por defecto: el primero lo creás vos en "Registro".

---

## 6. Orden rápido (copiar y pegar)

```powershell
# 1) (si hace falta) levantar Ollama
ollama serve

# 2) backend
py -3.12 -m uvicorn backend.main:app --reload --port 8000

# 3) frontend (otra terminal)
cd frontend
npm run dev
```

---

## 7. Si algo falla

| Síntoma | Causa probable | Solución |
|---|---|---|
| El asistente no responde / error de IA | Ollama apagado o sin el modelo | `ollama serve` y `ollama pull llama3.2:3b` |
| `ModuleNotFoundError` en el backend | Faltan dependencias o usás otra versión de Python | `py -3.12 -m pip install -r requirements.txt` |
| El frontend no conecta | Backend apagado o URL distinta | Verificá `frontend/.env` y que el backend esté en el puerto 8000 |
| `npm run dev` falla | Faltan dependencias | `cd frontend; npm install` |
| No puedo aprobar un contrato | Tu cuenta es `empleado` | Usá una cuenta `profesional` |
| La IA "no entiende" | El modelo es chico (3B) | Escribí datos explícitos (ej.: "DNI 12345678", "fecha de inicio 2026-01-01") |

---

## 8. Notas

- El backend crea solo la base `backend/contratos.sqlite3` en el primer arranque.
- Los documentos generados quedan en `documentos_generados/`.
- La plantilla del contrato es `plantillas/contrato_ejemplo_CONT-001(1).docx`.
- Si Ollama está apagado, **todo funciona menos el chat** con el asistente.

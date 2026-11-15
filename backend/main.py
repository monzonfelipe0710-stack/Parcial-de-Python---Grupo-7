from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# Permitir la comunicación con el frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

@app.get("/")
def inicio():
    return {"mensaje": "Sistema de contratos de Acosta & Asociados"}

@app.get("/api/estado")
def estado():
    return {"estado": "Backend funcionando correctamente"}
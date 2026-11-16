import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { CLAVE_SESION, establecerToken } from '../api/cliente.js'
import {
  cerrarSesion as cerrarSesionApi,
  obtenerUsuarioActual
} from '../api/authApi.js'

const SesionContext = createContext(null)

function leerSesionGuardada() {
  try {
    const bruto = window.localStorage.getItem(CLAVE_SESION)
    return bruto ? JSON.parse(bruto) : null
  } catch {
    return null
  }
}

function guardarSesion(sesion) {
  try {
    window.localStorage.setItem(CLAVE_SESION, JSON.stringify(sesion))
  } catch {
    // Si el navegador bloquea el almacenamiento, la sesión vive solo en memoria.
  }
}

export function SesionProvider({ children }) {
  const [sesion, setSesion] = useState(leerSesionGuardada)

  const limpiarSesion = useCallback(() => {
    establecerToken(null)
    try {
      window.localStorage.removeItem(CLAVE_SESION)
    } catch {
      // Ignorar almacenamiento no disponible.
    }
    setSesion(null)
  }, [])

  const iniciarSesion = useCallback((usuario, token) => {
    const nueva = { usuario, token }
    establecerToken(token)
    guardarSesion(nueva)
    setSesion(nueva)
  }, [])

  const cerrarSesion = useCallback(() => {
    cerrarSesionApi().catch(() => {})
    limpiarSesion()
  }, [limpiarSesion])

  useEffect(() => {
    function alExpirar() {
      limpiarSesion()
    }
    window.addEventListener('contratos:sesion-expirada', alExpirar)
    return () => window.removeEventListener('contratos:sesion-expirada', alExpirar)
  }, [limpiarSesion])

  useEffect(() => {
    if (!sesion?.token) {
      return undefined
    }
    let vigente = true
    obtenerUsuarioActual()
      .then((usuario) => {
        if (!vigente) {
          return
        }
        const actualizada = { usuario, token: sesion.token }
        guardarSesion(actualizada)
        setSesion(actualizada)
      })
      .catch(() => {
        // Si el token dejó de ser válido, el cliente emite 'contratos:sesion-expirada'.
      })
    return () => {
      vigente = false
    }
    // Se valida al montar y cada vez que cambia el token.
  }, [sesion?.token])

  const valor = {
    usuario: sesion?.usuario ?? null,
    token: sesion?.token ?? null,
    iniciarSesion,
    cerrarSesion
  }

  return <SesionContext.Provider value={valor}>{children}</SesionContext.Provider>
}

export function useSesion() {
  const contexto = useContext(SesionContext)
  if (!contexto) {
    throw new Error('useSesion debe usarse dentro de SesionProvider.')
  }
  return contexto
}

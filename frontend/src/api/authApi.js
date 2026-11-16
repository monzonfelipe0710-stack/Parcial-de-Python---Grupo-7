import { solicitarApi } from './cliente.js'

export async function registrar({ nombre, email, password, rol }) {
  return solicitarApi('/api/auth/registro', {
    method: 'POST',
    body: JSON.stringify({ nombre, email, password, rol })
  })
}

export async function iniciarSesion({ email, password }) {
  return solicitarApi('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  })
}

export async function cerrarSesion() {
  return solicitarApi('/api/auth/logout', { method: 'POST' })
}

export async function obtenerUsuarioActual() {
  return solicitarApi('/api/auth/yo')
}

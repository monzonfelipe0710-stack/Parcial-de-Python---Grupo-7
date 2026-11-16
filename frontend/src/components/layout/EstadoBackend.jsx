import { useEffect, useState } from 'react'
import { consultarEstadoBackend, URL_API } from '../../api/cliente.js'

const TEXTOS = {
  verificando: 'Verificando conexión',
  conectado: 'Backend conectado',
  sin_conexion: 'Backend sin conexión'
}

const PUNTOS = {
  verificando: 'bg-papel-300',
  conectado: 'bg-exito-700',
  sin_conexion: 'bg-peligro-700'
}

export function EstadoBackend() {
  const [estado, setEstado] = useState('verificando')

  useEffect(() => {
    let vigente = true
    consultarEstadoBackend()
      .then(() => {
        if (vigente) {
          setEstado('conectado')
        }
      })
      .catch(() => {
        if (vigente) {
          setEstado('sin_conexion')
        }
      })
    return () => {
      vigente = false
    }
  }, [])

  return (
    <p role="status" className="flex items-start gap-2 text-sm text-papel-200">
      <span aria-hidden="true" className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${PUNTOS[estado]}`} />
      <span>
        {TEXTOS[estado]}
        <span className="block text-xs text-papel-300">{URL_API}</span>
      </span>
    </p>
  )
}

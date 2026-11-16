import { useCallback, useEffect, useState } from 'react'

export function useCarga(funcionCarga, dependencias = []) {
  const [estado, setEstado] = useState({ datos: null, cargando: true, error: null })
  const [version, setVersion] = useState(0)

  useEffect(() => {
    let vigente = true
    setEstado((anterior) => ({ ...anterior, cargando: true, error: null }))
    funcionCarga()
      .then((datos) => {
        if (vigente) {
          setEstado({ datos, cargando: false, error: null })
        }
      })
      .catch((error) => {
        if (vigente) {
          setEstado({ datos: null, cargando: false, error })
        }
      })
    return () => {
      vigente = false
    }
  }, [version, ...dependencias])

  const recargar = useCallback(() => setVersion((valor) => valor + 1), [])

  return { ...estado, recargar }
}

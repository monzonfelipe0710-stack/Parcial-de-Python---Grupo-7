import { useEffect, useState } from 'react'

function leerHash() {
  const bruto = window.location.hash.replace(/^#/, '') || '/contratos'
  const [camino, consulta = ''] = bruto.split('?')
  return { camino: camino || '/contratos', consulta: new URLSearchParams(consulta) }
}

export function useRuta() {
  const [ruta, setRuta] = useState(leerHash)

  useEffect(() => {
    function alCambiar() {
      setRuta(leerHash())
    }
    window.addEventListener('hashchange', alCambiar)
    return () => window.removeEventListener('hashchange', alCambiar)
  }, [])

  return ruta
}

export function navegar(camino) {
  window.location.hash = camino
}

export function coincidir(patron, camino) {
  const partesPatron = patron.split('/').filter(Boolean)
  const partesCamino = camino.split('/').filter(Boolean)
  if (partesPatron.length !== partesCamino.length) {
    return null
  }
  const parametros = {}
  for (let indice = 0; indice < partesPatron.length; indice += 1) {
    const parte = partesPatron[indice]
    if (parte.startsWith(':')) {
      try {
        parametros[parte.slice(1)] = decodeURIComponent(partesCamino[indice])
      } catch {
        return null
      }
    } else if (parte !== partesCamino[indice]) {
      return null
    }
  }
  return parametros
}

export function Enlace({ a, children, className = '', ...resto }) {
  return (
    <a href={`#${a}`} className={className} {...resto}>
      {children}
    </a>
  )
}

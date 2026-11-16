import { useEffect, useRef, useState } from 'react'
import { Enlace } from '../../lib/router.jsx'
import { useSesion } from '../../lib/sesion.jsx'
import { PERFILES } from '../../config/campos.js'
import { Boton } from '../ui/Boton.jsx'
import { EstadoBackend } from './EstadoBackend.jsx'

const ENLACES = [
  { a: '/contratos', etiqueta: 'Contratos', activo: (camino) => camino === '/contratos' || (camino.startsWith('/contratos/') && camino !== '/contratos/nuevo') },
  { a: '/contratos/nuevo', etiqueta: 'Nuevo contrato', activo: (camino) => camino === '/contratos/nuevo' },
  { a: '/revision', etiqueta: 'Revisión profesional', activo: (camino) => camino === '/revision' }
]

function Navegacion({ camino, alNavegar }) {
  return (
    <nav aria-label="Navegación principal">
      <ul className="space-y-1">
        {ENLACES.map((enlace) => {
          const activo = enlace.activo(camino)
          return (
            <li key={enlace.a}>
              <Enlace
                a={enlace.a}
                onClick={alNavegar}
                aria-current={activo ? 'page' : undefined}
                className={`block rounded-md border-l-4 px-4 py-3 text-base font-medium transition-colors ${
                  activo
                    ? 'border-dorado-600 bg-tinta-800 text-white'
                    : 'border-transparent text-papel-100 hover:bg-tinta-800'
                }`}
              >
                {enlace.etiqueta}
              </Enlace>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

function PanelUsuario() {
  const { usuario, cerrarSesion } = useSesion()
  if (!usuario) {
    return null
  }
  const etiquetaRol = PERFILES[usuario.rol]?.etiqueta ?? usuario.rol
  return (
    <div>
      <p className="mb-1 text-sm font-semibold text-papel-100">Sesión activa</p>
      <p className="text-base font-semibold text-white">{usuario.nombre}</p>
      <p className="text-xs text-papel-300">{etiquetaRol}</p>
      <p className="mt-0.5 break-all text-xs text-papel-300">{usuario.email}</p>
      <Boton variante="secundario" className="mt-3 w-full" onClick={cerrarSesion}>
        Cerrar sesión
      </Boton>
    </div>
  )
}

function Marca() {
  return (
    <div>
      <p className="font-serif text-xl font-semibold leading-tight text-white">Acosta &amp; Asociados</p>
      <p className="text-sm text-papel-300">Sistema de contratos</p>
    </div>
  )
}

export function AppLayout({ camino, children }) {
  const [menuAbierto, setMenuAbierto] = useState(false)
  const principal = useRef(null)
  const caminoAnterior = useRef(camino)

  useEffect(() => {
    if (caminoAnterior.current === camino) {
      return
    }
    caminoAnterior.current = camino
    setMenuAbierto(false)
    if (principal.current) {
      principal.current.focus({ preventScroll: true })
    }
    window.scrollTo(0, 0)
  }, [camino])

  return (
    <div className="min-h-screen lg:flex">
      <a
        href="#contenido-principal"
        onClick={(evento) => {
          evento.preventDefault()
          principal.current?.focus()
        }}
        className="sr-only z-50 rounded-md bg-white px-4 py-2 font-semibold text-tinta-900 focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Ir al contenido principal
      </a>

      <header className="flex items-center justify-between bg-tinta-900 px-4 py-3 lg:hidden">
        <Marca />
        <button
          type="button"
          aria-expanded={menuAbierto}
          aria-controls="menu-lateral"
          onClick={() => setMenuAbierto((valor) => !valor)}
          className="min-h-11 rounded-md border border-tinta-600 px-4 py-2 text-sm font-semibold text-white hover:bg-tinta-800"
        >
          {menuAbierto ? 'Cerrar menú' : 'Abrir menú'}
        </button>
      </header>

      <aside
        id="menu-lateral"
        className={`${menuAbierto ? 'block' : 'hidden'} bg-tinta-900 px-4 pb-6 pt-4 lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-72 lg:overflow-y-auto lg:shrink-0 lg:flex-col lg:justify-between lg:px-6 lg:py-8`}
      >
        <div className="space-y-8">
          <div className="hidden lg:block">
            <Marca />
            <div className="mt-4 h-px bg-dorado-600" />
          </div>
          <Navegacion camino={camino} alNavegar={() => setMenuAbierto(false)} />
        </div>
        <div className="mt-8 space-y-5 lg:mt-0">
          <PanelUsuario />
          <EstadoBackend />
          <p className="text-xs text-papel-300">
            Los contratos y el asistente utilizan el backend local.
          </p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <main
          id="contenido-principal"
          ref={principal}
          tabIndex={-1}
          className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-8 lg:py-10"
        >
          {children}
        </main>
        <footer className="border-t border-papel-300 bg-papel-100 px-4 py-4 text-sm text-texto-suave sm:px-8">
          Todo contrato generado queda sujeto a revisión y aprobación de un profesional autorizado antes de
          considerarse definitivo.
        </footer>
      </div>
    </div>
  )
}

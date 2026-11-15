import { useEffect, useRef, useState } from 'react'
import { Enlace } from '../../lib/router.jsx'
import { usePerfil } from '../../lib/perfil.jsx'
import { PERFILES } from '../../config/campos.js'
import { modoSimulacion } from '../../api/contratosApi.js'
import { EstadoBackend } from './EstadoBackend.jsx'
import { Aviso } from '../ui/Aviso.jsx'

const ENLACES = [
  { a: '/contratos', etiqueta: 'Contratos', activo: (camino) => camino === '/contratos' || (camino.startsWith('/contratos/') && camino !== '/contratos/nuevo') },
  { a: '/contratos/nuevo', etiqueta: 'Nuevo contrato', activo: (camino) => camino === '/contratos/nuevo' },
  { a: '/revision', etiqueta: 'Revisión profesional', activo: (camino) => camino === '/revision' }
]

const TEXTOS_SIMULACION = {
  error: 'Los datos simulados responden con error.',
  vacio: 'Los datos simulados responden sin resultados.',
  lento: 'Los datos simulados responden con demora.'
}

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

function SelectorPerfil() {
  const { perfil, cambiarPerfil } = usePerfil()
  return (
    <div>
      <label htmlFor="selector-perfil" className="mb-1 block text-sm font-semibold text-papel-100">
        Perfil de usuario
      </label>
      <select
        id="selector-perfil"
        value={perfil}
        onChange={(evento) => cambiarPerfil(evento.target.value)}
        className="block w-full rounded-md border border-papel-300 bg-tinta-800 px-3 py-2.5 text-base text-white"
      >
        {Object.keys(PERFILES).map((clave) => (
          <option key={clave} value={clave}>
            {PERFILES[clave].etiqueta}
          </option>
        ))}
      </select>
      <p className="mt-1 text-xs text-papel-300">Selección simulada, sin inicio de sesión.</p>
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
  const simulacion = modoSimulacion()

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
          <SelectorPerfil />
          <EstadoBackend />
          <p className="text-xs text-papel-300">
            Los contratos y el asistente funcionan con datos simulados hasta que exista la API.
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
          {simulacion && TEXTOS_SIMULACION[simulacion] ? (
            <Aviso tipo="info" titulo="Modo de prueba activo" className="mb-6">
              {TEXTOS_SIMULACION[simulacion]}
            </Aviso>
          ) : null}
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

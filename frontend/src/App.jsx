import { useEffect } from 'react'
import { SesionProvider, useSesion } from './lib/sesion.jsx'
import { coincidir, useRuta } from './lib/router.jsx'
import { AppLayout } from './components/layout/AppLayout.jsx'
import ContratosPage from './pages/ContratosPage.jsx'
import NuevoContratoPage from './pages/NuevoContratoPage.jsx'
import DetalleContratoPage from './pages/DetalleContratoPage.jsx'
import RevisionPage from './pages/RevisionPage.jsx'
import NoEncontradaPage from './pages/NoEncontradaPage.jsx'
import AccesoPage from './pages/AccesoPage.jsx'

const RUTAS = [
  { patron: '/contratos', titulo: 'Contratos', pagina: ContratosPage },
  { patron: '/contratos/nuevo', titulo: 'Nuevo contrato', pagina: NuevoContratoPage },
  { patron: '/contratos/:id', titulo: 'Detalle del contrato', pagina: DetalleContratoPage },
  { patron: '/revision', titulo: 'Revisión profesional', pagina: RevisionPage }
]

function resolverRuta(camino) {
  for (const ruta of RUTAS) {
    const parametros = coincidir(ruta.patron, camino)
    if (parametros) {
      return { ...ruta, parametros }
    }
  }
  return { titulo: 'Página no encontrada', pagina: NoEncontradaPage, parametros: {} }
}

function Aplicacion() {
  const { camino, consulta } = useRuta()
  const { usuario } = useSesion()
  const ruta = resolverRuta(camino)
  const Pagina = ruta.pagina

  useEffect(() => {
    document.title = `${ruta.titulo} | Acosta & Asociados`
  }, [ruta.titulo])

  if (!usuario) {
    return <AccesoPage />
  }

  return (
    <AppLayout camino={camino}>
      <Pagina key={camino} parametros={ruta.parametros} consulta={consulta} />
    </AppLayout>
  )
}

export default function App() {
  return (
    <SesionProvider>
      <Aplicacion />
    </SesionProvider>
  )
}

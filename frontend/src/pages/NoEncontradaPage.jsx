import { EncabezadoPagina } from '../components/ui/EncabezadoPagina.jsx'
import { EstadoVacio } from '../components/ui/EstadoVacio.jsx'
import { Enlace } from '../lib/router.jsx'
import { clasesBoton } from '../components/ui/Boton.jsx'

export default function NoEncontradaPage() {
  return (
    <>
      <EncabezadoPagina titulo="Página no encontrada" />
      <EstadoVacio
        titulo="La dirección solicitada no existe"
        descripcion="Verifique la dirección o vuelva al listado de contratos."
      >
        <Enlace a="/contratos" className={clasesBoton('primario')}>
          Ir a contratos
        </Enlace>
      </EstadoVacio>
    </>
  )
}

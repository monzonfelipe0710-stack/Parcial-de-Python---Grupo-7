import { SECCIONES } from '../config/campos.js'
import { Tarjeta } from '../components/ui/Tarjeta.jsx'
import { CampoFormulario } from '../components/ui/CampoFormulario.jsx'
import { campoVacio, idCampo, leerValor } from '../lib/datosContrato.js'
import { validarCampo } from '../lib/validaciones.js'

function esVisible(erroresVisibles, llave) {
  if (!erroresVisibles) {
    return false
  }
  if (typeof erroresVisibles.has === 'function') {
    return erroresVisibles.has(llave)
  }
  return erroresVisibles.includes(llave)
}

function calcularMensaje({ seccion, campo, valor, errores, erroresVisibles }) {
  const llave = `${seccion}.${campo}`
  if (!esVisible(erroresVisibles, llave)) {
    return ''
  }
  if (campoVacio(valor)) {
    return 'Este campo es obligatorio.'
  }
  return validarCampo(seccion, campo, valor) || errores?.[llave] || ''
}

export function FormularioContrato({ datos, alCambiar, errores, erroresVisibles, alSalirCampo }) {
  return (
    <Tarjeta
      titulo="Datos del contrato"
      descripcion="Todos los campos son obligatorios. Las cláusulas cuarta a novena y la jurisdicción son contenido fijo del modelo y no se editan."
      idTitulo="titulo-formulario-contrato"
    >
      <div className="space-y-8">
        {SECCIONES.map((seccion) => (
          <fieldset key={seccion.clave} className="min-w-0 border-0 p-0">
            <legend className="mb-4 w-full border-b border-papel-200 pb-2 font-serif text-lg font-semibold text-tinta-900">
              {seccion.titulo}
            </legend>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              {seccion.campos.map((campo) => {
                const valor = leerValor(datos, seccion.clave, campo.clave)
                const ocupaFila = campo.tipo === 'textarea'
                return (
                  <CampoFormulario
                    key={campo.clave}
                    id={idCampo(seccion.clave, campo.clave)}
                    etiqueta={campo.etiqueta}
                    tipo={campo.tipo}
                    valor={valor}
                    obligatorio
                    ayuda={campo.ayuda}
                    error={calcularMensaje({
                      seccion: seccion.clave,
                      campo: campo.clave,
                      valor,
                      errores,
                      erroresVisibles
                    })}
                    onChange={(evento) =>
                      alCambiar(seccion.clave, campo.clave, evento.target.value)
                    }
                    onBlur={() => alSalirCampo(seccion.clave, campo.clave)}
                    className={ocupaFila ? 'md:col-span-2' : ''}
                  />
                )
              })}
            </div>
          </fieldset>
        ))}
      </div>
    </Tarjeta>
  )
}

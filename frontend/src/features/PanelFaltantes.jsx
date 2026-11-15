import { Aviso } from '../components/ui/Aviso.jsx'
import { Tarjeta } from '../components/ui/Tarjeta.jsx'
import { contarCampos, detectarCamposFaltantes, idCampo } from '../lib/datosContrato.js'

export function enfocarCampo(seccion, clave) {
  const elemento = document.getElementById(idCampo(seccion, clave))
  if (elemento) {
    elemento.focus()
  }
}

function agruparPorSeccion(faltantes) {
  const grupos = []
  faltantes.forEach((faltante) => {
    let grupo = grupos.find((existente) => existente.seccion === faltante.seccion)
    if (!grupo) {
      grupo = { seccion: faltante.seccion, titulo: faltante.tituloSeccion, campos: [] }
      grupos.push(grupo)
    }
    grupo.campos.push(faltante)
  })
  return grupos
}

export function PanelFaltantes({ datos }) {
  const { total, completos } = contarCampos(datos)
  const faltantes = detectarCamposFaltantes(datos)
  const grupos = agruparPorSeccion(faltantes)
  const porcentaje = total === 0 ? 0 : Math.round((completos / total) * 100)
  const textoProgreso = `${completos} de ${total} campos completos`

  return (
    <Tarjeta
      titulo="Datos obligatorios"
      descripcion="Avance de los datos requeridos por el modelo."
      idTitulo="titulo-faltantes"
    >
      <p className="text-sm font-semibold text-tinta-900">{textoProgreso}</p>
      <div
        role="progressbar"
        aria-valuenow={completos}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuetext={textoProgreso}
        aria-label="Avance de campos completos del contrato"
        className="mt-2 h-3 w-full overflow-hidden rounded-full border border-papel-300 bg-papel-100"
      >
        <div className="h-full bg-tinta-700" style={{ width: `${porcentaje}%` }} />
      </div>

      <div className="mt-5">
        {faltantes.length === 0 ? (
          <Aviso tipo="exito" titulo="Datos completos">
            Todos los campos obligatorios tienen información.
          </Aviso>
        ) : (
          <>
            <h3 className="text-base font-semibold">
              Campos que faltan ({faltantes.length})
            </h3>
            <div className="mt-3 space-y-4">
              {grupos.map((grupo) => (
                <div key={grupo.seccion}>
                  <p className="text-sm font-semibold text-texto-suave">{grupo.titulo}</p>
                  <ul className="mt-1">
                    {grupo.campos.map((campo) => (
                      <li key={campo.clave}>
                        <button
                          type="button"
                          onClick={() => enfocarCampo(campo.seccion, campo.clave)}
                          className="min-h-11 w-full rounded-md px-2 py-2 text-left text-sm text-tinta-700 underline underline-offset-2 hover:bg-papel-100"
                        >
                          {campo.etiqueta}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </Tarjeta>
  )
}

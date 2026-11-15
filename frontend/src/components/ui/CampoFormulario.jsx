const CLASES_CONTROL =
  'block w-full rounded-md border bg-white px-3 py-2.5 text-base text-texto placeholder:text-texto-suave focus-visible:outline-3 disabled:bg-papel-100'

export function CampoFormulario({
  id,
  etiqueta,
  tipo = 'text',
  valor,
  onChange,
  onBlur,
  error = '',
  ayuda = '',
  obligatorio = false,
  opciones = [],
  filas = 4,
  className = '',
  ...resto
}) {
  const idAyuda = ayuda ? `${id}-ayuda` : undefined
  const idError = error ? `${id}-error` : undefined
  const describedBy = [idAyuda, idError].filter(Boolean).join(' ') || undefined
  const claseBorde = error ? 'border-peligro-700' : 'border-texto-suave'

  const propiedadesComunes = {
    id,
    value: valor,
    onChange,
    onBlur,
    required: obligatorio,
    'aria-invalid': error ? 'true' : undefined,
    'aria-describedby': describedBy,
    className: `${CLASES_CONTROL} ${claseBorde}`,
    ...resto
  }

  let control
  if (tipo === 'textarea') {
    control = <textarea rows={filas} {...propiedadesComunes} />
  } else if (tipo === 'select') {
    control = (
      <select {...propiedadesComunes}>
        {opciones.map((opcion) => (
          <option key={opcion.valor} value={opcion.valor}>
            {opcion.etiqueta}
          </option>
        ))}
      </select>
    )
  } else if (tipo === 'number') {
    control = <input type="number" inputMode="decimal" min="0" step="any" {...propiedadesComunes} />
  } else {
    control = <input type={tipo} {...propiedadesComunes} />
  }

  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1 block text-sm font-semibold text-tinta-900">
        {etiqueta}
        {obligatorio ? <span className="font-normal text-texto-suave"> (obligatorio)</span> : null}
      </label>
      {control}
      {ayuda ? (
        <p id={idAyuda} className="mt-1 text-sm text-texto-suave">
          {ayuda}
        </p>
      ) : null}
      {error ? (
        <p id={idError} role="alert" className="mt-1 text-sm font-medium text-peligro-700">
          {error}
        </p>
      ) : null}
    </div>
  )
}

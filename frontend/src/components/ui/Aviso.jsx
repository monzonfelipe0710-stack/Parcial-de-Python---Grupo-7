const CLASES = {
  info: 'border-info-700 bg-info-100 text-info-700',
  exito: 'border-exito-700 bg-exito-100 text-exito-700',
  alerta: 'border-alerta-700 bg-alerta-100 text-alerta-700',
  peligro: 'border-peligro-700 bg-peligro-100 text-peligro-700'
}

export function Aviso({ tipo = 'info', titulo, children, className = '', rol: rolForzado }) {
  const rolPorTipo = tipo === 'peligro' || tipo === 'alerta' ? 'alert' : 'status'
  const rol = rolForzado ?? rolPorTipo
  return (
    <div role={rol} className={`rounded-md border-l-4 px-4 py-3 text-sm ${CLASES[tipo]} ${className}`}>
      {titulo ? <p className="font-semibold">{titulo}</p> : null}
      {children ? <div className={titulo ? 'mt-1' : ''}>{children}</div> : null}
    </div>
  )
}

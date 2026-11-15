import { createContext, useContext, useState } from 'react'

const PerfilContext = createContext({ perfil: 'empleado', cambiarPerfil: () => {} })

export function PerfilProvider({ children }) {
  const [perfil, setPerfil] = useState('empleado')
  return (
    <PerfilContext.Provider value={{ perfil, cambiarPerfil: setPerfil }}>
      {children}
    </PerfilContext.Provider>
  )
}

export function usePerfil() {
  return useContext(PerfilContext)
}

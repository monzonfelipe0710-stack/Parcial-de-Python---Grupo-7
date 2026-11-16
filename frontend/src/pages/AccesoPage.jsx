import { useState } from 'react'
import { iniciarSesion as iniciarSesionApi, registrar } from '../api/authApi.js'
import { useSesion } from '../lib/sesion.jsx'
import { PERFILES } from '../config/campos.js'
import { Aviso } from '../components/ui/Aviso.jsx'
import { Boton } from '../components/ui/Boton.jsx'
import { CampoFormulario } from '../components/ui/CampoFormulario.jsx'
import { Tarjeta } from '../components/ui/Tarjeta.jsx'

const FORMULARIO_INICIAL = { nombre: '', email: '', password: '', rol: 'empleado' }

export default function AccesoPage() {
  const { iniciarSesion } = useSesion()
  const [modo, setModo] = useState('login')
  const [formulario, setFormulario] = useState(FORMULARIO_INICIAL)
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)

  const esRegistro = modo === 'registro'

  function actualizar(campo) {
    return (evento) => {
      const { value } = evento.target
      setFormulario((anterior) => ({ ...anterior, [campo]: value }))
    }
  }

  function cambiarModo(nuevoModo) {
    setModo(nuevoModo)
    setError('')
    setFormulario(FORMULARIO_INICIAL)
  }

  async function enviar(evento) {
    evento.preventDefault()
    setError('')
    setEnviando(true)
    try {
      const respuesta = esRegistro
        ? await registrar({
            nombre: formulario.nombre,
            email: formulario.email,
            password: formulario.password,
            rol: formulario.rol
          })
        : await iniciarSesionApi({
            email: formulario.email,
            password: formulario.password
          })
      iniciarSesion(respuesta.usuario, respuesta.token)
    } catch (fallo) {
      setError(fallo?.message ?? 'No se pudo completar la operación.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-tinta-900 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <p className="font-serif text-2xl font-semibold text-white">Acosta &amp; Asociados</p>
          <p className="mt-1 text-sm text-papel-300">Sistema de contratos</p>
        </div>

        <Tarjeta
          titulo={esRegistro ? 'Crear cuenta' : 'Iniciar sesión'}
          descripcion={
            esRegistro
              ? 'Registre una cuenta para generar y revisar contratos.'
              : 'Ingrese con su correo electrónico y contraseña.'
          }
        >
          <form className="space-y-4" onSubmit={enviar} noValidate>
            {error ? (
              <Aviso tipo="peligro" titulo="No se pudo completar la operación">
                {error}
              </Aviso>
            ) : null}

            {esRegistro ? (
              <CampoFormulario
                id="acceso-nombre"
                etiqueta="Nombre y apellido"
                valor={formulario.nombre}
                onChange={actualizar('nombre')}
                obligatorio
                autoComplete="name"
              />
            ) : null}

            <CampoFormulario
              id="acceso-email"
              etiqueta="Correo electrónico"
              tipo="email"
              valor={formulario.email}
              onChange={actualizar('email')}
              obligatorio
              autoComplete="email"
            />

            <CampoFormulario
              id="acceso-password"
              etiqueta="Contraseña"
              tipo="password"
              valor={formulario.password}
              onChange={actualizar('password')}
              obligatorio
              autoComplete={esRegistro ? 'new-password' : 'current-password'}
              ayuda={esRegistro ? 'Mínimo 8 caracteres.' : ''}
            />

            {esRegistro ? (
              <CampoFormulario
                id="acceso-rol"
                etiqueta="Rol"
                tipo="select"
                valor={formulario.rol}
                onChange={actualizar('rol')}
                opciones={Object.entries(PERFILES).map(([clave, definicion]) => ({
                  valor: clave,
                  etiqueta: definicion.etiqueta
                }))}
                ayuda="El rol profesional habilita la aprobación de contratos."
              />
            ) : null}

            <Boton type="submit" variante="primario" className="w-full" cargando={enviando}>
              {esRegistro ? 'Crear cuenta' : 'Ingresar'}
            </Boton>
          </form>

          <div className="mt-4 border-t border-papel-200 pt-4 text-sm text-texto-suave">
            {esRegistro ? (
              <p>
                ¿Ya tiene una cuenta?{' '}
                <button
                  type="button"
                  onClick={() => cambiarModo('login')}
                  className="font-semibold text-tinta-700 underline underline-offset-4 hover:text-tinta-900"
                >
                  Iniciar sesión
                </button>
              </p>
            ) : (
              <p>
                ¿No tiene una cuenta?{' '}
                <button
                  type="button"
                  onClick={() => cambiarModo('registro')}
                  className="font-semibold text-tinta-700 underline underline-offset-4 hover:text-tinta-900"
                >
                  Crear una cuenta
                </button>
              </p>
            )}
          </div>
        </Tarjeta>
      </div>
    </div>
  )
}

'use client'

import Link from 'next/link'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminHomePage() {
  const router = useRouter()

  useEffect(() => {
    const token = localStorage.getItem('admin_token')
    if (!token) router.push('/')
  }, [router])

  const logout = () => {
    localStorage.removeItem('admin_token')
    router.push('/')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Administración clínica</h1>
            <p className="text-sm text-gray-500">Gestión operativa (personal, pacientes, citas)</p>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/" className="text-sm text-primary hover:underline">
              Inicio
            </Link>
            <button onClick={logout} className="text-sm text-gray-600 hover:text-gray-900">
              Cerrar sesión
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            href="/it/medical-professionals"
            className="bg-white rounded-lg shadow-md p-6 hover:bg-gray-50 transition border"
          >
            <div className="font-semibold text-gray-900">Personal</div>
            <div className="text-sm text-gray-600 mt-1">Altas, roles, especialidad, activar/desactivar</div>
          </Link>

          <Link
            href="/admin/patients"
            className="bg-white rounded-lg shadow-md p-6 hover:bg-gray-50 transition border"
          >
            <div className="font-semibold text-gray-900">Pacientes</div>
            <div className="text-sm text-gray-600 mt-1">Listado y búsqueda por nombre/email</div>
          </Link>

          <Link
            href="/admin/consultations"
            className="bg-white rounded-lg shadow-md p-6 hover:bg-gray-50 transition border"
          >
            <div className="font-semibold text-gray-900">Citas / Consultas</div>
            <div className="text-sm text-gray-600 mt-1">Lista por día, reasignación, estado</div>
          </Link>
        </div>
      </main>
    </div>
  )
}

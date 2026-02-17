'use client'

import { Users, Video, Calendar, Settings } from 'lucide-react'
import Link from 'next/link'

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-primary">Dashboard Médico</h1>
          <button className="flex items-center gap-2 text-gray-600 hover:text-primary">
            <Settings className="w-5 h-5" />
            <span>Configuración</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Pacientes</h3>
              <Users className="w-6 h-6 text-primary" />
            </div>
            <p className="text-3xl font-bold">24</p>
            <p className="text-sm text-gray-500">Total registrados</p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Citas Hoy</h3>
              <Calendar className="w-6 h-6 text-primary" />
            </div>
            <p className="text-3xl font-bold">5</p>
            <p className="text-sm text-gray-500">Pendientes</p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Videoconsultas</h3>
              <Video className="w-6 h-6 text-primary" />
            </div>
            <Link 
              href="/video-room" 
              className="block w-full bg-primary text-white text-center py-2 rounded-md hover:bg-opacity-90 transition"
            >
              Iniciar Sala
            </Link>
          </div>
        </div>

        {/* Patient List Placeholder */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Próximas Citas</h2>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                <div>
                  <p className="font-medium">Paciente {i}</p>
                  <p className="text-sm text-gray-500">14:00 - Consulta General</p>
                </div>
                <button className="text-primary hover:underline">Ver detalles</button>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}

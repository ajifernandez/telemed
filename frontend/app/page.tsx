import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-2xl mx-auto px-6 text-center">
        <h1 className="text-6xl font-bold text-gray-900 mb-6">
          Telemedicina
        </h1>
        <p className="text-xl text-gray-600 mb-12">
          Consultas médicas seguras desde casa
        </p>
        
        <div className="flex flex-col sm:flex-row gap-6 items-center justify-center">
          <Link
            href="/login"
            className="inline-block bg-blue-600 text-white px-8 py-4 rounded-lg font-semibold hover:bg-blue-700 transition text-lg"
          >
            🔐 Iniciar Sesión
          </Link>
          <Link
            href="/reserva"
            className="inline-block bg-white text-blue-600 px-8 py-4 rounded-lg font-semibold border-2 border-blue-600 hover:bg-blue-50 transition text-lg"
          >
            📅 Reservar Cita
          </Link>
        </div>
      </div>
    </div>
  )
}

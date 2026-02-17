'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'

type Consultation = {
  id: number
  patient_id: number
  doctor_id: number
  consultation_type: string
  specialty: string
  reason_for_visit?: string | null
  scheduled_at: string
  duration_minutes: number
  status: string
  notes?: string | null
  jitsi_room_name?: string | null
  jitsi_room_url?: string | null
  created_at: string
  updated_at: string
  started_at?: string | null
  ended_at?: string | null
  patient?: {
    id: number
    full_name?: string | null
    email: string
    phone?: string | null
  }
}

function formatDateTime(iso: string) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString()
}

function formatDate(iso: string) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('es-ES')
}

function formatTime(iso: string) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
}

function getStatusColor(status: string) {
  switch (status) {
    case 'pending': return 'bg-yellow-100 text-yellow-800'
    case 'confirmed': return 'bg-green-100 text-green-800'
    case 'in_progress': return 'bg-blue-100 text-blue-800'
    case 'completed': return 'bg-gray-100 text-gray-800'
    case 'cancelled': return 'bg-red-100 text-red-800'
    default: return 'bg-gray-100 text-gray-800'
  }
}

function getStatusText(status: string) {
  switch (status) {
    case 'pending': return 'Pendiente'
    case 'confirmed': return 'Confirmada'
    case 'in_progress': return 'En Progreso'
    case 'completed': return 'Completada'
    case 'cancelled': return 'Cancelada'
    default: return status
  }
}

export default function DoctorConsultationDetailPage() {
  const router = useRouter()
  const params = useParams()
  const consultationId = params.id as string

  const apiBase = useMemo(() => {
    return process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000/api/v1'
  }, [])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [consultation, setConsultation] = useState<Consultation | null>(null)

  const loadConsultation = async () => {
    setError(null)
    setLoading(true)

    const token = localStorage.getItem('doctor_token')
    if (!token) {
      router.push('/doctor/login')
      return
    }

    try {
      const res = await fetch(`${apiBase}/doctor/consultations`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (res.status === 401) {
        localStorage.removeItem('doctor_token')
        router.push('/doctor/login')
        return
      }

      if (!res.ok) {
        const detail = await res.text()
        throw new Error(detail || 'Error cargando consulta')
      }

      const consultations = (await res.json()) as Consultation[]
      const foundConsultation = consultations.find(c => c.id === parseInt(consultationId))
      
      if (!foundConsultation) {
        throw new Error('Consulta no encontrada')
      }

      setConsultation(foundConsultation)
    } catch (e: any) {
      setError(e?.message || 'Error cargando consulta')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadConsultation()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [consultationId])

  const logout = () => {
    localStorage.removeItem('doctor_token')
    router.push('/doctor/login')
  }

  const handleStartConsultation = () => {
    if (consultation?.jitsi_room_url) {
      window.open(consultation.jitsi_room_url, '_blank')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">💼 Consulta</h1>
              <p className="text-sm text-gray-600">Cargando detalles...</p>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/doctor" className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                🏠 Dashboard
              </Link>
              <button onClick={logout} className="text-sm text-gray-600 hover:text-gray-900 font-medium">
                Cerrar sesión
              </button>
            </div>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-6 py-8">
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <div className="inline-flex items-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">Cargando consulta...</span>
            </div>
          </div>
        </main>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">💼 Consulta</h1>
              <p className="text-sm text-gray-600">Error</p>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/doctor" className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                🏠 Dashboard
              </Link>
              <button onClick={logout} className="text-sm text-gray-600 hover:text-gray-900 font-medium">
                Cerrar sesión
              </button>
            </div>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-6 py-8">
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <div className="text-6xl mb-4">❌</div>
            <div className="text-lg font-medium text-gray-900 mb-2">Error</div>
            <p className="text-sm text-gray-600 mb-4">{error}</p>
            <button
              onClick={loadConsultation}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Reintentar
            </button>
          </div>
        </main>
      </div>
    )
  }

  if (!consultation) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">💼 Consulta</h1>
              <p className="text-sm text-gray-600">No encontrada</p>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/doctor" className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                🏠 Dashboard
              </Link>
              <button onClick={logout} className="text-sm text-gray-600 hover:text-gray-900 font-medium">
                Cerrar sesión
              </button>
            </div>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-6 py-8">
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <div className="text-6xl mb-4">🔍</div>
            <div className="text-lg font-medium text-gray-900 mb-2">Consulta no encontrada</div>
            <p className="text-sm text-gray-600 mb-4">La consulta solicitada no existe o no tienes acceso a ella.</p>
            <Link
              href="/doctor"
              className="inline-block px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Volver al Dashboard
            </Link>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">💼 Consulta #{consultation.id}</h1>
            <p className="text-sm text-gray-600">
              {consultation.specialty} - {formatDate(consultation.scheduled_at)}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/doctor" className="text-sm text-blue-600 hover:text-blue-800 font-medium">
              🏠 Dashboard
            </Link>
            <button onClick={logout} className="text-sm text-gray-600 hover:text-gray-900 font-medium">
              Cerrar sesión
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {error && (
          <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 mb-6">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Patient Info */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">👤 Paciente</h2>
              <div className="space-y-3">
                <div>
                  <div className="text-sm font-medium text-gray-900">
                    {consultation.patient?.full_name || 'Sin nombre'}
                  </div>
                  <div className="text-xs text-gray-500">{consultation.patient?.email}</div>
                </div>
                <div className="text-sm text-gray-600">
                  <div>📞 {consultation.patient?.phone || 'No registrado'}</div>
                  <div>🆔 ID: {consultation.patient?.id}</div>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t">
                <Link
                  href={`/doctor/patients/${consultation.patient?.id}`}
                  className="text-sm px-3 py-2 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                >
                  Ver Historia Clínica
                </Link>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">📅 Detalles</h2>
              <div className="space-y-3">
                <div>
                  <div className="text-sm font-medium text-gray-900">Fecha y Hora</div>
                  <div className="text-sm text-gray-600">
                    {formatDateTime(consultation.scheduled_at)}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-900">Duración</div>
                  <div className="text-sm text-gray-600">{consultation.duration_minutes} minutos</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-900">Tipo</div>
                  <div className="text-sm text-gray-600 capitalize">{consultation.consultation_type}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-900">Estado</div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(consultation.status)}`}>
                    {getStatusText(consultation.status)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Consultation Details */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">🏥 Información de Consulta</h2>
              <div className="space-y-4">
                <div>
                  <div className="text-sm font-medium text-gray-900">Especialidad</div>
                  <div className="text-sm text-gray-600">{consultation.specialty}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-900">Motivo de Consulta</div>
                  <div className="text-sm text-gray-600">
                    {consultation.reason_for_visit || 'No especificado'}
                  </div>
                </div>
                {consultation.notes && (
                  <div>
                    <div className="text-sm font-medium text-gray-900">Notas</div>
                    <div className="text-sm text-gray-600 whitespace-pre-wrap">
                      {consultation.notes}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {consultation.jitsi_room_url && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">🎥 Videoconsulta</h2>
                <div className="space-y-4">
                  <div>
                    <div className="text-sm font-medium text-gray-900">Sala Jitsi</div>
                    <div className="text-sm text-gray-600 font-mono">
                      {consultation.jitsi_room_name}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">Enlace de Acceso</div>
                    <div className="text-sm text-blue-600 break-all">
                      {consultation.jitsi_room_url}
                    </div>
                  </div>
                  <button
                    onClick={handleStartConsultation}
                    className="w-full px-4 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors font-medium"
                  >
                    🎥 Iniciar Videoconsulta
                  </button>
                  <p className="text-xs text-gray-500 text-center">
                    Al hacer clic se abrirá la sala de video en una nueva pestaña
                  </p>
                </div>
              </div>
            )}

            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">⏰ Timeline</h2>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">Creada</div>
                    <div className="text-xs text-gray-500">{formatDateTime(consultation.created_at)}</div>
                  </div>
                </div>
                {consultation.started_at && (
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <div>
                      <div className="text-sm font-medium text-gray-900">Iniciada</div>
                      <div className="text-xs text-gray-500">{formatDateTime(consultation.started_at)}</div>
                    </div>
                  </div>
                )}
                {consultation.ended_at && (
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
                    <div>
                      <div className="text-sm font-medium text-gray-900">Finalizada</div>
                      <div className="text-xs text-gray-500">{formatDateTime(consultation.ended_at)}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

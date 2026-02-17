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

type ClinicalRecord = {
  id: number
  patient_id: number
  chief_complaint?: string | null
  background?: string | null
  assessment?: string | null
  plan?: string | null
  allergies?: string | null
  medications?: string | null
  created_at: string
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
  const [patientHistory, setPatientHistory] = useState<ClinicalRecord[]>([])
  const [showHistoryModal, setShowHistoryModal] = useState(false)
  const [videoStarted, setVideoStarted] = useState(false)
  
  // Form for current consultation notes
  const [consultationNotes, setConsultationNotes] = useState({
    chief_complaint: '',
    background: '',
    assessment: '',
    plan: '',
    allergies: '',
    medications: ''
  })
  const [savingNotes, setSavingNotes] = useState(false)

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
      
      // Load patient history
      if (foundConsultation.patient?.id) {
        const historyRes = await fetch(`${apiBase}/doctor/patients/${foundConsultation.patient.id}/history`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        
        if (historyRes.ok) {
          const history = (await historyRes.json()) as ClinicalRecord[]
          setPatientHistory(history)
        }
      }
      
      // Pre-fill with consultation reason
      if (foundConsultation.reason_for_visit) {
        setConsultationNotes(prev => ({
          ...prev,
          chief_complaint: foundConsultation.reason_for_visit || ''
        }))
      }
      
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
    router.push('/')
  }

  const handleStartVideo = () => {
    if (consultation?.jitsi_room_url) {
      setVideoStarted(true)
      window.open(consultation.jitsi_room_url, '_blank')
    }
  }

  const handleSaveNotes = async () => {
    if (!consultation?.patient?.id) return
    
    setSavingNotes(true)
    const token = localStorage.getItem('doctor_token')
    
    try {
      const res = await fetch(`${apiBase}/doctor/patients/${consultation.patient.id}/history`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(consultationNotes),
      })
      
      if (res.ok) {
        // Reload history
        const historyRes = await fetch(`${apiBase}/doctor/patients/${consultation.patient.id}/history`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        
        if (historyRes.ok) {
          const history = (await historyRes.json()) as ClinicalRecord[]
          setPatientHistory(history)
        }
        
        // Clear form
        setConsultationNotes({
          chief_complaint: '',
          background: '',
          assessment: '',
          plan: '',
          allergies: '',
          medications: ''
        })
        
        alert('✅ Notas guardadas exitosamente')
      } else {
        throw new Error('Error guardando notas')
      }
    } catch (e: any) {
      alert('❌ Error: ' + (e?.message || 'Error guardando notas'))
    } finally {
      setSavingNotes(false)
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
          {/* Left Column - Patient Info & Video */}
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
              <div className="mt-4 pt-4 border-t space-y-2">
                <button
                  onClick={() => setShowHistoryModal(true)}
                  className="w-full text-sm px-3 py-2 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                >
                  📋 Ver Historia Clínica
                </button>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">🎥 Videoconsulta</h2>
              {consultation.jitsi_room_url ? (
                <div className="space-y-4">
                  <div>
                    <div className="text-sm font-medium text-gray-900">Sala Jitsi</div>
                    <div className="text-sm text-gray-600 font-mono">
                      {consultation.jitsi_room_name}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">Enlace</div>
                    <div className="text-xs text-blue-600 break-all">
                      {consultation.jitsi_room_url}
                    </div>
                  </div>
                  <button
                    onClick={handleStartVideo}
                    className={`w-full px-4 py-3 rounded-md transition-colors font-medium ${
                      videoStarted 
                        ? 'bg-gray-600 text-white hover:bg-gray-700' 
                        : 'bg-green-600 text-white hover:bg-green-700'
                    }`}
                  >
                    {videoStarted ? '🎥 Video en Progreso' : '🎥 Iniciar Videoconsulta'}
                  </button>
                  {videoStarted && (
                    <p className="text-xs text-gray-500 text-center">
                      La videoconsulta se abrió en una nueva pestaña
                    </p>
                  )}
                </div>
              ) : (
                <div className="text-center py-4">
                  <div className="text-gray-500">No hay sala de video configurada</div>
                </div>
              )}
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
                  <div className="text-sm font-medium text-gray-900">Estado</div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(consultation.status)}`}>
                    {getStatusText(consultation.status)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Notes & History */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">📝 Notas de Consulta</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Motivo Principal
                  </label>
                  <textarea
                    className="w-full border rounded-md px-3 py-2 text-sm"
                    rows={2}
                    value={consultationNotes.chief_complaint}
                    onChange={(e) => setConsultationNotes(prev => ({ ...prev, chief_complaint: e.target.value }))}
                    placeholder="Motivo de la consulta actual..."
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Antecedentes
                  </label>
                  <textarea
                    className="w-full border rounded-md px-3 py-2 text-sm"
                    rows={3}
                    value={consultationNotes.background}
                    onChange={(e) => setConsultationNotes(prev => ({ ...prev, background: e.target.value }))}
                    placeholder="Antecedentes relevantes..."
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Evaluación
                  </label>
                  <textarea
                    className="w-full border rounded-md px-3 py-2 text-sm"
                    rows={3}
                    value={consultationNotes.assessment}
                    onChange={(e) => setConsultationNotes(prev => ({ ...prev, assessment: e.target.value }))}
                    placeholder="Evaluación del paciente..."
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Plan
                  </label>
                  <textarea
                    className="w-full border rounded-md px-3 py-2 text-sm"
                    rows={2}
                    value={consultationNotes.plan}
                    onChange={(e) => setConsultationNotes(prev => ({ ...prev, plan: e.target.value }))}
                    placeholder="Plan de tratamiento..."
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Alergias
                    </label>
                    <textarea
                      className="w-full border rounded-md px-3 py-2 text-sm"
                      rows={2}
                      value={consultationNotes.allergies}
                      onChange={(e) => setConsultationNotes(prev => ({ ...prev, allergies: e.target.value }))}
                      placeholder="Alergias conocidas..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Medicamentos
                    </label>
                    <textarea
                      className="w-full border rounded-md px-3 py-2 text-sm"
                      rows={2}
                      value={consultationNotes.medications}
                      onChange={(e) => setConsultationNotes(prev => ({ ...prev, medications: e.target.value }))}
                      placeholder="Medicamentos actuales..."
                    />
                  </div>
                </div>
                
                <div className="flex justify-end">
                  <button
                    onClick={handleSaveNotes}
                    disabled={savingNotes}
                    className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    {savingNotes ? 'Guardando...' : '💾 Guardar Notas'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* History Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  📋 Historia Clínica - {consultation.patient?.full_name}
                </h3>
                <button
                  onClick={() => setShowHistoryModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {patientHistory.length > 0 ? (
                <div className="space-y-4">
                  {patientHistory.map((record) => (
                    <div key={record.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-900">
                          Nota #{record.id}
                        </span>
                        <span className="text-xs text-gray-500">
                          {formatDateTime(record.created_at)}
                        </span>
                      </div>
                      <div className="space-y-2 text-sm">
                        {record.chief_complaint && (
                          <div>
                            <span className="font-medium">Motivo:</span> {record.chief_complaint}
                          </div>
                        )}
                        {record.background && (
                          <div>
                            <span className="font-medium">Antecedentes:</span> {record.background}
                          </div>
                        )}
                        {record.assessment && (
                          <div>
                            <span className="font-medium">Evaluación:</span> {record.assessment}
                          </div>
                        )}
                        {record.plan && (
                          <div>
                            <span className="font-medium">Plan:</span> {record.plan}
                          </div>
                        )}
                        {record.allergies && (
                          <div>
                            <span className="font-medium">Alergias:</span> {record.allergies}
                          </div>
                        )}
                        {record.medications && (
                          <div>
                            <span className="font-medium">Medicamentos:</span> {record.medications}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-4xl mb-2">📋</div>
                  <div className="text-sm text-gray-600">No hay registros previos</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

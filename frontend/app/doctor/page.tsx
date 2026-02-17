'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

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

type Patient = {
  id: number
  full_name?: string | null
  email: string
  phone?: string | null
  created_at: string
  records_count: number
  latest_record_date?: string | null
}

type ClinicalTemplate = {
  id: number
  name: string
  description?: string | null
  chief_complaint?: string | null
  background?: string | null
  assessment?: string | null
  plan?: string | null
  allergies?: string | null
  medications?: string | null
  created_at: string
}

type Payment = {
  id: number
  consultation_id: number
  amount: number
  currency: string
  status: string
  stripe_payment_intent_id?: string | null
  stripe_session_id?: string | null
  stripe_customer_id?: string | null
  refund_amount?: number | null
  stripe_refund_id?: string | null
  created_at: string
  updated_at: string
  completed_at?: string | null
  consultation?: {
    id: number
    patient?: {
      id: number
      full_name?: string | null
      email: string
    }
  }
}

function formatDateTime(iso: string) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString()
}

function formatTime(iso: string) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
}

function formatDate(iso: string) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('es-ES')
}

function getStatusColor(status: string) {
  switch (status) {
    case 'scheduled': return 'bg-blue-100 text-blue-800'
    case 'confirmed': return 'bg-green-100 text-green-800'
    case 'in_progress': return 'bg-yellow-100 text-yellow-800'
    case 'completed': return 'bg-gray-100 text-gray-800'
    case 'cancelled': return 'bg-red-100 text-red-800'
    default: return 'bg-gray-100 text-gray-800'
  }
}

function getPaymentStatusColor(status: string) {
  switch (status) {
    case 'pending': return 'bg-yellow-100 text-yellow-800'
    case 'paid': return 'bg-green-100 text-green-800'
    case 'failed': return 'bg-red-100 text-red-800'
    default: return 'bg-gray-100 text-gray-800'
  }
}

export default function DoctorDashboardPage() {
  const router = useRouter()

  const apiBase = useMemo(() => {
    return process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000/api/v1'
  }, [])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [todayConsultations, setTodayConsultations] = useState<Consultation[]>([])
  const [recentPatients, setRecentPatients] = useState<Patient[]>([])
  const [templates, setTemplates] = useState<ClinicalTemplate[]>([])
  const [recentPayments, setRecentPayments] = useState<Payment[]>([])
  const [stats, setStats] = useState({
    totalPatients: 0,
    totalConsultations: 0,
    totalRevenue: 0,
    pendingPayments: 0
  })

  const loadData = async () => {
    setError(null)
    setLoading(true)

    const token = localStorage.getItem('doctor_token')
    if (!token) {
      router.push('/')
      return
    }

    try {
      // Load today's consultations
      const today = new Date().toISOString().split('T')[0]
      const consultationsRes = await fetch(`${apiBase}/doctor/consultations`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (consultationsRes.status === 401) {
        localStorage.removeItem('doctor_token')
        router.push('/')
        return
      }

      let consultationsData: Consultation[] = []
      if (consultationsRes.ok) {
        consultationsData = (await consultationsRes.json()) as Consultation[]
        const todayConsults = consultationsData.filter(c => 
          c.scheduled_at.startsWith(today)
        ).sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())
        setTodayConsultations(todayConsults)
      }

      // Load recent patients
      const patientsRes = await fetch(`${apiBase}/doctor/patients`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      let patientsData: Patient[] = []
      if (patientsRes.ok) {
        patientsData = (await patientsRes.json()) as Patient[]
        const recent = patientsData
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, 5)
        setRecentPatients(recent)
      }

      // Load templates
      const templatesRes = await fetch(`${apiBase}/templates`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (templatesRes.ok) {
        const templatesData = (await templatesRes.json()) as ClinicalTemplate[]
        setTemplates(templatesData)
      }

      // Load recent payments
      const paymentsRes = await fetch(`${apiBase}/payments/doctor/payments`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (paymentsRes.ok) {
        const payments = (await paymentsRes.json()) as Payment[]
        const recent = payments
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, 5)
        setRecentPayments(recent)
        
        // Calculate stats
        const totalRevenue = payments
          .filter(p => p.status === 'completed')
          .reduce((sum, p) => sum + p.amount, 0)
        
        const pendingPayments = payments.filter(p => p.status === 'pending').length

        setStats({
          totalPatients: patientsData.length,
          totalConsultations: consultationsData.length,
          totalRevenue,
          pendingPayments
        })
      }

    } catch (e: any) {
      setError(e?.message || 'Error cargando datos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const logout = () => {
    localStorage.removeItem('doctor_token')
    router.push('/')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">🩺 Dashboard Médico</h1>
            <p className="text-sm text-gray-600">
              {new Date().toLocaleDateString('es-ES', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/doctor/patients" className="text-sm text-blue-600 hover:text-blue-800 font-medium">
              👥 Pacientes
            </Link>
            <Link href="/doctor/templates" className="text-sm text-blue-600 hover:text-blue-800 font-medium">
              📋 Plantillas
            </Link>
            <Link href="/doctor/payments" className="text-sm text-blue-600 hover:text-blue-800 font-medium">
              💰 Pagos
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

        {loading ? (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <div className="inline-flex items-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">Cargando dashboard...</span>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Pacientes</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.totalPatients}</p>
                  </div>
                  <div className="text-3xl">👥</div>
                </div>
              </div>
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Consultas</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.totalConsultations}</p>
                  </div>
                  <div className="text-3xl">📅</div>
                </div>
              </div>
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Ingresos Totales</p>
                    <p className="text-2xl font-bold text-gray-900">${stats.totalRevenue.toFixed(2)}</p>
                  </div>
                  <div className="text-3xl">💰</div>
                </div>
              </div>
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Pagos Pendientes</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.pendingPayments}</p>
                  </div>
                  <div className="text-3xl">⏳</div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Today's Agenda */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">📅 Agenda del Día</h2>
                  <span className="text-sm text-gray-500">{todayConsultations.length} consultas</span>
                </div>
                <div className="space-y-3">
                  {todayConsultations.length > 0 ? (
                    todayConsultations.map((consultation) => (
                      <div key={consultation.id} className="border-l-4 border-blue-500 pl-4 py-2">
                        <div className="flex items-center justify-between mb-1">
                          <div>
                            <span className="text-sm font-medium text-gray-900">
                              {consultation.patient?.full_name || 'Paciente'}
                            </span>
                            <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(consultation.status)}`}>
                              {consultation.status}
                            </span>
                          </div>
                          <span className="text-xs text-gray-500">
                            {formatTime(consultation.scheduled_at)}
                          </span>
                        </div>
                        <div className="text-sm text-gray-600">
                          {consultation.consultation_type || 'Consulta médica'}
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <Link
                            href={`/doctor/consultations/${consultation.id}`}
                            className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                          >
                            Ver
                          </Link>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <div className="text-4xl mb-2">📅</div>
                      <div className="text-sm">No hay consultas programadas para hoy</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Recent Patients */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">👥 Pacientes Recientes</h2>
                  <Link href="/doctor/patients" className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                    Ver todos →
                  </Link>
                </div>
                <div className="space-y-3">
                  {recentPatients.map((patient) => (
                    <div key={patient.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {patient.full_name || 'Sin nombre'}
                        </div>
                        <div className="text-xs text-gray-500">{patient.email}</div>
                        <div className="text-xs text-gray-400">
                          {patient.records_count} notas
                        </div>
                      </div>
                      <Link
                        href={`/doctor/patients/${patient.id}`}
                        className="text-xs px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                      >
                        Ver
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Templates */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">📋 Plantillas Clínicas</h2>
                  <Link href="/doctor/templates" className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                    Gestionar →
                  </Link>
                </div>
                <div className="space-y-3">
                  {templates.slice(0, 3).map((template) => (
                    <div key={template.id} className="border-l-4 border-purple-500 pl-4 py-2">
                      <div className="text-sm font-medium text-gray-900">{template.name}</div>
                      <div className="text-xs text-gray-600">{template.description || 'Sin descripción'}</div>
                    </div>
                  ))}
                  {templates.length > 3 && (
                    <div className="text-center pt-2">
                      <Link href="/doctor/templates" className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                        Ver {templates.length - 3} más plantillas →
                      </Link>
                    </div>
                  )}
                </div>
              </div>

              {/* Recent Payments */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">💰 Pagos Recientes</h2>
                  <Link href="/doctor/payments" className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                    Ver todos →
                  </Link>
                </div>
                <div className="space-y-3">
                  {recentPayments.map((payment) => (
                    <div key={payment.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          ${payment.amount.toFixed(2)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {payment.consultation?.patient?.full_name || 'Paciente'}
                        </div>
                        <div className="text-xs text-gray-400">
                          {formatDate(payment.created_at)}
                        </div>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPaymentStatusColor(payment.status)}`}>
                        {payment.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">⚡ Acciones Rápidas</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Link
                  href="/doctor/patients"
                  className="flex items-center justify-center px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  👥 Buscar Pacientes
                </Link>
                <Link
                  href="/doctor/templates"
                  className="flex items-center justify-center px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  📋 Gestionar Plantillas
                </Link>
                <Link
                  href="/doctor/payments"
                  className="flex items-center justify-center px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  💰 Ver Pagos
                </Link>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

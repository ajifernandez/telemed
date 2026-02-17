'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

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

function formatDate(iso: string) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('es-ES')
}

function getPaymentStatusColor(status: string) {
  switch (status) {
    case 'pending': return 'bg-yellow-100 text-yellow-800'
    case 'processing': return 'bg-blue-100 text-blue-800'
    case 'completed': return 'bg-green-100 text-green-800'
    case 'failed': return 'bg-red-100 text-red-800'
    case 'refunded': return 'bg-gray-100 text-gray-800'
    default: return 'bg-gray-100 text-gray-800'
  }
}

function getPaymentStatusText(status: string) {
  switch (status) {
    case 'pending': return 'Pendiente'
    case 'processing': return 'Procesando'
    case 'completed': return 'Completado'
    case 'failed': return 'Fallido'
    case 'refunded': return 'Reembolsado'
    default: return status
  }
}

export default function DoctorPaymentsPage() {
  const router = useRouter()

  const apiBase = useMemo(() => {
    return process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000/api/v1'
  }, [])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [payments, setPayments] = useState<Payment[]>([])
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')

  const loadPayments = async () => {
    setError(null)
    setLoading(true)

    const token = localStorage.getItem('doctor_token')
    if (!token) {
      router.push('/')
      return
    }

    try {
      const res = await fetch(`${apiBase}/payments/doctor/payments`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (res.status === 401) {
        localStorage.removeItem('doctor_token')
        router.push('/')
        return
      }

      if (!res.ok) {
        const detail = await res.text()
        throw new Error(detail || 'Error cargando pagos')
      }

      const data = (await res.json()) as Payment[]
      setPayments(data)
    } catch (e: any) {
      setError(e?.message || 'Error cargando pagos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPayments()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const filteredPayments = useMemo(() => {
    let filtered = payments

    // Filter by status
    if (filter !== 'all') {
      filtered = filtered.filter(p => p.status === filter)
    }

    // Filter by search
    if (search.trim()) {
      const s = search.trim().toLowerCase()
      filtered = filtered.filter(p => 
        p.consultation?.patient?.full_name?.toLowerCase().includes(s) ||
        p.consultation?.patient?.email.toLowerCase().includes(s) ||
        p.amount.toString().includes(s)
      )
    }

    return filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  }, [payments, filter, search])

  const stats = useMemo(() => {
    const total = payments.reduce((sum, p) => sum + p.amount, 0)
    const completed = payments.filter(p => p.status === 'completed')
    const completedTotal = completed.reduce((sum, p) => sum + p.amount, 0)
    const pending = payments.filter(p => p.status === 'pending').length
    const failed = payments.filter(p => p.status === 'failed').length

    return {
      total,
      completedTotal,
      pending,
      failed,
      completedCount: completed.length,
      totalCount: payments.length
    }
  }, [payments])

  const logout = () => {
    localStorage.removeItem('doctor_token')
    router.push('/')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">💰 Pagos</h1>
            <p className="text-sm text-gray-600">Gestión de pagos médicos</p>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/doctor" className="text-sm text-blue-600 hover:text-blue-800 font-medium">
              🏠 Dashboard
            </Link>
            <Link href="/doctor/patients" className="text-sm text-blue-600 hover:text-blue-800 font-medium">
              👥 Pacientes
            </Link>
            <Link href="/doctor/templates" className="text-sm text-blue-600 hover:text-blue-800 font-medium">
              📋 Plantillas
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
              <span className="ml-3 text-gray-600">Cargando pagos...</span>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Transacciones</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.totalCount}</p>
                    <p className="text-xs text-gray-500">${stats.total.toFixed(2)}</p>
                  </div>
                  <div className="text-3xl">💳</div>
                </div>
              </div>
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Ingresos Completados</p>
                    <p className="text-2xl font-bold text-green-600">${stats.completedTotal.toFixed(2)}</p>
                    <p className="text-xs text-gray-500">{stats.completedCount} pagos</p>
                  </div>
                  <div className="text-3xl">✅</div>
                </div>
              </div>
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Pagos Pendientes</p>
                    <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
                    <p className="text-xs text-gray-500">En espera</p>
                  </div>
                  <div className="text-3xl">⏳</div>
                </div>
              </div>
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Pagos Fallidos</p>
                    <p className="text-2xl font-bold text-red-600">{stats.failed}</p>
                    <p className="text-xs text-gray-500">Reintentar</p>
                  </div>
                  <div className="text-3xl">❌</div>
                </div>
              </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex flex-col md:flex-row gap-4 md:items-center md:justify-between">
                <div className="flex-1">
                  <label className="block text-sm font-medium mb-1">Buscar por paciente o monto</label>
                  <input
                    className="w-full border rounded-md px-3 py-2 text-sm"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Nombre, email o monto..."
                  />
                </div>
                <div className="flex items-center gap-3">
                  <label className="block text-sm font-medium">Estado:</label>
                  <select
                    className="border rounded-md px-3 py-2 text-sm"
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                  >
                    <option value="all">Todos</option>
                    <option value="pending">Pendientes</option>
                    <option value="processing">Procesando</option>
                    <option value="completed">Completados</option>
                    <option value="failed">Fallidos</option>
                    <option value="refunded">Reembolsados</option>
                  </select>
                  <button
                    onClick={loadPayments}
                    className="text-sm px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    🔄 Recargar
                  </button>
                </div>
              </div>
            </div>

            {/* Payments List */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">
                  Historial de Pagos ({filteredPayments.length})
                </h2>
              </div>

              {filteredPayments.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-500 border-b">
                        <th className="pb-3">Fecha</th>
                        <th className="pb-3">Paciente</th>
                        <th className="pb-3">Monto</th>
                        <th className="pb-3">Estado</th>
                        <th className="pb-3">ID Transacción</th>
                        <th className="pb-3">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPayments.map((payment) => (
                        <tr key={payment.id} className="border-b hover:bg-gray-50">
                          <td className="py-3">
                            <div className="text-sm text-gray-900">{formatDate(payment.created_at)}</div>
                            <div className="text-xs text-gray-500">{formatDateTime(payment.created_at)}</div>
                          </td>
                          <td className="py-3">
                            <div className="text-sm font-medium text-gray-900">
                              {payment.consultation?.patient?.full_name || 'Paciente'}
                            </div>
                            <div className="text-xs text-gray-500">
                              {payment.consultation?.patient?.email}
                            </div>
                          </td>
                          <td className="py-3">
                            <div className="text-sm font-medium text-gray-900">
                              ${payment.amount.toFixed(2)}
                            </div>
                            <div className="text-xs text-gray-500">{payment.currency}</div>
                          </td>
                          <td className="py-3">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPaymentStatusColor(payment.status)}`}>
                              {getPaymentStatusText(payment.status)}
                            </span>
                          </td>
                          <td className="py-3">
                            <div className="text-xs text-gray-500 font-mono">
                              {payment.stripe_payment_intent_id?.slice(0, 8) || '—'}
                            </div>
                          </td>
                          <td className="py-3">
                            <div className="flex items-center gap-2">
                              <Link
                                href={`/doctor/consultations/${payment.consultation_id}`}
                                className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                              >
                                Ver Consulta
                              </Link>
                              {payment.consultation?.patient && (
                                <Link
                                  href={`/doctor/patients/${payment.consultation.patient.id}`}
                                  className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                                >
                                  Ver Paciente
                                </Link>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">💰</div>
                  <div className="text-lg font-medium text-gray-900 mb-2">
                    {search || filter !== 'all' ? 'No se encontraron pagos' : 'No hay pagos registrados'}
                  </div>
                  <p className="text-sm text-gray-600">
                    {search || filter !== 'all' 
                      ? 'Intenta con otros filtros de búsqueda' 
                      : 'Los pagos aparecerán aquí cuando los pacientes realicen consultas'
                    }
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

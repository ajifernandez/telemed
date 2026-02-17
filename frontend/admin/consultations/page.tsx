'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

type Patient = {
  id: number
  full_name?: string | null
  email: string
  phone?: string | null
}

type Doctor = {
  id: number
  email: string
  full_name?: string | null
  specialty?: string | null
}

type Consultation = {
  id: number
  scheduled_at: string
  duration_minutes: number
  status: string
  consultation_type: string
  specialty: string
  reason_for_visit?: string | null
  patient: Patient
  doctor: Doctor
}

export default function AdminConsultationsPage() {
  const router = useRouter()

  const apiBase = useMemo(() => {
    return process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000/api/v1'
  }, [])

  const [day, setDay] = useState<string>(() => {
    const d = new Date()
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    return `${yyyy}-${mm}-${dd}`
  })

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [items, setItems] = useState<Consultation[]>([])

  const load = async () => {
    const token = localStorage.getItem('admin_token')
    if (!token) {
      router.push('/')
      return
    }

    setLoading(true)
    setError(null)
    try {
      const url = new URL(`${apiBase}/admin/consultations`)
      if (day) url.searchParams.set('day', day)
      const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.status === 401) {
        localStorage.removeItem('admin_token')
        router.push('/')
        return
      }
      if (!res.ok) {
        const detail = await res.text()
        throw new Error(detail || 'Error cargando consultas')
      }
      setItems((await res.json()) as Consultation[])
    } catch (e: any) {
      setError(e?.message || 'Error cargando consultas')
    } finally {
      setLoading(false)
    }
  }

  const setStatus = async (id: number, status: string) => {
    const token = localStorage.getItem('admin_token')
    if (!token) {
      router.push('/')
      return
    }

    setError(null)
    try {
      const res = await fetch(`${apiBase}/admin/consultations/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      })

      if (res.status === 401) {
        localStorage.removeItem('admin_token')
        router.push('/')
        return
      }

      if (!res.ok) {
        const detail = await res.text()
        throw new Error(detail || 'Error actualizando')
      }

      await load()
    } catch (e: any) {
      setError(e?.message || 'Error actualizando')
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Citas / Consultas</h1>
            <p className="text-sm text-gray-500">Administración clínica</p>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/admin" className="text-sm text-primary hover:underline">
              Volver
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex flex-col md:flex-row gap-3 md:items-end md:justify-between">
            <div>
              <label className="block text-sm font-medium mb-1">Día</label>
              <input
                type="date"
                className="border rounded-md px-3 py-2"
                value={day}
                onChange={(e) => setDay(e.target.value)}
              />
            </div>
            <div>
              <button
                type="button"
                onClick={load}
                className="px-4 py-2 rounded-md bg-primary text-white hover:bg-opacity-90"
              >
                Cargar
              </button>
            </div>
          </div>

          {error && (
            <div className="mt-4 rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="mt-6">
            {loading ? (
              <div className="text-sm text-gray-600">Cargando…</div>
            ) : items.length ? (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500">
                      <th className="py-2">Hora</th>
                      <th className="py-2">Paciente</th>
                      <th className="py-2">Médico</th>
                      <th className="py-2">Tipo</th>
                      <th className="py-2">Estado</th>
                      <th className="py-2">Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((c) => {
                      const time = new Date(c.scheduled_at).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                      return (
                        <tr key={c.id} className="border-t">
                          <td className="py-2 pr-4 font-medium text-gray-900">{time}</td>
                          <td className="py-2 pr-4">
                            <div className="font-medium text-gray-900">{c.patient.full_name || c.patient.email}</div>
                            <div className="text-xs text-gray-500">{c.patient.phone || '—'}</div>
                          </td>
                          <td className="py-2 pr-4">
                            <div className="font-medium text-gray-900">{c.doctor.full_name || c.doctor.email}</div>
                            <div className="text-xs text-gray-500">{c.doctor.specialty || '—'}</div>
                          </td>
                          <td className="py-2 pr-4">{c.consultation_type}</td>
                          <td className="py-2 pr-4">{c.status}</td>
                          <td className="py-2 pr-4">
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setStatus(c.id, 'confirmed')}
                                className="px-3 py-1 rounded-md border hover:bg-gray-50"
                              >
                                Confirmar
                              </button>
                              <button
                                type="button"
                                onClick={() => setStatus(c.id, 'cancelled')}
                                className="px-3 py-1 rounded-md border hover:bg-gray-50"
                              >
                                Cancelar
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-sm text-gray-600">No hay citas para este día.</div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

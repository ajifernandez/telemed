'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

type Patient = {
  id: number
  full_name: string
  email: string
  phone?: string | null
}

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
  jitsi_room_url?: string | null
  patient: Patient
}

function formatDateTime(iso: string) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString()
}

export default function DoctorAgendaPage() {
  const router = useRouter()

  const apiBase = useMemo(() => {
    return (
      process.env.NEXT_PUBLIC_API_BASE ||
      'http://localhost:8000/api/v1'
    )
  }, [])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [items, setItems] = useState<Consultation[]>([])

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setError(null)
      setLoading(true)

      const token = localStorage.getItem('doctor_token')
      if (!token) {
        router.push('/doctor/login')
        return
      }

      try {
        const res = await fetch(`${apiBase}/consultations/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (res.status === 401) {
          localStorage.removeItem('doctor_token')
          router.push('/doctor/login')
          return
        }

        if (!res.ok) {
          const detail = await res.text()
          throw new Error(detail || 'Error cargando agenda')
        }

        const data = (await res.json()) as Consultation[]
        if (cancelled) return
        setItems(data)
      } catch (e: any) {
        if (cancelled) return
        setError(e?.message || 'Error cargando agenda')
      } finally {
        if (cancelled) return
        setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [apiBase, router])

  const logout = () => {
    localStorage.removeItem('doctor_token')
    router.push('/doctor/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Agenda médico</h1>
            <p className="text-sm text-gray-500">Videoconsultas (modo mock)</p>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/doctor/new-consultation" className="text-sm text-primary hover:underline">
              Nueva cita
            </Link>
            <Link href="/booking" className="text-sm text-primary hover:underline">
              Reserva
            </Link>
            <button onClick={logout} className="text-sm text-gray-600 hover:text-gray-900">
              Cerrar sesión
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {loading && (
          <div className="bg-white rounded-lg shadow-md p-6">Cargando…</div>
        )}

        {error && (
          <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700 mb-4">
            {error}
          </div>
        )}

        {!loading && !items.length && !error && (
          <div className="bg-white rounded-lg shadow-md p-6">
            No hay citas.
          </div>
        )}

        {!!items.length && (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="px-6 py-4 border-b">
              <h2 className="font-semibold">Próximas citas</h2>
            </div>
            <div className="divide-y">
              {items.map((c) => (
                <div key={c.id} className="px-6 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div>
                    <div className="font-medium text-gray-900">
                      {c.patient?.full_name || 'Paciente'}
                    </div>
                    <div className="text-sm text-gray-600">
                      {formatDateTime(c.scheduled_at)} — {c.specialty}
                    </div>
                    <div className="text-xs text-gray-500">
                      Estado: {c.status} · Tipo: {c.consultation_type}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {c.consultation_type === 'video' && c.jitsi_room_url ? (
                      <a
                        href={c.jitsi_room_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-block bg-primary text-white px-4 py-2 rounded-md hover:bg-opacity-90 transition"
                      >
                        Entrar a sala
                      </a>
                    ) : (
                      <span className="text-sm text-gray-500">
                        {c.consultation_type === 'video' ? 'Sin sala asignada' : 'No aplica'}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

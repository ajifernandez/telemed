'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'

type PublicDoctor = {
  id: number
  full_name: string
  specialty?: string | null
}

export default function BookingPage() {
  const apiBase = useMemo(() => {
    return (
      process.env.NEXT_PUBLIC_API_BASE ||
      'http://localhost:8000/api/v1'
    )
  }, [])

  const [doctors, setDoctors] = useState<PublicDoctor[]>([])
  const [loadingDoctors, setLoadingDoctors] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [doctorId, setDoctorId] = useState<number | ''>('')
  const [specialty, setSpecialty] = useState('')
  const [reasonForVisit, setReasonForVisit] = useState('')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [scheduledAtLocal, setScheduledAtLocal] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [successUrl, setSuccessUrl] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        setLoadingDoctors(true)
        const res = await fetch(`${apiBase}/consultations/public/doctors`)
        if (!res.ok) throw new Error('No se pudo cargar la lista de médicos')
        const data = (await res.json()) as PublicDoctor[]
        if (cancelled) return
        setDoctors(data)
      } catch (e: any) {
        if (cancelled) return
        setError(e?.message || 'Error cargando médicos')
      } finally {
        if (cancelled) return
        setLoadingDoctors(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [apiBase])

  useEffect(() => {
    const selected = doctors.find((d) => d.id === doctorId)
    if (selected?.specialty && !specialty) {
      setSpecialty(selected.specialty)
    }
  }, [doctorId, doctors, specialty])

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccessUrl(null)

    if (!doctorId) {
      setError('Selecciona un médico')
      return
    }
    if (!fullName || !email || !scheduledAtLocal || !specialty) {
      setError('Rellena nombre, email, especialidad y fecha/hora')
      return
    }

    setSubmitting(true)
    try {
      const scheduledAtIso = new Date(scheduledAtLocal).toISOString()

      const res = await fetch(`${apiBase}/consultations/public/book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          doctor_id: doctorId,
          patient: { full_name: fullName, email, phone: phone || null },
          specialty,
          reason_for_visit: reasonForVisit || null,
          scheduled_at: scheduledAtIso,
          duration_minutes: 30,
        }),
      })

      if (!res.ok) {
        const detail = await res.text()
        throw new Error(detail || 'Error reservando la videoconsulta')
      }

      const data = await res.json()
      setSuccessUrl(data?.jitsi_room_url || null)
    } catch (e: any) {
      setError(e?.message || 'Error reservando')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">Reserva online</h1>
          <Link href="/doctor/login" className="text-sm text-primary hover:underline">
            Soy médico
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Médico</label>
              <select
                className="w-full border rounded-md px-3 py-2"
                value={doctorId}
                onChange={(e) => setDoctorId(e.target.value ? Number(e.target.value) : '')}
                disabled={loadingDoctors}
              >
                <option value="">{loadingDoctors ? 'Cargando…' : 'Selecciona un médico'}</option>
                {doctors.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.full_name}{d.specialty ? ` — ${d.specialty}` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Nombre y apellidos</label>
                <input
                  className="w-full border rounded-md px-3 py-2"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input
                  className="w-full border rounded-md px-3 py-2"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Teléfono (opcional)</label>
                <input
                  className="w-full border rounded-md px-3 py-2"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Fecha y hora</label>
                <input
                  className="w-full border rounded-md px-3 py-2"
                  type="datetime-local"
                  value={scheduledAtLocal}
                  onChange={(e) => setScheduledAtLocal(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Especialidad</label>
              <input
                className="w-full border rounded-md px-3 py-2"
                value={specialty}
                onChange={(e) => setSpecialty(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Motivo (opcional)</label>
              <textarea
                className="w-full border rounded-md px-3 py-2"
                value={reasonForVisit}
                onChange={(e) => setReasonForVisit(e.target.value)}
                rows={3}
              />
            </div>

            {error && (
              <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}

            {successUrl && (
              <div className="rounded-md bg-green-50 border border-green-200 px-3 py-2 text-sm text-green-800">
                Reserva creada. Se ha enviado un correo con el enlace.
                <div className="mt-2">
                  <a
                    className="text-primary underline"
                    href={successUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Abrir sala (para pruebas)
                  </a>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-primary text-white py-2 rounded-md hover:bg-opacity-90 transition disabled:opacity-60"
            >
              {submitting ? 'Reservando…' : 'Confirmar reserva (mock)'}
            </button>
          </form>
        </div>
      </main>
    </div>
  )
}

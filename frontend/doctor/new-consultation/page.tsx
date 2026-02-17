'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

type ConsultationType = 'video' | 'phone' | 'in_person'

export default function NewConsultationPage() {
  const router = useRouter()

  const apiBase = useMemo(() => {
    return process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000/api/v1'
  }, [])

  const [consultationType, setConsultationType] = useState<ConsultationType>('video')
  const [specialty, setSpecialty] = useState('')
  const [reasonForVisit, setReasonForVisit] = useState('')
  const [scheduledAtLocal, setScheduledAtLocal] = useState('')

  const [patientFullName, setPatientFullName] = useState('')
  const [patientEmail, setPatientEmail] = useState('')
  const [patientPhone, setPatientPhone] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const token = localStorage.getItem('doctor_token')
    if (!token) {
      router.push('/doctor/login')
      return
    }

    if (!specialty || !scheduledAtLocal || !patientFullName || !patientEmail) {
      setError('Rellena especialidad, fecha/hora y datos mínimos del paciente')
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`${apiBase}/consultations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          consultation_type: consultationType,
          specialty,
          reason_for_visit: reasonForVisit || null,
          scheduled_at: new Date(scheduledAtLocal).toISOString(),
          duration_minutes: 30,
          patient: {
            full_name: patientFullName,
            email: patientEmail,
            phone: patientPhone || null,
          },
        }),
      })

      if (res.status === 401) {
        localStorage.removeItem('doctor_token')
        router.push('/doctor/login')
        return
      }

      if (!res.ok) {
        const detail = await res.text()
        throw new Error(detail || 'Error creando consulta')
      }

      router.push('/doctor/agenda')
    } catch (e: any) {
      setError(e?.message || 'Error creando consulta')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Nueva cita</h1>
            <p className="text-sm text-gray-500">Creación interna (médico/recepción)</p>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/doctor/agenda" className="text-sm text-primary hover:underline">
              Volver a agenda
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-1">
                <label className="block text-sm font-medium mb-1">Tipo</label>
                <select
                  className="w-full border rounded-md px-3 py-2"
                  value={consultationType}
                  onChange={(e) => setConsultationType(e.target.value as ConsultationType)}
                >
                  <option value="video">Online (video)</option>
                  <option value="in_person">Presencial</option>
                  <option value="phone">Teléfono</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">Especialidad</label>
                <input
                  className="w-full border rounded-md px-3 py-2"
                  value={specialty}
                  onChange={(e) => setSpecialty(e.target.value)}
                />
              </div>
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

            <div>
              <label className="block text-sm font-medium mb-1">Motivo (opcional)</label>
              <textarea
                className="w-full border rounded-md px-3 py-2"
                value={reasonForVisit}
                onChange={(e) => setReasonForVisit(e.target.value)}
                rows={3}
              />
            </div>

            <div className="border-t pt-4">
              <h2 className="font-semibold mb-3">Paciente</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Nombre y apellidos</label>
                  <input
                    className="w-full border rounded-md px-3 py-2"
                    value={patientFullName}
                    onChange={(e) => setPatientFullName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Email</label>
                  <input
                    className="w-full border rounded-md px-3 py-2"
                    type="email"
                    value={patientEmail}
                    onChange={(e) => setPatientEmail(e.target.value)}
                  />
                </div>
              </div>
              <div className="mt-4">
                <label className="block text-sm font-medium mb-1">Teléfono (opcional)</label>
                <input
                  className="w-full border rounded-md px-3 py-2"
                  value={patientPhone}
                  onChange={(e) => setPatientPhone(e.target.value)}
                />
              </div>
            </div>

            {error && (
              <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-white py-2 rounded-md hover:bg-opacity-90 transition disabled:opacity-60"
            >
              {loading ? 'Creando…' : 'Crear cita'}
            </button>
          </form>
        </div>
      </main>
    </div>
  )
}

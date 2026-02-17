'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'

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

export default function DoctorEditRecordPage() {
  const router = useRouter()
  const params = useParams()
  const patientId = params?.id as string
  const recordId = params?.recordId as string

  const apiBase = useMemo(() => {
    return process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000/api/v1'
  }, [])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [record, setRecord] = useState<ClinicalRecord | null>(null)
  const [form, setForm] = useState({
    chief_complaint: '',
    background: '',
    assessment: '',
    plan: '',
    allergies: '',
    medications: '',
  })
  const [saving, setSaving] = useState(false)

  const loadRecord = async () => {
    const token = localStorage.getItem('doctor_token')
    if (!token) {
      router.push('/doctor/login')
      return
    }

    try {
      const res = await fetch(`${apiBase}/doctor/patients/${patientId}/history`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.status === 401) {
        localStorage.removeItem('doctor_token')
        router.push('/doctor/login')
        return
      }
      if (!res.ok) {
        const detail = await res.text()
        throw new Error(detail || 'Error cargando notas')
      }
      const history = (await res.json()) as ClinicalRecord[]
      const found = history.find((r) => r.id === Number(recordId))
      if (!found) {
        throw new Error('Nota no encontrada')
      }
      setRecord(found)
      setForm({
        chief_complaint: found.chief_complaint || '',
        background: found.background || '',
        assessment: found.assessment || '',
        plan: found.plan || '',
        allergies: found.allergies || '',
        medications: found.medications || '',
      })
    } catch (e: any) {
      setError(e?.message || 'Error cargando nota')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!patientId || !recordId) return
    loadRecord()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId, recordId])

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    const token = localStorage.getItem('doctor_token')
    if (!token) {
      router.push('/doctor/login')
      return
    }
    try {
      const payload = Object.fromEntries(
        Object.entries(form).filter(([_, v]) => v.trim() !== '')
      )
      const res = await fetch(`${apiBase}/doctor/patients/${patientId}/history/${recordId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const detail = await res.text()
        throw new Error(detail || 'Error guardando nota')
      }
      router.push(`/doctor/patients/${patientId}`)
    } catch (e: any) {
      setError(e?.message || 'Error guardando nota')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-sm text-gray-600">Cargando…</div>
      </div>
    )
  }

  if (error || !record) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-sm text-red-600">{error || 'Nota no encontrada'}</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Editar nota clínica</h1>
            <p className="text-sm text-gray-500">Nota #{record.id}</p>
          </div>
          <div className="flex items-center gap-4">
            <Link href={`/doctor/patients/${patientId}`} className="text-sm text-primary hover:underline">
              Volver
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {error && (
          <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700 mb-4">
            {error}
          </div>
        )}

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Motivo de consulta</label>
              <input
                className="w-full border rounded-md px-3 py-2 text-sm"
                value={form.chief_complaint}
                onChange={(e) => setForm({ ...form, chief_complaint: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Antecedentes</label>
              <textarea
                className="w-full border rounded-md px-3 py-2 text-sm"
                rows={3}
                value={form.background}
                onChange={(e) => setForm({ ...form, background: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Valoración</label>
              <textarea
                className="w-full border rounded-md px-3 py-2 text-sm"
                rows={3}
                value={form.assessment}
                onChange={(e) => setForm({ ...form, assessment: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Plan</label>
              <textarea
                className="w-full border rounded-md px-3 py-2 text-sm"
                rows={3}
                value={form.plan}
                onChange={(e) => setForm({ ...form, plan: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Alergias</label>
              <input
                className="w-full border rounded-md px-3 py-2 text-sm"
                value={form.allergies}
                onChange={(e) => setForm({ ...form, allergies: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Medicación</label>
              <input
                className="w-full border rounded-md px-3 py-2 text-sm"
                value={form.medications}
                onChange={(e) => setForm({ ...form, medications: e.target.value })}
              />
            </div>

            <div className="flex items-center gap-2 pt-4">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="text-sm px-4 py-2 rounded-md bg-primary text-white hover:bg-opacity-90 disabled:opacity-60"
              >
                {saving ? 'Guardando…' : 'Guardar cambios'}
              </button>
              <Link
                href={`/doctor/patients/${patientId}`}
                className="text-sm px-4 py-2 rounded-md border hover:bg-gray-50"
              >
                Cancelar
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

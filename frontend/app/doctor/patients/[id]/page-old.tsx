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
}

type Patient = {
  id: number
  full_name?: string | null
  email: string
  phone?: string | null
  created_at: string
}

function formatDateTime(iso: string) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString()
}

export default function DoctorPatientDetailPage() {
  const router = useRouter()
  const params = useParams()
  const patientId = params?.id as string

  const apiBase = useMemo(() => {
    return process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000/api/v1'
  }, [])

  const [loadingPatient, setLoadingPatient] = useState(true)
  const [loadingHistory, setLoadingHistory] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [patient, setPatient] = useState<Patient | null>(null)
  const [history, setHistory] = useState<ClinicalRecord[]>([])
  const [q, setQ] = useState('')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [createForm, setCreateForm] = useState({
    chief_complaint: '',
    background: '',
    assessment: '',
    plan: '',
    allergies: '',
    medications: '',
  })
  const [saving, setSaving] = useState(false)
  const [templates, setTemplates] = useState<ClinicalTemplate[]>([])
  const [loadingTemplates, setLoadingTemplates] = useState(false)

  const loadPatient = async () => {
    const token = localStorage.getItem('doctor_token')
    if (!token) {
      router.push('/doctor/login')
      return
    }

    try {
      // First fetch all patients and find the one by id (demo, no dedicated endpoint)
      const res = await fetch(`${apiBase}/doctor/patients`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.status === 401) {
        localStorage.removeItem('doctor_token')
        router.push('/doctor/login')
        return
      }
      if (!res.ok) {
        const detail = await res.text()
        throw new Error(detail || 'Error cargando paciente')
      }
      const patients = (await res.json()) as Patient[]
      const found = patients.find((p) => p.id === Number(patientId))
      if (!found) {
        throw new Error('Paciente no encontrado')
      }
      setPatient(found)
    } catch (e: any) {
      setError(e?.message || 'Error cargando paciente')
    } finally {
      setLoadingPatient(false)
    }
  }

  const loadHistory = async () => {
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
        throw new Error(detail || 'Error cargando historia')
      }
      const data = (await res.json()) as ClinicalRecord[]
      setHistory(data)
    } catch (e: any) {
      setError(e?.message || 'Error cargando historia')
    } finally {
      setLoadingHistory(false)
    }
  }

  const loadTemplates = async () => {
    const token = localStorage.getItem('doctor_token')
    if (!token) {
      router.push('/doctor/login')
      return
    }
    setLoadingTemplates(true)
    try {
      const res = await fetch(`${apiBase}/templates`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.status === 401) {
        localStorage.removeItem('doctor_token')
        router.push('/doctor/login')
        return
      }
      if (!res.ok) {
        const detail = await res.text()
        throw new Error(detail || 'Error cargando plantillas')
      }
      const data = (await res.json()) as ClinicalTemplate[]
      setTemplates(data)
    } catch (e: any) {
      setError(e?.message || 'Error cargando plantillas')
    } finally {
      setLoadingTemplates(false)
    }
  }

  useEffect(() => {
    if (!patientId) return
    loadPatient()
    loadHistory()
    loadTemplates()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId])

  const filteredHistory = q.trim()
    ? history.filter((r) => {
        const s = q.trim().toLowerCase()
        return (
          (r.chief_complaint || '').toLowerCase().includes(s) ||
          (r.background || '').toLowerCase().includes(s) ||
          (r.assessment || '').toLowerCase().includes(s) ||
          (r.plan || '').toLowerCase().includes(s) ||
          (r.allergies || '').toLowerCase().includes(s) ||
          (r.medications || '').toLowerCase().includes(s)
        )
      })
    : history

  const applyTemplate = (t: ClinicalTemplate) => {
    setCreateForm({
      chief_complaint: t.chief_complaint || '',
      background: t.background || '',
      assessment: t.assessment || '',
      plan: t.plan || '',
      allergies: t.allergies || '',
      medications: t.medications || '',
    })
  }

  const handleCreate = async () => {
    setSaving(true)
    setError(null)
    const token = localStorage.getItem('doctor_token')
    if (!token) {
      router.push('/doctor/login')
      return
    }
    try {
      const payload = Object.fromEntries(
        Object.entries(createForm).filter(([_, v]) => v.trim() !== '')
      )
      const res = await fetch(`${apiBase}/doctor/patients/${patientId}/history`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const detail = await res.text()
        throw new Error(detail || 'Error creando nota')
      }
      await loadHistory()
      setShowCreateForm(false)
      setCreateForm({
        chief_complaint: '',
        background: '',
        assessment: '',
        plan: '',
        allergies: '',
        medications: '',
      })
    } catch (e: any) {
      setError(e?.message || 'Error creando nota')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (recordId: number) => {
    if (!confirm('¿Seguro que quieres eliminar esta nota?')) return
    const token = localStorage.getItem('doctor_token')
    if (!token) {
      router.push('/doctor/login')
      return
    }
    try {
      const res = await fetch(`${apiBase}/doctor/patients/${patientId}/history/${recordId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        const detail = await res.text()
        throw new Error(detail || 'Error eliminando nota')
      }
      await loadHistory()
    } catch (e: any) {
      setError(e?.message || 'Error eliminando nota')
    }
  }

  const exportHistory = async () => {
    if (!patient) return
    const token = localStorage.getItem('doctor_token')
    if (!token) {
      router.push('/doctor/login')
      return
    }

    try {
      const res = await fetch(`${apiBase}/pdf/patients/${patientId}/history/pdf`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        const detail = await res.text()
        throw new Error(detail || 'Error exportando historia')
      }
      
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `historia_${patient.full_name || patient.email}_${new Date().toISOString().split('T')[0]}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e: any) {
      setError(e?.message || 'Error exportando historia')
    }
  }

  const logout = () => {
    localStorage.removeItem('doctor_token')
    router.push('/doctor/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Historia clínica</h1>
            <p className="text-sm text-gray-500">
              {patient ? `${patient.full_name || patient.email}` : 'Paciente'}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/doctor/patients" className="text-sm text-primary hover:underline">
              Pacientes
            </Link>
            <Link href="/doctor/templates" className="text-sm text-primary hover:underline">
              Plantillas
            </Link>
            <button onClick={logout} className="text-sm text-gray-600 hover:text-gray-900">
              Cerrar sesión
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {error && (
          <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700 mb-4">
            {error}
          </div>
        )}

        {(loadingPatient || loadingHistory) && (
          <div className="bg-white rounded-lg shadow-md p-6">Cargando…</div>
        )}

        {!loadingPatient && !loadingHistory && patient && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="font-semibold text-lg mb-2">Datos del paciente</h2>
            <div className="text-sm text-gray-700 space-y-1">
              <div><strong>Nombre:</strong> {patient.full_name || '—'}</div>
              <div><strong>Email:</strong> {patient.email}</div>
              <div><strong>Teléfono:</strong> {patient.phone || '—'}</div>
              <div><strong>ID:</strong> #{patient.id}</div>
            </div>
          </div>
        )}

        {!loadingHistory && !loadingPatient && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between mb-4">
              <h2 className="font-semibold text-lg">Notas clínicas</h2>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(true)}
                  className="text-xs px-3 py-1 rounded-md bg-primary text-white hover:bg-opacity-90"
                >
                  Nueva nota
                </button>
                <button
                  type="button"
                  onClick={exportHistory}
                  className="text-xs px-3 py-1 rounded-md border hover:bg-gray-50"
                >
                  Exportar historia
                </button>
                <input
                  className="border rounded-md px-3 py-2 text-sm"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Buscar en notas"
                />
                <div className="text-sm text-gray-500">{filteredHistory.length} notas</div>
              </div>
            </div>

            {showCreateForm && (
              <div className="border rounded-lg p-4 mb-4 bg-gray-50">
                <h3 className="font-medium text-sm mb-2">Nueva nota clínica</h3>

                {templates.length > 0 && (
                  <div className="mb-4">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Usar plantilla</label>
                    <select
                      className="w-full border rounded-md px-3 py-2 text-xs"
                      value=""
                      onChange={(e) => {
                        if (e.target.value) {
                          const t = templates.find((tpl) => tpl.id === Number(e.target.value))
                          if (t) applyTemplate(t)
                        }
                      }}
                    >
                      <option value="">Seleccionar plantilla...</option>
                      {templates.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="space-y-2">
                  <input
                    className="w-full border rounded-md px-3 py-2 text-sm"
                    placeholder="Motivo de consulta"
                    value={createForm.chief_complaint}
                    onChange={(e) => setCreateForm({ ...createForm, chief_complaint: e.target.value })}
                  />
                  <textarea
                    className="w-full border rounded-md px-3 py-2 text-sm"
                    rows={2}
                    placeholder="Antecedentes"
                    value={createForm.background}
                    onChange={(e) => setCreateForm({ ...createForm, background: e.target.value })}
                  />
                  <textarea
                    className="w-full border rounded-md px-3 py-2 text-sm"
                    rows={2}
                    placeholder="Valoración"
                    value={createForm.assessment}
                    onChange={(e) => setCreateForm({ ...createForm, assessment: e.target.value })}
                  />
                  <textarea
                    className="w-full border rounded-md px-3 py-2 text-sm"
                    rows={2}
                    placeholder="Plan"
                    value={createForm.plan}
                    onChange={(e) => setCreateForm({ ...createForm, plan: e.target.value })}
                  />
                  <input
                    className="w-full border rounded-md px-3 py-2 text-sm"
                    placeholder="Alergias"
                    value={createForm.allergies}
                    onChange={(e) => setCreateForm({ ...createForm, allergies: e.target.value })}
                  />
                  <input
                    className="w-full border rounded-md px-3 py-2 text-sm"
                    placeholder="Medicación"
                    value={createForm.medications}
                    onChange={(e) => setCreateForm({ ...createForm, medications: e.target.value })}
                  />
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleCreate}
                      disabled={saving}
                      className="text-xs px-3 py-1 rounded-md bg-primary text-white hover:bg-opacity-90 disabled:opacity-60"
                    >
                      {saving ? 'Guardando…' : 'Guardar'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowCreateForm(false)}
                      className="text-xs px-3 py-1 rounded-md border hover:bg-gray-50"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              </div>
            )}

            {filteredHistory.length ? (
              <div className="space-y-6">
                {filteredHistory.map((r) => (
                  <div key={r.id} className="border rounded-lg p-4">
                    <div className="text-xs text-gray-500 mb-2">#{r.id} — {formatDateTime(r.created_at)}</div>

                    {r.chief_complaint && (
                      <div className="mb-3">
                        <div className="font-medium text-sm text-gray-900">Motivo de consulta</div>
                        <div className="text-sm text-gray-700">{r.chief_complaint}</div>
                      </div>
                    )}

                    {r.background && (
                      <div className="mb-3">
                        <div className="font-medium text-sm text-gray-900">Antecedentes</div>
                        <div className="text-sm text-gray-700">{r.background}</div>
                      </div>
                    )}

                    {r.assessment && (
                      <div className="mb-3">
                        <div className="font-medium text-sm text-gray-900">Valoración</div>
                        <div className="text-sm text-gray-700">{r.assessment}</div>
                      </div>
                    )}

                    {r.plan && (
                      <div className="mb-3">
                        <div className="font-medium text-sm text-gray-900">Plan</div>
                        <div className="text-sm text-gray-700">{r.plan}</div>
                      </div>
                    )}

                    {r.allergies && (
                      <div className="mb-3">
                        <div className="font-medium text-sm text-gray-900">Alergias</div>
                        <div className="text-sm text-gray-700">{r.allergies}</div>
                      </div>
                    )}

                    {r.medications && (
                      <div className="mb-3">
                        <div className="font-medium text-sm text-gray-900">Medicación</div>
                        <div className="text-sm text-gray-700">{r.medications}</div>
                      </div>
                    )}
                    <div className="flex items-center gap-2 mt-4">
                      <Link
                        href={`/doctor/patients/${patientId}/edit/${r.id}`}
                        className="text-xs px-3 py-1 rounded-md border hover:bg-gray-50"
                      >
                        Editar
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleDelete(r.id)}
                        className="text-xs px-3 py-1 rounded-md border border-red-300 text-red-600 hover:bg-red-50"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-gray-600">Sin notas clínicas.</div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}

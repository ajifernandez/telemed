'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

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

export default function DoctorTemplatesPage() {
  const router = useRouter()

  const apiBase = useMemo(() => {
    return process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000/api/v1'
  }, [])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [templates, setTemplates] = useState<ClinicalTemplate[]>([])
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [createForm, setCreateForm] = useState({
    name: '',
    description: '',
    chief_complaint: '',
    background: '',
    assessment: '',
    plan: '',
    allergies: '',
    medications: '',
  })
  const [saving, setSaving] = useState(false)

  const loadTemplates = async () => {
    const token = localStorage.getItem('doctor_token')
    if (!token) {
      router.push('/doctor/login')
      return
    }
    setLoading(true)
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
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTemplates()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
      const res = await fetch(`${apiBase}/templates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const detail = await res.text()
        throw new Error(detail || 'Error creando plantilla')
      }
      await loadTemplates()
      setShowCreateForm(false)
      setCreateForm({
        name: '',
        description: '',
        chief_complaint: '',
        background: '',
        assessment: '',
        plan: '',
        allergies: '',
        medications: '',
      })
    } catch (e: any) {
      setError(e?.message || 'Error creando plantilla')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (templateId: number) => {
    if (!confirm('¿Seguro que quieres eliminar esta plantilla?')) return
    const token = localStorage.getItem('doctor_token')
    if (!token) {
      router.push('/doctor/login')
      return
    }
    try {
      const res = await fetch(`${apiBase}/templates/${templateId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        const detail = await res.text()
        throw new Error(detail || 'Error eliminando plantilla')
      }
      await loadTemplates()
    } catch (e: any) {
      setError(e?.message || 'Error eliminando plantilla')
    }
  }

  const logout = () => {
    localStorage.removeItem('doctor_token')
    router.push('/')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Plantillas clínicas</h1>
            <p className="text-sm text-gray-500">Gestiona tus plantillas para notas</p>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/doctor" className="text-sm text-blue-600 hover:text-blue-800 font-medium">
              🏠 Dashboard
            </Link>
            <Link href="/doctor/patients" className="text-sm text-primary hover:underline">
              Pacientes
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

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-lg">Plantillas</h2>
            <button
              type="button"
              onClick={() => setShowCreateForm(true)}
              className="text-xs px-3 py-1 rounded-md bg-primary text-white hover:bg-opacity-90"
            >
              Nueva plantilla
            </button>
          </div>

          {showCreateForm && (
            <div className="border rounded-lg p-4 mb-4 bg-gray-50">
              <h3 className="font-medium text-sm mb-2">Nueva plantilla</h3>
              <div className="space-y-2">
                <input
                  className="w-full border rounded-md px-3 py-2 text-sm"
                  placeholder="Nombre de la plantilla"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                />
                <input
                  className="w-full border rounded-md px-3 py-2 text-sm"
                  placeholder="Descripción (opcional)"
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                />
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

          {loading ? (
            <div className="text-sm text-gray-600">Cargando…</div>
          ) : templates.length ? (
            <div className="space-y-4">
              {templates.map((t) => (
                <div key={t.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-medium text-sm text-gray-900">{t.name}</h3>
                      {t.description && <p className="text-xs text-gray-500">{t.description}</p>}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDelete(t.id)}
                      className="text-xs px-3 py-1 rounded-md border border-red-300 text-red-600 hover:bg-red-50"
                    >
                      Eliminar
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-gray-700">
                    {t.chief_complaint && (
                      <div>
                        <div className="font-medium">Motivo:</div>
                        <div>{t.chief_complaint}</div>
                      </div>
                    )}
                    {t.background && (
                      <div>
                        <div className="font-medium">Antecedentes:</div>
                        <div>{t.background}</div>
                      </div>
                    )}
                    {t.assessment && (
                      <div>
                        <div className="font-medium">Valoración:</div>
                        <div>{t.assessment}</div>
                      </div>
                    )}
                    {t.plan && (
                      <div>
                        <div className="font-medium">Plan:</div>
                        <div>{t.plan}</div>
                      </div>
                    )}
                    {t.allergies && (
                      <div>
                        <div className="font-medium">Alergias:</div>
                        <div>{t.allergies}</div>
                      </div>
                    )}
                    {t.medications && (
                      <div>
                        <div className="font-medium">Medicación:</div>
                        <div>{t.medications}</div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-gray-600">Sin plantillas.</div>
          )}
        </div>
      </main>
    </div>
  )
}

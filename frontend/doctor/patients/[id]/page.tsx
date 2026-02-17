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

function getTimeAgo(iso: string) {
  const now = new Date()
  const date = new Date(iso)
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)
  
  if (seconds < 60) return 'hace unos segundos'
  if (seconds < 3600) return `hace ${Math.floor(seconds / 60)} minutos`
  if (seconds < 86400) return `hace ${Math.floor(seconds / 3600)} horas`
  return `hace ${Math.floor(seconds / 86400)} días`
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
  const [viewMode, setViewMode] = useState<'timeline' | 'cards'>('timeline')
  const [selectedRecord, setSelectedRecord] = useState<ClinicalRecord | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [editForm, setEditForm] = useState({
    chief_complaint: '',
    background: '',
    assessment: '',
    plan: '',
    allergies: '',
    medications: '',
  })

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

  // Group records by chief complaint
  const groupedHistory = useMemo(() => {
    if (!q.trim()) {
      return history.reduce((acc, record) => {
        const complaint = record.chief_complaint || 'Sin motivo'
        if (!acc[complaint]) acc[complaint] = []
        acc[complaint].push(record)
        return acc
      }, {} as Record<string, ClinicalRecord[]>)
    }

    return history.filter((r) => {
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
  }, [history, q])

  const filteredHistory = useMemo(() => {
    if (!q.trim()) return history
    const s = q.trim().toLowerCase()
    return history.filter((r) => (
      (r.chief_complaint || '').toLowerCase().includes(s) ||
      (r.background || '').toLowerCase().includes(s) ||
      (r.assessment || '').toLowerCase().includes(s) ||
      (r.plan || '').toLowerCase().includes(s) ||
      (r.allergies || '').toLowerCase().includes(s) ||
      (r.medications || '').toLowerCase().includes(s)
    ))
  }, [history, q])

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

  const exportComplaint = async (complaint: string) => {
    if (!patient) return
    const token = localStorage.getItem('doctor_token')
    if (!token) {
      router.push('/doctor/login')
      return
    }

    try {
      // Encode complaint for URL
      const encodedComplaint = encodeURIComponent(complaint)
      const res = await fetch(`${apiBase}/pdf/patients/${patientId}/complaint/${encodedComplaint}/pdf`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        const detail = await res.text()
        throw new Error(detail || 'Error exportando motivo de consulta')
      }
      
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const safeComplaint = complaint.replace(' ', '_').replace('/', '_').slice(0, 20)
      a.download = `${safeComplaint}_${patient.full_name || patient.email}_${new Date().toISOString().split('T')[0]}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e: any) {
      setError(e?.message || 'Error exportando motivo de consulta')
    }
  }

  const logout = () => {
    localStorage.removeItem('doctor_token')
    router.push('/')
  }

  const openRecordModal = (record: ClinicalRecord) => {
    setSelectedRecord(record)
    setEditForm({
      chief_complaint: record.chief_complaint || '',
      background: record.background || '',
      assessment: record.assessment || '',
      plan: record.plan || '',
      allergies: record.allergies || '',
      medications: record.medications || '',
    })
    setShowModal(true)
  }

  const closeRecordModal = () => {
    setShowModal(false)
    setSelectedRecord(null)
    setEditForm({
      chief_complaint: '',
      background: '',
      assessment: '',
      plan: '',
      allergies: '',
      medications: '',
    })
  }

  const handleUpdateRecord = async () => {
    if (!selectedRecord) return
    setSaving(true)
    setError(null)
    const token = localStorage.getItem('doctor_token')
    if (!token) {
      router.push('/doctor/login')
      return
    }
    try {
      const payload = Object.fromEntries(
        Object.entries(editForm).filter(([_, v]) => v.trim() !== '')
      )
      const res = await fetch(`${apiBase}/doctor/patients/${patientId}/history/${selectedRecord.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const detail = await res.text()
        throw new Error(detail || 'Error actualizando nota')
      }
      await loadHistory()
      closeRecordModal()
    } catch (e: any) {
      setError(e?.message || 'Error actualizando nota')
    } finally {
      setSaving(false)
    }
  }

  // Render collapsed history list (left sidebar)
  const renderCollapsedHistory = () => (
    <div className="space-y-2">
      {Object.entries(groupedHistory).map(([complaint, records]) => (
        <div key={complaint} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div 
            className="p-3 cursor-pointer hover:bg-gray-50 transition-colors"
            onClick={() => openRecordModal(records[0])}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span className="text-sm font-medium text-gray-900">{complaint}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">{records.length} nota{records.length > 1 ? 's' : ''}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    exportComplaint(complaint)
                  }}
                  className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
                  title={`Exportar "${complaint}" a PDF`}
                >
                  📄
                </button>
              </div>
            </div>
            <div className="mt-1 text-xs text-gray-500">
              Última: {formatDateTime(records[0].created_at)}
            </div>
          </div>
        </div>
      ))}
    </div>
  )

  // Render cards view
  const renderCards = () => (
    <div className="space-y-4">
      {filteredHistory.map((record) => (
        <div key={record.id} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                  Nota #{record.id}
                </span>
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-600">
                  {formatDateTime(record.created_at)}
                </span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                {record.chief_complaint || 'Sin motivo'}
              </h3>
              <p className="text-sm text-gray-500">{getTimeAgo(record.created_at)}</p>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href={`/doctor/patients/${patientId}/edit/${record.id}`}
                className="text-xs px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
              >
                ✏️ Editar
              </Link>
              <button
                onClick={() => handleDelete(record.id)}
                className="text-xs px-3 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors"
              >
                🗑️ Eliminar
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {record.chief_complaint && (
              <div className="border-l-4 border-blue-500 pl-4">
                <div className="text-sm font-medium text-blue-800 mb-1">📋 Motivo de consulta</div>
                <div className="text-sm text-gray-700 whitespace-pre-wrap">{record.chief_complaint}</div>
              </div>
            )}
            {record.background && (
              <div className="border-l-4 border-gray-300 pl-4">
                <div className="text-sm font-medium text-gray-800 mb-1">📚 Antecedentes</div>
                <div className="text-sm text-gray-700 whitespace-pre-wrap">{record.background}</div>
              </div>
            )}
            {record.assessment && (
              <div className="border-l-4 border-green-500 pl-4">
                <div className="text-sm font-medium text-green-800 mb-1">🔍 Valoración</div>
                <div className="text-sm text-gray-700 whitespace-pre-wrap">{record.assessment}</div>
              </div>
            )}
            {record.plan && (
              <div className="border-l-4 border-purple-500 pl-4">
                <div className="text-sm font-medium text-purple-800 mb-1">📝 Plan</div>
                <div className="text-sm text-gray-700 whitespace-pre-wrap">{record.plan}</div>
              </div>
            )}
            {record.allergies && (
              <div className="border-l-4 border-red-500 pl-4">
                <div className="text-sm font-medium text-red-800 mb-1">⚠️ Alergias</div>
                <div className="text-sm text-gray-700">{record.allergies}</div>
              </div>
            )}
            {record.medications && (
              <div className="border-l-4 border-yellow-500 pl-4">
                <div className="text-sm font-medium text-yellow-800 mb-1">💊 Medicación</div>
                <div className="text-sm text-gray-700">{record.medications}</div>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Historia Clínica</h1>
            <p className="text-sm text-gray-600">
              {patient ? `${patient.full_name || patient.email}` : 'Paciente'}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/doctor" className="text-sm text-blue-600 hover:text-blue-800 font-medium">
              🏠 Dashboard
            </Link>
            <Link href="/doctor/patients" className="text-sm text-blue-600 hover:text-blue-800 font-medium">
              ← Volver a pacientes
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

        {(loadingPatient || loadingHistory) && (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <div className="inline-flex items-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">Cargando historia clínica...</span>
            </div>
          </div>
        )}

        {!loadingPatient && !loadingHistory && patient && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Sidebar - Collapsed History */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-md p-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">📋 Historial</h2>
                  <span className="text-sm text-gray-500">{history.length} notas</span>
                </div>
                
                {/* Search */}
                <div className="mb-4">
                  <input
                    className="w-full border rounded-md px-3 py-2 text-sm"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Buscar notas..."
                  />
                </div>

                {/* Collapsed History List */}
                <div className="max-h-96 overflow-y-auto">
                  {Object.keys(groupedHistory).length > 0 ? (
                    renderCollapsedHistory()
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <div className="text-4xl mb-2">📋</div>
                      <div className="text-sm">Sin notas clínicas</div>
                    </div>
                  )}
                </div>

                {/* View Toggle */}
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setViewMode(viewMode === 'timeline' ? 'cards' : 'timeline')}
                      className={`text-xs px-2 py-1 rounded-md transition-colors ${
                        viewMode === 'timeline'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 text-gray-700'
                      }`}
                    >
                      {viewMode === 'timeline' ? '📅 Timeline' : '📋 Cards'}
                    </button>
                    <button
                      onClick={exportHistory}
                      className="text-xs px-2 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                    >
                      📄 PDF
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - New Consultation Form */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">✏️ Nueva Consulta</h2>
                  <div className="flex items-center gap-2">
                    <Link href="/doctor/patients" className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                      ← Volver
                    </Link>
                    <Link href="/doctor/templates" className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                      📋 Plantillas
                    </Link>
                  </div>
                </div>

                {/* Patient Info Summary */}
                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 font-bold">{patient.full_name?.[0] || patient.email[0].toUpperCase()}</span>
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{patient.full_name || patient.email}</div>
                      <div className="text-sm text-gray-500">{patient.phone || '—'}</div>
                    </div>
                  </div>
                </div>

                {/* Template Selector */}
                {templates.length > 0 && (
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">📋 Usar plantilla</label>
                    <select
                      className="w-full border rounded-md px-3 py-2 text-sm"
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

                {/* Form Fields */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">📋 Motivo de consulta</label>
                    <textarea
                      className="w-full border rounded-md px-3 py-2 text-sm"
                      rows={3}
                      placeholder="Describe el motivo principal de la consulta..."
                      value={createForm.chief_complaint}
                      onChange={(e) => setCreateForm({ ...createForm, chief_complaint: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">📚 Antecedentes</label>
                    <textarea
                      className="w-full border rounded-md px-3 py-2 text-sm"
                      rows={4}
                      placeholder="Antecedentes relevantes del paciente..."
                      value={createForm.background}
                      onChange={(e) => setCreateForm({ ...createForm, background: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">🔍 Valoración</label>
                    <textarea
                      className="w-full border rounded-md px-3 py-2 text-sm"
                      rows={4}
                      placeholder="Tu valoración clínica del caso..."
                      value={createForm.assessment}
                      onChange={(e) => setCreateForm({ ...createForm, assessment: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">📝 Plan</label>
                    <textarea
                      className="w-full border rounded-md px-3 py-2 text-sm"
                      rows={4}
                      placeholder="Plan de tratamiento y seguimiento..."
                      value={createForm.plan}
                      onChange={(e) => setCreateForm({ ...createForm, plan: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">⚠️ Alergias</label>
                      <input
                        className="w-full border rounded-md px-3 py-2 text-sm"
                        placeholder="Alergias conocidas..."
                        value={createForm.allergies}
                        onChange={(e) => setCreateForm({ ...createForm, allergies: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">💊 Medicación</label>
                      <input
                        className="w-full border rounded-md px-3 py-2 text-sm"
                        placeholder="Medicación actual..."
                        value={createForm.medications}
                        onChange={(e) => setCreateForm({ ...createForm, medications: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleCreate}
                      disabled={saving}
                      className="text-sm px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
                    >
                      {saving ? '💾 Guardando...' : '💾 Guardar Nota'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setCreateForm({
                        chief_complaint: '',
                        background: '',
                        assessment: '',
                        plan: '',
                        allergies: '',
                        medications: '',
                      })}
                      className="text-sm px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
                    >
                      Limpiar
                    </button>
                  </div>
                </div>
              </div>

              {/* Recent Notes Preview */}
              {filteredHistory.length > 0 && (
                <div className="mt-6 bg-white rounded-lg shadow-md p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">📋 Notas Recientes</h3>
                  <div className="space-y-3">
                    {filteredHistory.slice(0, 3).map((record) => (
                      <div 
                        key={record.id} 
                        className="border-l-4 border-blue-500 pl-4 py-2 cursor-pointer hover:bg-gray-50 transition-colors rounded"
                        onClick={() => openRecordModal(record)}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-gray-900">Nota #{record.id}</span>
                          <span className="text-xs text-gray-500">{formatDateTime(record.created_at)}</span>
                        </div>
                        <div className="text-sm text-gray-700">{record.chief_complaint || 'Sin motivo'}</div>
                      </div>
                    ))}
                  </div>
                  {filteredHistory.length > 3 && (
                    <div className="text-center mt-4">
                      <button
                        onClick={() => setViewMode('cards')}
                        className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                      >
                        Ver todas las {filteredHistory.length} notas →
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Full History View (when expanded) */}
              {viewMode === 'cards' && (
                <div className="mt-6">
                  <div className="bg-white rounded-lg shadow-md p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">📋 Todas las Notas</h3>
                    {renderCards()}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Modal for viewing/editing records */}
      {showModal && selectedRecord && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  📋 Nota #{selectedRecord.id} - {formatDateTime(selectedRecord.created_at)}
                </h3>
                <button
                  onClick={closeRecordModal}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">📋 Motivo de consulta</label>
                  <textarea
                    className="w-full border rounded-md px-3 py-2 text-sm"
                    rows={3}
                    value={editForm.chief_complaint}
                    onChange={(e) => setEditForm({ ...editForm, chief_complaint: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">📚 Antecedentes</label>
                  <textarea
                    className="w-full border rounded-md px-3 py-2 text-sm"
                    rows={4}
                    value={editForm.background}
                    onChange={(e) => setEditForm({ ...editForm, background: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">🔍 Valoración</label>
                  <textarea
                    className="w-full border rounded-md px-3 py-2 text-sm"
                    rows={4}
                    value={editForm.assessment}
                    onChange={(e) => setEditForm({ ...editForm, assessment: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">📝 Plan</label>
                  <textarea
                    className="w-full border rounded-md px-3 py-2 text-sm"
                    rows={4}
                    value={editForm.plan}
                    onChange={(e) => setEditForm({ ...editForm, plan: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">⚠️ Alergias</label>
                    <input
                      className="w-full border rounded-md px-3 py-2 text-sm"
                      value={editForm.allergies}
                      onChange={(e) => setEditForm({ ...editForm, allergies: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">💊 Medicación</label>
                    <input
                      className="w-full border rounded-md px-3 py-2 text-sm"
                      value={editForm.medications}
                      onChange={(e) => setEditForm({ ...editForm, medications: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleUpdateRecord}
                    disabled={saving}
                    className="text-sm px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    {saving ? '💾 Guardando...' : '💾 Actualizar'}
                  </button>
                  <button
                    onClick={() => handleDelete(selectedRecord.id)}
                    className="text-sm px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                  >
                    🗑️ Eliminar
                  </button>
                </div>
                <button
                  onClick={closeRecordModal}
                  className="text-sm px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

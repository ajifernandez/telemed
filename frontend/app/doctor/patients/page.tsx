'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

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

type Patient = {
  id: number
  full_name?: string | null
  email: string
  phone?: string | null
  created_at: string
  latest_record?: ClinicalRecord | null
  records_count: number
  latest_record_date?: string | null
}

export default function DoctorPatientsPage() {
  const router = useRouter()

  const apiBase = useMemo(() => {
    return process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000/api/v1'
  }, [])

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [items, setItems] = useState<Patient[]>([])
  const [q, setQ] = useState('')
  const [hasSearched, setHasSearched] = useState(false)

  const load = async () => {
    setError(null)
    setLoading(true)

    const token = localStorage.getItem('doctor_token')
    if (!token) {
      router.push('/')
      return
    }

    try {
      const res = await fetch(`${apiBase}/doctor/patients`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (res.status === 401) {
        localStorage.removeItem('doctor_token')
        router.push('/')
        return
      }

      if (!res.ok) {
        const detail = await res.text()
        throw new Error(detail || 'Error cargando pacientes')
      }

      const data = (await res.json()) as Patient[]
      setItems(data)
    } catch (e: any) {
      setError(e?.message || 'Error cargando pacientes')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // No cargar pacientes automáticamente, esperar a que el médico busque
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const logout = () => {
    localStorage.removeItem('doctor_token')
    router.push('/')
  }

  const handleSearch = async (searchQuery: string) => {
    setQ(searchQuery)
    
    if (!searchQuery.trim()) {
      setItems([])
      setHasSearched(false)
      return
    }

    setError(null)
    setLoading(true)
    setHasSearched(true)

    const token = localStorage.getItem('doctor_token')
    if (!token) {
      router.push('/')
      return
    }

    try {
      const res = await fetch(`${apiBase}/doctor/patients`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (res.status === 401) {
        localStorage.removeItem('doctor_token')
        router.push('/')
        return
      }

      if (!res.ok) {
        const detail = await res.text()
        throw new Error(detail || 'Error cargando pacientes')
      }

      const data = (await res.json()) as Patient[]
      
      // Filtrar localmente por el término de búsqueda
      const filtered = data.filter((p) => {
        const s = searchQuery.trim().toLowerCase()
        return (
          (p.full_name || '').toLowerCase().includes(s) ||
          p.email.toLowerCase().includes(s)
        )
      })
      
      setItems(filtered)
    } catch (e: any) {
      setError(e?.message || 'Error cargando pacientes')
    } finally {
      setLoading(false)
    }
  }

  const filtered = items // Ya está filtrado en handleSearch

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Pacientes</h1>
            <p className="text-sm text-gray-500">Vista médico (demo)</p>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/doctor" className="text-sm text-blue-600 hover:text-blue-800 font-medium">
              🏠 Dashboard
            </Link>
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

      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">🔍 Buscar Pacientes</h2>
            <p className="text-sm text-gray-600">
              Por privacidad, los pacientes solo se mostrarán cuando realices una búsqueda.
            </p>
          </div>
          
          <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-1">Buscar por nombre o email</label>
              <input
                className="w-full border rounded-md px-3 py-2"
                value={q}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Escribe para buscar pacientes..."
              />
            </div>
            <div className="md:pt-6 flex items-center gap-3">
              {hasSearched && (
                <div className="text-sm text-gray-500">{filtered.length} pacientes</div>
              )}
            </div>
          </div>

          {error && (
            <div className="mt-4 rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="mt-6">
            {!hasSearched ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🔍</div>
                <div className="text-lg font-medium text-gray-900 mb-2">Búsqueda de Pacientes</div>
                <p className="text-sm text-gray-600 max-w-md mx-auto">
                  Escribe el nombre o email del paciente en el campo de búsqueda para ver los resultados.
                  Por seguridad, no mostramos la lista completa de pacientes.
                </p>
              </div>
            ) : loading ? (
              <div className="text-center py-8">
                <div className="inline-flex items-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  <span className="ml-3 text-sm text-gray-600">Buscando pacientes...</span>
                </div>
              </div>
            ) : filtered.length ? (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500">
                      <th className="py-2">Paciente</th>
                      <th className="py-2">Contacto</th>
                      <th className="py-2">Notas</th>
                      <th className="py-2">Última nota</th>
                      <th className="py-2">Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((p) => (
                      <tr key={p.id} className="border-t align-top">
                        <td className="py-2 pr-4">
                          <div className="font-medium text-gray-900">{p.full_name || '—'}</div>
                          <div className="text-xs text-gray-500">#{p.id}</div>
                        </td>
                        <td className="py-2 pr-4">
                          <div>{p.email}</div>
                          <div className="text-xs text-gray-500">{p.phone || '—'}</div>
                        </td>
                        <td className="py-2 pr-4">
                          <div className="text-sm text-gray-900">{p.records_count}</div>
                        </td>
                        <td className="py-2 pr-4">
                          {p.latest_record ? (
                            <div className="text-xs text-gray-700">
                              <div className="font-medium">{p.latest_record.chief_complaint || '—'}</div>
                              <div className="text-gray-500">{p.latest_record.background || ''}</div>
                              <div className="mt-1">{p.latest_record.plan || ''}</div>
                              <div className="text-xs text-gray-400 mt-1">
                                {p.latest_record_date ? new Date(p.latest_record_date).toLocaleDateString() : ''}
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-500">Sin historia</span>
                          )}
                        </td>
                        <td className="py-2 pr-4">
                          <Link
                            href={`/doctor/patients/${p.id}`}
                            className="inline-block text-xs px-3 py-1 rounded-md border hover:bg-gray-50"
                          >
                            Ver
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="text-4xl mb-2">🔍</div>
                <div className="text-sm text-gray-600">No se encontraron pacientes</div>
                <p className="text-xs text-gray-500 mt-2">
                  Intenta con otros términos de búsqueda
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

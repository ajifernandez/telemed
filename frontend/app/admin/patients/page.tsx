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

export default function AdminPatientsPage() {
  const router = useRouter()

  const apiBase = useMemo(() => {
    return process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000/api/v1'
  }, [])

  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [patients, setPatients] = useState<Patient[]>([])

  const load = async () => {
    const token = localStorage.getItem('admin_token')
    if (!token) {
      router.push('/')
      return
    }

    setLoading(true)
    setError(null)
    try {
      const url = new URL(`${apiBase}/admin/patients`)
      if (q.trim()) url.searchParams.set('q', q.trim())
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
        throw new Error(detail || 'Error cargando pacientes')
      }
      setPatients((await res.json()) as Patient[])
    } catch (e: any) {
      setError(e?.message || 'Error cargando pacientes')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Pacientes</h1>
            <p className="text-sm text-gray-500">Administración clínica</p>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/admin" className="text-sm text-primary hover:underline">
              Volver
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-1">Buscar</label>
              <input
                className="w-full border rounded-md px-3 py-2"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Nombre o email"
              />
            </div>
            <div className="md:pt-6">
              <button
                type="button"
                onClick={load}
                className="px-4 py-2 rounded-md bg-primary text-white hover:bg-opacity-90"
              >
                Buscar
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
            ) : patients.length ? (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500">
                      <th className="py-2">Nombre</th>
                      <th className="py-2">Email</th>
                      <th className="py-2">Teléfono</th>
                    </tr>
                  </thead>
                  <tbody>
                    {patients.map((p) => (
                      <tr key={p.id} className="border-t">
                        <td className="py-2 pr-4 font-medium text-gray-900">
                          {p.full_name || '—'}
                        </td>
                        <td className="py-2 pr-4">{p.email}</td>
                        <td className="py-2 pr-4">{p.phone || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-sm text-gray-600">Sin resultados.</div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

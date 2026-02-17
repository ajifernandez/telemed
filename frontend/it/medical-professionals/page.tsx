'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

type MedicalProfessional = {
  id: number
  email: string
  full_name?: string | null
  specialty?: string | null
  license_number?: string | null
  role?: string | null
  is_active: boolean
  is_medical_professional: boolean
}

export default function MedicalProfessionalsAdminPage() {
  const router = useRouter()

  const apiBase = useMemo(() => {
    return process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000/api/v1'
  }, [])

  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [licenseNumber, setLicenseNumber] = useState('')
  const [specialty, setSpecialty] = useState('')
  const [registrationToken, setRegistrationToken] = useState('mock')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [listLoading, setListLoading] = useState(true)
  const [professionals, setProfessionals] = useState<MedicalProfessional[]>([])

  const [editingId, setEditingId] = useState<number | null>(null)
  const [editFullName, setEditFullName] = useState('')
  const [editSpecialty, setEditSpecialty] = useState('')
  const [editRole, setEditRole] = useState('specialist')

  const loadProfessionals = async () => {
    const token = localStorage.getItem('it_token')
    if (!token) {
      router.push('/')
      return
    }

    setListLoading(true)
    try {
      const res = await fetch(`${apiBase}/admin/medical-professionals`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.status === 401) {
        localStorage.removeItem('it_token')
        router.push('/')
        return
      }
      if (!res.ok) {
        const detail = await res.text()
        throw new Error(detail || 'Error listando médicos')
      }
      const data = (await res.json()) as MedicalProfessional[]
      setProfessionals(data)
    } catch (e: any) {
      setError(e?.message || 'Error listando médicos')
    } finally {
      setListLoading(false)
    }
  }

  const startEdit = (mp: MedicalProfessional) => {
    setEditingId(mp.id)
    setEditFullName(mp.full_name || '')
    setEditSpecialty(mp.specialty || '')
    setEditRole(mp.role || 'specialist')
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditFullName('')
    setEditSpecialty('')
    setEditRole('specialist')
  }

  const saveEdit = async (mp: MedicalProfessional) => {
    setError(null)
    setSuccess(null)

    const token = localStorage.getItem('it_token')
    if (!token) {
      router.push('/')
      return
    }

    try {
      const payload: Record<string, any> = {}
      if ((mp.full_name || '') !== editFullName) payload.full_name = editFullName
      if ((mp.specialty || '') !== editSpecialty) payload.specialty = editSpecialty
      if ((mp.role || '') !== editRole) payload.role = editRole

      const res = await fetch(`${apiBase}/admin/medical-professionals/${mp.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })

      if (res.status === 401) {
        localStorage.removeItem('it_token')
        router.push('/')
        return
      }

      if (!res.ok) {
        const detail = await res.text()
        throw new Error(detail || 'Error actualizando médico')
      }

      setSuccess('Actualizado')
      cancelEdit()
      await loadProfessionals()
    } catch (e: any) {
      setError(e?.message || 'Error actualizando médico')
    }
  }

  useEffect(() => {
    loadProfessionals()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const logout = () => {
    localStorage.removeItem('it_token')
    router.push('/')
  }

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    const token = localStorage.getItem('it_token')
    if (!token) {
      router.push('/')
      return
    }

    if (!email || !fullName || !licenseNumber || !specialty) {
      setError('Rellena email, nombre, nº colegiado y especialidad')
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`${apiBase}/auth/register-medical-professional`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          email,
          full_name: fullName,
          license_number: licenseNumber,
          specialty,
          registration_token: registrationToken,
        }),
      })

      if (res.status === 401) {
        localStorage.removeItem('it_token')
        router.push('/')
        return
      }

      if (!res.ok) {
        const detail = await res.text()
        throw new Error(detail || 'Error creando médico')
      }

      const data = await res.json()
      setSuccess(`Médico creado. user_id=${data?.user_id}`)
      setEmail('')
      setFullName('')
      setLicenseNumber('')
      setSpecialty('')

      await loadProfessionals()
    } catch (e: any) {
      setError(e?.message || 'Error creando médico')
    } finally {
      setLoading(false)
    }
  }

  const toggleActive = async (mp: MedicalProfessional) => {
    setError(null)
    setSuccess(null)

    const token = localStorage.getItem('it_token')
    if (!token) {
      router.push('/')
      return
    }

    try {
      const res = await fetch(`${apiBase}/admin/medical-professionals/${mp.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ is_active: !mp.is_active }),
      })

      if (res.status === 401) {
        localStorage.removeItem('it_token')
        router.push('/')
        return
      }

      if (!res.ok) {
        const detail = await res.text()
        throw new Error(detail || 'Error actualizando médico')
      }

      setSuccess('Actualizado')
      await loadProfessionals()
    } catch (e: any) {
      setError(e?.message || 'Error actualizando médico')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">IT · Profesionales</h1>
            <p className="text-sm text-gray-500">Alta de médicos (mock)</p>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/booking" className="text-sm text-primary hover:underline">
              Reserva
            </Link>
            <button onClick={logout} className="text-sm text-gray-600 hover:text-gray-900">
              Cerrar sesión
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8">
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="font-semibold mb-4">Médicos existentes</h2>
          {listLoading ? (
            <div className="text-sm text-gray-600">Cargando…</div>
          ) : professionals.length ? (
            <div className="space-y-3">
              {professionals.map((p) => (
                <div key={p.id} className="border rounded-md p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div>
                    {editingId === p.id ? (
                      <div className="space-y-2">
                        <div className="text-xs text-gray-500">{p.email}</div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium mb-1">Nombre</label>
                            <input
                              className="w-full border rounded-md px-3 py-2"
                              value={editFullName}
                              onChange={(e) => setEditFullName(e.target.value)}
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium mb-1">Especialidad</label>
                            <input
                              className="w-full border rounded-md px-3 py-2"
                              value={editSpecialty}
                              onChange={(e) => setEditSpecialty(e.target.value)}
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium mb-1">Rol</label>
                            <select
                              className="w-full border rounded-md px-3 py-2"
                              value={editRole}
                              onChange={(e) => setEditRole(e.target.value)}
                            >
                              <option value="specialist">specialist</option>
                              <option value="medical_admin">medical_admin</option>
                              <option value="reception">reception</option>
                              <option value="administration">administration</option>
                              <option value="it_admin">it_admin</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-medium mb-1">Nº colegiado</label>
                            <div className="px-3 py-2 border rounded-md text-sm text-gray-700 bg-gray-50">
                              {p.license_number || '—'}
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="font-medium text-gray-900">{p.full_name || p.email}</div>
                        <div className="text-sm text-gray-600">
                          {p.specialty || '—'} · {p.license_number || '—'}
                        </div>
                        <div className="text-xs text-gray-500">role: {p.role || '—'} · active: {String(p.is_active)}</div>
                      </>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      {editingId === p.id ? (
                        <>
                          <button
                            type="button"
                            onClick={() => saveEdit(p)}
                            className="px-4 py-2 rounded-md bg-primary text-white hover:bg-opacity-90"
                          >
                            Guardar
                          </button>
                          <button
                            type="button"
                            onClick={cancelEdit}
                            className="px-4 py-2 rounded-md border hover:bg-gray-50"
                          >
                            Cancelar
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => startEdit(p)}
                            className="px-4 py-2 rounded-md border hover:bg-gray-50"
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleActive(p)}
                            className="px-4 py-2 rounded-md border hover:bg-gray-50"
                          >
                            {p.is_active ? 'Desactivar' : 'Activar'}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-gray-600">No hay médicos todavía.</div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <form onSubmit={onCreate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <input className="w-full border rounded-md px-3 py-2" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Nombre y apellidos</label>
              <input className="w-full border rounded-md px-3 py-2" value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Nº colegiado</label>
                <input className="w-full border rounded-md px-3 py-2" value={licenseNumber} onChange={(e) => setLicenseNumber(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Especialidad</label>
                <input className="w-full border rounded-md px-3 py-2" value={specialty} onChange={(e) => setSpecialty(e.target.value)} />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Registration token (mock)</label>
              <input className="w-full border rounded-md px-3 py-2" value={registrationToken} onChange={(e) => setRegistrationToken(e.target.value)} />
            </div>

            {error && (
              <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}
            {success && (
              <div className="rounded-md bg-green-50 border border-green-200 px-3 py-2 text-sm text-green-800">
                {success}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-white py-2 rounded-md hover:bg-opacity-90 transition disabled:opacity-60"
            >
              {loading ? 'Creando…' : 'Crear médico'}
            </button>

            <p className="text-xs text-gray-500">
              Al crear el médico, el backend genera contraseña temporal y la envía por email (o la imprime por consola en modo dev si no hay SendGrid).
            </p>
          </form>
        </div>
      </main>
    </div>
  )
}

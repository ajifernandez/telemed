'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminLoginPage() {
  const router = useRouter()

  const apiBase = useMemo(() => {
    return process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000/api/v1'
  }, [])

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const res = await fetch(`${apiBase}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      if (!res.ok) {
        const detail = await res.text()
        throw new Error(detail || 'Credenciales inválidas')
      }

      const data = await res.json()
      const token = data?.access_token
      if (!token) throw new Error('No token received')

      localStorage.setItem('admin_token', token)
      router.push('/admin')
    } catch (e: any) {
      setError(e?.message || 'Error en login')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-md mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">Acceso Administración</h1>
          <Link href="/login" className="text-sm text-primary hover:underline">
            Accesos
          </Link>
        </div>
      </header>

      <main className="max-w-md mx-auto px-6 py-10">
        <div className="bg-white rounded-lg shadow-md p-6">
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <input
                className="w-full border rounded-md px-3 py-2"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Contraseña</label>
              <input
                className="w-full border rounded-md px-3 py-2"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
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
              {loading ? 'Entrando…' : 'Entrar'}
            </button>
          </form>

          <p className="text-xs text-gray-500 mt-4">
            Roles permitidos en este panel: medical_admin, administration, reception, it_admin.
          </p>
        </div>
      </main>
    </div>
  )
}

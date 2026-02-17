'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function UnifiedLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const apiBase = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000/api/v1'

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

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
      console.log('Login response:', data) // Debug log
      const { access_token, dashboard_url } = data

      if (!dashboard_url) {
        console.error('dashboard_url is undefined:', data)
        throw new Error('No se pudo determinar el dashboard correspondiente')
      }

      // Store token in appropriate storage based on dashboard
      if (dashboard_url.startsWith('/admin')) {
        localStorage.setItem('admin_token', access_token)
      } else if (dashboard_url.startsWith('/doctor')) {
        localStorage.setItem('doctor_token', access_token)
      } else if (dashboard_url.startsWith('/it')) {
        localStorage.setItem('it_token', access_token)
      } else {
        // Default fallback
        localStorage.setItem('default_token', access_token)
      }

      // Redirect to the appropriate dashboard
      router.push(dashboard_url)
    } catch (e: any) {
      setError(e?.message || 'Error al iniciar sesión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Telemedicina</h1>
          <p className="text-sm text-gray-600">Inicia sesión para continuar</p>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700 mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              required
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
            <input
              type="password"
              required
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white rounded-md py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
          </button>
        </form>

        <div className="mt-6 text-xs text-gray-500 text-center">
          Se redirigirá automáticamente al dashboard correspondiente según tu rol.
        </div>
      </div>
    </div>
  )
}

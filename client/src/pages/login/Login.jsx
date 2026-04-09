// =============================================================================
// Login — Root component for the login page
//
// On success the server returns a JWT + sets an httpOnly cookie.
// We redirect to /dashboard — Express then validates the cookie and
// serves dashboard.html. No client-side routing needed.
// =============================================================================

import React, { useState } from 'react'
import Button from '../../components/ui/Button'

export default function Login() {
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState(null)
  const [loading,  setLoading]  = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const res  = await fetch('/api/auth/login', {
        method:      'POST',
        headers:     { 'Content-Type': 'application/json' },
        credentials: 'include',          // send/receive cookies
        body:        JSON.stringify({ email, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Login failed')
        return
      }

      // Store token for fetch calls that need the Authorization header
      sessionStorage.setItem('token', data.token)
      sessionStorage.setItem('user',  JSON.stringify(data.user))

      // Let Express handle where to send the user based on their role
      const destination = data.user.role === 'manager' || data.user.role === 'admin'
        ? '/manager'
        : '/dashboard'

      window.location.href = destination

    } catch {
      setError('Network error — please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page-center">
      <div className="card">
        <h1 className="card__title">NanoXplore RH</h1>
        <p className="card__subtitle">Sign in to your account</p>

        <form onSubmit={handleSubmit} noValidate>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>

          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>

          {error && <p className="error-msg">{error}</p>}

          <Button type="submit" disabled={loading} fullWidth>
            {loading ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>
      </div>
    </div>
  )
}

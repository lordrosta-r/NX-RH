// =============================================================================
// Manager — Team overview + review/validate evaluations
// =============================================================================

import React, { useEffect, useState } from 'react'
import Button from '../../components/ui/Button'

function getCurrentUser() {
  try { return JSON.parse(sessionStorage.getItem('user')) } catch { return null }
}

function authHeaders() {
  const token = sessionStorage.getItem('token')
  return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }
}

export default function Manager() {
  const user      = getCurrentUser()
  const [evals,   setEvals]   = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  useEffect(() => {
    fetch('/api/evaluations', { headers: authHeaders(), credentials: 'include' })
      .then(r => r.json())
      .then(data => {
        if (data.error) throw new Error(data.error)
        setEvals(data)
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  async function advanceStatus(id, nextStatus) {
    const res  = await fetch(`/api/evaluations/${id}`, {
      method:      'PATCH',
      headers:     authHeaders(),
      credentials: 'include',
      body:        JSON.stringify({ status: nextStatus }),
    })
    const data = await res.json()
    if (!res.ok) return alert(data.error)

    // Optimistically update local state
    setEvals(prev => prev.map(e => e.id === id ? { ...e, status: nextStatus } : e))
  }

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
    sessionStorage.clear()
    window.location.href = '/'
  }

  return (
    <div className="page">
      <header className="topbar">
        <span className="topbar__brand">NanoXplore RH</span>
        <div className="topbar__user">
          <span>{user?.firstName} {user?.lastName} ({user?.role})</span>
          <button className="btn btn--ghost" onClick={handleLogout}>Logout</button>
        </div>
      </header>

      <main className="content">
        <h2>Team Evaluations</h2>

        {loading && <p>Loading…</p>}
        {error   && <p className="error-msg">{error}</p>}

        {!loading && !error && evals.length === 0 && (
          <p className="empty-state">No evaluations to review.</p>
        )}

        {!loading && evals.length > 0 && (
          <table className="table">
            <thead>
              <tr>
                <th>Evaluatee</th>
                <th>Evaluator</th>
                <th>Status</th>
                <th>Score</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {evals.map(ev => (
                <tr key={ev.id}>
                  <td>{ev.evaluatee_name}</td>
                  <td>{ev.evaluator_name}</td>
                  <td><span className={`badge badge--${ev.status}`}>{ev.status}</span></td>
                  <td>{ev.score ?? '—'}</td>
                  <td>
                    {ev.status === 'submitted' && (
                      <Button size="sm" onClick={() => advanceStatus(ev.id, 'reviewed')}>
                        Mark Reviewed
                      </Button>
                    )}
                    {ev.status === 'reviewed' && (
                      <Button size="sm" onClick={() => advanceStatus(ev.id, 'validated')}>
                        Validate
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </main>
    </div>
  )
}

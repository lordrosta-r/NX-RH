// =============================================================================
// Dashboard — Employee view
// Shows the evaluations assigned to the current user.
// =============================================================================

import React, { useEffect, useState } from 'react'

// Read user info written to sessionStorage at login time
function getCurrentUser() {
  try { return JSON.parse(sessionStorage.getItem('user')) } catch { return null }
}

function authHeaders() {
  const token = sessionStorage.getItem('token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export default function Dashboard() {
  const user        = getCurrentUser()
  const [evals,     setEvals]   = useState([])
  const [loading,   setLoading] = useState(true)
  const [error,     setError]   = useState(null)

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
          <span>{user?.firstName} {user?.lastName}</span>
          <button className="btn btn--ghost" onClick={handleLogout}>Logout</button>
        </div>
      </header>

      <main className="content">
        <h2>My Evaluations</h2>

        {loading && <p>Loading…</p>}
        {error   && <p className="error-msg">{error}</p>}

        {!loading && !error && evals.length === 0 && (
          <p className="empty-state">No evaluations assigned yet.</p>
        )}

        {!loading && evals.length > 0 && (
          <table className="table">
            <thead>
              <tr>
                <th>Campaign</th>
                <th>Evaluatee</th>
                <th>Status</th>
                <th>Score</th>
                <th>Submitted</th>
              </tr>
            </thead>
            <tbody>
              {evals.map(ev => (
                <tr key={ev.id}>
                  <td>{ev.campaign_id}</td>
                  <td>{ev.evaluatee_name}</td>
                  <td><span className={`badge badge--${ev.status}`}>{ev.status}</span></td>
                  <td>{ev.score ?? '—'}</td>
                  <td>{ev.submitted_at ? new Date(ev.submitted_at).toLocaleDateString() : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </main>
    </div>
  )
}

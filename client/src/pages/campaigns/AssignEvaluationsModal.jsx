import React from 'react'

export default function AssignEvaluationsModal({ campaign, forms, users, assignForm, setAssignForm, onSubmit, onCancel, saving, t }) {
  function toggleUser(uid) {
    setAssignForm(prev => ({
      ...prev,
      evaluateeIds: prev.evaluateeIds.includes(uid)
        ? prev.evaluateeIds.filter(id => id !== uid)
        : [...prev.evaluateeIds, uid],
    }))
  }

  function getFilteredUsers() {
    if (!campaign?.targetDepartments?.length) return users
    return users.filter(u => campaign.targetDepartments.includes(u.department))
  }

  function toggleAll() {
    const filtered = getFilteredUsers()
    const allSelected = filtered.every(u => assignForm.evaluateeIds.includes(u._id || u.id))
    if (allSelected) {
      const ids = new Set(filtered.map(u => u._id || u.id))
      setAssignForm(prev => ({ ...prev, evaluateeIds: prev.evaluateeIds.filter(id => !ids.has(id)) }))
    } else {
      const current = new Set(assignForm.evaluateeIds)
      filtered.forEach(u => current.add(u._id || u.id))
      setAssignForm(prev => ({ ...prev, evaluateeIds: [...current] }))
    }
  }

  const filtered = getFilteredUsers()

  return (
    <div className="cmp-modal-backdrop" onClick={onCancel}>
      <div className="cmp-modal cmp-modal--wide" role="dialog" aria-labelledby="cmp-assign-title" onClick={e => e.stopPropagation()}>
        <h3 id="cmp-assign-title" className="cmp-modal__title">{t('cmp.assign.title')}</h3>
        <p className="cmp-card__desc">{campaign?.name}</p>
        <form onSubmit={onSubmit} className="cmp-wizard-form">
          <label className="cmp-field">
            <span>{t('cmp.assign.form')}</span>
            <select required value={assignForm.formId}
              onChange={e => setAssignForm(p => ({ ...p, formId: e.target.value }))}>
              <option value="">{t('cmp.assign.selectForm')}</option>
              {forms.map(f => (
                <option key={f._id || f.id} value={f._id || f.id}>{f.title || f.name}</option>
              ))}
            </select>
          </label>

          {/* Evaluator mode: self or specific */}
          <label className="cmp-field">
            <span>{t('cmp.assign.mode')}</span>
            <select value={assignForm.mode || 'self'}
              onChange={e => setAssignForm(p => ({ ...p, mode: e.target.value, evaluatorId: '' }))}>
              <option value="self">{t('cmp.assign.mode.self')}</option>
              <option value="specific">{t('cmp.assign.mode.specific')}</option>
            </select>
          </label>

          {assignForm.mode === 'specific' && (
            <label className="cmp-field">
              <span>{t('cmp.assign.evaluator')}</span>
              <select required value={assignForm.evaluatorId || ''}
                onChange={e => setAssignForm(p => ({ ...p, evaluatorId: e.target.value }))}>
                <option value="">{t('cmp.assign.selectEvaluator')}</option>
                {users.filter(u => ['manager', 'director', 'admin'].includes(u.role)).map(u => (
                  <option key={u._id || u.id} value={u._id || u.id}>
                    {u.firstName} {u.lastName} — {u.role}
                  </option>
                ))}
              </select>
            </label>
          )}

          <fieldset className="cmp-field">
            <legend>{t('cmp.assign.employees')} ({assignForm.evaluateeIds.length})</legend>
            <div className="cmp-assign__toolbar">
              <button type="button" className="cmp-btn cmp-btn--sm" onClick={toggleAll}>
                {t('cmp.assign.toggleAll')}
              </button>
            </div>
            <div className="cmp-assign__list">
              {filtered.map(u => (
                <label key={u._id || u.id} className="cmp-check">
                  <input type="checkbox"
                    checked={assignForm.evaluateeIds.includes(u._id || u.id)}
                    onChange={() => toggleUser(u._id || u.id)} />
                  <span>{u.firstName} {u.lastName} — {u.department || '?'}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <div className="cmp-modal__actions">
            <button type="button" className="cmp-btn" onClick={onCancel}>
              {t('cmp.wizard.cancel')}
            </button>
            <button type="submit" className="cmp-btn cmp-btn--primary" disabled={saving || !assignForm.formId || assignForm.evaluateeIds.length === 0}>
              {t('cmp.assign.submit')} ({assignForm.evaluateeIds.length})
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

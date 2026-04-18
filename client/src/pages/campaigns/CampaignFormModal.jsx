import React from 'react'

const DEPARTMENTS = [
  'Engineering', 'Product', 'Design', 'Data', 'Security', 'Infrastructure',
  'Finance', 'Legal', 'HR', 'Sales', 'Marketing', 'Customer Success',
  'Operations', 'Executive',
]

export default function CampaignFormModal({ title, titleId, form, setForm, departments, toggleDept, onSubmit, onCancel, saving, submitLabel, t }) {
  return (
    <div className="cmp-modal-backdrop" onClick={onCancel}>
      <div className="cmp-modal" role="dialog" aria-labelledby={titleId} onClick={e => e.stopPropagation()}>
        <h3 id={titleId} className="cmp-modal__title">{title}</h3>
        <form onSubmit={onSubmit} className="cmp-wizard-form">
          <label className="cmp-field">
            <span>{t('cmp.wizard.name')}</span>
            <input type="text" required value={form.name}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
          </label>
          <label className="cmp-field">
            <span>{t('cmp.wizard.description')}</span>
            <textarea rows={3} value={form.description}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
          </label>
          <div className="cmp-field-row">
            <label className="cmp-field">
              <span>{t('cmp.wizard.startDate')}</span>
              <input type="date" required value={form.startDate}
                onChange={e => setForm(p => ({ ...p, startDate: e.target.value }))} />
            </label>
            <label className="cmp-field">
              <span>{t('cmp.wizard.endDate')}</span>
              <input type="date" required value={form.endDate}
                onChange={e => setForm(p => ({ ...p, endDate: e.target.value }))} />
            </label>
          </div>
          <fieldset className="cmp-field">
            <legend>{t('cmp.wizard.departments')}</legend>
            <div className="cmp-checks">
              {(departments || DEPARTMENTS).map(d => (
                <label key={d} className="cmp-check">
                  <input type="checkbox" checked={form.targetDepartments.includes(d)}
                    onChange={() => toggleDept(d)} />
                  <span>{d}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <div className="cmp-modal__actions">
            <button type="button" className="cmp-btn" onClick={onCancel}>
              {t('cmp.wizard.cancel')}
            </button>
            <button type="submit" className="cmp-btn cmp-btn--primary" disabled={saving}>
              {submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

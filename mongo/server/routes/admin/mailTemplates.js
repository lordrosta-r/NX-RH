'use strict'

// =============================================================================
// routes/admin/mailTemplates.js — Gestion des templates d'email editables
//
// GET   /api/admin/mail-templates        → liste tous les templates (admin, hr)
// PATCH /api/admin/mail-templates/:slug  → modifier un template (admin uniquement)
//                                          reset:true → remettre les valeurs hardcodées
//
// Le router est monté dans index.js avec authGuard(['admin','hr']).
// Le PATCH restreint supplémentairement à 'admin' via vérification dans le handler.
// =============================================================================

const router      = require('express').Router()
const sanitizeHtml = require('sanitize-html')
const { MailTemplate } = require('../../models')

// ─── GET /api/admin/mail-templates ────────────────────────────────────────────

router.get('/', async (req, res, next) => {
  try {
    const templates = await MailTemplate.find({}).sort({ slug: 1 }).lean()
    res.json(templates)
  } catch (err) {
    next(err)
  }
})

// ─── PATCH /api/admin/mail-templates/:slug ────────────────────────────────────

router.patch('/:slug', async (req, res, next) => {
  try {
    // Restreindre la modification aux admins uniquement
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Réservé à l\'administrateur' })
    }

    const { slug } = req.params
    const { subject, bodyText, bodyHtml, reset } = req.body

    if (reset) {
      // Re-seed depuis les templates hardcodés du notificationService
      const { TEMPLATES } = require('../../services/notificationService')
      const templateFn    = TEMPLATES?.[slug]
      if (!templateFn) {
        return res.status(404).json({ error: `Aucun template hardcodé trouvé pour le slug "${slug}"` })
      }

      // Appel avec données vides pour obtenir le subject/text de base
      const defaults = templateFn({})
      const updated  = await MailTemplate.findOneAndUpdate(
        { slug },
        {
          $set: {
            subject:      defaults.subject  || '',
            bodyText:     defaults.text     || '',
            bodyHtml:     defaults.html     || '',
            lastEditedBy: req.user.id,
          },
        },
        { new: true },
      ).lean()

      if (!updated) return res.status(404).json({ error: `Template introuvable : ${slug}` })
      return res.json(updated)
    }

    const updates = { lastEditedBy: req.user.id }
    if (subject  !== undefined) updates.subject  = subject
    if (bodyText !== undefined) updates.bodyText = bodyText
    if (bodyHtml !== undefined) {
      updates.bodyHtml = sanitizeHtml(bodyHtml, {
        allowedTags: ['p', 'br', 'strong', 'em', 'a', 'ul', 'ol', 'li', 'h2', 'h3', 'span', 'div'],
        allowedAttributes: {
          'a': ['href', 'target'],
          '*': ['style'],
        },
        allowedStyles: {
          '*': {
            'color':       [/.*/],
            'font-weight': [/.*/],
            'text-align':  [/.*/],
          },
        },
      })
    }

    const template = await MailTemplate.findOneAndUpdate(
      { slug },
      { $set: updates },
      { new: true, runValidators: true },
    ).lean()

    if (!template) return res.status(404).json({ error: `Template introuvable : ${slug}` })
    res.json(template)
  } catch (err) {
    next(err)
  }
})

module.exports = router

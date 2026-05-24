'use strict'

/**
 * Middleware Express de validation Joi.
 * Retourne 422 avec le détail des erreurs si la validation échoue.
 */
const validate = (schema, target = 'body') => (req, res, next) => {
  const { error, value } = schema.validate(req[target], {
    abortEarly: false,
    stripUnknown: true,
  })
  if (error) {
    return res.status(422).json({
      error: 'Données invalides',
      details: error.details.map(d => ({
        field: d.path.join('.'),
        message: d.message,
      })),
    })
  }
  req[target] = value // réassigner avec les valeurs sanitisées
  next()
}

module.exports = validate

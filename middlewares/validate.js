const { validationResult } = require('express-validator');

/**
 * Middleware to catch express-validator errors
 */
const validate = (validations) => {
  return async (req, res, next) => {
    // Run all validations
    for (const validation of validations) {
      const result = await validation.run(req);
      if (!result.isEmpty()) break;
    }

    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }

    // Return first error per field
    const extractedErrors = {};
    errors.array().forEach((err) => {
      if (!extractedErrors[err.path]) {
        extractedErrors[err.path] = err.msg;
      }
    });

    return res.status(422).json({
      success: false,
      message: 'Validation failed',
      errors: extractedErrors,
    });
  };
};

module.exports = validate;
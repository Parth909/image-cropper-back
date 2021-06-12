const { validationResult } = require("express-validator");

exports.runValidation = (req, res, next) => {
  // Intercept the request and finds the validation errors in this request and wraps them in an object with handy functions
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    // errors not empty
    return res.status(422).json({
      error: errors.array()[0].msg,
    });
  }

  next();
};

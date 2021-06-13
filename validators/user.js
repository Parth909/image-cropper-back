const { check } = require("express-validator");

exports.userUpdateValidator = [
  check("firstname")
    .not()
    .isEmpty()
    .withMessage("Firstname can't be empty")
    .matches(/^[a-zA-Z]{3,30}$/i)
    .withMessage(
      "Firstname should be atleast 3 characters long containing only alphabets & less than 30 characters"
    ),
  check("lastname")
    .not()
    .isEmpty()
    .withMessage("Lastname can't be empty")
    .matches(/^[a-zA-Z]{3,30}$/i)
    .withMessage(
      "Firstname than 3 characters long containing only alphabets & less than 30 characters"
    ),
  check("username")
    .not()
    .isEmpty()
    .withMessage("Username can't be empty")
    .matches(/^\w(\w|\.(?![._])){1,28}\w$/i)
    .withMessage(
      "Username should be alphanumeric less than 30 characters with no consecutive periods and shouldn't end and start with period"
    ),
  check("email").isEmail().withMessage("Must be a valid email address"),
];

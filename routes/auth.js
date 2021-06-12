const express = require("express");
const router = express.Router();
const { runValidation } = require("../validators/index");

const {
  userRegisterValidator,
  userLoginValidator,
} = require("../validators/auth");

const { register, registerActivate, login } = require("../controllers/auth");

router.post("/register", userRegisterValidator, runValidation, register);
router.post("/register/activate", registerActivate);

// userLoginValidator, runValidation
router.post("/login", login);

module.exports = router;

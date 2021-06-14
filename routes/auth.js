const express = require("express");
const router = express.Router();
const { runValidation } = require("../validators/index");

const { userRegisterValidator } = require("../validators/auth");

const {
  register,
  registerActivate,
  login,
  signinFacebook,
  refreshSignInFacebook,
} = require("../controllers/auth");

router.post("/register", userRegisterValidator, runValidation, register);
router.post("/register/activate", registerActivate);

// userLoginValidator, runValidation
router.post("/login", login);

router.post("/signin/facebook", signinFacebook);
router.post("/refreshsignin/facebook", refreshSignInFacebook);

module.exports = router;

const express = require("express");
const router = express.Router();

const { userUpdateValidator } = require("../validators/user");
const { runValidation } = require("../validators/index");

const { requireSignIn, authMiddleware } = require("../controllers/auth");

const {
  getProfile,
  updateProfile,
  deleteProfile,
} = require("../controllers/user");

router.get("/user", requireSignIn, authMiddleware, getProfile);

router.post(
  "/user",
  userUpdateValidator,
  runValidation,
  requireSignIn,
  updateProfile
);

router.delete("/user", requireSignIn, deleteProfile);

module.exports = router;

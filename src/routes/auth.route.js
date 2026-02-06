const express = require("express");
const router = express.Router();
const multer = require("multer");

// Controllers
const {
  registerUser,
  verifyEmailOTP,
  resendOTP,
} = require("../controllers/auth_controller/register.controller");
const login = require("../controllers/auth_controller/login.controller");
const updateProfile = require("../controllers/auth_controller/updateProfile.controller");
const changePassword = require("../controllers/auth_controller/changePassword.controller");
const {
  requestPasswordReset,
  verifyOTP,
  resetPassword,
} = require("../controllers/auth_controller/forgotpass.controller");

// Middlewares
const authMiddleware = require("../middlewares/auth.middleware");
const upload = multer({ storage: multer.memoryStorage() });

// --- Public Routes ---
router.post("/register", registerUser);
router.post("/verify-email-otp", verifyEmailOTP);
router.post("/resend-otp", resendOTP);
router.post("/login", login);

// Forgot Password Flow
router.post("/request-password-reset", requestPasswordReset);
router.post("/verify-reset-otp", verifyOTP);
router.post("/reset-password", resetPassword);

// --- Protected Routes ---
router.put(
  "/update-profile",
  authMiddleware,
  upload.single("avatar"),
  updateProfile,
);
router.put("/change-password", authMiddleware, changePassword);

module.exports = router;

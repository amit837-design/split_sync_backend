const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const validator = require("validator");
const User = require("../../models/auth.model");
const sendEmail = require("../../utils/sendEmail");

// Utility: Generate 6 digit string
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function registerUser(req, res) {
  try {
    let { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Sanitize email
    email = email.trim().toLowerCase();

    if (!validator.isEmail(email)) {
      return res.status(400).json({ message: "Invalid email address" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const otp = generateOTP();
    const hashedOTP = await bcrypt.hash(otp, 10); // Securely hash OTP

    await User.create({
      name,
      email,
      password: hashedPassword,
      emailOTP: hashedOTP, // Store hash, not plain text
      emailOTPExpires: Date.now() + 10 * 60 * 1000, // 10 mins
      isVerified: false,
    });

    await sendEmail(
      email,
      "Verify your email",
      `Your verification code is ${otp}. It expires in 10 minutes.`
    );

    res.status(201).json({ message: "OTP sent to your email" });
  } catch (err) {
    console.error("Register Error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
}

async function verifyEmailOTP(req, res) {
  try {
    let { email, otp } = req.body;
    email = email.trim().toLowerCase();

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.isVerified) {
      return res.status(400).json({ message: "Email already verified" });
    }

    // Validate Expiry
    if (!user.emailOTP || user.emailOTPExpires < Date.now()) {
      return res.status(400).json({ message: "OTP expired" });
    }

    // Validate Hash Match
    const isMatch = await bcrypt.compare(String(otp), user.emailOTP);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    // Update User State
    user.isVerified = true;
    user.emailOTP = undefined;
    user.emailOTPExpires = undefined;
    await user.save();

    const token = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });

    res.json({
      message: "Email verified successfully",
      token,
      user: { id: user._id, name: user.name, email: user.email },
    });
  } catch (err) {
    console.error("Verify OTP Error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
}

async function resendOTP(req, res) {
  try {
    let { email } = req.body;
    email = email.trim().toLowerCase();

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.isVerified) {
      return res.status(400).json({ message: "Email already verified" });
    }

    const otp = generateOTP();
    const hashedOTP = await bcrypt.hash(otp, 10);

    user.emailOTP = hashedOTP;
    user.emailOTPExpires = Date.now() + 10 * 60 * 1000;
    await user.save();

    await sendEmail(
      email,
      "Resend verification code",
      `Your new verification code is ${otp}.`
    );

    res.json({ message: "OTP resent successfully" });
  } catch (err) {
    console.error("Resend OTP Error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
}

module.exports = { registerUser, verifyEmailOTP, resendOTP };
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const sendEmail = require("../../utils/sendEmail");
const User = require("../../models/auth.model");

async function requestPasswordReset(req, res) {
  try {
    let { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required" });

    email = email.trim().toLowerCase();
    const user = await User.findOne({ email });

    // Security: Do not reveal if user exists
    if (!user) {
      return res.status(200).json({ message: "If the email exists, an OTP has been sent" });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedOTP = await bcrypt.hash(otp, 10);

    user.emailOTP = hashedOTP;
    user.emailOTPExpires = Date.now() + 10 * 60 * 1000;
    await user.save();

    await sendEmail(
      email,
      "Reset Your Password",
      `Your password reset code is ${otp}. It expires in 10 minutes.`
    );

    res.status(200).json({ message: "If the email exists, an OTP has been sent" });
  } catch (err) {
    console.error("Forgot Password Error:", err);
    res.status(500).json({ message: "Server error" });
  }
}

async function verifyOTP(req, res) {
  try {
    let { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ message: "Email and OTP are required" });

    email = email.trim().toLowerCase();
    const user = await User.findOne({ email });

    if (!user || !user.emailOTP || !user.emailOTPExpires) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    if (user.emailOTPExpires < Date.now()) {
      return res.status(400).json({ message: "OTP expired" });
    }

    const isValidOTP = await bcrypt.compare(String(otp), user.emailOTP);
    if (!isValidOTP) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    // Create 10-minute reset token
    const resetToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "10m" });

    res.status(200).json({ message: "OTP verified", resetToken });
  } catch (err) {
    console.error("Verify OTP Error:", err);
    res.status(500).json({ message: "Server error" });
  }
}

async function resetPassword(req, res) {
  try {
    const { resetToken, newPassword } = req.body;

    if (!resetToken || !newPassword) {
      return res.status(400).json({ message: "Reset token and new password are required" });
    }

    let decoded;
    try {
      decoded = jwt.verify(resetToken, process.env.JWT_SECRET);
    } catch (e) {
      return res.status(401).json({ message: "Invalid or expired reset token" });
    }

    const user = await User.findById(decoded.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    user.password = hashedPassword;
    user.emailOTP = undefined;
    user.emailOTPExpires = undefined;
    user.isVerified = true; // Auto-verify if they reset password via email

    await user.save();

    res.status(200).json({ message: "Password reset successful" });
  } catch (err) {
    console.error("Reset Password Error:", err);
    res.status(500).json({ message: "Server error" });
  }
}

module.exports = { requestPasswordReset, verifyOTP, resetPassword };
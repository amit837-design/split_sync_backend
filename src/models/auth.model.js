const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },

    // OTP & Verification Fields
    emailOTP: { type: String },
    emailOTPExpires: { type: Date },
    isVerified: {
      type: Boolean,
      default: false,
    },

    // Profile Picture Fields
    avatar: {
      type: String,
      default:
        "https://ik.imagekit.io/lpsxbrwkq/split_sync/default-profile-account.jpg?updatedAt=1767673235019",
    },
    // Stores the ImageKit File ID so we can delete it later
    avatarId: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("User", userSchema);

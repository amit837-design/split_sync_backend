const User = require("../../models/auth.model");
const ImageKit = require("imagekit");

// Initialize ImageKit
const imagekit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
});

const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id; // From authMiddleware
    const { name } = req.body;
    const file = req.file; // From Multer

    // Fetch current user to check for existing avatarId
    const currentUser = await User.findById(userId);

    if (!currentUser) {
      return res.status(404).json({ message: "User not found" });
    }

    let updateData = {};

    // Update Name if provided
    if (name) {
      updateData.name = name;
    }

    // Handle File Upload & Replacement
    if (file) {
      // DELETE OLD IMAGE: If user has a previous non-default image
      if (currentUser.avatarId) {
        try {
          await imagekit.deleteFile(currentUser.avatarId);
          console.log("Old profile image deleted from ImageKit");
        } catch (err) {
          console.warn("Failed to delete old image:", err.message);
        }
      }

      // UPLOAD NEW IMAGE
      const uploadResponse = await imagekit.upload({
        file: file.buffer,
        fileName: `user_${userId}_${Date.now()}`,
        folder: "/profile_pictures",
      });

      updateData.avatar = uploadResponse.url;
      updateData.avatarId = uploadResponse.fileId;
    }

    // Update Database
    const updatedUser = await User.findByIdAndUpdate(userId, updateData, {
      new: true,
    }).select("-password -emailOTP -emailOTPExpires");

    res.status(200).json({
      message: "Profile updated successfully",
      user: {
        id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        avatar: updatedUser.avatar,
      },
    });
  } catch (error) {
    console.error("Update Profile Error:", error);
    res.status(500).json({ message: "Failed to update profile" });
  }
};

module.exports = updateProfile;

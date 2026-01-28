const Chat = require("../../models/chat.model");
const ImageKit = require("imagekit");

const imagekit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
});

const updateGroup = async (req, res) => {
  const { chatId, chatName } = req.body;
  const file = req.file;

  // 1. Validation
  if (!chatId) {
    return res.status(400).json({ message: "Chat ID is required" });
  }

  try {
    // Check Permissions (Is User Admin?)

    let updateData = {};

    // Update Name
    if (chatName) {
      updateData.chatName = chatName;
    }

    // Update Picture (ImageKit)
    if (file) {
      const uploadResponse = await imagekit.upload({
        file: file.buffer,
        fileName: `group_${chatId}_${Date.now()}`,
        folder: "/group_pictures",
      });
      updateData.groupPic = uploadResponse.url;
    }

    // Update DB
    const updatedChat = await Chat.findByIdAndUpdate(chatId, updateData, {
      new: true,
    })
      .populate("users", "-password")
      .populate("groupAdmin", "-password");

    if (!updatedChat) {
      return res.status(404).json({ message: "Chat not found" });
    }

    res.json(updatedChat);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

module.exports = updateGroup;

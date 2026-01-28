const Chat = require("../../models/chat.model");

const removeFromGroup = async (req, res) => {
  const { chatId, userId } = req.body;

  // Validation
  if (!chatId || !userId) {
    return res
      .status(400)
      .json({ message: "Chat ID and User ID are required" });
  }

  // 2. Remove the user from the group's 'users' array
  try {
    const removed = await Chat.findByIdAndUpdate(
      chatId,
      {
        $pull: { users: userId },
      },
      { new: true }
    )
      .populate("users", "-password")
      .populate("groupAdmin", "-password");

    if (!removed) {
      return res.status(404).json({ message: "Chat not found" });
    }

    res.json(removed);
  } catch (error) {
    res.status(400);
    throw new Error(error.message);
  }
};

module.exports = removeFromGroup;

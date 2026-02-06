const Message = require("../models/message.model");
const Chat = require("../models/chat.model");
const User = require("../models/auth.model");

const fetchMessages = async (req, res) => {
  try {
    const { chatId } = req.params;

    // Check if the chat exists first
    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({ message: "Chat not found" });
    }

    const isMember = chat.users.some(
      (userId) => userId.toString() === req.user._id.toString()
    );

    if (!isMember) {
      return res
        .status(403)
        .json({ message: "Not authorized to view this chat" });
    }

    // Fetch messages only if authorized
    const messages = await Message.find({ chat: chatId })
      .populate("sender", "name email avatar")
      .populate("chat")
      .populate("poolId")
      .sort({ createdAt: 1 });

    res.status(200).json(messages);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const sendMessage = async (req, res) => {
  try {
    const { content, chatId, type, poolId } = req.body;

    if (!content || !chatId) {
      return res.status(400).json({ message: "Invalid data passed" });
    }

    let message = await Message.create({
      sender: req.user._id,
      content,
      chat: chatId,
      type: type || "text",
      poolId: poolId || null,
    });

    // Populate fields so the frontend can render it immediately without refresh
    message = await message.populate("sender", "name email avatar");
    message = await message.populate("chat");
    message = await message.populate("poolId");

    await Chat.findByIdAndUpdate(chatId, {
      latestMessage: message._id,
    });

    res.status(201).json(message);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

module.exports = {
  fetchMessages,
  sendMessage,
};

const Chat = require("../../models/chat.model");
const User = require("../../models/auth.model");

const accessChat = async (req, res) => {
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ message: "UserId param not sent" });
  }

  // Find existing non-group chats where BOTH users are present
  var isChat = await Chat.find({
    isGroupChat: false,
    $and: [
      { users: { $elemMatch: { $eq: req.user._id } } },
      { users: { $elemMatch: { $eq: userId } } },
    ],
  })
    .populate("users", "-password")
    .populate("latestMessage");

  // Populate sender info inside the latest message
  isChat = await User.populate(isChat, {
    path: "latestMessage.sender",
    select: "name email avatar",
  });

  // 2.Handle Self-Chat (Message Yourself)
  // If I message myself, ensure the chat doesn't contain anyone else
  if (req.user._id.toString() === userId) {
    isChat = isChat.filter(
      (chat) =>
        !chat.users.some((u) => u._id.toString() !== req.user._id.toString())
    );
  }

  // Return existing chat OR Create a new one
  if (isChat.length > 0) {
    res.send(isChat[0]);
  } else {
    var chatData = {
      chatName: "sender",
      isGroupChat: false,
      users: [req.user._id, userId],
    };

    try {
      const createdChat = await Chat.create(chatData);
      const FullChat = await Chat.findOne({ _id: createdChat._id }).populate(
        "users",
        "-password"
      );
      res.status(200).send(FullChat);
    } catch (error) {
      res.status(400);
      throw new Error(error.message);
    }
  }
};

module.exports = accessChat;

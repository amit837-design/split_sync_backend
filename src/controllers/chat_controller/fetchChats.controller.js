const Chat = require("../../models/chat.model");

const fetchChats = async (req, res) => {
  try {
    const results = await Chat.find({
      users: { $elemMatch: { $eq: req.user._id } },
    })
      .populate("users", "-password") 
      .populate("groupAdmin", "-password")
      .populate("latestMessage")
      .sort({ updatedAt: -1 });

    // Populate the sender inside latestMessage
    const populatedResults = await Chat.populate(results, {
      path: "latestMessage.sender",
      select: "name email avatar",
    });

    res.status(200).send(populatedResults);
  } catch (error) {
    res.status(400).send(error.message);
  }
};

module.exports = fetchChats;

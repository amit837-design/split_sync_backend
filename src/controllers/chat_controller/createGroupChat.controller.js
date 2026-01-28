const Chat = require("../../models/chat.model");
const ImageKit = require("imagekit");

// Initialize ImageKit
const imagekit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
});

const createGroupChat = async (req, res) => {
  try {
    // Basic Validation
    if (!req.body.users || !req.body.name) {
      return res.status(400).send({ message: "Please fill all fields" });
    }

    // 2. Parse Users
    // FormData sends arrays as strings, so we must parse it.
    // We check type to test raw JSON in Postman.
    let users =
      typeof req.body.users === "string"
        ? JSON.parse(req.body.users)
        : req.body.users;

    if (users.length < 2) {
      return res.status(400).send("More than 2 users required for group");
    }

    users.push(req.user); // Add current user (Admin)

    // Handle Image Upload
    let groupPicUrl =
      "https://icon-library.com/images/anonymous-avatar-icon/anonymous-avatar-icon-25.jpg"; // Default

    if (req.file) {
      const uploadResponse = await imagekit.upload({
        file: req.file.buffer,
        fileName: `group_${Date.now()}`,
        folder: "/group_pictures",
      });
      groupPicUrl = uploadResponse.url;
    }

    const groupChat = await Chat.create({
      chatName: req.body.name,
      users: users,
      isGroupChat: true,
      groupAdmin: req.user,
      groupPic: groupPicUrl,
    });

    // 5. Populate and Return
    const fullGroupChat = await Chat.findOne({ _id: groupChat._id })
      .populate("users", "-password")
      .populate("groupAdmin", "-password");

    res.status(200).json(fullGroupChat);
  } catch (error) {
    console.error("Create Group Error:", error);
    res.status(400).send(error.message);
  }
};

module.exports = createGroupChat;

const User = require("../../models/auth.model");

async function searchUsers(req, res) {
  try {
    const { q, type, page, limit } = req.search;
    const skip = (page - 1) * limit;

    let filter = {};

    if (type === "name") {
      filter.name = { $regex: `^${q}`, $options: "i" };
    }

    if (type === "email") {
      filter.email = { $regex: q, $options: "i" };
    }

    const users = await User.find(filter)
      .select("name email avatar isVerified")
      .sort({ name: 1 })
      .skip(skip)
      .limit(limit);

    return res.status(200).json({
      success: true,
      users,
      page,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "User search failed",
    });
  }
}

module.exports = searchUsers;

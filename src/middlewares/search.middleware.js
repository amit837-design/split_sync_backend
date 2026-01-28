function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function searchMiddleware(req, res, next) {
  let { q = "", type = "name", page = 1, limit = 20 } = req.query;

  // validate type
  if (!["name", "email"].includes(type)) {
    return res.status(400).json({ message: "Invalid search type" });
  }

  // normalize inputs
  q = q.trim();
  page = Number(page);
  limit = Number(limit);

  if (q.length > 50) {
    return res.status(400).json({ message: "Search query too long" });
  }

  if (page < 1) page = 1;
  if (limit < 1) limit = 20;
  if (limit > 50) limit = 50;

  req.search = {
    q: escapeRegex(q),
    type,
    page,
    limit,
  };

  next();
}

module.exports = searchMiddleware;

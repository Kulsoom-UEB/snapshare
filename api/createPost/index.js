const { getCosmosDb, newId, requireEnv } = require("../shared/helpers");

module.exports = async function (context, req) {
  try {
    const body = req.body || {};

    const title = (body.title || "").toString().trim();
    const caption = (body.caption || "").toString().trim();
    const locationText = (body.locationText || "").toString().trim();
    const creatorId = (body.creatorId || "creator-demo").toString().trim();
    const imageUrl = (body.imageUrl || "").toString().trim();

    const people = Array.isArray(body.people)
      ? body.people.map(p => String(p).trim()).filter(Boolean)
      : [];

    if (!imageUrl) {
      context.res = { status: 400, body: { error: "imageUrl is required." } };
      return;
    }

    const postId = newId();

    // Use postId as document id and partition key (recommended container pk: /postId)
    const item = {
      id: postId,
      postId,
      creatorId,
      createdAt: new Date().toISOString(),
      title,
      caption,
      locationText,
      people,
      peopleText: people.join(", ").toLowerCase(),
      imageUrl,
      ratingAvg: 0,
      ratingCount: 0
    };

    const { db } = getCosmosDb();
    const postsContainer = db.container(requireEnv("COSMOS_CONTAINER_POSTS"));

    await postsContainer.items.create(item, { partitionKey: postId });

    context.res = { status: 200, body: { postId } };
  } catch (err) {
    context.log(err);
    context.res = { status: 500, body: { error: err.message || "Failed to create post." } };
  }
};

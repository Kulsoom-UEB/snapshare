const { getCosmosDb, newId, requireEnv } = require("../shared/helpers");

module.exports = async function (context, req) {
  try {
    const body = req.body || {};
    const postId = String(body.postId || "").trim();
    const userId = String(body.userId || "consumer-demo").trim();
    const text = String(body.text || "").trim();

    if (!postId || !text) {
      context.res = { status: 400, body: { error: "postId and text are required." } };
      return;
    }

    const commentId = newId();
    const comment = {
      id: commentId,
      commentId,
      postId,
      userId,
      text,
      createdAt: new Date().toISOString()
    };

    const { db } = getCosmosDb();
    const commentsContainer = db.container(requireEnv("COSMOS_CONTAINER_COMMENTS"));
    await commentsContainer.items.create(comment, { partitionKey: postId });

    context.res = { status: 200, body: { ok: true } };
  } catch (err) {
    context.log(err);
    context.res = { status: 500, body: { error: err.message || "Failed to add comment." } };
  }
};

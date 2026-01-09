const { getCosmosDb, requireEnv } = require("../shared/helpers");

module.exports = async function (context, req) {
  try {
    const body = req.body || {};
    const postId = String(body.postId || "").trim();
    const userId = String(body.userId || "consumer-demo").trim();
    const stars = parseInt(body.stars, 10);

    if (!postId || !(stars >= 1 && stars <= 5)) {
      context.res = { status: 400, body: { error: "postId and stars (1-5) are required." } };
      return;
    }

    const { db } = getCosmosDb();
    const ratingsContainer = db.container(requireEnv("COSMOS_CONTAINER_RATINGS"));
    const postsContainer = db.container(requireEnv("COSMOS_CONTAINER_POSTS"));

    // One rating per user per post (deterministic id)
    const ratingId = `${postId}:${userId}`;
    const ratingDoc = {
      id: ratingId,
      postId,
      userId,
      stars,
      createdAt: new Date().toISOString()
    };

    await ratingsContainer.items.upsert(ratingDoc, { partitionKey: postId });

    // Recompute average and count (simple and reliable for coursework)
    const avgQuery = {
      query: "SELECT VALUE AVG(c.stars) FROM c WHERE c.postId = @pid",
      parameters: [{ name: "@pid", value: postId }]
    };
    const avgResult = await ratingsContainer.items.query(avgQuery).fetchAll();
    const avg = (avgResult.resources && avgResult.resources[0] != null) ? Number(avgResult.resources[0]) : 0;

    const countQuery = {
      query: "SELECT VALUE COUNT(1) FROM c WHERE c.postId = @pid",
      parameters: [{ name: "@pid", value: postId }]
    };
    const countResult = await ratingsContainer.items.query(countQuery).fetchAll();
    const count = (countResult.resources && countResult.resources[0] != null) ? Number(countResult.resources[0]) : 0;

    // Update post (recommended pk: /postId)
    await postsContainer.item(postId, postId).patch([
      { op: "add", path: "/ratingAvg", value: avg },
      { op: "add", path: "/ratingCount", value: count }
    ]);

    context.res = { status: 200, body: { ok: true, ratingAvg: avg, ratingCount: count } };
  } catch (err) {
    context.log(err);
    context.res = { status: 500, body: { error: err.message || "Failed to add rating." } };
  }
};

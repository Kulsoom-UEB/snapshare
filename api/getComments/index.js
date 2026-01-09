const { getCosmosDb, requireEnv } = require("../shared/helpers");

module.exports = async function (context, req) {
  try {
    const postId = String((req.query && req.query.postId) || "").trim();

    if (!postId) {
      context.res = { status: 400, body: { error: "postId is required." } };
      return;
    }

    const { db } = getCosmosDb();
    const commentsContainer = db.container(requireEnv("COSMOS_CONTAINER_COMMENTS"));

    const querySpec = {
      query: "SELECT * FROM c WHERE c.postId = @pid ORDER BY c.createdAt DESC",
      parameters: [{ name: "@pid", value: postId }]
    };

    const { resources } = await commentsContainer.items.query(querySpec).fetchAll();

    context.res = { status: 200, body: { comments: resources || [] } };
  } catch (err) {
    context.log(err);
    context.res = { status: 500, body: { error: err.message || "Failed to get comments." } };
  }
};

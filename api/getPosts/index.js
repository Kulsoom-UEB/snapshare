const { getCosmosDb, requireEnv } = require("../shared/helpers");

module.exports = async function (context, req) {
  try {
    const search = String((req.query && req.query.search) || "").toLowerCase().trim();

    const { db } = getCosmosDb();
    const container = db.container(requireEnv("COSMOS_CONTAINER_POSTS"));

    let querySpec;

    if (!search) {
      querySpec = {
        query: "SELECT TOP 50 * FROM c ORDER BY c.createdAt DESC"
      };
    } else {
      querySpec = {
        query: `
          SELECT TOP 50 * FROM c
          WHERE CONTAINS(LOWER(c.title), @q)
             OR CONTAINS(LOWER(c.caption), @q)
             OR CONTAINS(LOWER(c.locationText), @q)
             OR CONTAINS(LOWER(c.peopleText), @q)
          ORDER BY c.createdAt DESC
        `,
        parameters: [{ name: "@q", value: search }]
      };
    }

    const { resources } = await container.items.query(querySpec).fetchAll();

    context.res = {
      status: 200,
      body: { posts: resources || [] }
    };
  } catch (err) {
    context.log(err);
    context.res = { status: 500, body: { error: err.message || "Failed to load posts." } };
  }
};

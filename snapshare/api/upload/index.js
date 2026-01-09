const { getBlobContainerClient, newId, publicBlobUrl } = require("../shared/helpers");

module.exports = async function (context, req) {
  try {
    const body = req.body || {};
    const fileName = (body.fileName || "upload.jpg").toString();
    const contentType = (body.contentType || "image/jpeg").toString();
    const base64 = body.base64;

    if (!base64 || typeof base64 !== "string") {
      context.res = { status: 400, body: { error: "base64 is required (image payload)." } };
      return;
    }

    // Create a safe extension (best-effort)
    const extRaw = fileName.includes(".") ? fileName.split(".").pop() : "jpg";
    const ext = String(extRaw).toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";

    const id = newId();
    const blobName = `original/${id}.${ext}`;

    const containerClient = getBlobContainerClient();
    await containerClient.createIfNotExists();

    const buffer = Buffer.from(base64, "base64");

    // Coursework-safe size guard (2 MB)
    if (buffer.length > 2 * 1024 * 1024) {
      context.res = { status: 413, body: { error: "Image too large. Please use <= 2MB." } };
      return;
    }

    const blobClient = containerClient.getBlockBlobClient(blobName);
    await blobClient.uploadData(buffer, {
      blobHTTPHeaders: { blobContentType: contentType }
    });

    context.res = {
      status: 200,
      body: {
        blobName,
        imageUrl: publicBlobUrl(blobName)
      }
    };
  } catch (err) {
    context.log(err);
    context.res = { status: 500, body: { error: err.message || "Upload failed." } };
  }
};

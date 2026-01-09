const { BlobServiceClient } = require("@azure/storage-blob");
const { CosmosClient } = require("@azure/cosmos");
const crypto = require("crypto");

function requireEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing environment variable: ${name}`);
  return v;
}

function newId() {
  return crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString("hex");
}

function getBlobContainerClient() {
  const conn = requireEnv("AZURE_STORAGE_CONNECTION_STRING");
  const containerName = requireEnv("BLOB_CONTAINER_NAME");

  const blobServiceClient = BlobServiceClient.fromConnectionString(conn);
  return blobServiceClient.getContainerClient(containerName);
}

function getCosmosDb() {
  const endpoint = requireEnv("COSMOS_ENDPOINT");
  const key = requireEnv("COSMOS_KEY");
  const dbName = requireEnv("COSMOS_DB_NAME");

  const client = new CosmosClient({ endpoint, key });
  const db = client.database(dbName);
  return { client, db };
}

function publicBlobUrl(blobName) {
  const base = requireEnv("PUBLIC_BLOB_BASE_URL").replace(/\/$/, "");
  return `${base}/${blobName}`;
}

module.exports = {
  requireEnv,
  newId,
  getBlobContainerClient,
  getCosmosDb,
  publicBlobUrl
};

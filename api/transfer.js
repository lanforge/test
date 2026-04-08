#!/usr/bin/env node

const { MongoClient } = require("mongodb");

const SOURCE_URI =
  process.env.SOURCE_URI ||
  "mongodb+srv://damian:wJwxO0xQYgrLV9AH@altoev.u9lcgej.mongodb.net/lanforge-beta?retryWrites=true&w=majority&appName=Altoev";

const TARGET_URI =
  process.env.TARGET_URI ||
  "mongodb+srv://damian:wJwxO0xQYgrLV9AH@altoev.u9lcgej.mongodb.net/lanforge-final?retryWrites=true&w=majority&appName=Altoev";

const SOURCE_DB_NAME = process.env.SOURCE_DB_NAME || "lanforge-beta";
const TARGET_DB_NAME = process.env.TARGET_DB_NAME || "lanforge-final";

const BATCH_SIZE = Number(process.env.BATCH_SIZE || 500);
const CLEAR_TARGET_COLLECTIONS_FIRST =
  String(process.env.CLEAR_TARGET_COLLECTIONS_FIRST || "true").toLowerCase() === "true";

async function copyCollectionData(sourceCollection, targetCollection) {
  const totalDocs = await sourceCollection.countDocuments();

  if (CLEAR_TARGET_COLLECTIONS_FIRST) {
    console.log(`  - Clearing target collection "${targetCollection.collectionName}"...`);
    await targetCollection.deleteMany({});
  }

  if (totalDocs === 0) {
    console.log(`  - No documents to copy for "${sourceCollection.collectionName}"`);
    return;
  }

  console.log(`  - Copying ${totalDocs} document(s)...`);

  const cursor = sourceCollection.find({});
  let batch = [];
  let copied = 0;

  try {
    for await (const doc of cursor) {
      batch.push(doc);

      if (batch.length >= BATCH_SIZE) {
        await targetCollection.insertMany(batch, { ordered: false });
        copied += batch.length;
        console.log(`    Inserted ${copied}/${totalDocs}`);
        batch = [];
      }
    }

    if (batch.length > 0) {
      await targetCollection.insertMany(batch, { ordered: false });
      copied += batch.length;
      console.log(`    Inserted ${copied}/${totalDocs}`);
    }
  } finally {
    await cursor.close().catch(() => {});
  }
}

async function copyIndexes(sourceCollection, targetCollection) {
  const indexes = await sourceCollection.indexes();
  const targetIndexes = await targetCollection.indexes();
  const targetIndexNames = new Set(targetIndexes.map((idx) => idx.name));

  for (const index of indexes) {
    if (index.name === "_id_") continue;

    const { key, name, ns, v, background, ...options } = index;

    try {
      if (targetIndexNames.has(name)) {
        console.log(`  - Index "${name}" already exists`);
        continue;
      }

      await targetCollection.createIndex(key, { name, ...options });
      console.log(`  - Created index "${name}"`);
    } catch (err) {
      console.warn(`  - Failed to create index "${name}": ${err.message}`);
    }
  }
}

async function ensureTargetCollection(targetDb, collectionName, collectionInfo) {
  const existingCollections = await targetDb
    .listCollections({ name: collectionName }, { nameOnly: false })
    .toArray();

  if (existingCollections.length > 0) {
    console.log(`  - Target collection "${collectionName}" already exists`);
    return targetDb.collection(collectionName);
  }

  const createOptions = {};

  if (collectionInfo.options) {
    if (collectionInfo.options.validator) {
      createOptions.validator = collectionInfo.options.validator;
    }
    if (collectionInfo.options.validationLevel) {
      createOptions.validationLevel = collectionInfo.options.validationLevel;
    }
    if (collectionInfo.options.validationAction) {
      createOptions.validationAction = collectionInfo.options.validationAction;
    }
    if (collectionInfo.options.timeseries) {
      createOptions.timeseries = collectionInfo.options.timeseries;
    }
    if (collectionInfo.options.expireAfterSeconds != null) {
      createOptions.expireAfterSeconds = collectionInfo.options.expireAfterSeconds;
    }
    if (collectionInfo.options.capped) {
      createOptions.capped = collectionInfo.options.capped;
    }
    if (collectionInfo.options.size != null) {
      createOptions.size = collectionInfo.options.size;
    }
    if (collectionInfo.options.max != null) {
      createOptions.max = collectionInfo.options.max;
    }
  }

  await targetDb.createCollection(collectionName, createOptions);
  console.log(`  - Created target collection "${collectionName}"`);

  return targetDb.collection(collectionName);
}

async function cloneDatabase() {
  const sourceClient = new MongoClient(SOURCE_URI);
  const targetClient = new MongoClient(TARGET_URI);

  try {
    console.log("Connecting to source...");
    await sourceClient.connect();

    console.log("Connecting to target...");
    await targetClient.connect();

    const sourceDb = sourceClient.db(SOURCE_DB_NAME);
    const targetDb = targetClient.db(TARGET_DB_NAME);

    const collections = await sourceDb.listCollections({}, { nameOnly: false }).toArray();

    if (!collections.length) {
      console.log(`No collections found in source database "${SOURCE_DB_NAME}"`);
      return;
    }

    console.log(`Found ${collections.length} collection(s) in "${SOURCE_DB_NAME}"`);

    for (const collectionInfo of collections) {
      const collectionName = collectionInfo.name;

      console.log(`\nCloning collection "${collectionName}"...`);

      const sourceCollection = sourceDb.collection(collectionName);
      const targetCollection = await ensureTargetCollection(targetDb, collectionName, collectionInfo);

      await copyCollectionData(sourceCollection, targetCollection);
      await copyIndexes(sourceCollection, targetCollection);

      console.log(`Finished "${collectionName}"`);
    }

    console.log(`\nClone complete: "${SOURCE_DB_NAME}" -> "${TARGET_DB_NAME}"`);
  } catch (err) {
    console.error("\nClone failed:");
    console.error(err);
    process.exitCode = 1;
  } finally {
    await sourceClient.close().catch(() => {});
    await targetClient.close().catch(() => {});
  }
}

cloneDatabase();
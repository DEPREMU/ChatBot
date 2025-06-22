import { Db } from "mongodb";
import { defaultDatabase, defaultCollection, client } from "./connection.ts";

/**
 * Asynchronously connects to the MongoDB client and returns the specified database instance.
 *
 * @param database - The name of the database to connect to. Defaults to `defaultDatabase` if not provided.
 * @returns A promise that resolves to the MongoDB database instance.
 * @throws Will throw an error if the connection to the database fails.
 */
export const getDatabase = async (database: string = defaultDatabase) => {
  try {
    await client.connect();
    return client.db(database);
  } catch (error) {
    console.error("Error connecting to the database", error);
    throw error;
  }
};

/**
 * Retrieves a MongoDB collection from the specified database. If the collection does not exist, it is created.
 *
 * @param collection - The name of the collection to retrieve. Defaults to `defaultCollection`.
 * @param database - The database instance or the name of the database. Defaults to `defaultDatabase`.
 * @returns A promise that resolves to the requested MongoDB collection.
 * @throws Will throw an error if there is an issue retrieving or creating the collection.
 */
export const getCollection = async (
  collection: string = defaultCollection,
  database: string | Db = defaultDatabase
) => {
  try {
    let db = database as Db;

    if (typeof database === "string") db = await getDatabase(database);

    const collections = await db
      .listCollections({ name: collection })
      .toArray();

    if (collections.length === 0) await db.createCollection(collection);

    return db.collection(collection);
  } catch (error) {
    console.error("Error getting the collection", error);
    throw error;
  }
};

/**
 * Finds documents in a specified MongoDB collection that match the given query.
 *
 * @param collection - The name of the collection to search in. Defaults to `defaultCollection`.
 * @param query - An object representing the MongoDB query to filter documents.
 * @param database - The name of the database to use. Defaults to `defaultDatabase`.
 * @returns A promise that resolves to an array of documents matching the query.
 * @throws Will throw an error if the database or collection cannot be accessed, or if the query fails.
 */
export const findInCollection = async (
  collection: string = defaultCollection,
  query: { [key: string]: any },
  database: string = defaultDatabase
) => {
  try {
    const coll = await getCollection(collection, database);
    const result = await coll.find(query).toArray();
    return result;
  } catch (error) {
    console.error("Error finding in collection", error);
    throw error;
  }
};

/**
 * Retrieves user data from the specified database and collection using the provided UUID.
 *
 * @param uuid - The unique identifier of the user to retrieve.
 * @param db - (Optional) The name of the database to use. Defaults to `defaultDatabase`.
 * @param collection - (Optional) The name of the collection to use. Defaults to `defaultCollection`.
 * @returns A promise that resolves to the user data object if found, or `null` if not found.
 */
export const getUserData = async (
  uuid: string,
  db: string = defaultDatabase,
  collection: string = defaultCollection
) => {
  const database = await getDatabase(db);
  const coll = await getCollection(collection, database);

  const result = await coll.findOne({ uuid });
  return result;
};

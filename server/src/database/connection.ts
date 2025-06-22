import { env } from "../env.ts";
import { MongoClient } from "mongodb";

const uri = env.MONGO_URI;

export const defaultDatabase = "chatbotZaid";
export const defaultCollection = "users";
/**
 * MongoDB client instance used to interact with the database.
 *
 * @remarks
 * This client should be used for all database operations within the application.
 * Make sure to connect and close the client appropriately to manage resources.
 *
 * @public
 */
export const client: MongoClient = new MongoClient(uri);

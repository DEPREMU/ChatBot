import dotenv from "dotenv";
dotenv.config();

export type Env = {
  SECRET_KEY_TO_ENCRYPTION: string;
  API_GOOGLE_MAPS: string;
  SUPABASE_URL: string;
  SUPABASE_KEY: string;
  MONGO_URI: string;
  META_DESCRIPTION: string;
};

/**
 * Environment variables configuration object.
 *
 * @property {string} SECRET_KEY_TO_ENCRYPTION - Secret key used for encryption operations.
 * @property {string} API_GOOGLE_MAPS - API key for accessing Google Maps services.
 * @property {string} SUPABASE_URL - URL endpoint for the Supabase backend.
 * @property {string} SUPABASE_KEY - API key for authenticating with Supabase.
 * @property {string} MONGO_URI - Connection string URI for MongoDB database.
 * @property {string} META_DESCRIPTION - Meta description for SEO or application metadata.
 */
export const env: Env = {
  SECRET_KEY_TO_ENCRYPTION: process.env.SECRET_KEY_TO_ENCRYPTION as string,
  API_GOOGLE_MAPS: process.env.API_GOOGLE_MAPS as string,
  SUPABASE_URL: process.env.SUPABASE_URL as string,
  SUPABASE_KEY: process.env.SUPABASE_KEY as string,
  MONGO_URI: process.env.MONGO_URI as string,
  META_DESCRIPTION: process.env.META_DESCRIPTION as string,
};

if (!Object.values(env).every((value) => value)) {
  throw new Error(
    "One or more environment variables are missing. Please check .env file."
  );
}

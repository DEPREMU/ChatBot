import path from "path";
import { fileURLToPath } from "url";

export const __filename = fileURLToPath(import.meta.url);
export const __dirname = path.dirname(__filename);

/**
 * The base URL for the main server.
 * This URL is used to make requests to the backend server running locally.
 *
 * @constant
 * @type {string}
 */
export const mainUrl: string = "http://localhost:8082";

/**
 * The port number on which the server will listen for incoming connections.
 *
 * @constant
 * @type {number}
 * @default 8080
 */
export const port: number = 8080;

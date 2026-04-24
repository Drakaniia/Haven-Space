/**
 * Appwrite client configuration
 */
import {
  Client,
  Account,
  Databases,
  ID,
  Query,
} from 'https://cdn.jsdelivr.net/npm/appwrite@17.0.2/dist/esm/sdk.js';

const APPWRITE_ENDPOINT = 'https://fra.cloud.appwrite.io/v1';
const APPWRITE_PROJECT_ID = '69eae504002697b6749c';

export const client = new Client().setEndpoint(APPWRITE_ENDPOINT).setProject(APPWRITE_PROJECT_ID);

export const account = new Account(client);
export const databases = new Databases(client);
export { ID, Query };

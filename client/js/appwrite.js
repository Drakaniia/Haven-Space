/**
 * Appwrite client configuration
 * Replace APPWRITE_ENDPOINT and APPWRITE_PROJECT_ID with your actual values.
 */
import { Client, Account, Databases, ID, Query } from 'appwrite';

const APPWRITE_ENDPOINT = 'https://<REGION>.cloud.appwrite.io/v1'; // e.g. https://fra.cloud.appwrite.io/v1
const APPWRITE_PROJECT_ID = '<PROJECT_ID>';

export const client = new Client().setEndpoint(APPWRITE_ENDPOINT).setProject(APPWRITE_PROJECT_ID);

export const account = new Account(client);
export const databases = new Databases(client);
export { ID, Query };

#!/usr/bin/env node
// Generates the two secrets the app needs. Copy them into your .env.
//   APP_ENCRYPTION_KEY — 32-byte base64 key for AES-256-GCM (encrypts the Mistral API key at rest)
//   AUTH_SECRET        — secret used by Auth.js to sign session cookies
import { randomBytes } from "node:crypto";

const appEncryptionKey = randomBytes(32).toString("base64");
const authSecret = randomBytes(32).toString("base64");

console.log("# Add these to your .env (keep them secret, never commit):\n");
console.log(`APP_ENCRYPTION_KEY="${appEncryptionKey}"`);
console.log(`AUTH_SECRET="${authSecret}"`);

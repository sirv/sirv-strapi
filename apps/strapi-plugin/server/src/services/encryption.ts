import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from 'node:crypto';
import type { Core } from '@strapi/strapi';

/**
 * AES-256-GCM encryption for the stored Sirv credentials. The key is derived from Strapi's
 * `APP_KEYS` (server.app.keys) via HKDF-SHA256 - never the raw APP_KEYS, and never a key
 * checked into the repo. Output format (base64): iv(12) | authTag(16) | ciphertext.
 *
 * This is the mechanism behind hard constraint 4: Sirv credentials are persisted encrypted in
 * the plugin store and only ever decrypted server-side.
 */

const ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12;
const TAG_BYTES = 16;
const KEY_BYTES = 32;
const HKDF_INFO = 'sirv-strapi-plugin:token-encryption:v1';

function deriveKey(rootSecret: string): Buffer {
  const derived = hkdfSync(
    'sha256',
    Buffer.from(rootSecret, 'utf8'),
    Buffer.alloc(0),
    Buffer.from(HKDF_INFO, 'utf8'),
    KEY_BYTES,
  );
  return Buffer.from(derived);
}

const service = ({ strapi }: { strapi: Core.Strapi }) => {
  /** The HKDF input key material: Strapi's APP_KEYS, joined when it is an array. */
  function rootSecret(): string {
    const keys = strapi.config.get('server.app.keys') as unknown;
    const secret = Array.isArray(keys) ? keys.join('|') : typeof keys === 'string' ? keys : '';
    if (!secret) {
      throw new Error(
        'Cannot encrypt Sirv credentials: server.app.keys (APP_KEYS) is not configured.',
      );
    }
    return secret;
  }

  return {
    encrypt(plaintext: string): string {
      const key = deriveKey(rootSecret());
      const iv = randomBytes(IV_BYTES);
      const cipher = createCipheriv(ALGORITHM, key, iv);
      const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
      const tag = cipher.getAuthTag();
      return Buffer.concat([iv, tag, ciphertext]).toString('base64');
    },

    decrypt(payload: string): string {
      const buf = Buffer.from(payload, 'base64');
      const iv = buf.subarray(0, IV_BYTES);
      const tag = buf.subarray(IV_BYTES, IV_BYTES + TAG_BYTES);
      const ciphertext = buf.subarray(IV_BYTES + TAG_BYTES);
      const key = deriveKey(rootSecret());
      const decipher = createDecipheriv(ALGORITHM, key, iv);
      decipher.setAuthTag(tag);
      return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
    },
  };
};

export default service;

import crypto from 'crypto';
import "dotenv/config";

const ALGO = 'aes-256-gcm';
const IV_LEN = 16;
const SALT_LEN = 32;
const ITERATIONS = 100000;
const KEY_LEN = 32;

// Derive key from password using PBKDF2
function getKey(password) {
  const salt = crypto.createHash('sha256').update(password).digest();
  return crypto.pbkdf2Sync(password, salt, ITERATIONS, KEY_LEN, 'sha256');
}

// Encrypt text with AES-256-GCM
export function encrypt(text) {
  let secret = process.env.MASTER_KEY;
  if (!secret) 
    // throw new Error('MASTER_KEY not set');
  return;
  
  // Remove quotes if present
  secret = secret.replace(/^['"]|['"]$/g, '');
  
  const key = getKey(secret);
  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  
  let encrypted = cipher.update(String(text), 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const tag = cipher.getAuthTag();
  
  return iv.toString('hex') + ':' + tag.toString('hex') + ':' + encrypted;
}

// Decrypt text with AES-256-GCM
export function decrypt(payload) {
  let secret = process.env.MASTER_KEY;
  if (!secret) return;
    // throw new Error('MASTER_KEY not set'); 
  
  // Remove quotes if present
  secret = secret.replace(/^['"]|['"]$/g, '');
  
  const key = getKey(secret);
  const parts = String(payload).split(':');
  
  if (parts.length !== 3) return null;
  
  const iv = Buffer.from(parts[0], 'hex');
  const tag = Buffer.from(parts[1], 'hex');
  const encrypted = Buffer.from(parts[2], 'hex');
  
  const decipher = crypto.createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  
  let decrypted = decipher.update(encrypted, null, 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

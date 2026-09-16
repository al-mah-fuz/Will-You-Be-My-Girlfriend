import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { Invitation, PublicInvitation, CreateInvitationInput } from '../src/types.js';

// In-memory cache for fast lookups and atomic checks
const invitationsMap = new Map<string, Invitation>();
let isInitialized = false;

// Determine writable directory for file-based persistence
function resolveWritableDataDir(): string {
  // If explicitly overridden in environment
  if (process.env.DATA_DIR && process.env.DATA_DIR.trim()) {
    return process.env.DATA_DIR.trim();
  }

  // Vercel and AWS Lambda serverless runtimes have a read-only root (/var/task)
  // The only writable filesystem partition is os.tmpdir() (/tmp)
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    return path.join(os.tmpdir(), 'girlfriend_app_data');
  }

  // Check if process.cwd()/data is writable
  const localDir = path.join(process.cwd(), 'data');
  try {
    if (!fs.existsSync(localDir)) {
      fs.mkdirSync(localDir, { recursive: true });
    }
    const testFile = path.join(localDir, `.test_write_${Date.now()}`);
    fs.writeFileSync(testFile, 'ok', 'utf-8');
    fs.unlinkSync(testFile);
    return localDir;
  } catch {
    // If not writable (e.g. read-only container), fallback to /tmp
    return path.join(os.tmpdir(), 'girlfriend_app_data');
  }
}

const WRITABLE_DATA_DIR = resolveWritableDataDir();
const DB_FILE = path.join(WRITABLE_DATA_DIR, 'invitations.json');

// Upstash / Vercel KV REST configuration (optional for persistent cross-instance storage in Vercel)
interface KvConfig {
  url: string;
  token: string;
}

function getKvConfig(): KvConfig | null {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (url && token) {
    return { url: url.replace(/\/$/, ''), token };
  }
  return null;
}

// Generate clean, URL-friendly invitation IDs (e.g. Ab7k92)
const ID_CHARS = '23456789abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ';
export function generateUniqueId(length = 6): string {
  let id = '';
  const bytes = crypto.randomBytes(length);
  for (let i = 0; i < length; i++) {
    id += ID_CHARS[bytes[i] % ID_CHARS.length];
  }
  return id;
}

/**
 * Normalizes any raw invitation object (from disk, JSON, KV, or legacy formats)
 * Handles both camelCase and snake_case properties, null/undefined messages, and preserves timestamps.
 */
export function normalizeInvitationRecord(raw: any): Invitation | null {
  if (!raw || typeof raw !== 'object') return null;
  const id = raw.id || raw.invitationId || raw.invitation_id;
  if (!id || typeof id !== 'string') return null;

  // Handle all possible variations of field names for the personal message
  const rawMsg =
    raw.personalMessage ??
    raw.personal_message ??
    raw.message ??
    raw.customMessage ??
    raw.custom_message;

  const personalMessage =
    typeof rawMsg === 'string' && rawMsg.trim().length > 0 ? rawMsg.trim() : undefined;

  return {
    id: id.trim(),
    creatorName: (raw.creatorName || raw.creator_name || 'Someone').trim(),
    recipientName: (raw.recipientName || raw.recipient_name || 'My Special Someone').trim(),
    creatorEmail: (raw.creatorEmail || raw.creator_email || '').trim().toLowerCase(),
    personalMessage,
    responseStatus:
      raw.responseStatus === 'accepted' || raw.response_status === 'accepted'
        ? 'accepted'
        : 'pending',
    createdAt: raw.createdAt || raw.created_at || new Date().toISOString(),
    respondedAt: raw.respondedAt || raw.responded_at || null,
  };
}

export function toPublicInvitation(inv: Invitation): PublicInvitation {
  return {
    id: inv.id,
    creatorName: inv.creatorName,
    recipientName: inv.recipientName,
    personalMessage: inv.personalMessage,
    responseStatus: inv.responseStatus,
    createdAt: inv.createdAt,
    respondedAt: inv.respondedAt,
  };
}

/**
 * Reads from disk file and populates in-memory cache
 */
function loadDiskFileIntoCache(filePath: string): number {
  if (!fs.existsSync(filePath)) return 0;
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    if (!raw.trim()) return 0;
    const parsed = JSON.parse(raw);
    let loadedCount = 0;
    if (Array.isArray(parsed)) {
      for (const item of parsed) {
        const normalized = normalizeInvitationRecord(item);
        if (normalized) {
          invitationsMap.set(normalized.id, normalized);
          loadedCount++;
        }
      }
    }
    return loadedCount;
  } catch (err) {
    console.warn(`Could not read invitations from ${filePath}:`, err);
    return 0;
  }
}

/**
 * Initialize persistent database
 * Loads existing data from bundled seed files or writable disk
 */
export async function initDb(): Promise<void> {
  if (isInitialized) return;

  try {
    // 1. Try reading pre-bundled data if available in process.cwd()/data/invitations.json
    const bundledPath = path.join(process.cwd(), 'data', 'invitations.json');
    loadDiskFileIntoCache(bundledPath);

    // 2. Ensure writable data dir exists
    if (!fs.existsSync(WRITABLE_DATA_DIR)) {
      fs.mkdirSync(WRITABLE_DATA_DIR, { recursive: true });
    }

    // 3. Read existing data from writable disk DB_FILE
    if (fs.existsSync(DB_FILE)) {
      loadDiskFileIntoCache(DB_FILE);
    } else {
      // Create initial empty file if possible
      try {
        fs.writeFileSync(DB_FILE, JSON.stringify(Array.from(invitationsMap.values()), null, 2), 'utf-8');
      } catch {
        // Non-fatal if filesystem prevents initial write
      }
    }
  } catch (err) {
    console.error('Warning initializing database file storage:', err);
  }

  isInitialized = true;
}

/**
 * Atomically persist all invitations to disk (both writable dir and local data dir if available)
 */
async function persistToDisk(): Promise<void> {
  try {
    if (!fs.existsSync(WRITABLE_DATA_DIR)) {
      fs.mkdirSync(WRITABLE_DATA_DIR, { recursive: true });
    }
    const all = Array.from(invitationsMap.values());
    const tempFile = `${DB_FILE}.${Date.now()}.${crypto.randomBytes(4).toString('hex')}.tmp`;
    await fs.promises.writeFile(tempFile, JSON.stringify(all, null, 2), 'utf-8');
    await fs.promises.rename(tempFile, DB_FILE);
  } catch (err) {
    console.warn('Could not write database to DB_FILE (continuing with memory):', err);
  }

  // Also sync to process.cwd()/data/invitations.json if that directory exists
  try {
    const localDir = path.join(process.cwd(), 'data');
    const localFile = path.join(localDir, 'invitations.json');
    if (localFile !== DB_FILE && fs.existsSync(localDir)) {
      const all = Array.from(invitationsMap.values());
      await fs.promises.writeFile(localFile, JSON.stringify(all, null, 2), 'utf-8');
    }
  } catch {
    // Non-fatal if local directory is read-only in production
  }
}

/**
 * Sync single invitation to Upstash / Vercel KV if configured
 * Uses standard Redis REST command format ["SET", key, value]
 */
async function syncToKv(invitation: Invitation): Promise<void> {
  const kv = getKvConfig();
  if (!kv) return;

  try {
    await fetch(kv.url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${kv.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(['SET', `invite:${invitation.id}`, JSON.stringify(invitation)]),
    });
  } catch (err) {
    console.warn('Failed to sync invitation to Cloud KV:', err);
  }
}

/**
 * Fetch invitation from Upstash / Vercel KV if configured
 */
async function fetchFromKv(id: string): Promise<Invitation | null> {
  const kv = getKvConfig();
  if (!kv) return null;

  try {
    const res = await fetch(kv.url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${kv.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(['GET', `invite:${id}`]),
    });
    if (!res.ok) return null;
    const json = await res.json();
    if (json && json.result) {
      const parsed: any = typeof json.result === 'string' ? JSON.parse(json.result) : json.result;
      const normalized = normalizeInvitationRecord(parsed);
      if (normalized && normalized.id) {
        invitationsMap.set(normalized.id, normalized);
        return normalized;
      }
    }
  } catch (err) {
    console.warn('Failed to fetch invitation from Cloud KV:', err);
  }
  return null;
}

/**
 * Helper to re-read files if an invitation is not currently in memory.
 * Essential for multi-process or serverless environments.
 */
function lookupOnDisk(id: string): Invitation | null {
  // Check writable DB_FILE
  loadDiskFileIntoCache(DB_FILE);
  if (invitationsMap.has(id)) {
    return invitationsMap.get(id)!;
  }

  // Check bundled path
  const bundledPath = path.join(process.cwd(), 'data', 'invitations.json');
  if (bundledPath !== DB_FILE) {
    loadDiskFileIntoCache(bundledPath);
    if (invitationsMap.has(id)) {
      return invitationsMap.get(id)!;
    }
  }

  // Check case-insensitive
  const lowerId = id.toLowerCase();
  for (const [key, value] of invitationsMap.entries()) {
    if (key.toLowerCase() === lowerId) {
      return value;
    }
  }

  return null;
}

/**
 * Create a new invitation
 */
export async function createInvitation(input: CreateInvitationInput): Promise<Invitation> {
  await initDb();

  // Generate an ID that does not collide
  let id = generateUniqueId(6);
  while (invitationsMap.has(id)) {
    id = generateUniqueId(7);
  }

  const rawMsg = input.personalMessage;
  const personalMessage =
    typeof rawMsg === 'string' && rawMsg.trim().length > 0 ? rawMsg.trim() : undefined;

  const invitation: Invitation = {
    id,
    creatorName: input.creatorName.trim(),
    recipientName: input.recipientName.trim(),
    creatorEmail: input.creatorEmail.trim().toLowerCase(),
    personalMessage,
    responseStatus: 'pending',
    createdAt: new Date().toISOString(),
    respondedAt: null,
  };

  invitationsMap.set(id, invitation);

  // Persist locally & cloud KV
  await persistToDisk();
  await syncToKv(invitation);

  return invitation;
}

/**
 * Retrieve invitation by ID
 * Checks memory, disk (re-reads to catch out-of-process writes), and Cloud KV
 */
export async function getInvitation(id: string): Promise<Invitation | null> {
  if (!id || typeof id !== 'string') return null;
  const cleanId = id.trim();
  await initDb();

  // 1. Check in-memory cache first (exact match)
  let cached = invitationsMap.get(cleanId);
  if (cached) return cached;

  // 2. Check in-memory cache (case-insensitive fallback)
  const lowerCleanId = cleanId.toLowerCase();
  for (const [key, val] of invitationsMap.entries()) {
    if (key.toLowerCase() === lowerCleanId) {
      return val;
    }
  }

  // 3. Re-read disk files to catch changes made by other processes or workers
  const fromDisk = lookupOnDisk(cleanId);
  if (fromDisk) return fromDisk;

  // 4. Check Cloud KV if available (e.g. multi-region Vercel functions)
  const fromKv = await fetchFromKv(cleanId);
  if (fromKv) return fromKv;

  return null;
}

/**
 * Public representation for recipient display
 */
export async function getPublicInvitation(id: string): Promise<PublicInvitation | null> {
  const inv = await getInvitation(id);
  if (!inv) return null;
  return toPublicInvitation(inv);
}

/**
 * Accept invitation and record response
 */
export async function acceptInvitation(id: string): Promise<{
  success: boolean;
  alreadyAccepted?: boolean;
  invitation?: Invitation;
}> {
  await initDb();
  const inv = await getInvitation(id);

  if (!inv) {
    return { success: false };
  }

  if (inv.responseStatus === 'accepted') {
    return {
      success: false,
      alreadyAccepted: true,
      invitation: inv,
    };
  }

  inv.responseStatus = 'accepted';
  inv.respondedAt = new Date().toISOString();

  invitationsMap.set(inv.id, inv);

  await persistToDisk();
  await syncToKv(inv);

  return {
    success: true,
    invitation: inv,
  };
}

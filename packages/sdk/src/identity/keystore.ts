/**
 * Abstract keystore interface.
 *
 * Consumers provide their own storage backend (filesystem,
 * database, HSM, etc.). The SDK provides an in-memory
 * implementation for testing.
 */

export interface KeyPair {
  publicKey: Uint8Array;
  privateKey: Uint8Array;
}

export interface Keystore {
  /** Generate a new Ed25519 key pair and store it under the given ID */
  generateKey(keyId: string): Promise<KeyPair>;

  /** Retrieve a key pair by ID */
  getKey(keyId: string): Promise<KeyPair | null>;

  /** Sign data with the private key identified by keyId */
  sign(keyId: string, data: Uint8Array): Promise<Uint8Array>;

  /** Verify a signature against a public key */
  verify(publicKey: Uint8Array, data: Uint8Array, signature: Uint8Array): Promise<boolean>;

  /** List all key IDs */
  listKeys(): Promise<string[]>;

  /** Delete a key pair */
  deleteKey(keyId: string): Promise<void>;
}

/**
 * In-memory keystore for testing.
 */
export class MemoryKeystore implements Keystore {
  private keys = new Map<string, KeyPair>();

  async generateKey(keyId: string): Promise<KeyPair> {
    const ed = await import("@noble/ed25519");
    const privateKey = ed.utils.randomPrivateKey();
    const publicKey = ed.getPublicKey(privateKey);
    const pair = { publicKey, privateKey };
    this.keys.set(keyId, pair);
    return pair;
  }

  async getKey(keyId: string): Promise<KeyPair | null> {
    return this.keys.get(keyId) ?? null;
  }

  async sign(keyId: string, data: Uint8Array): Promise<Uint8Array> {
    const key = this.keys.get(keyId);
    if (!key) throw new Error(`Key not found: ${keyId}`);
    const ed = await import("@noble/ed25519");
    return ed.sign(data, key.privateKey);
  }

  async verify(
    publicKey: Uint8Array,
    data: Uint8Array,
    signature: Uint8Array,
  ): Promise<boolean> {
    const ed = await import("@noble/ed25519");
    return ed.verify(signature, data, publicKey);
  }

  async listKeys(): Promise<string[]> {
    return Array.from(this.keys.keys());
  }

  async deleteKey(keyId: string): Promise<void> {
    this.keys.delete(keyId);
  }
}

/**
 * Consent management — OAuth scope mapping and validation.
 *
 * Maps OAuth scopes to a "permission manifest" the user
 * can review/approve.
 */

export interface ConsentGrant {
  scopes: string[];
  audience: string;
  grantedAt: Date;
  expiresAt?: Date;
  grantedBy: string;
}

/**
 * Consent manager — tracks granted OAuth scopes per audience.
 */
export class ConsentManager {
  private grants = new Map<string, ConsentGrant>();

  /**
   * Grant consent for specific scopes.
   */
  grant(params: {
    audience: string;
    scopes: string[];
    grantedBy: string;
    expiresInSeconds?: number;
  }): ConsentGrant {
    const key = `${params.audience}:${params.grantedBy}`;
    const existing = this.grants.get(key);

    const grant: ConsentGrant = {
      scopes: existing ? [...new Set([...existing.scopes, ...params.scopes])] : params.scopes,
      audience: params.audience,
      grantedAt: new Date(),
      expiresAt: params.expiresInSeconds
        ? new Date(Date.now() + params.expiresInSeconds * 1000)
        : undefined,
      grantedBy: params.grantedBy,
    };

    this.grants.set(key, grant);
    return grant;
  }

  /**
   * Check if specific scopes are granted for an audience.
   */
  hasConsent(audience: string, scopes: string[], grantedBy: string): boolean {
    const key = `${audience}:${grantedBy}`;
    const grant = this.grants.get(key);
    if (!grant) return false;

    // Check expiration
    if (grant.expiresAt && grant.expiresAt.getTime() < Date.now()) {
      this.grants.delete(key);
      return false;
    }

    return scopes.every((s) => grant.scopes.includes(s));
  }

  /**
   * Revoke consent for an audience.
   */
  revoke(audience: string, grantedBy: string): void {
    this.grants.delete(`${audience}:${grantedBy}`);
  }

  /**
   * List all active grants.
   */
  listGrants(): ConsentGrant[] {
    const now = Date.now();
    const active: ConsentGrant[] = [];

    for (const [key, grant] of this.grants) {
      if (grant.expiresAt && grant.expiresAt.getTime() < now) {
        this.grants.delete(key);
      } else {
        active.push(grant);
      }
    }

    return active;
  }
}

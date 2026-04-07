import { describe, it, expect } from "vitest";
import { createPoWStamp, verifyPoWStamp } from "./pow.js";

describe("PoW stamp", () => {
  it("creates and verifies a valid stamp", () => {
    const stamp = createPoWStamp({ difficulty: 8, challenge: "test-challenge" });

    expect(stamp.difficulty).toBe(8);
    expect(stamp.nonce).toBeTruthy();
    expect(stamp.hash).toBeTruthy();

    const result = verifyPoWStamp(stamp);
    expect(result.valid).toBe(true);
    expect(result.type).toBe("pow");
  });

  it("rejects tampered hash", () => {
    const stamp = createPoWStamp({ difficulty: 8, challenge: "test" });

    const tampered = { ...stamp, hash: "ffffffffffffffff" };
    const result = verifyPoWStamp(tampered);
    expect(result.valid).toBe(false);
    expect(result.reason).toContain("mismatch");
  });

  it("rejects insufficient difficulty", () => {
    const stamp = createPoWStamp({ difficulty: 8, challenge: "test" });

    const result = verifyPoWStamp(stamp, 16);
    expect(result.valid).toBe(false);
    expect(result.reason).toContain("below minimum");
  });

  it("throws on impossible difficulty within iteration limit", () => {
    expect(() =>
      createPoWStamp({
        difficulty: 64,
        challenge: "impossible",
        maxIterations: 100,
      }),
    ).toThrow("Failed to find PoW solution");
  });
});

import { describe, expect, it } from "vitest";
import { validateProfile } from "./validate";

const valid = {
    schema: "gmk67-profile", schemaVersion: 1, name: "Test", createdAt: "2026-09-10T00:00:00.000Z",
    device: { adapter: "gmk67-v2", vendorId: 0x36b0, productId: 0x3068, matrixRows: 1, matrixCols: 2, viaProtocolVersion: 8 },
    keymap: { layerCount: 1, layers: [[1, 2]] },
};

describe("profile validation", () => {
    it("rejects layers with the wrong matrix size", () => {
        expect(() => validateProfile({ ...valid, keymap: { layerCount: 1, layers: [[1]] } })).toThrow("exactly 2 values");
    });
});

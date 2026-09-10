import { describe, expect, it } from "vitest";
import { bytesToU16Array, u16ArrayToBytes } from "./byte-utils";
import { createViaPacket } from "./packet";

describe("VIA packet helpers", () => {
    it("builds a 32-byte payload and preserves big-endian keycodes", () => {
        const packet = createViaPacket(0x12, Uint8Array.of(0, 4, 2));
        expect(packet).toHaveLength(32);
        expect([...packet.slice(0, 4)]).toEqual([0x12, 0, 4, 2]);
        expect(bytesToU16Array(u16ArrayToBytes([0x0000, 0x1234, 0xffff]))).toEqual([0x0000, 0x1234, 0xffff]);
    });
});

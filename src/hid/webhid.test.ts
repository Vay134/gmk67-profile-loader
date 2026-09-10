import { describe, expect, it } from "vitest";
import { isViaRawHidDevice, viaReportId } from "./webhid";

describe("VIA Raw HID collection detection", () => {
    it("recognizes the default Raw HID usage nested in a collection", () => {
        const device = { collections: [{ children: [{ usagePage: 0xff60, usage: 0x61 }] }] } as HIDDevice;
        expect(isViaRawHidDevice(device)).toBe(true);
    });

    it("uses the 32-byte output report instead of assuming report ID zero", () => {
        const device = {
            collections: [{ outputReports: [{ reportId: 1, items: [{ reportSize: 8, reportCount: 32 }] }] }],
        } as HIDDevice;
        expect(viaReportId(device)).toBe(1);
    });
});

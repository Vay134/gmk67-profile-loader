import { ViaCommandQueue } from "./command-queue";
import { createViaPacket, hasPrefix } from "./packet";

const RAW_USAGE_PAGE = 0xff60;
const RAW_USAGE = 0x61;

export class HidProtocolError extends Error {}
export class HidTimeoutError extends Error {}

export function webHidSupported(): boolean {
    return "hid" in navigator && typeof navigator.hid?.requestDevice === "function";
}

function collectionMatches(collection: HIDCollectionInfo): boolean {
    return (collection.usagePage === RAW_USAGE_PAGE && collection.usage === RAW_USAGE) ||
        collection.children?.some(collectionMatches) === true;
}

export function isViaRawHidDevice(device: HIDDevice): boolean {
    return device.collections.some(collectionMatches);
}

function collectionsOf(collection: HIDCollectionInfo): HIDCollectionInfo[] {
    return [collection, ...(collection.children?.flatMap(collectionsOf) ?? [])];
}

function reportLength(report: HIDReportInfo): number {
    return report.items?.reduce((bits, item) => bits + (item.reportSize ?? 0) * (item.reportCount ?? 0), 0) ?? 0;
}

export function viaReportId(device: HIDDevice): number {
    const reports = device.collections.flatMap(collectionsOf).flatMap((collection) => collection.outputReports ?? []);
    return reports.find((report) => reportLength(report) >= 32 * 8)?.reportId ?? 0;
}

export class WebHidTransport {
    private readonly queue = new ViaCommandQueue();
    private readonly reportId: number;

    constructor(readonly device: HIDDevice) {
        this.reportId = viaReportId(device);
    }

    async open(): Promise<void> {
        // Protocol response validates VIA; collection usage and report IDs vary by firmware.
        if (!this.device.opened) await this.device.open();
    }

    async command(command: number, args = new Uint8Array(), timeoutMs = 1500): Promise<Uint8Array> {
        return this.queue.enqueue(async () => {
            if (!this.device.opened) throw new HidProtocolError("Keyboard is not connected.");
            const expected = Uint8Array.from([command, ...args]);
            return new Promise<Uint8Array>((resolve, reject) => {
                const onReport = (event: HIDInputReportEvent): void => {
                    if (event.reportId !== this.reportId) return;
                    const response = new Uint8Array(event.data.buffer, event.data.byteOffset, event.data.byteLength);
                    if (!hasPrefix(response, expected)) return;
                    cleanup();
                    resolve(response);
                };
                const timer = window.setTimeout(() => {
                    cleanup();
                    reject(new HidTimeoutError(`No response to VIA command 0x${command.toString(16)}.`));
                }, timeoutMs);
                const cleanup = (): void => {
                    window.clearTimeout(timer);
                    this.device.removeEventListener("inputreport", onReport);
                };
                this.device.addEventListener("inputreport", onReport);
                const packet = createViaPacket(command, args);
                const payload = packet.buffer.slice(packet.byteOffset, packet.byteOffset + packet.byteLength) as ArrayBuffer;
                void this.device.sendReport(this.reportId, payload).catch((error: unknown) => {
                    cleanup();
                    reject(error instanceof Error ? error : new Error(String(error)));
                });
            });
        });
    }

    async close(): Promise<void> {
        this.queue.cancelPending(new HidProtocolError("Keyboard connection closed."));
        if (this.device.opened) await this.device.close();
    }
}

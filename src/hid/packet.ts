import { VIA_REPORT_LENGTH } from "./via-commands";

export function createViaPacket(command: number, args = new Uint8Array()): Uint8Array {
    if (!Number.isInteger(command) || command < 0 || command > 0xff) {
        throw new RangeError("VIA command must be a byte.");
    }
    if (args.length > VIA_REPORT_LENGTH - 1) {
        throw new RangeError("VIA command arguments exceed one report.");
    }
    const packet = new Uint8Array(VIA_REPORT_LENGTH);
    packet[0] = command;
    packet.set(args, 1);
    return packet;
}

export function hasPrefix(data: Uint8Array, prefix: Uint8Array): boolean {
    return prefix.every((value, index) => data[index] === value);
}

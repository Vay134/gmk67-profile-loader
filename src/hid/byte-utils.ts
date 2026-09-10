export function u16ToBigEndian(value: number): [number, number] {
    if (!Number.isInteger(value) || value < 0 || value > 0xffff) {
        throw new RangeError("Expected a 16-bit unsigned integer.");
    }
    return [(value >>> 8) & 0xff, value & 0xff];
}

export function u16FromBigEndian(hi: number, lo: number): number {
    return ((hi & 0xff) << 8) | (lo & 0xff);
}

export function u16ArrayToBytes(values: readonly number[]): Uint8Array {
    return Uint8Array.from(values.flatMap(u16ToBigEndian));
}

export function bytesToU16Array(bytes: Uint8Array): number[] {
    if (bytes.length % 2 !== 0) {
        throw new Error("A 16-bit byte buffer must have an even length.");
    }
    const values: number[] = [];
    for (let index = 0; index < bytes.length; index += 2) {
        values.push(u16FromBigEndian(bytes[index], bytes[index + 1]));
    }
    return values;
}

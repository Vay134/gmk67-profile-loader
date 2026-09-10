import { bytesToU16Array, u16ArrayToBytes, u16FromBigEndian, u16ToBigEndian } from "./byte-utils";
import { VIA_CHUNK_SIZE, VIA_COMMAND } from "./via-commands";
import type { WebHidTransport } from "./webhid";

export class ViaClient {
    constructor(private readonly transport: WebHidTransport) {}

    async getProtocolVersion(): Promise<number> {
        const response = await this.transport.command(VIA_COMMAND.GET_PROTOCOL_VERSION);
        return u16FromBigEndian(response[1], response[2]);
    }

    async getLayerCount(): Promise<number> {
        const response = await this.transport.command(VIA_COMMAND.DYNAMIC_KEYMAP_GET_LAYER_COUNT);
        return response[1];
    }

    async getKey(layer: number, row: number, col: number): Promise<number> {
        const response = await this.transport.command(VIA_COMMAND.DYNAMIC_KEYMAP_GET_KEYCODE, Uint8Array.of(layer, row, col));
        return u16FromBigEndian(response[4], response[5]);
    }

    async readKeymapBuffer(offset: number, size: number): Promise<Uint8Array> {
        if (size < 1 || size > VIA_CHUNK_SIZE) throw new RangeError(`Keymap reads must be 1-${VIA_CHUNK_SIZE} bytes.`);
        const response = await this.transport.command(VIA_COMMAND.DYNAMIC_KEYMAP_GET_BUFFER, Uint8Array.of(...u16ToBigEndian(offset), size));
        return response.slice(4, 4 + size);
    }

    async writeKeymapBuffer(offset: number, data: Uint8Array): Promise<void> {
        if (data.length < 1 || data.length > VIA_CHUNK_SIZE) throw new RangeError(`Keymap writes must be 1-${VIA_CHUNK_SIZE} bytes.`);
        await this.transport.command(VIA_COMMAND.DYNAMIC_KEYMAP_SET_BUFFER, Uint8Array.of(...u16ToBigEndian(offset), data.length, ...data));
    }

    async readKeymap(layerCount: number, rows: number, cols: number): Promise<number[][]> {
        const layerBytes = rows * cols * 2;
        const layers: number[][] = [];
        for (let layer = 0; layer < layerCount; layer += 1) {
            const bytes = new Uint8Array(layerBytes);
            for (let offset = 0; offset < layerBytes; offset += VIA_CHUNK_SIZE) {
                const size = Math.min(VIA_CHUNK_SIZE, layerBytes - offset);
                bytes.set(await this.readKeymapBuffer(layer * layerBytes + offset, size), offset);
            }
            layers.push(bytesToU16Array(bytes));
        }
        return layers;
    }

    async writeKeymap(layers: readonly number[][]): Promise<void> {
        const data = u16ArrayToBytes(layers.flat());
        for (let offset = 0; offset < data.length; offset += VIA_CHUNK_SIZE) {
            await this.writeKeymapBuffer(offset, data.slice(offset, offset + VIA_CHUNK_SIZE));
        }
    }
}

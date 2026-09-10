import { GMK67_V2 } from "../hid/via-commands";

export interface DeviceCapabilities {
    vendorId: number;
    productId: number;
    productName?: string;
    viaProtocolVersion: number;
    matrix: { rows: number; cols: number };
    layerCount: number;
}

export function isGmk67V2(device: HIDDevice): boolean {
    return device.vendorId === GMK67_V2.vendorId && device.productId === GMK67_V2.productId;
}

export function formatDeviceId(value: number): string {
    return `0x${value.toString(16).padStart(4, "0").toUpperCase()}`;
}

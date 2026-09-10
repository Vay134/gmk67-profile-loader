export interface Gmk67ProfileV1 {
    schema: "gmk67-profile";
    schemaVersion: 1;
    name: string;
    description?: string;
    createdAt: string;
    device: {
        adapter: "gmk67-v2";
        vendorId: number;
        productId: number;
        matrixRows: number;
        matrixCols: number;
        viaProtocolVersion: number;
    };
    keymap: { layerCount: number; layers: number[][] };
    macros?: { supported: boolean; count?: number; bufferSize?: number; bytes?: number[] };
    encoders?: {
        supported: boolean;
        items?: Array<{ id: number; layers: Array<{ counterClockwise: number; clockwise: number }> }>;
    };
    lighting?: { supported: boolean; brightness?: number; effect?: number; speed?: number; hue?: number; saturation?: number };
    metadata?: { capturedBy?: string; appVersion?: string; notes?: string };
}

export interface ProfileManifestEntry {
    id: string;
    name: string;
    file: string;
    description?: string;
}

export interface ProfileManifest { profiles: ProfileManifestEntry[] }

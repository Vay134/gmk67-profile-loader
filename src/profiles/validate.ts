import type { Gmk67ProfileV1, ProfileManifest } from "./schema";

const MAX_PROFILE_SIZE = 1024 * 1024;
const MAX_LAYERS = 16;
const MAX_MACRO_BYTES = 64 * 1024;
type RecordValue = Record<string, unknown>;

export class ProfileValidationError extends Error {}

function object(value: unknown, label: string): RecordValue {
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new ProfileValidationError(`${label} must be an object.`);
    return value as RecordValue;
}

function string(value: unknown, label: string, max = 500): string {
    if (typeof value !== "string" || !value.trim() || value.length > max) throw new ProfileValidationError(`${label} must be a non-empty string.`);
    return value;
}

function optionalString(value: unknown, label: string, max = 2000): string | undefined {
    if (value === undefined) return undefined;
    return string(value, label, max);
}

function integer(value: unknown, label: string, min: number, max: number): number {
    if (!Number.isInteger(value) || (value as number) < min || (value as number) > max) throw new ProfileValidationError(`${label} must be an integer from ${min} to ${max}.`);
    return value as number;
}

function bool(value: unknown, label: string): boolean {
    if (typeof value !== "boolean") throw new ProfileValidationError(`${label} must be true or false.`);
    return value;
}

function integers(value: unknown, label: string, maxLength: number, maxValue: number): number[] {
    if (!Array.isArray(value) || value.length > maxLength) throw new ProfileValidationError(`${label} has an invalid length.`);
    return value.map((item, index) => integer(item, `${label}[${index}]`, 0, maxValue));
}

function optionalObject(value: unknown, label: string): RecordValue | undefined {
    return value === undefined ? undefined : object(value, label);
}

export function validateProfile(input: unknown): Gmk67ProfileV1 {
    const root = object(input, "Profile");
    if (root.schema !== "gmk67-profile") throw new ProfileValidationError("This is not a GMK67 profile.");
    if (root.schemaVersion !== 1) throw new ProfileValidationError(`This profile uses format version ${String(root.schemaVersion)}, but this app supports version 1.`);

    const device = object(root.device, "device");
    if (device.adapter !== "gmk67-v2") throw new ProfileValidationError("This profile is not for the GMK67 V2 adapter.");
    const rows = integer(device.matrixRows, "device.matrixRows", 1, 32);
    const cols = integer(device.matrixCols, "device.matrixCols", 1, 32);
    const keymap = object(root.keymap, "keymap");
    const layerCount = integer(keymap.layerCount, "keymap.layerCount", 1, MAX_LAYERS);
    if (!Array.isArray(keymap.layers) || keymap.layers.length !== layerCount) throw new ProfileValidationError("keymap.layers must contain every layer.");
    const layers = keymap.layers.map((layer, index) => {
        const values = integers(layer, `keymap.layers[${index}]`, rows * cols, 0xffff);
        if (values.length !== rows * cols) throw new ProfileValidationError(`keymap.layers[${index}] must have exactly ${rows * cols} values.`);
        return values;
    });

    const macros = optionalObject(root.macros, "macros");
    const encoders = optionalObject(root.encoders, "encoders");
    const lighting = optionalObject(root.lighting, "lighting");
    const metadata = optionalObject(root.metadata, "metadata");

    return {
        schema: "gmk67-profile",
        schemaVersion: 1,
        name: string(root.name, "name", 120),
        description: optionalString(root.description, "description"),
        createdAt: string(root.createdAt, "createdAt", 50),
        device: {
            adapter: "gmk67-v2",
            vendorId: integer(device.vendorId, "device.vendorId", 0, 0xffff),
            productId: integer(device.productId, "device.productId", 0, 0xffff),
            matrixRows: rows,
            matrixCols: cols,
            viaProtocolVersion: integer(device.viaProtocolVersion, "device.viaProtocolVersion", 0, 0xffff),
        },
        keymap: { layerCount, layers },
        macros: macros ? {
            supported: bool(macros.supported, "macros.supported"),
            count: macros.count === undefined ? undefined : integer(macros.count, "macros.count", 0, 255),
            bufferSize: macros.bufferSize === undefined ? undefined : integer(macros.bufferSize, "macros.bufferSize", 0, MAX_MACRO_BYTES),
            bytes: macros.bytes === undefined ? undefined : integers(macros.bytes, "macros.bytes", MAX_MACRO_BYTES, 0xff),
        } : undefined,
        encoders: encoders ? validateEncoders(encoders, layerCount) : undefined,
        lighting: lighting ? validateLighting(lighting) : undefined,
        metadata: metadata ? {
            capturedBy: optionalString(metadata.capturedBy, "metadata.capturedBy"),
            appVersion: optionalString(metadata.appVersion, "metadata.appVersion"),
            notes: optionalString(metadata.notes, "metadata.notes"),
        } : undefined,
    };
}

function validateEncoders(value: RecordValue, layerCount: number): Gmk67ProfileV1["encoders"] {
    const supported = bool(value.supported, "encoders.supported");
    if (value.items === undefined) return { supported };
    if (!Array.isArray(value.items) || value.items.length > 8) throw new ProfileValidationError("encoders.items has an invalid length.");
    return {
        supported,
        items: value.items.map((item, index) => {
            const encoder = object(item, `encoders.items[${index}]`);
            if (!Array.isArray(encoder.layers) || encoder.layers.length !== layerCount) throw new ProfileValidationError(`encoders.items[${index}].layers must include every layer.`);
            return {
                id: integer(encoder.id, `encoders.items[${index}].id`, 0, 7),
                layers: encoder.layers.map((layer, layerIndex) => {
                    const mapping = object(layer, `encoders.items[${index}].layers[${layerIndex}]`);
                    return {
                        counterClockwise: integer(mapping.counterClockwise, "encoder counterClockwise", 0, 0xffff),
                        clockwise: integer(mapping.clockwise, "encoder clockwise", 0, 0xffff),
                    };
                }),
            };
        }),
    };
}

function validateLighting(value: RecordValue): Gmk67ProfileV1["lighting"] {
    const result: NonNullable<Gmk67ProfileV1["lighting"]> = { supported: bool(value.supported, "lighting.supported") };
    for (const key of ["brightness", "effect", "speed", "hue", "saturation"] as const) {
        if (value[key] !== undefined) result[key] = integer(value[key], `lighting.${key}`, 0, 255);
    }
    return result;
}

export function parseProfileText(text: string): Gmk67ProfileV1 {
    if (new Blob([text]).size > MAX_PROFILE_SIZE) throw new ProfileValidationError("Profile files must be smaller than 1 MiB.");
    try {
        return validateProfile(JSON.parse(text));
    } catch (error) {
        if (error instanceof ProfileValidationError) throw error;
        throw new ProfileValidationError("The selected file is not valid JSON.");
    }
}

export function validateManifest(input: unknown): ProfileManifest {
    const root = object(input, "Profile manifest");
    if (!Array.isArray(root.profiles)) throw new ProfileValidationError("Profile manifest must contain profiles.");
    const ids = new Set<string>();
    return {
        profiles: root.profiles.map((item, index) => {
            const entry = object(item, `profiles[${index}]`);
            const id = string(entry.id, `profiles[${index}].id`, 80);
            const file = string(entry.file, `profiles[${index}].file`, 160);
            if (!/^[a-z0-9][a-z0-9-]*$/.test(id) || ids.has(id) || !/^[a-z0-9][a-z0-9-]*\.json$/i.test(file)) throw new ProfileValidationError(`profiles[${index}] has an unsafe or duplicate id/file.`);
            ids.add(id);
            return { id, name: string(entry.name, `profiles[${index}].name`, 120), file, description: optionalString(entry.description, `profiles[${index}].description`) };
        }),
    };
}

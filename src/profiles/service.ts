import type { DeviceCapabilities } from "../devices/gmk67-v2";
import { ViaClient } from "../hid/via-client";
import type { Gmk67ProfileV1 } from "./schema";
import { validateProfile } from "./validate";

export type ProgressStage = "validating" | "backing-up" | "writing-keymap" | "verifying" | "rolling-back" | "complete";
export type ProgressCallback = (stage: ProgressStage) => void;

export class CompatibilityError extends Error {}
export class VerificationError extends Error {}
export class ApplyError extends Error {
    constructor(message: string, readonly rollbackVerified: boolean) {
        super(message);
    }
}

export function assertCompatible(capabilities: DeviceCapabilities, profile: Gmk67ProfileV1): void {
    const { device, keymap } = profile;
    if (capabilities.vendorId !== device.vendorId || capabilities.productId !== device.productId) throw new CompatibilityError("Profile device ID does not match the connected keyboard.");
    if (capabilities.matrix.rows !== device.matrixRows || capabilities.matrix.cols !== device.matrixCols) throw new CompatibilityError("Profile matrix dimensions do not match the connected keyboard.");
    if (capabilities.layerCount !== keymap.layerCount) throw new CompatibilityError("Profile layer count does not match the connected keyboard.");
    if (capabilities.viaProtocolVersion !== device.viaProtocolVersion) throw new CompatibilityError("Profile VIA protocol version does not match the connected keyboard.");
    if (profile.macros?.supported || profile.encoders?.supported || profile.lighting?.supported) throw new CompatibilityError("This keymap-only release cannot apply profiles containing macros, encoders, or lighting.");
}

export async function captureProfile(client: ViaClient, device: DeviceCapabilities, name: string): Promise<Gmk67ProfileV1> {
    return validateProfile({
        schema: "gmk67-profile",
        schemaVersion: 1,
        name,
        createdAt: new Date().toISOString(),
        device: {
            adapter: "gmk67-v2",
            vendorId: device.vendorId,
            productId: device.productId,
            matrixRows: device.matrix.rows,
            matrixCols: device.matrix.cols,
            viaProtocolVersion: device.viaProtocolVersion,
        },
        keymap: { layerCount: device.layerCount, layers: await client.readKeymap(device.layerCount, device.matrix.rows, device.matrix.cols) },
        macros: { supported: false },
        encoders: { supported: false },
        lighting: { supported: false },
        metadata: { capturedBy: "gmk67-recovery" },
    });
}

export async function verifyProfile(client: ViaClient, device: DeviceCapabilities, profile: Gmk67ProfileV1): Promise<boolean> {
    const actual = await client.readKeymap(device.layerCount, device.matrix.rows, device.matrix.cols);
    return actual.every((layer, layerIndex) => layer.every((keycode, keyIndex) => keycode === profile.keymap.layers[layerIndex][keyIndex]));
}

export async function applyProfile(client: ViaClient, device: DeviceCapabilities, profile: Gmk67ProfileV1, progress: ProgressCallback): Promise<Gmk67ProfileV1> {
    progress("validating");
    const valid = validateProfile(profile);
    assertCompatible(device, valid);
    progress("backing-up");
    const backup = await captureProfile(client, device, "Automatic pre-apply backup");
    try {
        progress("writing-keymap");
        await client.writeKeymap(valid.keymap.layers);
        progress("verifying");
        if (!await verifyProfile(client, device, valid)) throw new VerificationError("Keyboard read-back does not match the selected profile.");
        progress("complete");
        return backup;
    } catch (error) {
        progress("rolling-back");
        try {
            await client.writeKeymap(backup.keymap.layers);
            const rollbackVerified = await verifyProfile(client, device, backup);
            throw new ApplyError(error instanceof Error ? error.message : "Profile apply failed.", rollbackVerified);
        } catch (rollbackError) {
            if (rollbackError instanceof ApplyError) throw rollbackError;
            throw new ApplyError(`${error instanceof Error ? error.message : "Profile apply failed."} Automatic rollback could not be verified.`, false);
        }
    }
}

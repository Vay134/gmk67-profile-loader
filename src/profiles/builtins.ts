import type { ProfileManifest, Gmk67ProfileV1 } from "./schema";
import { validateManifest, validateProfile } from "./validate";

function profileUrl(file: string): URL {
    return new URL(`profiles/${file}`, document.baseURI);
}

export async function loadBuiltinManifest(): Promise<ProfileManifest> {
    const response = await fetch(new URL("profiles/index.json", document.baseURI));
    if (!response.ok) throw new Error("Could not load the built-in profile list.");
    return validateManifest(await response.json());
}

export async function loadBuiltinProfile(file: string): Promise<Gmk67ProfileV1> {
    const response = await fetch(profileUrl(file));
    if (!response.ok) throw new Error("Could not load this built-in profile.");
    return validateProfile(await response.json());
}

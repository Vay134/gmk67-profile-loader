import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { validateManifest, validateProfile } from "../src/profiles/validate.ts";

const profileDirectory = resolve("public/profiles");
const manifest = validateManifest(JSON.parse(await readFile(resolve(profileDirectory, "index.json"), "utf8")));
for (const entry of manifest.profiles) {
    validateProfile(JSON.parse(await readFile(resolve(profileDirectory, entry.file), "utf8")));
}
console.log(`Validated ${manifest.profiles.length} built-in profile(s).`);

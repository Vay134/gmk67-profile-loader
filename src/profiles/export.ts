import type { Gmk67ProfileV1 } from "./schema";

export function slugifyProfileName(name: string): string {
    return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "profile";
}

export function exportProfile(profile: Gmk67ProfileV1): void {
    const url = URL.createObjectURL(new Blob([JSON.stringify(profile, null, 2)], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `gmk67-${slugifyProfileName(profile.name)}.json`;
    link.click();
    URL.revokeObjectURL(url);
}

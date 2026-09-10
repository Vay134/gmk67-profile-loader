import { ChangeEvent, useEffect, useRef, useState } from "react";
import { formatDeviceId, isGmk67V2, type DeviceCapabilities } from "./devices/gmk67-v2";
import { ViaClient } from "./hid/via-client";
import { isViaRawHidDevice, WebHidTransport, webHidSupported } from "./hid/webhid";
import { loadBuiltinManifest, loadBuiltinProfile } from "./profiles/builtins";
import { exportProfile } from "./profiles/export";
import type { Gmk67ProfileV1, ProfileManifestEntry } from "./profiles/schema";
import { ApplyError, applyProfile, captureProfile, type ProgressStage } from "./profiles/service";
import { parseProfileText } from "./profiles/validate";

type ProfileSelection = { profile: Gmk67ProfileV1; source: string } | null;
type PendingApply = Gmk67ProfileV1 | null;
const stageText: Record<ProgressStage, string> = {
    validating: "Checking profile compatibility…",
    "backing-up": "Capturing recovery backup…",
    "writing-keymap": "Writing keymap…",
    verifying: "Reading the keymap back…",
    "rolling-back": "Restoring the recovery backup…",
    complete: "Profile verified.",
};

export function App() {
    const fileInput = useRef<HTMLInputElement>(null);
    const [profiles, setProfiles] = useState<ProfileManifestEntry[]>([]);
    const [selection, setSelection] = useState<ProfileSelection>(null);
    const [pendingApply, setPendingApply] = useState<PendingApply>(null);
    const [transport, setTransport] = useState<WebHidTransport | null>(null);
    const [capabilities, setCapabilities] = useState<DeviceCapabilities | null>(null);
    const [operation, setOperation] = useState<ProgressStage | null>(null);
    const [recoveryBackup, setRecoveryBackup] = useState<Gmk67ProfileV1 | null>(null);
    const [message, setMessage] = useState<string>("");
    const supported = webHidSupported();

    useEffect(() => {
        void loadBuiltinManifest().then((manifest) => setProfiles(manifest.profiles)).catch((error: unknown) => setMessage(error instanceof Error ? error.message : "Could not load built-in profiles."));
    }, []);

    useEffect(() => {
        if (!supported || !navigator.hid) return;
        const disconnected = (event: Event & { device: HIDDevice }): void => {
            if (transport?.device === event.device) {
                setTransport(null);
                setCapabilities(null);
                setMessage("Keyboard disconnected. Reconnect it, then inspect it again before applying a profile.");
            }
        };
        navigator.hid.addEventListener("disconnect", disconnected);
        return () => navigator.hid?.removeEventListener?.("disconnect", disconnected);
    }, [supported, transport]);

    async function inspect(device: HIDDevice): Promise<void> {
        if (!isGmk67V2(device)) throw new Error(`Unsupported keyboard: ${formatDeviceId(device.vendorId)} / ${formatDeviceId(device.productId)}. This app supports ZUOYA GMK67 V2 only.`);
        const nextTransport = new WebHidTransport(device);
        await nextTransport.open();
        const client = new ViaClient(nextTransport);
        const viaProtocolVersion = await client.getProtocolVersion();
        if (viaProtocolVersion < 8) throw new Error(`VIA protocol ${viaProtocolVersion} does not support the safe bulk keymap path used by this app.`);
        const layerCount = await client.getLayerCount();
        if (!layerCount || layerCount > 16) throw new Error("The keyboard reported an invalid VIA layer count.");
        setTransport(nextTransport);
        setCapabilities({
            vendorId: device.vendorId,
            productId: device.productId,
            productName: device.productName,
            viaProtocolVersion,
            matrix: { rows: 6, cols: 16 },
            layerCount,
        });
    }

    async function connect(): Promise<void> {
        try {
            setMessage("");
            const approved = (await navigator.hid!.getDevices()).find((device) => isGmk67V2(device) && isViaRawHidDevice(device));
            if (approved) {
                await inspect(approved);
                return;
            }
            const devices = await navigator.hid!.requestDevice({ filters: [{ vendorId: 0x36b0, productId: 0x3068, usagePage: 0xff60, usage: 0x61 }] });
            const selected = devices.find((device) => isGmk67V2(device) && isViaRawHidDevice(device));
            if (selected) await inspect(selected);
        } catch (error) {
            setMessage(error instanceof Error ? error.message : "Could not connect to the keyboard. Close VIA or another configurator and try again.");
        }
    }

    async function chooseBuiltin(entry: ProfileManifestEntry): Promise<void> {
        try {
            setMessage("");
            setSelection({ profile: await loadBuiltinProfile(entry.file), source: "Built-in profile" });
        } catch (error) {
            setMessage(error instanceof Error ? error.message : "Could not load this profile.");
        }
    }

    async function loadFile(event: ChangeEvent<HTMLInputElement>): Promise<void> {
        const file = event.target.files?.[0];
        event.target.value = "";
        if (!file) return;
        try {
            if (file.size > 1024 * 1024) throw new Error("Profile files must be smaller than 1 MiB.");
            setSelection({ profile: parseProfileText(await file.text()), source: `Loaded: ${file.name}` });
            setMessage("");
        } catch (error) {
            setMessage(error instanceof Error ? error.message : "Could not load this profile.");
        }
    }

    async function capture(): Promise<void> {
        if (!transport || !capabilities || operation) return;
        try {
            setOperation("backing-up");
            setSelection({ profile: await captureProfile(new ViaClient(transport), capabilities, "Default"), source: "Captured from connected keyboard" });
            setMessage("Keyboard captured. Export it now or apply it later in this session.");
        } catch (error) {
            setMessage(error instanceof Error ? error.message : "Could not capture the keyboard.");
        } finally {
            setOperation(null);
        }
    }

    async function apply(profile: Gmk67ProfileV1): Promise<void> {
        if (!transport || !capabilities || operation) return;
        setPendingApply(null);
        try {
            setMessage("");
            const backup = await applyProfile(new ViaClient(transport), capabilities, profile, setOperation);
            setRecoveryBackup(backup);
            setMessage(`“${profile.name}” was applied and verified.`);
        } catch (error) {
            if (error instanceof ApplyError) {
                setMessage(`${error.message} ${error.rollbackVerified ? "The previous configuration was restored and verified." : "Automatic rollback could not be verified; keep the keyboard connected."}`);
            } else {
                setMessage(error instanceof Error ? error.message : "Could not apply the profile.");
            }
        } finally {
            setOperation(null);
        }
    }

    return <main className="app-shell">
        <header className="masthead"><div><p className="eyebrow">ZUOYA GMK67 V2</p><h1>Recovery</h1></div><p>Local USB profile restore.</p></header>

        {!supported ? <section className="notice error"><strong>WebHID is unavailable.</strong> Use a desktop Chromium browser.</section> : <>
            <section className="connection panel" aria-live="polite"><div><span className={`signal ${capabilities ? "online" : ""}`} /> <strong>{capabilities ? "Connected" : "Not connected"}</strong>{capabilities && <small>{formatDeviceId(capabilities.vendorId)} · {formatDeviceId(capabilities.productId)} · VIA {capabilities.viaProtocolVersion}</small>}</div><button onClick={() => void connect()} disabled={Boolean(operation)}>{capabilities ? "Reconnect" : "Connect"}</button></section>

            <section className="library panel"><div className="section-heading"><h2>Profiles</h2><button className="secondary" onClick={() => fileInput.current?.click()} disabled={Boolean(operation)}>Load Profile</button><input ref={fileInput} onChange={(event) => void loadFile(event)} type="file" accept=".json,application/json" hidden /></div>
                {profiles.length ? <div className="profile-list">{profiles.map((entry) => <article className="profile-card" key={entry.id}><div><h3>{entry.name}</h3>{entry.description && <p>{entry.description}</p>}</div><button className="secondary" onClick={() => void chooseBuiltin(entry)} disabled={Boolean(operation)}>Select</button></article>)}</div> : <p className="quiet">No built-in profiles.</p>}
            </section>

            {selection && <section className="selected panel"><div><p className="eyebrow">Selected</p><h2>{selection.profile.name}</h2><p className="quiet">{selection.profile.keymap.layerCount} layers · {selection.source}</p></div><div className="actions">{pendingApply ? <><button onClick={() => void apply(pendingApply)} disabled={!capabilities || Boolean(operation)}>Confirm apply</button><button className="secondary" onClick={() => setPendingApply(null)} disabled={Boolean(operation)}>Cancel</button></> : <><button onClick={() => setPendingApply(selection.profile)} disabled={!capabilities || Boolean(operation)}>Apply</button><button className="secondary" onClick={() => exportProfile(selection.profile)} disabled={Boolean(operation)}>Export</button></>}</div></section>}

            <section className="capture panel"><div><h2>Current keyboard</h2><p className="quiet">Capture creates a portable keymap profile.</p></div><div className="actions"><button className="secondary" onClick={() => void capture()} disabled={!capabilities || Boolean(operation)}>Capture</button>{recoveryBackup && <button className="secondary" onClick={() => setPendingApply(recoveryBackup)} disabled={!capabilities || Boolean(operation)}>Undo</button>}</div></section>
        </>}
        {operation && <p className="operation" aria-live="assertive">{stageText[operation]}</p>}
        {message && <section className="notice" aria-live="polite">{message}</section>}
        <footer>Keymap-only</footer>
    </main>;
}

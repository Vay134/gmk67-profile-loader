# GMK67 V2 Web Recovery / Profile Manager
## Comprehensive implementation specification and Codex handoff

**Status:** implementation-ready design specification  
**Primary target:** ZUOYA GMK67 V2  
**Deployment target:** GitHub Pages  
**Application type:** static, backend-less web application  
**Primary browser target:** desktop Chromium browsers with WebHID  
**Preferred UI terminology:** use **Load**, never **Import**  
**Primary purpose:** recover and reapply known-good keyboard configurations from any compatible computer, without requiring VIA, the ZUOYA desktop software, or the owner's personal laptop.

---

# 1. Executive summary

Build a small static web application that can talk directly to a GMK67 V2 over WebHID using the VIA-compatible HID protocol exposed by the keyboard.

The application is **not** intended to replace VIA as a visual keyboard editor. VIA remains the place where a user initially creates or edits a configuration. This app is a **configuration snapshot, backup, recovery, and profile reapplication tool**.

The core intended workflow is:

1. Configure the GMK67 V2 in VIA.
2. Open this web app.
3. Connect the keyboard over USB.
4. Capture the keyboard's current raw VIA state.
5. Save that state as a named profile.
6. Export that profile to a portable JSON file and/or add it to the repository as a built-in profile.
7. GitHub Pages serves the app and built-in profiles publicly over HTTPS.
8. Later, if the keyboard resets while the user is away from their normal computer:
   - plug the keyboard into any compatible computer,
   - open the GitHub Pages URL,
   - grant WebHID access,
   - select a profile,
   - click **Apply**,
   - verify the written state,
   - continue using the keyboard.

The expected v1 does **not** require:

- a backend,
- a database,
- user authentication,
- a desktop app,
- a browser extension,
- a local daemon,
- VIA to be installed on the recovery computer,
- the ZUOYA configuration app,
- cloud account state.

The only server-side role is static hosting. The user's browser performs all keyboard I/O locally.

---

# 2. Product goal

The product exists to solve this concrete failure case:

> "My GMK67 reset or lost its configuration while I am away from my personal laptop. I want to plug it into another computer, visit one URL, and restore one of my known-good configurations."

The product should optimize for:

- reliability,
- low dependency count,
- clear safety checks,
- deterministic profile application,
- portability,
- recoverability,
- transparent behavior.

Convenience matters, but **safe writes and verifiable restoration matter more than visual sophistication**.

---

# 3. Non-goals

Do not turn v1 into a clone of VIA.

Specifically, v1 should **not** include:

- a visual keyboard layout editor,
- arbitrary keycode selection,
- a macro editor,
- a graphical RGB editor,
- firmware flashing,
- bootloader operations,
- EEPROM reset controls,
- keyboard firmware updates,
- Bluetooth pairing management,
- 2.4 GHz pairing management,
- a community profile marketplace,
- cloud sync,
- authentication,
- account management,
- analytics,
- telemetry,
- a native desktop companion,
- broad support for unrelated keyboards.

Avoid exposing dangerous VIA commands such as EEPROM reset and bootloader jump in the UI.

The app should focus on five primary concepts:

- Connect
- Capture
- Apply
- Load
- Export

---

# 4. Terminology

Use these terms consistently in the code and UI.

## Profile

A serialized snapshot of the recoverable keyboard configuration.

A profile should be device-specific and versioned.

Examples:

- Default
- Work
- Gaming
- Mac

## Built-in profile

A profile JSON file stored in the GitHub repository and deployed with the static site.

Built-in profiles are available from any compatible computer that can access the site.

## Loaded profile

A profile selected by the user from a local JSON file using the browser's file picker.

Loading happens entirely in the browser. The file is **not uploaded to a server**.

## Capture

Read supported configuration state from the connected keyboard and construct a profile object.

## Apply

Write a profile to the connected keyboard.

## Export

Serialize a profile into a portable JSON file and trigger a browser download.

## Recovery backup

A temporary snapshot captured automatically immediately before an Apply operation. It exists so the app can attempt to restore the pre-apply state if writing or verification fails.

---

# 5. Current hardware and protocol assumptions

Treat every assumption in this section as something that must be checked or safely handled at runtime.

## 5.1 Target device identity

A currently available community VIA definition for `ZUOYA GMK67 V2` identifies:

- USB vendor ID: `0x36B0`
- USB product ID: `0x3068`
- matrix rows: `6`
- matrix columns: `16`
- encoder: `e0`
- VIA/QMK-like RGB Matrix controls
- custom keycodes related to 2.4 GHz, BLE channels, USB mode, battery status, Windows lock, NKRO/6K behavior, lighting toggle, and reset behavior

Do **not** assume every GMK67 sold under that name uses the same firmware.

At minimum, check VID/PID at runtime.

Where possible also check:

- VIA protocol version,
- layer count,
- matrix dimensions expected by the profile,
- macro capability,
- macro buffer size,
- encoder capability,
- optional keyboard/QMK keycode version.

A mismatch should block Apply unless explicitly supported.

## 5.2 V1 vs V2 distinction

This project targets **GMK67 V2 VIA-capable firmware**.

Older GMK67 hardware/firmware may rely on proprietary ZUOYA software and may not expose the same VIA-compatible HID interface.

Do not advertise generic "GMK67" support without qualification until real hardware variants have been tested.

## 5.3 Wired recovery assumption

For v1, assume profile recovery is performed over **USB cable**.

Do not depend on Bluetooth or 2.4 GHz connectivity for configuration writes.

If later hardware testing proves that another transport exposes the same VIA HID protocol reliably, it can be added separately.

---

# 6. Why a static web app works

VIA-compatible firmware exposes a Raw HID interface.

The browser can communicate with that HID interface using WebHID:

```ts
navigator.hid.requestDevice(...)
navigator.hid.getDevices()
device.open()
device.sendReport(...)
device.addEventListener("inputreport", ...)
```

The static host only serves application assets:

```text
GitHub Pages
      |
      | HTTPS: HTML / JS / CSS / JSON
      v
Browser
      |
      | WebHID, local machine only
      v
GMK67 V2
```

There is no need for the host to proxy USB traffic.

That means:

- profiles bundled with the app can be fetched as ordinary static JSON files,
- local profile files can be read with browser file APIs,
- profile files can be exported with `Blob` / object URLs,
- WebHID writes happen directly between browser and keyboard.

---

# 7. Recommended technology stack

Use:

- Vite
- React
- TypeScript
- WebHID
- Vitest
- Testing Library for UI tests if useful
- GitHub Actions
- GitHub Pages

Avoid adding a state-management framework unless it becomes clearly useful.

For v1, React context/hooks or simple component state is enough.

Recommended runtime dependencies should be kept small.

Do not add:

- Supabase,
- Firebase,
- Express,
- Next.js server routes,
- Electron,
- Tauri,
- a database,
- Redux,

unless requirements change.

---

# 8. Recommended repository structure

A reasonable starting structure:

```text
gmk67-recovery/
├── .github/
│   └── workflows/
│       └── deploy-pages.yml
│
├── public/
│   └── profiles/
│       ├── index.json
│       ├── default.json
│       ├── work.json
│       ├── gaming.json
│       └── mac.json
│
├── src/
│   ├── app/
│   │   ├── App.tsx
│   │   └── app-state.ts
│   │
│   ├── components/
│   │   ├── BrowserSupportNotice.tsx
│   │   ├── ConnectPanel.tsx
│   │   ├── DeviceStatus.tsx
│   │   ├── ProfileList.tsx
│   │   ├── ProfileCard.tsx
│   │   ├── CaptureDialog.tsx
│   │   ├── ApplyDialog.tsx
│   │   ├── ProgressView.tsx
│   │   └── ErrorPanel.tsx
│   │
│   ├── hid/
│   │   ├── constants.ts
│   │   ├── webhid.ts
│   │   ├── command-queue.ts
│   │   ├── via-protocol.ts
│   │   ├── via-commands.ts
│   │   ├── byte-utils.ts
│   │   └── errors.ts
│   │
│   ├── devices/
│   │   ├── device-adapter.ts
│   │   └── gmk67-v2.ts
│   │
│   ├── profiles/
│   │   ├── schema.ts
│   │   ├── validate.ts
│   │   ├── capture.ts
│   │   ├── apply.ts
│   │   ├── verify.ts
│   │   ├── export.ts
│   │   ├── load.ts
│   │   └── builtins.ts
│   │
│   ├── tests/
│   │   ├── fake-hid-device.ts
│   │   └── fixtures/
│   │
│   ├── main.tsx
│   └── vite-env.d.ts
│
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── README.md
└── LICENSE
```

Do not over-architect the first prototype. The protocol layer deserves separation because it is safety-critical and should be unit-testable independently from React.

---

# 9. Device adapter boundary

Even though v1 supports one keyboard, create a thin adapter abstraction.

Example:

```ts
export interface KeyboardAdapter {
  readonly id: string;
  readonly displayName: string;

  matches(device: HIDDevice): boolean;

  inspect(
    transport: HidTransport,
  ): Promise<DeviceCapabilities>;

  capture(
    transport: HidTransport,
    capabilities: DeviceCapabilities,
  ): Promise<KeyboardProfilePayload>;

  apply(
    transport: HidTransport,
    capabilities: DeviceCapabilities,
    payload: KeyboardProfilePayload,
    progress?: ProgressCallback,
  ): Promise<void>;

  verify(
    transport: HidTransport,
    capabilities: DeviceCapabilities,
    expected: KeyboardProfilePayload,
  ): Promise<VerificationResult>;
}
```

Implement:

```ts
class Gmk67V2Adapter implements KeyboardAdapter
```

This keeps the VIA transport generic while isolating GMK67-specific assumptions.

---

# 10. WebHID device discovery

## 10.1 Browser capability check

Before rendering functional controls:

```ts
const webHidSupported =
  "hid" in navigator &&
  typeof navigator.hid?.requestDevice === "function";
```

If unsupported, show a clear message.

Do not show an enabled Connect button that will inevitably fail.

Suggested UI:

```text
This browser does not expose WebHID.

Use a supported desktop Chromium-based browser to connect to the GMK67.
```

Avoid promising exact browser support beyond what has actually been tested.

## 10.2 Requesting a device

Prefer a narrow device filter:

```ts
const devices = await navigator.hid.requestDevice({
  filters: [
    {
      vendorId: 0x36b0,
      productId: 0x3068,
    },
  ],
});
```

Then perform additional validation after selection.

Where browser APIs and hardware descriptors permit, verify that the selected HID collections include the VIA/QMK Raw HID usage:

- usage page: `0xFF60`
- usage ID: `0x61`

Do not trust VID/PID alone if the device exposes several HID interfaces.

## 10.3 Previously authorized devices

On page load, the app may call:

```ts
await navigator.hid.getDevices()
```

to find devices for which the user previously granted permission.

If a matching connected GMK67 is present, the UI may offer to reconnect automatically or mark it available.

Do not trigger the permission chooser automatically. `requestDevice()` should be initiated by a clear user action.

## 10.4 Open and close

A returned `HIDDevice` must be opened before transfer:

```ts
if (!device.opened) {
  await device.open();
}
```

Handle:

- disconnect,
- reconnect,
- page refresh,
- permission revocation,
- operating-system access errors.

Listen for WebHID connection/disconnection events if useful, but treat them as convenience only.

---

# 11. Raw HID framing

Current QMK Raw HID defaults use:

- usage page `0xFF60`
- usage ID `0x61`

The VIA web application uses report ID `0`.

Conceptually, VIA constructs a 33-byte host-side array:

```text
[reportId=0x00, command, arg0, arg1, ...padding]
```

but WebHID `sendReport(0, payload)` receives the report ID separately, so the transmitted data payload is 32 bytes:

```text
byte 0    VIA command
byte 1..  arguments/data
remaining bytes zero padded
```

Recommended transport API:

```ts
interface HidTransport {
  sendCommand(
    command: number,
    args?: Uint8Array,
    options?: {
      timeoutMs?: number;
      expectedCommand?: number;
    },
  ): Promise<Uint8Array>;
}
```

The transport should:

1. serialize commands,
2. construct a 32-byte zero-filled output buffer,
3. put the VIA command at byte 0,
4. put arguments from byte 1,
5. call `device.sendReport(0, payload)`,
6. wait for the next matching input report,
7. validate response identity,
8. reject on timeout,
9. never allow concurrent VIA commands on the same device.

---

# 12. Command queue is mandatory

Do not fire multiple writes concurrently simply because JavaScript makes it easy.

Create a strict per-device FIFO command queue.

Why:

- VIA devices commonly expect request-response sequencing.
- Responses need to be associated with the correct request.
- Some operations require ordered chunks.
- macro writes are stateful.
- interleaving reads/writes could create invalid verification results.

Example queue contract:

```ts
class ViaCommandQueue {
  enqueue<T>(operation: () => Promise<T>): Promise<T>;
  get idle(): boolean;
  waitUntilIdle(): Promise<void>;
  cancelPending(reason: Error): void;
}
```

One HID command in flight at a time is the safe default.

Bulk read performance is not important enough to justify protocol concurrency in v1.

---

# 13. Current VIA command IDs

The current VIA web client defines these command IDs:

| Name | Hex |
|---|---:|
| GET_PROTOCOL_VERSION | `0x01` |
| GET_KEYBOARD_VALUE | `0x02` |
| SET_KEYBOARD_VALUE | `0x03` |
| DYNAMIC_KEYMAP_GET_KEYCODE | `0x04` |
| DYNAMIC_KEYMAP_SET_KEYCODE | `0x05` |
| CUSTOM_MENU_SET_VALUE | `0x07` |
| CUSTOM_MENU_GET_VALUE | `0x08` |
| CUSTOM_MENU_SAVE | `0x09` |
| EEPROM_RESET | `0x0A` |
| BOOTLOADER_JUMP | `0x0B` |
| DYNAMIC_KEYMAP_MACRO_GET_COUNT | `0x0C` |
| DYNAMIC_KEYMAP_MACRO_GET_BUFFER_SIZE | `0x0D` |
| DYNAMIC_KEYMAP_MACRO_GET_BUFFER | `0x0E` |
| DYNAMIC_KEYMAP_MACRO_SET_BUFFER | `0x0F` |
| DYNAMIC_KEYMAP_MACRO_RESET | `0x10` |
| DYNAMIC_KEYMAP_GET_LAYER_COUNT | `0x11` |
| DYNAMIC_KEYMAP_GET_BUFFER | `0x12` |
| DYNAMIC_KEYMAP_SET_BUFFER | `0x13` |
| DYNAMIC_KEYMAP_GET_ENCODER | `0x14` |
| DYNAMIC_KEYMAP_SET_ENCODER | `0x15` |
| UI_SYNC_REQUEST | `0x16` |

### Important

Do not expose `EEPROM_RESET` or `BOOTLOADER_JUMP` in the product UI.

Prefer symbolic constants rather than magic numbers.

```ts
export const VIA_COMMAND = {
  GET_PROTOCOL_VERSION: 0x01,
  // ...
} as const;
```

---

# 14. Byte-order utilities

VIA keycodes are 16-bit values.

Create explicit helpers and unit tests:

```ts
export function u16ToBigEndian(value: number): [number, number] {
  return [(value >> 8) & 0xff, value & 0xff];
}

export function u16FromBigEndian(hi: number, lo: number): number {
  return ((hi & 0xff) << 8) | (lo & 0xff);
}
```

Also implement:

```ts
u16ArrayToBytes(values: readonly number[]): Uint8Array;
bytesToU16Array(bytes: Uint8Array): number[];
```

Reject odd-length byte buffers when decoding 16-bit values.

Do not depend on platform-native endianness.

---

# 15. Protocol version handling

The first protocol request after opening a device should be:

```text
GET_PROTOCOL_VERSION
```

Store the reported version in the session capabilities object and captured profile metadata.

Example:

```ts
interface DeviceCapabilities {
  vendorId: number;
  productId: number;
  productName?: string;

  viaProtocolVersion: number;

  matrix: {
    rows: number;
    cols: number;
  };

  layerCount: number;

  macros: {
    supported: boolean;
    count?: number;
    bufferSize?: number;
  };

  encoders: {
    supported: boolean;
    count: number;
  };

  lighting: {
    supported: boolean;
    type?: "gmk67-v2-rgb-matrix";
  };
}
```

If a protocol version is unknown or clearly incompatible, fail closed.

Avoid silently assuming "four layers" except as a deliberate compatibility fallback for an explicitly tested older VIA protocol.

For the GMK67 V2, use hardware results rather than inferred defaults wherever possible.

---

# 16. Reading the keymap

The target matrix is currently assumed to be 6 × 16:

```text
96 electrical matrix positions per layer
```

Not every matrix position must correspond to a physical key. Capture the **entire raw matrix**, not only visible keys.

That makes the profile deterministic and avoids losing hidden/unused positions.

## 16.1 Bulk keymap reads

Current VIA uses `DYNAMIC_KEYMAP_GET_BUFFER` with:

```text
offset: 16-bit byte offset
size:   8-bit byte count
```

Maximum returned data payload used by VIA is 28 bytes.

Each keycode is 2 bytes, so a convenient read chunk is:

```text
14 keycodes = 28 bytes
```

For a given layer:

```ts
const keycodesPerLayer = rows * cols;
const layerByteSize = keycodesPerLayer * 2;
const layerStartOffset = layer * layerByteSize;
```

Read consecutive chunks until the complete layer is obtained.

Pseudo-code:

```ts
async function readLayer(
  layer: number,
  rows: number,
  cols: number,
): Promise<number[]> {
  const keyCount = rows * cols;
  const totalBytes = keyCount * 2;
  const result: number[] = [];

  for (let offset = 0; offset < totalBytes; offset += 28) {
    const size = Math.min(28, totalBytes - offset);

    const bytes = await getKeymapBuffer(
      layer * totalBytes + offset,
      size,
    );

    result.push(...bytesToU16Array(bytes));
  }

  return result;
}
```

## 16.2 Bulk keymap writes

Use `DYNAMIC_KEYMAP_SET_BUFFER`.

Flatten layers in firmware order:

```ts
const allKeycodes = layers.flat();
const bytes = u16ArrayToBytes(allKeycodes);
```

Write sequential chunks of at most 28 data bytes.

The request includes:

```text
offset_hi
offset_lo
size
data...
```

Pseudo-code:

```ts
for (let offset = 0; offset < bytes.length; offset += 28) {
  const chunk = bytes.slice(offset, offset + 28);

  await sendCommand(
    VIA_COMMAND.DYNAMIC_KEYMAP_SET_BUFFER,
    concat(
      u16ToBigEndian(offset),
      [chunk.length],
      chunk,
    ),
  );
}
```

Do not mutate the original profile during serialization.

---

# 17. Individual key operations

Implement single-key get/set methods even if the normal Apply path uses bulk buffers.

They are useful for:

- hardware bring-up,
- diagnostics,
- prototype validation,
- targeted testing.

Commands:

```text
DYNAMIC_KEYMAP_GET_KEYCODE 0x04
DYNAMIC_KEYMAP_SET_KEYCODE 0x05
```

Parameters conceptually include:

```text
layer
row
column
keycode_hi
keycode_lo
```

The first hardware prototype should prove individual key read/write before implementing the complete profile system.

---

# 18. Macro capture and restore

Macros should be handled as raw bytes rather than translated text unless there is a strong reason otherwise.

Reasons:

- fewer conversion assumptions,
- custom keycodes may exist,
- raw preservation is ideal for recovery,
- this is not a macro editor.

## 18.1 Capability detection

Query:

```text
DYNAMIC_KEYMAP_MACRO_GET_COUNT       0x0C
DYNAMIC_KEYMAP_MACRO_GET_BUFFER_SIZE 0x0D
```

If either operation is unsupported, treat macros as unsupported rather than failing the entire capture unless the selected profile requires macros.

Record the device-reported buffer size.

## 18.2 Reading macros

Use `DYNAMIC_KEYMAP_MACRO_GET_BUFFER`.

Conceptually:

```text
offset: 16-bit
size:   8-bit
data:   up to 28 bytes
```

Read the full buffer in chunks.

Do not trim unknown bytes unless protocol behavior is explicitly understood.

A raw full-buffer backup is the most faithful recovery representation.

## 18.3 Writing macros

Replicate the safe behavior used by VIA.

At a high level:

1. query device macro buffer size,
2. reject a profile that exceeds it,
3. reset/clear the macro buffer,
4. mark the buffer as write-in-progress according to VIA protocol behavior,
5. write data sequentially in chunks,
6. finalize the buffer,
7. verify by reading it back.

Do not invent a simplified macro write sequence unless tested on the actual GMK67 V2.

Macro restore deserves dedicated hardware tests.

---

# 19. Encoder capture and restore

The current GMK67 V2 community definition contains encoder `e0`.

Assume one encoder for the initial adapter, but structure the schema as an array for future support.

For each layer and encoder, capture both directions:

```ts
interface EncoderBinding {
  counterClockwise: number;
  clockwise: number;
}
```

Use:

```text
DYNAMIC_KEYMAP_GET_ENCODER 0x14
DYNAMIC_KEYMAP_SET_ENCODER 0x15
```

Conceptual request fields:

```text
layer
encoderId
isClockwise
keycode_hi
keycode_lo
```

Capture encoder mappings independently from the physical knob's push switch. The push switch, if present, is simply a matrix key and is already included in the keymap.

---

# 20. Lighting capture and restore

Lighting is the least important v1 capability and should not delay reliable keymap recovery.

Treat it as an optional module.

The current GMK67 V2 community definition exposes RGB Matrix-like controls:

- brightness,
- effect,
- effect speed,
- color.

These are exposed through VIA custom menu commands.

Relevant commands:

```text
CUSTOM_MENU_SET_VALUE 0x07
CUSTOM_MENU_GET_VALUE 0x08
CUSTOM_MENU_SAVE      0x09
```

The observed definition uses QMK RGB Matrix identifiers/channels.

Implementation recommendation:

1. first ship keymap + encoder + macros,
2. implement lighting only after those are proven,
3. preserve lighting values as raw normalized values,
4. write all lighting fields,
5. issue the relevant save/commit operation,
6. read them back where possible.

Lighting failure should normally be represented separately from core keymap failure.

Example result:

```ts
{
  keymap: "verified",
  macros: "verified",
  encoders: "verified",
  lighting: "unsupported"
}
```

Do not claim a full profile restore succeeded if a field marked `required` in the profile was not restored.

---

# 21. Why profiles should store raw values

Do not make v1 depend on translating human-readable VIA keycode names such as:

```text
KC_A
MO(1)
LCTL(KC_C)
CUSTOM(0)
MD_24G
MD_BLE1
```

Instead, capture raw 16-bit keycodes from the keyboard.

Advantages:

- custom GMK67 keycodes survive unchanged,
- no need to replicate VIA's complete keycode dictionary,
- less dependence on QMK keycode version changes,
- profile restore becomes byte-oriented rather than semantic,
- lower implementation complexity,
- easier byte-for-byte verification.

VIA can remain responsible for authoring the layout.

This app is responsible for preserving and restoring it.

---

# 22. Profile format

Create a versioned application-specific profile schema.

Use JSON.

Do not simply reuse VIA's `.layout.json` as the internal canonical representation because:

- the app is capturing raw keycodes,
- raw macro bytes are useful,
- compatibility metadata is needed,
- verification metadata is useful,
- optional lighting should be preserved,
- schema evolution should be controlled by this project.

Suggested extension:

```text
.gmk67.json
```

or simply:

```text
.json
```

A filename like this is clear:

```text
gmk67-gaming.json
```

---

# 23. Proposed profile schema v1

Prefer ordinary integer arrays over Base64 for the small keymap data because they are:

- human inspectable,
- diffable in Git,
- easy to validate,
- easy for Codex/developers to debug.

Macro buffers may be stored as integer arrays for the same reason.

Example:

```json
{
  "schema": "gmk67-profile",
  "schemaVersion": 1,

  "name": "Gaming",
  "description": "Known-good gaming layout",

  "createdAt": "2026-09-10T15:00:00.000Z",

  "device": {
    "adapter": "gmk67-v2",
    "vendorId": 14000,
    "productId": 12392,
    "matrixRows": 6,
    "matrixCols": 16,
    "viaProtocolVersion": 12
  },

  "keymap": {
    "layerCount": 4,
    "layers": [
      [41, 30, 31],
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0]
    ]
  },

  "macros": {
    "supported": true,
    "count": 16,
    "bufferSize": 512,
    "bytes": [0, 0, 0]
  },

  "encoders": {
    "supported": true,
    "items": [
      {
        "id": 0,
        "layers": [
          {
            "counterClockwise": 0,
            "clockwise": 0
          }
        ]
      }
    ]
  },

  "lighting": {
    "supported": false
  },

  "metadata": {
    "capturedBy": "gmk67-recovery",
    "notes": ""
  }
}
```

The tiny arrays above are illustrative only. Real layers for a 6 × 16 matrix contain 96 16-bit values each.

Do not copy the example's `viaProtocolVersion` as an assumption. Store the actual response from the real board.

---

# 24. TypeScript types

Codex should define strict types.

Example:

```ts
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
    qmkKeycodeVersion?: number;
  };

  keymap: {
    layerCount: number;
    layers: number[][];
  };

  macros?: {
    supported: boolean;
    count?: number;
    bufferSize?: number;
    bytes?: number[];
  };

  encoders?: {
    supported: boolean;
    items?: Array<{
      id: number;
      layers: Array<{
        counterClockwise: number;
        clockwise: number;
      }>;
    }>;
  };

  lighting?: {
    supported: boolean;
    brightness?: number;
    effect?: number;
    speed?: number;
    hue?: number;
    saturation?: number;
  };

  metadata?: {
    capturedBy?: string;
    appVersion?: string;
    notes?: string;
  };
}
```

Prefer a runtime schema validator in addition to compile-time TypeScript.

A lightweight library such as Zod is acceptable, but manual validation is also reasonable if dependency minimization is preferred.

---

# 25. Profile validation

Loaded files are untrusted input.

Validate before displaying an Apply button.

At minimum verify:

- root is an object,
- `schema === "gmk67-profile"`,
- known `schemaVersion`,
- non-empty reasonable profile name,
- device adapter is supported,
- vendor ID is integer 0–65535,
- product ID is integer 0–65535,
- matrix dimensions are sane,
- layer count is sane,
- number of layer arrays equals layer count,
- each layer has exactly `rows * cols` values,
- every keycode is an integer 0–65535,
- macro bytes are integers 0–255,
- encoder keycodes are integers 0–65535,
- no unbounded arrays,
- file size is below a conservative limit,
- optional lighting values are within expected ranges.

Suggested file-size limit:

```text
1 MiB
```

This is vastly larger than a normal GMK67 profile while preventing accidental abuse.

Reject unexpected schema versions with an explicit error:

```text
This profile uses format version 2, but this version of the app supports version 1.
```

Do not attempt clever best-effort conversions silently.

---

# 26. Built-in profile manifest

Keep a static manifest:

```json
{
  "profiles": [
    {
      "id": "default",
      "name": "Default",
      "file": "default.json"
    },
    {
      "id": "work",
      "name": "Work",
      "file": "work.json"
    },
    {
      "id": "gaming",
      "name": "Gaming",
      "file": "gaming.json"
    },
    {
      "id": "mac",
      "name": "Mac",
      "file": "mac.json"
    }
  ]
}
```

Load it from:

```text
public/profiles/index.json
```

This avoids hard-coding profile data into JavaScript bundles.

The application can fetch profiles on demand.

Use URLs that respect the Vite GitHub Pages base path.

Avoid assumptions like `/profiles/index.json` if the site may be hosted under:

```text
https://username.github.io/repository-name/
```

Prefer:

```ts
new URL("profiles/index.json", document.baseURI)
```

or another base-aware mechanism.

---

# 27. Load behavior

The UI term is **Load**.

Do not label the feature "Import".

User flow:

```text
[ Load Profile ]
       |
       v
native file picker
       |
       v
read file in browser
       |
       v
parse JSON
       |
       v
validate schema
       |
       v
show profile summary
       |
       v
[ Apply ]
```

Implementation can use:

```html
<input
  type="file"
  accept=".json,application/json"
/>
```

or File System Access APIs where appropriate, but standard `<input type=file>` has broader compatibility and is sufficient.

Browser-side read:

```ts
const text = await file.text();
const json = JSON.parse(text);
const profile = validateProfile(json);
```

Nothing is sent to GitHub or any other backend.

Loaded profile state may exist only in memory.

Optionally provide:

```text
Keep loaded profile until page refresh
```

No persistence is required for the primary recovery use case.

---

# 28. Export behavior

Export means:

> Create a portable profile file on the current computer.

Implementation:

```ts
const text = JSON.stringify(profile, null, 2);
const blob = new Blob([text], {
  type: "application/json",
});

const url = URL.createObjectURL(blob);

const link = document.createElement("a");
link.href = url;
link.download = "gmk67-gaming.json";
link.click();

URL.revokeObjectURL(url);
```

Sanitize the profile name when creating filenames.

Example:

```ts
function slugifyProfileName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
```

Export should be available for:

- captured profiles,
- built-in profiles,
- loaded profiles.

This allows the user to retain independent backups.

---

# 29. Canonical profile publishing workflow

No backend is needed to make profiles globally available.

Recommended manual v1 workflow:

```text
Configure keyboard in VIA
        |
        v
Open recovery app
        |
        v
Capture
        |
        v
Export
        |
        v
gmk67-gaming.json
        |
        v
copy file into repository:
public/profiles/gaming.json
        |
        v
update public/profiles/index.json
        |
        v
git commit + push
        |
        v
GitHub Pages deploy
        |
        v
profile now available globally
```

Do not add GitHub OAuth/API write support in v1.

Manual Git publishing is simpler, safer, and more reliable for a personal recovery utility.

---

# 30. Capture flow

Capture should be read-only.

Detailed flow:

```text
User clicks Connect
        |
        v
Select/authorize GMK67
        |
        v
Open HID device
        |
        v
Inspect device
  - VID/PID
  - Raw HID collection
  - VIA protocol
  - layer count
  - macro capability
  - encoder capability
        |
        v
User clicks Capture Current Keyboard
        |
        v
Read every raw matrix position on every layer
        |
        v
Read macro metadata and buffer
        |
        v
Read encoder mappings
        |
        v
Read optional lighting values
        |
        v
Construct profile
        |
        v
Validate captured profile
        |
        v
Show profile summary
        |
        +--> Export
        |
        +--> keep in memory and Apply later
```

Display granular progress.

Example:

```text
Capturing profile…

✓ Device identity
✓ 4 keymap layers
✓ Macro buffer
✓ Encoder mappings
○ Lighting unsupported
```

Avoid fake percentage precision unless total work units are known.

---

# 31. Apply flow

Apply is the most safety-sensitive operation.

Detailed recommended flow:

```text
User selects profile
        |
        v
User clicks Apply
        |
        v
Validate profile structure
        |
        v
Inspect connected device
        |
        v
Compatibility check
        |
        +-- mismatch --> BLOCK
        |
        v
Capture pre-apply recovery backup
        |
        v
Write keymap
        |
        v
Write macros
        |
        v
Write encoders
        |
        v
Write optional lighting
        |
        v
Read complete relevant state back
        |
        v
Compare expected vs actual
        |
        +-- exact/acceptable --> SUCCESS
        |
        +-- mismatch/error --> offer/attempt rollback
```

---

# 32. Apply confirmation

The app should not require excessive confirmation for a known compatible profile, but the action should be clear.

Suggested dialog:

```text
Apply "Gaming"?

Keyboard: ZUOYA GMK67 V2
Profile device: GMK67 V2
Layers: 4

The current keyboard configuration will be replaced.
A temporary recovery backup will be captured first.

[ Cancel ] [ Apply ]
```

Do not use generic wording like "Continue?" for destructive operations.

---

# 33. Compatibility validation before Apply

Block the write if any critical condition fails.

Critical conditions:

```ts
connected.vendorId === profile.device.vendorId
connected.productId === profile.device.productId
connected.matrix.rows === profile.device.matrixRows
connected.matrix.cols === profile.device.matrixCols
connected.layerCount === profile.keymap.layerCount
```

Protocol-version policy needs testing.

Recommended initial conservative policy:

- exact match: allow,
- known tested compatibility range: allow,
- unknown mismatch: block with explanation.

Macro checks:

- profile requires macros but device reports none -> block or mark incompatible,
- profile macro bytes exceed device buffer size -> block,
- profile macro count incompatible -> block unless proven safe.

Encoder checks:

- profile contains encoder mappings but device adapter says no encoder -> block.

Lighting:

- if profile lighting is marked optional and device lacks support -> warn,
- if marked required -> block.

---

# 34. Automatic recovery backup

Immediately before any Apply, Capture the current recoverable device state.

Keep it in memory as:

```ts
let recoveryBackup: Gmk67ProfileV1 | null;
```

The UI should expose:

```text
[ Undo Apply ]
```

while the page/session remains open, provided a backup exists.

Optionally also persist the latest recovery backup in IndexedDB, but this is **not required** for v1.

A backup failure should block Apply by default.

Reason:

If the application cannot successfully read the current device state, that may indicate the connection is unreliable enough that writing is unsafe.

Allowing an expert override could be considered later, but not in initial implementation.

---

# 35. Verification after Apply

Never assume an acknowledged write means the final state is correct.

After writes finish:

1. read keymap back,
2. read macros back,
3. read encoders back,
4. read lighting back if supported,
5. normalize values,
6. compare against profile.

Example type:

```ts
interface VerificationResult {
  ok: boolean;

  sections: {
    keymap: SectionVerification;
    macros: SectionVerification;
    encoders: SectionVerification;
    lighting: SectionVerification;
  };

  differences: VerificationDifference[];
}
```

Possible section statuses:

```ts
type VerificationStatus =
  | "verified"
  | "mismatch"
  | "unsupported"
  | "not-requested";
```

Do not call the operation "Restored successfully" when a required section mismatches.

---

# 36. Rollback behavior

If Apply fails after changes have started:

1. stop issuing new profile writes,
2. keep the device connection open if possible,
3. display the stage and error,
4. attempt to reapply the pre-apply recovery backup,
5. verify rollback,
6. report rollback result separately.

Example:

```text
Profile restore failed while writing macros.

✓ Previous configuration was restored successfully.

The keyboard should be in the same state it was in before this operation.
```

or:

```text
Profile restore failed.

Automatic rollback could not be verified.

Do not reset or disconnect the keyboard until you have reviewed the recovery options.
```

Do not claim rollback succeeded unless read-back verification supports that conclusion.

---

# 37. Operation cancellation

Do not let the user accidentally start a second Capture or Apply while one is already running.

While an operation is active:

- disable profile Apply buttons,
- disable Capture,
- disable Load if it would replace active profile state,
- keep useful navigation available.

A user-requested Cancel can stop future queued work, but note:

> HID writes already sent cannot be undone by cancelling.

If cancellation occurs during Apply, attempt rollback if the device remains available.

---

# 38. Timeout and retry policy

Use explicit timeouts.

Suggested starting point:

```text
per HID command: 1500 ms
```

This value should be adjusted after hardware testing.

Retry policy should be conservative:

Safe candidates for a single retry:

- GET protocol version,
- GET layer count,
- read-only keymap chunks.

Be careful retrying writes because duplicate semantics must be understood.

For sequential buffer writes, writing the exact same chunk to the same offset should generally be idempotent, but do not depend on that until tested.

Macro finalization operations deserve special caution.

Recommended v1 policy:

- reads: one retry on timeout,
- ordinary deterministic buffer writes: optionally one retry after hardware validation,
- stateful macro reset/finalize steps: no automatic retry unless explicitly proven safe.

---

# 39. Disconnect handling

If the device disconnects:

- reject the in-flight HID command,
- clear queued commands,
- mark device disconnected,
- preserve loaded/built-in profile selection,
- preserve recovery backup in memory,
- show clear instructions.

During Apply:

```text
Keyboard disconnected during restore.

Reconnect the same GMK67 to continue recovery.
```

Do not automatically restart a partially completed profile write from the beginning without asking the orchestration layer.

The safest strategy after reconnect is likely:

- re-inspect device,
- read current state,
- decide whether to reapply the desired profile or recovery backup from scratch.

---

# 40. Error taxonomy

Create typed errors.

Examples:

```ts
class WebHidUnsupportedError extends Error {}
class DevicePermissionError extends Error {}
class DeviceDisconnectedError extends Error {}
class DeviceMismatchError extends Error {}
class UnsupportedViaProtocolError extends Error {}
class HidTimeoutError extends Error {}
class InvalidHidResponseError extends Error {}
class InvalidProfileError extends Error {}
class ProfileCompatibilityError extends Error {}
class VerificationError extends Error {}
class RollbackError extends Error {}
```

Map these to user-friendly messages.

Do not expose only opaque stack traces.

In development mode, retain structured diagnostic details.

---

# 41. HID response validation

Do not accept arbitrary input reports as command replies.

The transport should correlate the expected reply.

At minimum:

- ignore unrelated reports,
- require the expected command byte,
- validate minimum response length,
- validate command-specific echoed fields where the protocol does so,
- reject malformed buffers.

The current VIA application verifies that the returned command prefix matches the request before treating the response as valid.

Implement a similar check.

---

# 42. UI layout

Keep the application compact and recovery-oriented.

Suggested desktop layout:

```text
┌───────────────────────────────────────────────────┐
│ GMK67 Recovery                                    │
│                                                   │
│ Keyboard                                          │
│ ● ZUOYA GMK67 V2                         Connected│
│ VIA protocol: 12                                  │
│                                                   │
│ [ Disconnect ]   [ Capture Current Keyboard ]     │
├───────────────────────────────────────────────────┤
│ Profiles                                          │
│                                                   │
│ Default                                           │
│ Known-good baseline                               │
│ [ Apply ] [ Export ]                              │
│                                                   │
│ Work                                              │
│ [ Apply ] [ Export ]                              │
│                                                   │
│ Gaming                                            │
│ [ Apply ] [ Export ]                              │
│                                                   │
│ Mac                                               │
│ [ Apply ] [ Export ]                              │
│                                                   │
│ [ Load Profile ]                                  │
└───────────────────────────────────────────────────┘
```

Before connection:

```text
GMK67 Recovery

Restore your saved GMK67 V2 configurations.

[ Connect Keyboard ]

Requires a WebHID-capable desktop browser.
```

---

# 43. UI wording rules

Use:

- **Connect Keyboard**
- **Disconnect**
- **Capture Current Keyboard**
- **Apply**
- **Load Profile**
- **Export**
- **Undo Apply**
- **Try Again**

Do not use:

- Import
- Flash
- Burn
- Program firmware

unless future functionality actually performs firmware operations.

"Apply" is preferable because the operation writes configuration rather than firmware.

---

# 44. Profile display metadata

Each profile card may show:

- name,
- description,
- source:
  - Built-in
  - Loaded
  - Captured
- capture date,
- expected device,
- layer count.

Do not display large raw arrays in the ordinary UI.

An optional developer/diagnostics view may show raw metadata.

---

# 45. Capture naming

After Capture completes, prompt for a profile name.

Example:

```text
Capture complete.

Profile name:
[ Gaming                         ]

[ Cancel ] [ Save Profile ]
```

"Save Profile" here means save to application memory, not server persistence.

Immediately offer Export.

Because there is no backend, make the behavior explicit:

```text
This captured profile is currently stored only in this browser session.
Export it to keep a portable copy.
```

Do not imply it has been uploaded.

---

# 46. Privacy model

This application should be privacy-simple.

By default:

- no keyboard state is uploaded,
- no profile is uploaded,
- no server API exists,
- no user account exists,
- no telemetry is required.

GitHub Pages serves static assets only.

Loaded files stay in the browser.

Captured keyboard state stays in the browser unless the user explicitly exports a file.

Built-in profiles are public if they are stored in a public repository/site.

---

# 47. Macro security warning

Profiles can contain macros.

A public built-in profile must be treated as public information.

Do not place:

- passwords,
- API keys,
- access tokens,
- private recovery codes,
- secret URLs,
- authentication material,

inside macros stored in a public repository.

The app may display a small informational warning when exporting or capturing macros, but avoid alarmist UX.

---

# 48. GitHub Pages hosting model

GitHub Pages is appropriate because this is a static application.

Deployment:

```text
GitHub repository
       |
       | push
       v
GitHub Actions
       |
       | npm ci
       | npm test
       | npm run build
       v
dist/
       |
       v
GitHub Pages
       |
       v
HTTPS public site
```

WebHID requires a secure context, and GitHub Pages provides HTTPS.

---

# 49. Vite GitHub Pages base path

Project Pages commonly use:

```text
https://USERNAME.github.io/REPOSITORY/
```

Vite must build assets using the correct base.

Options:

1. configure `base: "/REPOSITORY/"`,
2. derive a suitable base from deployment environment,
3. use a custom domain, allowing `/`.

Example:

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "/gmk67-recovery/",
});
```

If the repository name may change, avoid burying it throughout the code.

All profile asset URLs must respect this base.

---

# 50. GitHub Pages deployment workflow

Use the official GitHub Pages Actions workflow pattern.

Conceptually:

```yaml
name: Deploy Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - checkout
      - setup node
      - npm ci
      - npm test
      - npm run build
      - upload ./dist as Pages artifact

  deploy:
    environment:
      name: github-pages
    needs: build
    runs-on: ubuntu-latest
    steps:
      - deploy Pages artifact
```

When implementing, use the current supported major versions of the official GitHub actions.

Do not deploy if tests fail.

---

# 51. Browser compatibility policy

WebHID is not universally available.

The app should be useful even when WebHID is missing:

- users should still be able to view built-in profiles,
- Load may still validate a file,
- Export of already available profiles may still work.

But device functions must clearly be disabled.

Initial supported target:

```text
Desktop Chromium-based browser with WebHID enabled
```

Test at least:

- current Chrome desktop,
- current Edge desktop.

Do not promise Safari or Firefox WebHID support without verification.

Mobile is out of scope for v1.

---

# 52. Browser policy / managed-computer limitation

A borrowed or workplace-managed computer may block WebHID by policy.

This cannot be solved by the static app.

Provide a useful error such as:

```text
The browser could not access the keyboard.

Possible causes:
- WebHID is unavailable,
- device access is blocked by browser/administrator policy,
- another application is using the HID interface.
```

Do not suggest bypassing organizational security controls.

---

# 53. Testing architecture

The protocol layer must be testable without physical hardware.

Create a fake HID device/transport.

Example:

```ts
class FakeHidTransport implements HidTransport {
  sent: Uint8Array[] = [];
  responses: Uint8Array[] = [];

  async sendCommand(
    command: number,
    args = new Uint8Array(),
  ): Promise<Uint8Array> {
    // deterministic mocked behavior
  }
}
```

Tests should be able to assert exact bytes sent.

---

# 54. Unit tests

At minimum test:

## Byte utilities

- u16 encode/decode,
- array encode/decode,
- 0,
- 255,
- 256,
- 65535,
- malformed odd-length byte array.

## Packet builder

- command at byte 0,
- arguments begin at byte 1,
- output payload exactly 32 bytes,
- unused bytes zero-filled,
- oversized request rejected.

## Command queue

- operations stay FIFO,
- no overlap,
- error rejects only relevant promise,
- pending queue cancellation works,
- timeout releases queue.

## Keymap chunking

- exact 28-byte boundary,
- partial final chunk,
- multi-layer offsets,
- 6 × 16 × 4 example,
- no duplicate/missing bytes.

## Macro chunking

- zero bytes,
- exact boundary,
- partial boundary,
- max size,
- oversized buffer rejected.

## Profile validation

- valid profile,
- wrong schema,
- wrong schema version,
- missing keymap,
- wrong layer length,
- negative keycode,
- keycode > 65535,
- invalid macro byte,
- extreme arrays,
- wrong VID/PID metadata.

## Verification

- identical state passes,
- single key mismatch reports exact location,
- macro mismatch reports offset,
- encoder mismatch reports layer/id/direction,
- optional unsupported section handled correctly.

---

# 55. Integration tests with fake firmware

Implement a stateful fake VIA device.

It should emulate enough protocol behavior to test:

- protocol version,
- layer count,
- dynamic keymap buffer reads,
- dynamic keymap buffer writes,
- macro buffer,
- encoder reads/writes,
- malformed response injection,
- timeout injection,
- disconnect injection.

Then test:

```text
capture -> profile
profile -> apply
apply -> read-back verification
failed apply -> rollback
```

The most valuable integration assertion is:

```ts
const before = await capture(device);

mutateFakeDevice();

await apply(device, before);

const after = await capture(device);

expect(after.payload).toEqual(before.payload);
```

---

# 56. Real hardware bring-up plan

Do not begin with the full React product.

Create a small development diagnostic screen or script inside the app.

## Stage 1: connect

Verify:

- WebHID chooser shows the keyboard,
- device VID/PID match expectations,
- HID collection is usable,
- `device.open()` succeeds.

## Stage 2: protocol

Send:

```text
GET_PROTOCOL_VERSION
```

Log raw request and response in development mode.

Record actual protocol version from physical GMK67 V2.

## Stage 3: layer count

Send:

```text
DYNAMIC_KEYMAP_GET_LAYER_COUNT
```

Record actual count.

## Stage 4: read

Read one known matrix key.

Compare with VIA.

Then bulk-read one layer.

Then all layers.

Capture twice and confirm identical results when keyboard configuration has not changed.

## Stage 5: safe write

Before modifying anything:

- save complete raw capture to a local file.

Pick one harmless physical key.

Read original value.

Write a temporary value.

Confirm the key behavior changes.

Read it back.

Restore original value.

Confirm behavior and read-back.

## Stage 6: unplug persistence

Make a temporary configuration change.

Disconnect/reconnect power.

Confirm whether the configuration persists.

Restore original state.

## Stage 7: encoder

Read encoder values.

Modify and verify.

Restore.

## Stage 8: macros

Read macro metadata/buffer.

Test write/restore carefully.

## Stage 9: lighting

Only after core profile restore works.

---

# 57. Hardware test log

Create:

```text
docs/hardware-test-log.md
```

Record:

- exact board labeling,
- purchase/revision information if known,
- USB VID,
- USB PID,
- USB product string,
- firmware/VIA protocol version,
- matrix size,
- layer count,
- macro count,
- macro buffer size,
- encoder count,
- successful commands,
- unsupported commands,
- persistence behavior,
- Chrome version,
- OS,
- date tested.

This becomes the authoritative evidence for supported hardware.

Do not leave critical facts as assumptions in code comments once tested.

---

# 58. Logging

In production:

- keep user-visible logging concise.

In development:

- optional structured command diagnostics are useful.

Never log macro contents to remote services.

Suggested development log event:

```ts
{
  direction: "tx",
  command: "DYNAMIC_KEYMAP_GET_BUFFER",
  commandId: 0x12,
  args: [0, 0, 28]
}
```

Response:

```ts
{
  direction: "rx",
  command: "DYNAMIC_KEYMAP_GET_BUFFER",
  bytes: [...]
}
```

Provide a `DEBUG_HID` build/dev switch.

Avoid dumping everything in normal production console output.

---

# 59. Progress reporting

Model operations as steps.

Example:

```ts
type ApplyStage =
  | "validating"
  | "backing-up"
  | "writing-keymap"
  | "writing-macros"
  | "writing-encoders"
  | "writing-lighting"
  | "verifying"
  | "rolling-back"
  | "complete";
```

UI can display:

```text
Applying "Gaming"

✓ Validated profile
✓ Captured recovery backup
✓ Wrote keymap
→ Writing macros
○ Encoder mappings
○ Verification
```

This is more useful than an unexplained spinner.

---

# 60. State machine

Avoid scattered boolean flags like:

```ts
isLoading
isApplying
hasError
isConnected
```

A simple discriminated state is safer.

Example:

```ts
type AppOperation =
  | { kind: "idle" }
  | { kind: "connecting" }
  | { kind: "capturing"; stage: CaptureStage }
  | { kind: "applying"; stage: ApplyStage }
  | { kind: "error"; error: AppError };
```

Device connection state should be separate from operation state.

This reduces impossible UI combinations.

---

# 61. Accessibility

Basic requirements:

- every action is keyboard accessible,
- buttons use semantic `<button>`,
- progress/status changes use appropriate live regions,
- dialogs trap/focus correctly if dialogs are used,
- errors are text, not color-only,
- disabled actions explain why when necessary,
- adequate contrast,
- no tiny critical controls.

This is a small utility; accessibility should be straightforward.

---

# 62. No service worker required initially

Do not add PWA complexity in v1.

A service worker could later make the recovery tool available offline after first visit, which may actually be useful.

But it introduces:

- cache invalidation,
- versioning,
- stale built-in profile risks.

For initial reliability, ordinary online GitHub Pages hosting is sufficient.

Potential future feature:

```text
Install/offline recovery mode
```

Only add after profile/version update behavior is designed carefully.

---

# 63. Optional offline recovery enhancement

A future PWA could cache:

- application bundle,
- built-in profiles.

This could help when:

```text
keyboard reset + compatible borrowed computer + no internet
```

However, that only helps on a computer where the site was previously installed/cached, so it is not central to the "anywhere" recovery story.

A better independent backup remains an exported profile file.

---

# 64. Profile versioning strategy

Never silently reinterpret an old profile if semantics change.

Rules:

- schemaVersion increments for breaking format changes,
- newer app may include explicit migration functions,
- older app rejects unsupported future schema versions,
- built-in profiles should be validated during build/test.

Example:

```ts
function parseProfile(input: unknown): SupportedProfile {
  switch (getSchemaVersion(input)) {
    case 1:
      return parseV1(input);
    default:
      throw new UnsupportedProfileVersionError();
  }
}
```

---

# 65. Profile integrity / hash

A hash is optional for v1 but useful.

Potential metadata:

```json
{
  "integrity": {
    "algorithm": "SHA-256",
    "payloadHash": "..."
  }
}
```

This is **not** a signature and does not establish trust.

It only detects accidental modification/corruption.

If implemented, define canonical serialization first.

Do not add cryptographic signatures unless there is an actual threat model requiring them.

---

# 66. Trust model for built-in profiles

Built-in profiles come from the same GitHub Pages deployment as the application.

For a personal project, trust is effectively the repository/deployment trust boundary.

Loaded files are untrusted and require validation.

Do not execute code from profile files.

Profiles must remain pure data.

Never use `eval`, dynamic JavaScript, embedded expressions, or arbitrary HTML from a profile.

Escape profile name/description when rendering; React's normal text rendering is sufficient.

---

# 67. Dangerous operations explicitly excluded

The VIA protocol includes:

```text
EEPROM_RESET
BOOTLOADER_JUMP
```

Do not implement UI buttons for these.

The application is intended to recover from reset, not cause resets.

If low-level protocol constants exist for completeness, they should not be reachable from ordinary profile operations.

Consider omitting them entirely from the first public protocol wrapper.

---

# 68. Expected app behavior with no keyboard

Built-in profile browsing should still work.

Example:

```text
Gaming
GMK67 V2 · 4 layers
[ Connect to Apply ] [ Export ]
```

Exporting a built-in profile should not require hardware.

Loading and validating a file should not require hardware.

Only Capture/Apply need a connected keyboard.

---

# 69. Expected app behavior with wrong keyboard

If another HID device is selected or detected:

```text
Unsupported keyboard

Connected:
VID 0x1234
PID 0x5678

This version supports ZUOYA GMK67 V2 only.
```

Do not offer a "force apply" button in v1.

---

# 70. Expected behavior when VIA is open

VIA or another configurator might already have access to the HID interface.

The exact behavior depends on OS/browser/device.

If opening or communication fails:

```text
Could not open the GMK67 configuration interface.

Close VIA or other keyboard configuration software and try again.
```

Do not assume this is always the cause; phrase it as a possibility.

---

# 71. Build-time validation of built-in profiles

Add a script/test that scans:

```text
public/profiles/index.json
```

and validates every referenced profile.

CI should fail if:

- a file is missing,
- JSON is invalid,
- schema validation fails,
- manifest ID duplicates exist,
- file names escape profile directory,
- profile device is unsupported.

This prevents deploying a recovery site with broken canonical backups.

---

# 72. Suggested npm scripts

Example:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "eslint .",
    "check:profiles": "tsx scripts/check-profiles.ts",
    "check": "npm run lint && npm run test && npm run check:profiles && npm run build"
  }
}
```

Exact tooling can vary.

The key is that CI validates profiles and protocol code before deployment.

---

# 73. Coding principles for Codex

Codex should prioritize:

1. correctness over cleverness,
2. explicit byte manipulation,
3. small pure functions,
4. protocol isolation from React,
5. runtime validation,
6. typed errors,
7. deterministic tests,
8. no hidden server assumptions,
9. no profile semantic translation unless required,
10. no write without compatibility checks.

Avoid premature abstractions that obscure packet layout.

---

# 74. Suggested implementation interfaces

## Transport

```ts
export interface ViaTransport {
  command(
    command: number,
    args?: Uint8Array,
    timeoutMs?: number,
  ): Promise<Uint8Array>;

  close(): Promise<void>;
}
```

## VIA protocol

```ts
export interface ViaProtocolClient {
  getProtocolVersion(): Promise<number>;
  getLayerCount(): Promise<number>;

  getKey(layer: number, row: number, col: number): Promise<number>;
  setKey(
    layer: number,
    row: number,
    col: number,
    keycode: number,
  ): Promise<void>;

  readKeymapBuffer(offset: number, size: number): Promise<Uint8Array>;
  writeKeymapBuffer(offset: number, data: Uint8Array): Promise<void>;

  getMacroCount(): Promise<number>;
  getMacroBufferSize(): Promise<number>;
  readMacroBuffer(): Promise<Uint8Array>;
  writeMacroBuffer(data: Uint8Array): Promise<void>;

  getEncoder(
    layer: number,
    encoderId: number,
    clockwise: boolean,
  ): Promise<number>;

  setEncoder(
    layer: number,
    encoderId: number,
    clockwise: boolean,
    keycode: number,
  ): Promise<void>;
}
```

## Profile service

```ts
export interface ProfileService {
  capture(
    client: ViaProtocolClient,
    device: DeviceCapabilities,
  ): Promise<Gmk67ProfileV1>;

  apply(
    client: ViaProtocolClient,
    device: DeviceCapabilities,
    profile: Gmk67ProfileV1,
  ): Promise<ApplyResult>;

  verify(
    client: ViaProtocolClient,
    device: DeviceCapabilities,
    profile: Gmk67ProfileV1,
  ): Promise<VerificationResult>;
}
```

---

# 75. Capture implementation pseudo-code

```ts
async function captureGmk67(
  client: ViaProtocolClient,
  capabilities: DeviceCapabilities,
  name: string,
): Promise<Gmk67ProfileV1> {
  const {
    matrix,
    layerCount,
  } = capabilities;

  const layers: number[][] = [];

  for (let layer = 0; layer < layerCount; layer++) {
    layers.push(
      await readFullLayer(
        client,
        layer,
        matrix.rows,
        matrix.cols,
      ),
    );
  }

  const macros = await captureMacrosIfSupported(
    client,
    capabilities,
  );

  const encoders = await captureEncodersIfSupported(
    client,
    capabilities,
  );

  const lighting = await captureLightingIfSupported(
    client,
    capabilities,
  );

  const profile: Gmk67ProfileV1 = {
    schema: "gmk67-profile",
    schemaVersion: 1,
    name,
    createdAt: new Date().toISOString(),
    device: {
      adapter: "gmk67-v2",
      vendorId: capabilities.vendorId,
      productId: capabilities.productId,
      matrixRows: matrix.rows,
      matrixCols: matrix.cols,
      viaProtocolVersion: capabilities.viaProtocolVersion,
    },
    keymap: {
      layerCount,
      layers,
    },
    macros,
    encoders,
    lighting,
  };

  return validateProfile(profile);
}
```

---

# 76. Apply implementation pseudo-code

```ts
async function applyProfile(
  client: ViaProtocolClient,
  capabilities: DeviceCapabilities,
  profile: Gmk67ProfileV1,
  onProgress: ProgressCallback,
): Promise<ApplyResult> {
  onProgress("validating");

  validateProfile(profile);
  assertCompatible(capabilities, profile);

  onProgress("backing-up");

  const backup = await captureGmk67(
    client,
    capabilities,
    "Automatic pre-apply backup",
  );

  try {
    onProgress("writing-keymap");
    await writeFullKeymap(client, profile.keymap);

    if (profile.macros?.supported) {
      onProgress("writing-macros");
      await restoreMacros(client, capabilities, profile.macros);
    }

    if (profile.encoders?.supported) {
      onProgress("writing-encoders");
      await restoreEncoders(client, capabilities, profile.encoders);
    }

    if (profile.lighting?.supported) {
      onProgress("writing-lighting");
      await restoreLighting(client, capabilities, profile.lighting);
    }

    onProgress("verifying");

    const verification = await verifyProfile(
      client,
      capabilities,
      profile,
    );

    if (!verification.ok) {
      throw new VerificationError(verification);
    }

    onProgress("complete");

    return {
      ok: true,
      backup,
      verification,
    };
  } catch (applyError) {
    onProgress("rolling-back");

    const rollbackResult = await attemptRollback(
      client,
      capabilities,
      backup,
    );

    throw new ApplyFailedError({
      applyError,
      rollbackResult,
    });
  }
}
```

---

# 77. Do not compare irrelevant metadata during verification

Verification should compare device state, not metadata such as:

- profile name,
- description,
- createdAt,
- capturedBy.

Normalize and compare only recoverable payload sections.

Example:

```ts
function profilePayload(profile: Gmk67ProfileV1) {
  return {
    keymap: profile.keymap,
    macros: profile.macros,
    encoders: profile.encoders,
    lighting: profile.lighting,
  };
}
```

---

# 78. Verification difference reporting

Make differences useful for developers.

Examples:

```ts
{
  section: "keymap",
  layer: 2,
  index: 47,
  expected: 0x1234,
  actual: 0x0000
}
```

```ts
{
  section: "macros",
  offset: 123,
  expected: 65,
  actual: 0
}
```

```ts
{
  section: "encoder",
  encoderId: 0,
  layer: 1,
  direction: "clockwise",
  expected: 0x00e9,
  actual: 0x00ea
}
```

User-facing UI may summarize these while keeping exact details in an expandable Diagnostics view.

---

# 79. Profile source model

Use:

```ts
type ProfileSource =
  | { kind: "builtin"; id: string; url: string }
  | { kind: "loaded"; filename: string }
  | { kind: "captured" };
```

This allows UI labels without changing the profile data itself.

Do not embed local file paths into profile JSON.

---

# 80. No backend clarification

Codex must not accidentally create server endpoints for Load/Export.

## Load

```text
local disk -> browser memory
```

## Export

```text
browser memory -> local disk
```

## Built-in profile

```text
GitHub Pages static JSON -> browser memory
```

## Apply

```text
browser memory -> WebHID -> keyboard
```

## Capture

```text
keyboard -> WebHID -> browser memory
```

There is no HTTP API for profile mutation.

---

# 81. Recovery availability strategy

The user's canonical configurations should live in the repository as static built-in profiles.

That achieves the core requirement:

> Configurations remain available even without the personal laptop.

Recommended redundancy:

- canonical copies in GitHub repo / GitHub Pages,
- exported `.json` copies in another cloud file storage location,
- optionally a local USB copy.

The web application itself only needs the GitHub-hosted copies for ordinary recovery.

---

# 82. README requirements

The repository README should include:

- what the app does,
- target hardware,
- strong V2-only caveat,
- supported browsers,
- privacy model,
- how to run locally,
- how to capture/export a profile,
- how to add a built-in profile,
- how to deploy Pages,
- troubleshooting,
- warning about public macro contents,
- hardware compatibility status,
- link to protocol/research references.

---

# 83. First prototype UI

Before building polished profile cards, Codex should create a diagnostic prototype.

Suggested initial screen:

```text
GMK67 Protocol Test

WebHID: Supported

[ Connect GMK67 ]

Device:
VID: -
PID: -
Protocol: -
Layers: -

[ Read Device Info ]
[ Read Keymap ]
[ Capture Raw Profile ]

Development only:
[ Test Single Key Read ]
```

Do **not** add arbitrary destructive write buttons until backup and restore logic exists.

For the first single-key write experiment, gate it behind development mode and require explicit code configuration of the target matrix coordinate.

---

# 84. Implementation phases

## Phase 0 — repository/bootstrap

Deliver:

- Vite + React + TypeScript project,
- lint/test setup,
- Pages build configuration,
- empty profile manifest,
- browser support detection.

Acceptance:

- `npm run build` succeeds,
- app runs locally,
- GitHub Pages build can be produced.

## Phase 1 — WebHID transport

Deliver:

- Connect button,
- device filter,
- open/close,
- Raw HID collection check,
- 32-byte packet builder,
- input report listener,
- command queue,
- timeouts,
- typed errors.

Acceptance:

- fake transport tests pass,
- real GMK67 can connect.

## Phase 2 — basic VIA inspection

Deliver:

- protocol version,
- layer count,
- one-key read,
- bulk keymap read.

Acceptance:

- capture of the same unmodified keyboard twice is identical,
- values correspond with expected VIA configuration.

## Phase 3 — safe keymap restore

Deliver:

- automatic pre-write capture,
- bulk keymap write,
- read-back verification,
- rollback.

Acceptance:

- known keymap can be changed and restored,
- restore survives power cycle if firmware normally persists VIA state,
- induced verification failure triggers rollback.

## Phase 4 — profile system

Deliver:

- v1 schema,
- validation,
- built-in profiles,
- Load,
- Export,
- Capture,
- Apply UI.

Acceptance:

- exported file can be loaded on a different browser/computer,
- loaded file validates,
- built-in file and loaded copy produce same device state.

## Phase 5 — encoder support

Acceptance:

- encoder directions on all layers can be captured, changed, restored, verified.

## Phase 6 — macro support

Acceptance:

- macro buffer round-trip works,
- failed/incomplete macro write cannot leave unreported state,
- verification succeeds after restore.

## Phase 7 — lighting

Optional for initial release.

Acceptance:

- supported lighting values round-trip,
- unsupported lighting does not break core restore.

## Phase 8 — polish

Deliver:

- progress UI,
- diagnostics,
- mobile/unsupported-browser messaging,
- README,
- hardware test log,
- CI profile validation.

---

# 85. MVP release acceptance criteria

The first meaningful release is ready when all of the following are true:

- static GitHub Pages deployment works over HTTPS,
- current Chrome desktop can connect to a tested GMK67 V2,
- device mismatch is blocked,
- protocol version is read,
- layer count is read,
- complete raw keymap can be captured,
- captured profile can be exported,
- exported profile can be loaded using **Load Profile**,
- built-in profiles can be fetched from static JSON,
- Apply creates a recovery backup first,
- Apply writes the complete keymap,
- Apply performs read-back verification,
- keymap mismatch is detected,
- failure triggers a rollback attempt,
- successful rollback is verified,
- successful Apply produces a clear success state,
- no backend requests exist for profile storage,
- no EEPROM-reset or bootloader command is exposed,
- CI validates built-in profiles,
- README explains V2 hardware limitation.

Macro, encoder, and RGB features can be staged if necessary, but the UI must accurately describe what a profile contains.

---

# 86. Definition of "complete restore"

Do not use the phrase "complete restore" until hardware testing confirms all relevant profile sections.

Possible release labels:

## Keymap-only MVP

Restores:

- raw keymap layers.

Does not yet restore:

- macros,
- encoder mappings,
- RGB.

## Core profile release

Restores:

- keymap,
- encoder,
- macros.

## Full tested profile release

Restores:

- keymap,
- encoder,
- macros,
- supported lighting values.

The UI/profile metadata should make supported sections explicit.

---

# 87. Known uncertainty list

Codex should preserve these as explicit TODOs until tested:

1. Actual VIA protocol version reported by the user's physical GMK67 V2.
2. Whether all GMK67 V2 units use VID `0x36B0` / PID `0x3068`.
3. Exact macro count and macro buffer size.
4. Whether macro behavior exactly matches current VIA implementation.
5. Exact number of dynamic layers.
6. Whether encoder commands work exactly as expected on this firmware.
7. Whether RGB custom menu values persist immediately or require explicit save.
8. Whether configuration persists across USB power cycles exactly as VIA-created state does.
9. Whether the keyboard exposes any firmware/version value useful for stricter compatibility checking.
10. Whether multiple GMK67 V2 firmware revisions need distinct adapter compatibility rules.

Do not "resolve" these from inference alone.

Use real device tests.

---

# 88. Research references

These are useful starting references. Codex should treat current upstream sources as authoritative for protocol behavior and the community GMK67 definition as hardware evidence that still requires physical verification.

## VIA web application source

Repository:

https://github.com/the-via/app

Relevant areas:

```text
src/utils/keyboard-api.ts
src/shims/node-hid.ts
src/components/panes/configure-panes/save-load.tsx
src/store/keymapSlice.ts
```

Current source demonstrates:

- WebHID usage,
- usage page / usage filtering,
- command IDs,
- 32-byte report behavior,
- keymap buffer chunking,
- macro buffer operations,
- encoder operations,
- layout save/load behavior.

## VIA documentation

https://caniusevia.com/docs/

Useful pages:

https://caniusevia.com/docs/configuring_qmk/
https://caniusevia.com/docs/specification/
https://caniusevia.com/docs/layouts/
https://caniusevia.com/docs/custom_ui/

## QMK Raw HID documentation

https://docs.qmk.fm/features/rawhid

Current defaults documented there include:

```text
RAW_USAGE_PAGE = 0xFF60
RAW_USAGE_ID   = 0x61
```

## WebHID / MDN

https://developer.mozilla.org/en-US/docs/Web/API/WebHID_API
https://developer.mozilla.org/en-US/docs/Web/API/HID/requestDevice
https://developer.mozilla.org/en-US/docs/Web/API/HID/getDevices
https://developer.mozilla.org/en-US/docs/Web/API/HIDDevice/open

Important constraints:

- secure context,
- permission chooser,
- limited browser availability.

## GitHub Pages

https://docs.github.com/en/pages
https://docs.github.com/en/pages/getting-started-with-github-pages/securing-your-github-pages-site-with-https

## GMK67 V2 community VIA definition

Repository:

https://github.com/Hixo23/Gmk67-json

Observed definition:

```text
ZUOYA GMK67 V2.JSON
```

Current observed fields include:

```text
name      ZUOYA GMK67 V2
vendorId  0x36B0
productId 0x3068
matrix    6 x 16
encoder   e0
```

and custom RGB/keycode definitions.

Again: verify against the actual target keyboard.

---

# 89. Licensing note

The VIA app repository is GPL-3.0 licensed.

If this project needs a different licensing model, avoid copying substantial VIA implementation code verbatim.

Implement the protocol independently from:

- documented behavior,
- observed command framing,
- public protocol definitions.

Small constants/protocol facts are not the same as copying VIA's application implementation, but Codex should not wholesale copy files from VIA.

If licensing becomes commercially important, obtain proper legal advice.

---

# 90. Recommended first tasks for Codex

Start here, in order.

## Task 1

Create the Vite + React + TypeScript project.

Add:

- Vitest,
- browser capability check,
- GitHub Pages-compatible Vite base configuration.

## Task 2

Implement and unit-test:

```text
src/hid/byte-utils.ts
src/hid/via-commands.ts
src/hid/packet.ts
```

Must include:

- exact 32-byte report payload,
- u16 conversion,
- 28-byte chunk helpers.

## Task 3

Implement:

```text
src/hid/webhid.ts
src/hid/command-queue.ts
```

Do not yet implement profile writes.

## Task 4

Build a diagnostic Connect panel.

Display:

- vendor ID,
- product ID,
- product name,
- opened status.

Validate expected VIA Raw HID collection.

## Task 5

Implement:

```text
getProtocolVersion()
getLayerCount()
```

Verify them on real hardware.

Record actual results in `docs/hardware-test-log.md`.

## Task 6

Implement one-key read and bulk keymap read.

Do not implement arbitrary write UI yet.

## Task 7

Implement the profile v1 types and runtime validator.

Add exhaustive validator tests.

## Task 8

Implement Capture + Export.

At this point, the project already provides useful read-only backups.

## Task 9

Implement Load.

Use the exact UI wording:

```text
Load Profile
```

Never "Import".

## Task 10

Implement safe Apply:

- compatibility check,
- backup,
- keymap write,
- verification,
- rollback.

Only after this is proven should encoder/macros/lighting be added.

---

# 91. Codex operating instruction

When implementing this specification:

- do not assume untested GMK67 firmware behavior,
- do not invent a backend,
- do not replace "Load" with "Import",
- do not turn the project into a VIA clone,
- do not expose firmware-reset commands,
- do not skip pre-apply backup,
- do not skip read-back verification,
- do not silently accept device/profile mismatches,
- do not translate raw keycodes unless required,
- do not add cloud/auth infrastructure without a changed requirement,
- keep protocol code independently testable,
- document every hardware fact that was verified on a real unit.

If a protocol detail conflicts with current upstream VIA/QMK behavior, inspect the current upstream source and adjust the implementation rather than forcing this specification literally.

The purpose of this document is to preserve product intent and safety boundaries, not to override newer authoritative protocol facts.

---

# 92. Final target experience

The desired end state should feel this simple:

```text
GMK67 Recovery

● GMK67 V2 connected

Profiles

Default
[ Apply ] [ Export ]

Work
[ Apply ] [ Export ]

Gaming
[ Apply ] [ Export ]

Mac
[ Apply ] [ Export ]

[ Load Profile ]
[ Capture Current Keyboard ]
```

Recovery from a reset:

```text
borrow computer
     |
plug in GMK67
     |
open GitHub Pages URL
     |
Connect Keyboard
     |
select Gaming
     |
Apply
     |
automatic backup
     |
write
     |
read back
     |
verified
     |
done
```

That is the product.

Everything else is secondary.

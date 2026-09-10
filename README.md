# GMK67 Recovery

A static, browser-to-keyboard recovery tool for the **ZUOYA GMK67 V2**. It uses WebHID over USB; profiles stay in the browser and are never uploaded.

This is a keymap-only MVP. It captures all 6 × 16 raw matrix positions on every dynamic layer, exports/loads versioned JSON, performs a pre-Apply backup, verifies read-back, and tries to roll back on failure. Macro, encoder, and RGB restoration are deliberately not supported yet, so profiles containing them are rejected.

## Use it

1. Open the site in a supported desktop Chromium-based browser.
2. Plug the GMK67 V2 in over USB and choose **Connect keyboard**.
3. Choose a profile, then choose **Apply**. The current keymap is captured before it is changed.
4. Use **Capture current keyboard** to make a portable backup, then **Export** it.

Do not use it with older GMK67 models or untested firmware variants. Close VIA or other configurators if the keyboard cannot be opened.

## Add built-in profiles

Put each exported JSON profile in `public/profiles/`, then list it in `public/profiles/index.json`:

```json
{
  "profiles": [{ "id": "gaming", "name": "Gaming", "file": "gaming.json" }]
}
```

Run `npm run check:profiles` before publishing. Built-in profiles are public static files: do not commit macros or notes you would not want publicly visible.

## Development and Pages

```sh
npm install
npm run dev
npm run check
```

The included workflow deploys the `main` branch to GitHub Pages. If your repository name differs from `GMK67-Profile-Loader-Web`, update the `base` path in `vite.config.ts`.

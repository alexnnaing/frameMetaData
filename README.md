# EXIFrame.

A browser-based tool that adds a clean white border and EXIF metadata footer to photos. No uploads, no account, no server — everything runs locally in the browser.

## Features

- Adjustable white border (3–12% of the long edge, in 0.5% steps)
- EXIF metadata footer: camera, lens, focal length, aperture, shutter speed, ISO, megapixels, resolution
- Per-field toggles — choose exactly which fields appear in the footer (megapixels and resolution are off by default)
- Aspect ratio crop: 16 presets across Standard and Social media groups (see table below)
- Three export formats: PNG lossless, JPEG max quality, JPEG compressed
- Collapsible debug log panel with timestamped, colour-coded entries and one-click copy
- Reset button to clear the current photo and start over

## Aspect Ratio Presets

| Group | Preset | Ratio |
|---|---|---|
| Standard | Native | original — no crop |
| Standard | Square | 1:1 |
| Standard | Portrait | 4:5 |
| Standard | Classic | 3:2 |
| Standard | Classic | 4:3 |
| Standard | Widescreen | 16:9 |
| Standard | Cinematic | 2.39:1 |
| Social media | Instagram Feed | 1:1 |
| Social media | Instagram Portrait | 4:5 |
| Social media | Instagram Landscape | 1.91:1 |
| Social media | Stories · Reels · TikTok | 9:16 |
| Social media | YouTube Thumbnail | 16:9 |
| Social media | Pinterest | 2:3 |
| Social media | Facebook · LinkedIn | 1.91:1 |
| Social media | Twitter · X | 16:9 |

All crops are centre-cropped from the source image.

## Export Formats

| Format | Quality | Output filename |
|---|---|---|
| PNG — Lossless | lossless | `originalname_framed.png` |
| JPEG — Max quality | 100% | `originalname_framed_hq.jpg` |
| JPEG — Compressed | 82% | `originalname_framed.jpg` |

## Supported Formats

| Format | Extensions |
|---|---|
| JPEG, PNG, WebP, and other browser-native formats | `image/*` |
| Apple HEIC / HEIF | `.heic` `.heif` |
| Fuji RAW | `.raf` |
| Canon RAW | `.cr2` `.cr3` |
| Nikon RAW | `.nef` `.nrw` |
| Sony RAW | `.arw` `.sr2` `.srf` |
| Adobe / Apple DNG | `.dng` |

RAW files are handled by extracting the embedded JPEG preview that cameras write into every RAW file. This is the camera's own processed, colour-corrected version of the shot. EXIF metadata is always read from the original RAW file, not the preview.

## Usage

1. Open [this link](https://alexnnaing.github.io/frameMetaData/) in any modern browser (Chrome, Firefox, Safari, Edge)
2. Drop a photo onto the upload area, or click to browse
3. Adjust border width and aspect ratio as needed
4. Toggle which EXIF fields appear in the footer
5. Select an export format (PNG lossless, JPEG max, or JPEG compressed) and click **Download**

## Debug Log

A collapsible **Debug log** panel sits at the bottom of the page. Click it to expand. It shows a timestamped trace of every step — file detection, EXIF parsing, RAW extraction, image decode, preview render, and download — colour-coded by severity:

| Colour | Meaning |
|---|---|
| Grey | Info / progress |
| Green | Success |
| Amber | Warning (e.g. fallback parser used) |
| Red | Error |

Click **Copy log** to copy all entries to the clipboard. Use it to diagnose why a particular file isn't loading or why metadata is missing — it can also be pasted into the [feedback form](https://alexnnaing.github.io/frameMetaData/feedback.html).

## Pages

| File | Purpose |
|---|---|
| `index.html` | Main app |
| `feedback.html` | Bug reports and feature requests (Formspree-powered form) |
| `privacy.html` | Privacy policy, including GitHub Pages hosting disclosure |
| `legal.html` | MIT license and third-party dependency licences |

## File Structure

```
index.html      markup, inline FrameLog logger
styles.css      all styles, including debug panel and all sub-pages
app.js          application logic
raw.js          RAW format preview extractor (RAF, CR2/3, NEF, ARW, DNG)
feedback.html   feedback & bug report form
privacy.html    privacy policy
legal.html      MIT license
```

## Dependencies (CDN, no install needed)

| Library | Provider | Purpose | Load |
|---|---|---|---|
| [Fraunces](https://fonts.google.com/specimen/Fraunces) | Google Fonts | Primary serif typeface | Eager |
| [JetBrains Mono](https://fonts.google.com/specimen/JetBrains+Mono) | Google Fonts | Monospace labels and metadata | Eager |
| [exifr](https://github.com/MikeKovarik/exifr) full bundle v7.1.3 | jsDelivr | EXIF/TIFF metadata reading, including RAW formats | Eager |
| [heic2any](https://github.com/alexcorvi/heic2any) v0.0.4 | jsDelivr | HEIC → JPEG conversion | Lazy — only on first HEIC file |
| [@formspree/ajax](https://github.com/formspree/formspree-js) v1 | unpkg | Feedback form submission | Deferred — feedback page only |

## Privacy

Images are never uploaded anywhere. All decoding, EXIF parsing, and rendering happens inside the browser tab. Closing the tab leaves no trace.

This site is hosted on GitHub Pages. GitHub may collect standard server access logs (IP address, user-agent, referrer, timestamp) as part of normal hosting. GitHub does not inject analytics or tracking into pages hosted on GitHub Pages. See GitHub's [Privacy Statement](https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement) and the full [privacy policy](https://alexnnaing.github.io/frameMetaData/privacy.html) for details.

## License

MIT License

Copyright (c) 2026 alexnaing

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

---

**EXIFrame.** &nbsp;·&nbsp; v1.6 &nbsp;·&nbsp; Author: [alexnaing](https://github.com/alexnnaing)

# Frame.

A browser-based tool that adds a clean white border and EXIF metadata footer to photos. No uploads, no account, no server — everything runs locally in the browser.

## Features

- Adjustable white border (3–12% of the long edge)
- EXIF metadata footer: camera, lens, focal length, aperture, shutter speed, ISO, megapixels, resolution
- Per-field toggles — choose exactly what shows in the footer
- Aspect ratio crop: Native, Square 1:1, Portrait 4:5, Classic 3:2
- Lossless PNG export at full native resolution
- Collapsible debug log panel for diagnosing file issues

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
5. Click **Download** to save the framed image as a lossless PNG

## Debug Log

A collapsible **Debug log** panel sits at the bottom of the page. Click it to expand. It shows a timestamped trace of every step — file detection, EXIF parsing, RAW extraction, image decode, preview render, and download — colour-coded by severity:

| Colour | Meaning |
|---|---|
| Grey | Info / progress |
| Green | Success |
| Amber | Warning (e.g. fallback parser used) |
| Red | Error |

Use it to diagnose why a particular file isn't loading or why metadata is missing.

## File Structure

```
index.html   markup and inline FrameLog logger
styles.css   all styles, including debug panel
raw.js       RAW format preview extractor (RAF, CR2/3, NEF, ARW, DNG)
app.js       application logic
```

## Dependencies (CDN, no install needed)

| Library | Purpose |
|---|---|
| [exifr](https://github.com/MikeKovarik/exifr) full bundle | EXIF/TIFF metadata reading, including RAW formats |
| [heic2any](https://github.com/alexcorvi/heic2any) | HEIC → JPEG conversion (lazy-loaded on first HEIC file) |

## Privacy

Images are never uploaded anywhere. All decoding, EXIF parsing, and rendering happens inside the browser tab. Closing the tab leaves no trace.

## License

MIT License

Copyright (c) 2026 alexnaing

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

---

**Frame.** &nbsp;·&nbsp; v1.6 &nbsp;·&nbsp; Author: [alexnaing](https://github.com/alexnnaing)

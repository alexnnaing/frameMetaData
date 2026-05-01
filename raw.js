/**
 * RAW format preview extractor.
 * Supports: Fuji RAF, Canon CR2/CR3, Nikon NEF/NRW, Sony ARW/SR2/SRF, Apple/Adobe DNG.
 * Strategy: extract the largest embedded JPEG preview from each format.
 * All parsers read from an ArrayBuffer so the original File is never mutated.
 */
(function (global) {
  'use strict';

  const RAW_EXTS = new Set(['raf', 'cr2', 'cr3', 'nef', 'nrw', 'arw', 'sr2', 'srf', 'dng']);

  function fileExt(file) {
    return (file.name || '').split('.').pop().toLowerCase();
  }

  function isRaw(file) {
    return RAW_EXTS.has(fileExt(file));
  }

  async function extractRawPreview(file) {
    const L = global.FrameLog || { info: () => {}, ok: () => {}, warn: () => {}, error: () => {} };

    const e      = fileExt(file);
    const sizeMB = (file.size / 1024 / 1024).toFixed(1);
    L.info('RAW · ' + file.name + ' — ' + e.toUpperCase() + ', ' + sizeMB + ' MB');
    L.info('RAW · reading ArrayBuffer…');

    const buf = await file.arrayBuffer();
    L.info('RAW · buffer ready — ' + (buf.byteLength / 1024 / 1024).toFixed(1) + ' MB');

    let blob = null;
    let parser = '';

    if (e === 'raf') {
      parser = 'RAF header';
      L.info('RAW · trying RAF header parser');
      blob = fromRaf(buf);
    } else if (e === 'cr3') {
      parser = 'CR3 ISOBMFF';
      L.info('RAW · trying CR3 ISOBMFF parser');
      blob = fromCr3(buf);
    } else {
      parser = 'TIFF IFD';
      L.info('RAW · trying TIFF IFD parser (' + e.toUpperCase() + ')');
      blob = fromTiff(buf);
    }

    if (blob) {
      L.ok('RAW · ' + parser + ': preview extracted — ' + (blob.size / 1024).toFixed(0) + ' KB');
    } else {
      L.warn('RAW · ' + parser + ' parser returned null — falling back to byte scan');
      blob = fromScan(buf);
      if (blob) {
        L.ok('RAW · scan fallback: found preview — ' + (blob.size / 1024).toFixed(0) + ' KB');
      } else {
        L.error('RAW · no embedded JPEG found in file');
      }
    }

    return blob;
  }

  // ---------------------------------------------------------------------------
  // TIFF-based RAW files (CR2, NEF, NRW, ARW, SR2, SRF, DNG)
  // Walk the IFD chain and every SubIFD; collect all JPEGInterchangeFormat blobs;
  // return the largest one (= the full-size embedded preview).
  // ---------------------------------------------------------------------------
  function fromTiff(buf) {
    const v = new DataView(buf);
    const bom = v.getUint16(0, false);
    if (bom !== 0x4949 && bom !== 0x4D4D) return null;
    const le = bom === 0x4949;
    const r16 = o => v.getUint16(o, le);
    const r32 = o => v.getUint32(o, le);
    if (r16(2) !== 42) return null; // TIFF magic

    const found = [];
    const seen  = new Set();

    function ifd(off) {
      if (!off || off < 8 || off + 2 >= buf.byteLength || seen.has(off)) return;
      seen.add(off);

      let n;
      try { n = r16(off); } catch (_) { return; }
      if (n < 1 || n > 2000) return;

      let jOff = 0, jLen = 0;
      const subs = [];

      for (let i = 0; i < n; i++) {
        const b = off + 2 + i * 12;
        if (b + 12 > buf.byteLength) break;
        const tag = r16(b);
        const cnt = r32(b + 4);
        const val = r32(b + 8);

        if      (tag === 0x0201) jOff = val;  // JPEGInterchangeFormat
        else if (tag === 0x0202) jLen = val;  // JPEGInterchangeFormatLength
        else if (tag === 0x014A) {            // SubIFD — can be an array of offsets
          if (cnt === 1) {
            subs.push(val);
          } else {
            for (let k = 0; k < Math.min(cnt, 8); k++) {
              const p = val + k * 4;
              if (p + 4 <= buf.byteLength) subs.push(r32(p));
            }
          }
        }
        // Don't recurse into ExifIFD (0x8769) — it holds settings, not images
      }

      if (jOff && jLen && jOff + 2 <= buf.byteLength) {
        try { if (v.getUint16(jOff, false) === 0xFFD8) found.push({ o: jOff, l: jLen }); }
        catch (_) {}
      }

      // Next IFD in chain
      const nxtPtr = off + 2 + n * 12;
      if (nxtPtr + 4 <= buf.byteLength) {
        const nxt = r32(nxtPtr);
        if (nxt) ifd(nxt);
      }

      subs.forEach(ifd);
    }

    try { ifd(r32(4)); } catch (_) {}

    if (!found.length) return null;
    found.sort((a, b) => b.l - a.l);
    const { o, l } = found[0];
    return new Blob([buf.slice(o, o + l)], { type: 'image/jpeg' });
  }

  // ---------------------------------------------------------------------------
  // Fuji RAF
  // Header at offset 84/88 (big-endian) gives JPEG offset + length.
  // Newer bodies sometimes shift those fields; try a few known locations.
  // ---------------------------------------------------------------------------
  function fromRaf(buf) {
    const sig = String.fromCharCode(...new Uint8Array(buf, 0, 16));
    if (!sig.startsWith('FUJIFILMCCD-RAW')) return null;

    const v = new DataView(buf);
    // [jpeg-offset-field, jpeg-length-field] — big-endian uint32s
    const candidates = [[84, 88], [100, 104], [56, 60]];
    for (const [offAt, lenAt] of candidates) {
      if (offAt + 8 > buf.byteLength) continue;
      const jOff = v.getUint32(offAt, false);
      const jLen = v.getUint32(lenAt, false);
      if (jOff > 100 && jLen > 10000 && jOff + jLen <= buf.byteLength) {
        try {
          if (v.getUint16(jOff, false) === 0xFFD8)
            return new Blob([buf.slice(jOff, jOff + jLen)], { type: 'image/jpeg' });
        } catch (_) {}
      }
    }
    return null;
  }

  // ---------------------------------------------------------------------------
  // Canon CR3 (ISO Base Media File Format / ISOBMFF)
  // Walk top-level boxes; each `mdat` box that starts with JPEG SOI is a candidate.
  // The largest such mdat is the full-size preview.
  // ---------------------------------------------------------------------------
  function fromCr3(buf) {
    const v = new DataView(buf);
    let off = 0;
    const found = [];

    while (off + 8 < buf.byteLength) {
      const sz = v.getUint32(off, false);
      if (sz < 8 || off + sz > buf.byteLength) break;

      const type = String.fromCharCode(
        v.getUint8(off + 4), v.getUint8(off + 5),
        v.getUint8(off + 6), v.getUint8(off + 7)
      );

      if (type === 'mdat') {
        const dOff = off + 8;
        const dLen = sz - 8;
        try {
          if (dLen > 1000 && v.getUint16(dOff, false) === 0xFFD8)
            found.push({ o: dOff, l: dLen });
        } catch (_) {}
      }

      off += sz;
    }

    if (!found.length) return null;
    found.sort((a, b) => b.l - a.l);
    return new Blob([buf.slice(found[0].o, found[0].o + found[0].l)], { type: 'image/jpeg' });
  }

  // ---------------------------------------------------------------------------
  // Universal fallback: scan for JPEG SOI (FF D8 FF) + EOI (FF D9).
  // JPEG byte-stuffing guarantees FF D9 only appears as the real end marker,
  // so this is reliable. Collects all candidates, returns the largest.
  // ---------------------------------------------------------------------------
  function fromScan(buf) {
    const b = new Uint8Array(buf);
    const n = b.length;
    const found = [];

    for (let i = 0; i < n - 3; i++) {
      // Require SOI followed immediately by a marker byte (FF D8 FF xx)
      if (b[i] !== 0xFF || b[i + 1] !== 0xD8 || b[i + 2] !== 0xFF) continue;

      // Search forward for the first EOI
      for (let j = i + 100; j < n - 1; j++) {
        if (b[j] === 0xFF && b[j + 1] === 0xD9) {
          found.push({ o: i, l: j + 2 - i });
          i = j; // skip past this JPEG before looking for the next
          break;
        }
      }
    }

    if (!found.length) return null;
    found.sort((a, b) => b.l - a.l);
    const best = found[0];
    return new Blob([buf.slice(best.o, best.o + best.l)], { type: 'image/jpeg' });
  }

  // Expose API
  global.RawDecoder = { isRaw, extractRawPreview };

})(window);

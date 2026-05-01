(function () {
  'use strict';

  if (window.FrameLog) window.FrameLog.init();
  const L = window.FrameLog || { info: () => {}, ok: () => {}, warn: () => {}, error: () => {} };

  const fileInput  = document.getElementById('file');
  const drop       = document.getElementById('drop');
  const dropLabel  = document.getElementById('dropLabel');
  const stage      = document.getElementById('stage');
  const borderEl   = document.getElementById('border');
  const borderVal  = document.getElementById('borderVal');
  const aspectEl   = document.getElementById('aspect');
  const readout    = document.getElementById('readout');
  const downloadBtn = document.getElementById('download');
  const resetBtn   = document.getElementById('reset');
  const toast      = document.getElementById('toast');

  let currentImage = null;
  let currentMeta  = null;
  let currentName  = 'photo';

  // ---- Controls ----

  borderEl.addEventListener('input', () => {
    borderVal.textContent = borderEl.value + '%';
    if (currentImage) render(false);
  });
  aspectEl.addEventListener('change', () => { if (currentImage) render(false); });

  document.querySelectorAll('#chips input[type="checkbox"]').forEach(cb => {
    cb.addEventListener('change', () => { if (currentImage) render(false); });
  });

  function getEnabledFields() {
    const fields = {};
    document.querySelectorAll('#chips input[type="checkbox"]').forEach(cb => {
      fields[cb.dataset.field] = cb.checked;
    });
    return fields;
  }

  // ---- Drag and drop ----

  ['dragenter', 'dragover'].forEach(ev =>
    drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('over'); })
  );
  ['dragleave', 'drop'].forEach(ev =>
    drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove('over'); })
  );
  drop.addEventListener('drop', e => {
    if (e.dataTransfer.files && e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
  });
  drop.addEventListener('click', e => {
    if (e.target !== fileInput) { e.preventDefault(); fileInput.click(); }
  });
  fileInput.addEventListener('change', e => {
    if (e.target.files && e.target.files[0]) handleFile(e.target.files[0]);
  });

  // ---- Reset ----

  resetBtn.addEventListener('click', () => {
    currentImage = null;
    currentMeta  = null;
    fileInput.value = '';
    dropLabel.textContent = 'Upload a photo';
    stage.classList.add('empty');
    stage.innerHTML = '<div class="empty-mark">Your framed photo appears here</div><div class="empty-sub">— upload to begin —</div>';
    readout.innerHTML = '<b>No metadata yet.</b> Camera, lens, and exposure data appear once a photo is loaded.';
    downloadBtn.disabled = true;
    resetBtn.disabled = true;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  // ---- Download ----

  const dlFormatEl = document.getElementById('dlFormat');

  // Format definitions: [mimeType, quality (undefined = lossless), file suffix, label]
  const DL_FORMATS = {
    'png':     ['image/png',  undefined, '_framed.png',    'PNG lossless'],
    'jpeg-hq': ['image/jpeg', 1.0,       '_framed_hq.jpg', 'JPEG max quality'],
    'jpeg-sm': ['image/jpeg', 0.82,      '_framed.jpg',    'JPEG compressed'],
  };

  downloadBtn.addEventListener('click', async () => {
    if (!currentImage) return;
    downloadBtn.disabled = true;

    const fmt = dlFormatEl ? dlFormatEl.value : 'png';
    const [mime, quality, suffix, label] = DL_FORMATS[fmt] || DL_FORMATS['png'];

    showToast('Rendering...');
    L.info('Download: ' + label + ' — rendering at full native resolution…');
    await new Promise(r => setTimeout(r, 50));
    try {
      const fullCanvas = renderToCanvas(Infinity);
      if (!fullCanvas) throw new Error('Render failed');
      L.info('Download: canvas ' + fullCanvas.width + '×' + fullCanvas.height + ' px — encoding ' + mime + '…');
      fullCanvas.toBlob(blob => {
        if (!blob) {
          L.error('Download: toBlob returned null');
          showToast('Export failed — try smaller border');
          downloadBtn.disabled = false;
          return;
        }
        const filename = currentName.replace(/\.[^.]+$/, '') + suffix;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        L.ok('Download: ' + filename + ' (' + (blob.size / 1024 / 1024).toFixed(1) + ' MB)');
        showToast('Downloaded');
        downloadBtn.disabled = false;
      }, mime, quality);
    } catch (err) {
      L.error('Download: ' + (err.message || 'unknown'));
      showToast('Export failed: ' + (err.message || 'unknown'));
      downloadBtn.disabled = false;
    }
  });

  // ---- Toast ----

  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 1600);
  }

  // ---- Image loading ----

  function loadImageFromBlob(blob) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = () => {
        if (img.naturalWidth === 0) { URL.revokeObjectURL(url); tryBitmap(); }
        else { resolve({ image: img, cleanup: () => URL.revokeObjectURL(url) }); }
      };
      img.onerror = () => { URL.revokeObjectURL(url); tryBitmap(); };
      img.src = url;
      function tryBitmap() {
        if (typeof createImageBitmap !== 'function')
          return reject(new Error('Browser cannot decode this image'));
        createImageBitmap(blob)
          .then(bmp => resolve({ image: bmp, cleanup: () => bmp.close && bmp.close() }))
          .catch(reject);
      }
    });
  }

  // ---- EXIF parsing (runs on the original file, not converted blob) ----

  async function parseExifSafe(file) {
    if (typeof window.exifr === 'undefined') return {};
    try {
      const parsePromise = window.exifr.parse(file, {
        tiff: true, exif: true, ifd0: true, gps: false, xmp: false, icc: false
      });
      const timeout = new Promise(resolve => setTimeout(() => resolve(null), 8000));
      const result = await Promise.race([parsePromise, timeout]);
      return result || {};
    } catch (_) { return {}; }
  }

  // ---- Format detection ----

  function isHeic(file) {
    const name = (file.name || '').toLowerCase();
    const type = (file.type || '').toLowerCase();
    return name.endsWith('.heic') || name.endsWith('.heif') ||
           type === 'image/heic' || type === 'image/heif';
  }

  // ---- File handler ----

  async function handleFile(file) {
    currentName = file.name || 'photo';
    dropLabel.textContent = currentName.length > 38 ? currentName.slice(0, 35) + '...' : currentName;
    showToast('Loading...');

    L.info('File: ' + file.name + ' (' + (file.type || 'no MIME type') + ', ' + (file.size / 1024 / 1024).toFixed(1) + ' MB)');

    // Start EXIF read immediately on the original file (parallel with decode)
    L.info('EXIF: parsing…');
    const exifPromise = parseExifSafe(file);
    let imageBlob = file;

    if (isHeic(file)) {
      L.info('Format: HEIC/HEIF — loading converter…');
      showToast('Converting HEIC...');
      try {
        const heic2any = await window.__loadHeic2any();
        const converted = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.92 });
        imageBlob = Array.isArray(converted) ? converted[0] : converted;
        L.ok('HEIC: converted — ' + (imageBlob.size / 1024).toFixed(0) + ' KB');
      } catch (err) {
        L.error('HEIC: ' + err.message);
        showToast('HEIC failed: ' + (err.message || 'unknown'));
        return;
      }
    } else if (window.RawDecoder && window.RawDecoder.isRaw(file)) {
      const rawExt = (file.name || '').split('.').pop().toUpperCase();
      L.info('Format: RAW (' + rawExt + ') — extracting embedded JPEG preview…');
      showToast('Reading RAW preview...');
      try {
        const preview = await window.RawDecoder.extractRawPreview(file);
        if (!preview) throw new Error('No embedded preview found in RAW file');
        imageBlob = preview;
        L.ok('RAW: preview ready — ' + (imageBlob.size / 1024).toFixed(0) + ' KB');
      } catch (err) {
        L.error('RAW: ' + err.message);
        showToast('RAW failed: ' + (err.message || 'unknown'));
        return;
      }
    } else {
      L.info('Format: standard (' + (file.type || 'unknown') + ')');
    }

    try {
      const { image } = await loadImageFromBlob(imageBlob);
      currentImage = image;
      if (typeof image.naturalWidth === 'undefined') {
        Object.defineProperty(image, 'naturalWidth',  { get: () => image.width });
        Object.defineProperty(image, 'naturalHeight', { get: () => image.height });
      }
      L.ok('Image decoded: ' + image.naturalWidth + '×' + image.naturalHeight + ' px');

      const exif = await exifPromise;
      currentMeta = parseMeta(exif || {}, image.naturalWidth, image.naturalHeight);

      if (currentMeta.hasAny) {
        const metaParts = [];
        if (currentMeta.make || currentMeta.model) metaParts.push(brandTitleCase(formatBrand(currentMeta.make, currentMeta.model)));
        if (currentMeta.lens)     metaParts.push(brandTitleCase(currentMeta.lens));
        if (currentMeta.focal)    metaParts.push(Math.round(currentMeta.focal) + 'mm');
        if (currentMeta.fNum)     metaParts.push('f/' + currentMeta.fNum.toFixed(1));
        if (currentMeta.exposure) metaParts.push(formatShutter(currentMeta.exposure));
        if (currentMeta.iso)      metaParts.push('ISO ' + currentMeta.iso);
        L.ok('EXIF: ' + metaParts.join(' · '));
      } else {
        L.warn('EXIF: no metadata found in file');
      }

      render(true);
      downloadBtn.disabled = false;
      resetBtn.disabled = false;
      showToast('Loaded');
    } catch (err) {
      L.error('Decode: ' + err.message);
      showToast('Decode failed: ' + (err.message || 'unknown'));
    }
  }

  // ---- Metadata ----

  function parseMeta(exif, width, height) {
    const make     = (exif.Make  || '').trim();
    const model    = (exif.Model || '').trim();
    const fNum     = exif.FNumber || exif.ApertureValue;
    const exposure = exif.ExposureTime;
    const focal    = exif.FocalLength;
    const focal35  = exif.FocalLengthIn35mmFormat;
    const iso      = exif.ISO || exif.ISOSpeedRatings || exif.PhotographicSensitivity;
    const lens     = (exif.LensModel || '').trim();
    const exifW    = exif.ExifImageWidth  || exif.PixelXDimension || exif.ImageWidth;
    const exifH    = exif.ExifImageHeight || exif.PixelYDimension || exif.ImageHeight;
    const w = width  || exifW || 0;
    const h = height || exifH || 0;
    const megapixels = (w && h) ? (w * h) / 1000000 : 0;
    return {
      make, model, fNum, exposure, focal, focal35, iso, lens,
      width: w, height: h, megapixels,
      hasAny: !!(make || model || fNum || exposure || focal || iso || lens)
    };
  }

  function formatShutter(t) {
    if (!t) return '';
    if (t >= 1) return t + '"';
    return '1/' + Math.round(1 / t);
  }

  function formatBrand(make, model) {
    if (!make && !model) return '';
    if (!make) return model;
    if (!model) return make;
    if (model.toUpperCase().startsWith(make.toUpperCase())) return model;
    return make + ' ' + model;
  }

  function brandTitleCase(s) {
    if (!s) return '';
    const cleaned = s.replace(/\b(CORPORATION|IMAGING|COMPANY|CO\.?,?\s*LTD\.?)\b/gi, '').trim();
    return cleaned.split(/\s+/).map(w => {
      if (/^[A-Z]+$/.test(w) && w.length > 1) return w[0] + w.slice(1).toLowerCase();
      return w;
    }).join(' ').replace(/\s+/g, ' ').trim();
  }

  // ---- Canvas rendering ----

  function renderToCanvas(maxDim) {
    if (!currentImage) return null;
    const img = currentImage;
    const aspect    = aspectEl.value;
    const borderPct = parseFloat(borderEl.value) / 100;

    let srcW = img.naturalWidth, srcH = img.naturalHeight;
    let cropW = srcW, cropH = srcH, cropX = 0, cropY = 0;

    if (aspect !== 'native') {
      const ratios  = { 'square': 1, '4:5': 4 / 5, '3:2': 3 / 2 };
      const target  = ratios[aspect];
      const currentR = srcW / srcH;
      if (currentR > target) {
        cropW = Math.round(srcH * target);
        cropX = Math.round((srcW - cropW) / 2);
      } else {
        cropH = Math.round(srcW / target);
        cropY = Math.round((srcH - cropH) / 2);
      }
    }

    const longEdge = Math.max(cropW, cropH);
    const border   = Math.round(longEdge * borderPct);
    const footer   = Math.round(longEdge * borderPct * 2.0);
    const outW = cropW + border * 2;
    const outH = cropH + border + footer;
    const scale = Math.min(1, maxDim / Math.max(outW, outH));
    const fW = Math.round(outW * scale);
    const fH = Math.round(outH * scale);
    const fBorder = border * scale;
    const fFooter = footer * scale;
    const fImgW   = cropW * scale;
    const fImgH   = cropH * scale;

    const canvas = document.createElement('canvas');
    canvas.width  = fW;
    canvas.height = fH;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, fW, fH);
    ctx.drawImage(img, cropX, cropY, cropW, cropH, fBorder, fBorder, fImgW, fImgH);
    drawFooter(ctx, fW, fH, fBorder, fFooter, fImgH);
    return canvas;
  }

  function render(scrollTo) {
    const isMobile  = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    const previewMax = isMobile ? 1600 : 2400;
    const canvas = renderToCanvas(previewMax);
    if (!canvas) return;
    L.info('Preview: ' + canvas.width + '×' + canvas.height + ' px (cap ' + previewMax + 'px)');
    stage.classList.remove('empty');
    stage.innerHTML = '';
    stage.appendChild(canvas);
    updateReadout();
    if (scrollTo) {
      requestAnimationFrame(() => stage.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    }
  }

  // ---- Footer drawing ----

  function drawFooter(ctx, W, _H, border, footer, imgH) {
    const m      = currentMeta;
    const fields = getEnabledFields();
    const footerCenterY = border + imgH + footer / 2;

    const showBrand = fields.brand && (m.make || m.model);
    const showLens  = fields.lens  && m.lens;
    const brand = showBrand ? brandTitleCase(formatBrand(m.make, m.model)) : '';
    const lens  = showLens  ? brandTitleCase(m.lens) : '';

    const techParts = [];
    if (fields.focal      && m.focal)     techParts.push(Math.round(m.focal) + 'mm');
    if (fields.aperture   && m.fNum)      techParts.push('f/' + (m.fNum < 10 ? m.fNum.toFixed(1) : Math.round(m.fNum)));
    if (fields.shutter    && m.exposure)  techParts.push(formatShutter(m.exposure));
    if (fields.iso        && m.iso)       techParts.push('ISO ' + m.iso);
    if (fields.megapixels && m.megapixels) techParts.push(m.megapixels.toFixed(1) + 'MP');
    if (fields.resolution && m.width && m.height) techParts.push(m.width + '×' + m.height);
    const tech = techParts.join('  ·  ');

    if (!brand && !lens && !tech) {
      ctx.fillStyle = '#999999'; ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
      ctx.font = 'italic 400 ' + (footer * 0.22) + 'px "Fraunces", Georgia, serif';
      ctx.fillText(m.hasAny ? 'No fields selected' : 'No metadata found', W / 2, footerCenterY);
      return;
    }

    const brandSize = footer * 0.22;
    const subSize   = footer * 0.12;
    const techSize  = footer * 0.16;
    const padX      = border * 1.2;
    const gap       = footer * 0.06;

    ctx.font = '700 ' + brandSize + 'px Helvetica, "Helvetica Neue", Arial, sans-serif';
    const brandWidth = brand ? ctx.measureText(brand).width : 0;
    ctx.font = '400 ' + subSize + 'px "JetBrains Mono", monospace';
    const lensWidth = lens ? ctx.measureText(lens).width : 0;
    ctx.font = '500 ' + techSize + 'px "JetBrains Mono", monospace';
    const techWidth = tech ? ctx.measureText(tech).width : 0;

    const leftWidth  = Math.max(brandWidth, lensWidth);
    const horizontal = leftWidth + footer * 0.5 + techWidth + padX * 2 <= W;

    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#1a1a1a';

    if (horizontal) {
      const leftLines = [];
      if (brand) leftLines.push({ text: brand, size: brandSize, font: '700 ' + brandSize + 'px Helvetica, "Helvetica Neue", Arial, sans-serif', color: '#1a1a1a' });
      if (lens)  leftLines.push({ text: lens,  size: subSize,   font: '400 ' + subSize   + 'px "JetBrains Mono", monospace',                    color: '#888888' });
      drawStack(ctx, leftLines, padX, footerCenterY, gap, 'left');
      if (tech) {
        ctx.fillStyle = '#1a1a1a';
        ctx.font = '500 ' + techSize + 'px "JetBrains Mono", monospace';
        ctx.textAlign = 'right';
        ctx.fillText(tech, W - padX, footerCenterY);
      }
    } else {
      const lines = [];
      if (brand) lines.push({ text: brand, size: brandSize, font: '700 ' + brandSize + 'px Helvetica, "Helvetica Neue", Arial, sans-serif', color: '#1a1a1a' });
      if (lens)  lines.push({ text: lens,  size: subSize,   font: '400 ' + subSize   + 'px "JetBrains Mono", monospace',                    color: '#888888' });
      if (tech)  lines.push({ text: tech,  size: techSize,  font: '500 ' + techSize  + 'px "JetBrains Mono", monospace',                    color: '#1a1a1a' });
      drawStack(ctx, lines, W / 2, footerCenterY, gap, 'center');
    }
  }

  function drawStack(ctx, lines, x, centerY, gap, align) {
    if (!lines.length) return;
    const totalHeight = lines.reduce((s, l) => s + l.size, 0) + gap * (lines.length - 1);
    let y = centerY - totalHeight / 2;
    ctx.textAlign    = align;
    ctx.textBaseline = 'top';
    for (const line of lines) {
      ctx.fillStyle = line.color;
      ctx.font      = line.font;
      ctx.fillText(line.text, x, y);
      y += line.size + gap;
    }
    ctx.textBaseline = 'middle';
  }

  // ---- Readout ----

  function updateReadout() {
    const m      = currentMeta;
    const fields = getEnabledFields();
    if (!m.hasAny) {
      readout.innerHTML = 'This file does not contain any metadata — please try another image.';
      return;
    }
    const parts = [];
    if (fields.brand) { const b = brandTitleCase(formatBrand(m.make, m.model)); if (b) parts.push('<b>' + b + '</b>'); }
    if (fields.lens      && m.lens)             parts.push(brandTitleCase(m.lens));
    if (fields.focal     && m.focal)            parts.push(Math.round(m.focal) + 'mm');
    if (fields.aperture  && m.fNum)             parts.push('f/' + (m.fNum < 10 ? m.fNum.toFixed(1) : Math.round(m.fNum)));
    if (fields.shutter   && m.exposure)         parts.push(formatShutter(m.exposure));
    if (fields.iso       && m.iso)              parts.push('ISO ' + m.iso);
    if (fields.megapixels && m.megapixels)      parts.push(m.megapixels.toFixed(1) + 'MP');
    if (fields.resolution && m.width && m.height) parts.push(m.width + '×' + m.height);
    readout.innerHTML = parts.length ? parts.join('  ·  ') : '<b>No fields selected.</b>';
  }

})();

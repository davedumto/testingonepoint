'use client';

import { useCallback, useEffect, useState } from 'react';
import Cropper, { type Area } from 'react-easy-crop';

interface PhotoCropperProps {
  file: File;
  onCancel: () => void;
  onConfirm: (croppedBlob: Blob) => void;
}

// Square avatar cropper. Opens in a modal; user pans the photo and zooms
// with the slider, then confirms. We rasterize the selected 1:1 region to a
// 512x512 JPEG blob so the server doesn't have to guess a face-crop that
// might miss. Server-side transform is just a resize after this.
export default function PhotoCropper({ file, onCancel, onConfirm }: PhotoCropperProps) {
  const [imageSrc, setImageSrc] = useState<string>('');
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    // Use a data URL rather than URL.createObjectURL — the portal's CSP
    // img-src directive allows `data:` but not `blob:`, so a blob URL would
    // be silently blocked and the Cropper would render an empty box.
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') setImageSrc(reader.result);
    };
    reader.readAsDataURL(file);
  }, [file]);

  const onCropComplete = useCallback((_area: Area, areaPixels: Area) => {
    setCroppedAreaPixels(areaPixels);
  }, []);

  async function confirm() {
    if (!croppedAreaPixels || !imageSrc) return;
    setProcessing(true);
    try {
      const blob = await cropToBlob(imageSrc, croppedAreaPixels);
      if (blob) onConfirm(blob);
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed', inset: 0, zIndex: 1100,
        background: 'rgba(5,40,71,0.6)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      }}
    >
      <div style={{ background: '#fff', borderRadius: 14, width: '100%', maxWidth: 520, padding: 20, boxShadow: '0 24px 64px rgba(5,40,71,0.25)' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14 }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--subtle)' }}>Position your photo</p>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--navy)', marginTop: 2 }}>Drag to reposition, zoom to fit</h3>
          </div>
        </div>

        <div style={{ position: 'relative', width: '100%', height: 340, background: '#0a1b2e', borderRadius: 10, overflow: 'hidden' }}>
          {imageSrc && (
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={1}
              cropShape="round"
              showGrid={false}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
              restrictPosition={true}
            />
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 14 }}>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--subtle)' }}>Zoom</span>
          <input
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={zoom}
            onChange={e => setZoom(Number(e.target.value))}
            style={{ flex: 1, accentColor: 'var(--navy)' }}
            aria-label="Zoom"
          />
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 18, justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={onCancel}
            disabled={processing}
            className="btn"
            style={{ background: 'transparent', color: 'var(--muted)', padding: '10px 18px' }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={confirm}
            disabled={processing || !croppedAreaPixels}
            className="btn btn-navy"
            style={{ padding: '10px 22px' }}
          >
            {processing ? 'Preparing…' : 'Use this photo'}
          </button>
        </div>
      </div>
    </div>
  );
}

// Rasterizes the chosen crop region to a 512x512 JPEG blob. We render to a
// fixed output size so the server always gets a predictable square image.
async function cropToBlob(imageSrc: string, pixels: Area): Promise<Blob | null> {
  const OUTPUT = 512;
  const image = await loadImage(imageSrc);
  const canvas = document.createElement('canvas');
  canvas.width = OUTPUT;
  canvas.height = OUTPUT;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.drawImage(
    image,
    pixels.x, pixels.y, pixels.width, pixels.height,
    0, 0, OUTPUT, OUTPUT,
  );

  return new Promise<Blob | null>(resolve => {
    canvas.toBlob(b => resolve(b), 'image/jpeg', 0.92);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

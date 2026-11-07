"use client";

import { useEffect, useId, useRef, useState } from "react";

export type GalleryImage = { src: string; alt: string; title?: string };

export function ImageGallery({ images }: { images: GalleryImage[] }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const captionId = useId();
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState(false);
  const selected = images[active];

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [open]);

  function show(index: number) {
    setActive(index);
    dialog.current?.showModal();
    setOpen(true);
  }

  function move(delta: number) {
    setActive(index => (index + delta + images.length) % images.length);
  }

  if (!selected) return null;

  return <>
    <div className="image-gallery" data-columns={images.length === 3 || images.length >= 5 ? 3 : 2} role="group" aria-label="Image gallery">
      {images.map((image, index) => <button key={`${image.src}-${index}`} type="button" className="gallery-preview"
        aria-label={`Open image ${index + 1} of ${images.length}${image.alt ? `: ${image.alt}` : ""}`}
        aria-haspopup="dialog" onClick={() => show(index)}>
        <img src={image.src} alt={image.alt} title={image.title} loading="lazy" />
        {image.title && <span className="gallery-preview-caption">{image.title}</span>}
      </button>)}
    </div>
    <dialog ref={dialog} className="image-lightbox" aria-label="Image album" aria-describedby={captionId}
      onClose={() => setOpen(false)} onClick={event => {
        if (event.target === event.currentTarget) dialog.current?.close();
      }} onKeyDown={event => {
        if (images.length < 2) return;
        if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
          event.preventDefault();
          move(event.key === "ArrowLeft" ? -1 : 1);
        }
      }}>
      {open && <div className="image-album">
        <header className="album-toolbar">
          <span aria-live="polite">{active + 1} / {images.length}</span>
          <div className="album-actions">
            {images.length > 1 && <>
              <button type="button" aria-label="Previous image" onClick={() => move(-1)}>←</button>
              <button type="button" aria-label="Next image" onClick={() => move(1)}>→</button>
            </>}
            <button type="button" autoFocus aria-label="Close image album" onClick={() => dialog.current?.close()}>Close ×</button>
          </div>
        </header>
        <figure className="album-current">
          <div className="album-image"><img src={selected.src} alt={selected.alt} /></div>
          <figcaption id={captionId}>{selected.title || selected.alt || `Image ${active + 1}`}</figcaption>
        </figure>
        {images.length > 1 && <nav className="album-thumbnails" aria-label="Album images">
          {images.map((image, index) => <button key={`${image.src}-${index}`} type="button"
            aria-label={`Show image ${index + 1}${image.alt ? `: ${image.alt}` : ""}`}
            aria-current={index === active ? "true" : undefined} onClick={() => setActive(index)}>
            <img src={image.src} alt="" loading="lazy" />
          </button>)}
        </nav>}
      </div>}
    </dialog>
  </>;
}

import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { Button } from "../../components/ui/button";
import { ZoomIn } from "lucide-react";

interface ImageCropperProps {
  file: File;
  aspect?: number;
  onCancel: () => void;
  onCropped: (file: File) => void;
}

const VIEWPORT_WIDTH = 480;
const OUTPUT_WIDTH = 1200;

/** Pan-and-zoom image cropper. Renders the source file into a fixed-aspect
 * viewport the admin can drag/zoom, then rasterizes the visible region onto
 * an output canvas at a fixed resolution — no external cropping library. */
export function ImageCropper({ file, aspect = 4 / 3, onCancel, onCropped }: ImageCropperProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragState = useRef<{ startX: number; startY: number; offsetX: number; offsetY: number } | null>(null);

  const viewportHeight = VIEWPORT_WIDTH / aspect;

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setImageUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const baseScale = naturalSize
    ? Math.max(VIEWPORT_WIDTH / naturalSize.width, viewportHeight / naturalSize.height)
    : 1;
  const effectiveScale = baseScale * zoom;

  const clampOffset = (x: number, y: number, scale: number) => {
    if (!naturalSize) return { x, y };
    const renderedWidth = naturalSize.width * scale;
    const renderedHeight = naturalSize.height * scale;
    const minX = Math.min(0, VIEWPORT_WIDTH - renderedWidth);
    const minY = Math.min(0, viewportHeight - renderedHeight);
    return { x: Math.min(0, Math.max(minX, x)), y: Math.min(0, Math.max(minY, y)) };
  };

  const handleImageLoad = (event: React.SyntheticEvent<HTMLImageElement>) => {
    const img = event.currentTarget;
    setNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });
    setOffset({ x: 0, y: 0 });
  };

  const handleZoomChange = (nextZoom: number) => {
    setZoom(nextZoom);
    const nextScale = baseScale * nextZoom;
    setOffset((prev) => clampOffset(prev.x, prev.y, nextScale));
  };

  const handlePointerDown = (event: React.PointerEvent) => {
    dragState.current = { startX: event.clientX, startY: event.clientY, offsetX: offset.x, offsetY: offset.y };
    (event.target as HTMLElement).setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent) => {
    if (!dragState.current) return;
    const dx = event.clientX - dragState.current.startX;
    const dy = event.clientY - dragState.current.startY;
    const next = clampOffset(dragState.current.offsetX + dx, dragState.current.offsetY + dy, effectiveScale);
    setOffset(next);
  };

  const handlePointerUp = () => {
    dragState.current = null;
  };

  const handleConfirm = () => {
    if (!naturalSize || !imageUrl) return;
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = OUTPUT_WIDTH;
      canvas.height = Math.round(OUTPUT_WIDTH / aspect);
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const sx = -offset.x / effectiveScale;
      const sy = -offset.y / effectiveScale;
      const sw = VIEWPORT_WIDTH / effectiveScale;
      const sh = viewportHeight / effectiveScale;

      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => {
          if (!blob) return;
          const croppedFile = new File([blob], file.name.replace(/\.\w+$/, "") + "-cropped.jpg", {
            type: "image/jpeg",
          });
          onCropped(croppedFile);
        },
        "image/jpeg",
        0.92
      );
    };
    img.src = imageUrl;
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="orda-cinzel">Crop image</DialogTitle>
        </DialogHeader>

        <div
          className="relative mx-auto overflow-hidden rounded-lg select-none touch-none"
          style={{ width: VIEWPORT_WIDTH, height: viewportHeight, background: "#0a0a0a", cursor: "grab" }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        >
          {imageUrl && (
            // eslint-disable-next-line jsx-a11y/alt-text
            <img
              src={imageUrl}
              onLoad={handleImageLoad}
              draggable={false}
              style={{
                position: "absolute",
                left: offset.x,
                top: offset.y,
                width: naturalSize ? naturalSize.width * effectiveScale : "auto",
                height: naturalSize ? naturalSize.height * effectiveScale : "auto",
                maxWidth: "none",
              }}
            />
          )}
          <div className="absolute inset-0 pointer-events-none border-2 rounded-lg" style={{ borderColor: "rgba(184,137,43,0.6)" }} />
        </div>

        <div className="flex items-center gap-3 px-1">
          <ZoomIn size={16} className="text-muted-foreground" />
          <input
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={zoom}
            onChange={(e) => handleZoomChange(Number(e.target.value))}
            className="w-full"
          />
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="button" onClick={handleConfirm} disabled={!naturalSize}>
            Apply crop
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import { useRef, useState } from "react";
import { toast } from "sonner";
import { ImageIcon, Upload, X, Crop, Eye } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { useDeleteAdminUpload, useUploadAdminImage } from "../lib/adminApi";
import { ImageCropper } from "./ImageCropper";

interface ImageUploaderProps {
  value: string | null;
  onChange: (url: string | null) => void;
  /** Width/height ratio for the crop viewport, e.g. 16/9, 4/3, 1. */
  aspect?: number;
}

function extractUploadKey(url: string | null): string | null {
  if (!url?.includes("uploads/")) return null;
  return url.slice(url.indexOf("uploads/"));
}

export function ImageUploader({ value, onChange, aspect = 4 / 3 }: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const uploadMutation = useUploadAdminImage();
  const deleteMutation = useDeleteAdminUpload();
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const uploadCroppedFile = async (file: File) => {
    const previousKey = extractUploadKey(value);
    try {
      const result = await uploadMutation.mutateAsync(file);
      onChange(result.url);
      // Replace = upload the new asset first, then clean up the old one so a
      // failed upload never leaves the field pointing at a deleted image.
      if (previousKey) deleteMutation.mutate(previousKey);
      toast.success("Image uploaded");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setPendingFile(null);
    }
  };

  const handleRemove = () => {
    const key = extractUploadKey(value);
    if (key) deleteMutation.mutate(key);
    onChange(null);
  };

  return (
    <div className="space-y-2">
      {value ? (
        <div className="relative w-full h-40 rounded-lg overflow-hidden border" style={{ borderColor: "rgba(59,42,19,0.08)" }}>
          <img src={value} alt="" className="w-full h-full object-cover" />
          <div className="absolute top-2 right-2 flex gap-1.5">
            <button
              type="button"
              onClick={() => setPreviewOpen(true)}
              className="w-7 h-7 rounded-full flex items-center justify-center bg-black/60 hover:bg-black/80 text-white"
              title="Preview full size"
            >
              <Eye size={14} />
            </button>
            <button
              type="button"
              onClick={handleRemove}
              className="w-7 h-7 rounded-full flex items-center justify-center bg-black/60 hover:bg-black/80 text-white"
              title="Delete image"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      ) : (
        <div
          className="w-full h-40 rounded-lg border border-dashed flex flex-col items-center justify-center gap-2 text-muted-foreground"
          style={{ borderColor: "rgba(59,42,19,0.12)" }}
        >
          <ImageIcon size={24} />
          <span className="text-xs">No image selected</span>
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) setPendingFile(file);
          event.target.value = "";
        }}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={uploadMutation.isPending}
        onClick={() => inputRef.current?.click()}
        className="w-full"
      >
        {uploadMutation.isPending ? <Upload size={14} /> : <Crop size={14} />}
        {uploadMutation.isPending ? "Uploading…" : value ? "Replace image" : "Upload image"}
      </Button>
      <p className="text-[11px] text-muted-foreground text-center">Selecting a file opens the crop tool before uploading.</p>

      {pendingFile && (
        <ImageCropper
          file={pendingFile}
          aspect={aspect}
          onCancel={() => setPendingFile(null)}
          onCropped={uploadCroppedFile}
        />
      )}

      {value && (
        <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle className="orda-cinzel">Image preview</DialogTitle>
            </DialogHeader>
            <img src={value} alt="" className="w-full rounded-lg object-contain max-h-[70vh]" />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

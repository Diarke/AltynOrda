import { useRef } from "react";
import { toast } from "sonner";
import { ImageIcon, Upload, X } from "lucide-react";
import { Button } from "../../components/ui/button";
import { useDeleteAdminUpload, useUploadAdminImage } from "../lib/adminApi";

interface ImageUploaderProps {
  value: string | null;
  onChange: (url: string | null) => void;
}

export function ImageUploader({ value, onChange }: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const uploadMutation = useUploadAdminImage();
  const deleteMutation = useDeleteAdminUpload();

  const handleFile = async (file: File) => {
    try {
      const result = await uploadMutation.mutateAsync(file);
      onChange(result.url);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
    }
  };

  const handleRemove = async () => {
    if (value?.includes("uploads/")) {
      const key = value.slice(value.indexOf("uploads/"));
      deleteMutation.mutate(key);
    }
    onChange(null);
  };

  return (
    <div className="space-y-2">
      {value ? (
        <div className="relative w-full h-40 rounded-lg overflow-hidden border" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
          <img src={value} alt="" className="w-full h-full object-cover" />
          <button
            type="button"
            onClick={handleRemove}
            className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center bg-black/60 hover:bg-black/80 text-white"
          >
            <X size={14} />
          </button>
        </div>
      ) : (
        <div
          className="w-full h-40 rounded-lg border border-dashed flex flex-col items-center justify-center gap-2 text-muted-foreground"
          style={{ borderColor: "rgba(255,255,255,0.12)" }}
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
          if (file) handleFile(file);
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
        <Upload size={14} />
        {uploadMutation.isPending ? "Uploading…" : value ? "Replace image" : "Upload image"}
      </Button>
    </div>
  );
}

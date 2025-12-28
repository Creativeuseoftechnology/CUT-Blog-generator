import React, { useRef } from 'react';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { ImageData } from '../types';

interface Props {
  images: ImageData[];
  onImagesChange: (images: ImageData[]) => void;
  label?: string;
  maxFiles?: number;
}

export const ImageUploader: React.FC<Props> = ({ images, onImagesChange, label = "Upload Foto's", maxFiles = 99 }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processImage = async (file: File): Promise<{ blob: Blob, base64: string }> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = URL.createObjectURL(file);
      img.onload = () => {
        const canvas = document.createElement('canvas');
        // Resize logic: Max width 800px (Optimized for Blog Context & Copy-Paste limits)
        const MAX_WIDTH = 800;
        let width = img.width;
        let height = img.height;

        if (width > MAX_WIDTH) {
          height *= MAX_WIDTH / width;
          width = MAX_WIDTH;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context failed'));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to WebP with 0.6 quality (High compression for base64 safety)
        canvas.toBlob((blob) => {
          if (blob) {
            const reader = new FileReader();
            reader.readAsDataURL(blob);
            reader.onloadend = () => {
              const base64 = (reader.result as string).split(',')[1];
              resolve({ blob, base64 });
            };
          } else {
            reject(new Error('WebP conversion failed'));
          }
        }, 'image/webp', 0.6);
      };
      img.onerror = (e) => reject(e);
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newImages: ImageData[] = [];
      // If maxFiles is 1, we replace existing, otherwise append
      const limit = maxFiles === 1 ? 1 : e.target.files.length;
      
      for (let i = 0; i < limit; i++) {
        const file = e.target.files[i];
        
        try {
          // Compress and convert to WebP immediately
          const { blob, base64 } = await processImage(file);
          
          newImages.push({
            file, // Keep original file ref if needed, but we use blob mostly
            previewUrl: URL.createObjectURL(blob),
            base64: base64, // Optimized base64 for Gemini
            mimeType: 'image/webp',
            optimizedBlob: blob
          });
        } catch (error) {
          console.error("Error processing image:", error);
          // Fallback to original if processing fails (unlikely)
          const reader = new FileReader();
          reader.readAsDataURL(file);
          await new Promise<void>(resolve => {
             reader.onloadend = () => {
                newImages.push({
                    file,
                    previewUrl: URL.createObjectURL(file),
                    base64: (reader.result as string).split(',')[1],
                    mimeType: file.type
                });
                resolve();
             }
          });
        }
      }
      
      if (maxFiles === 1) {
          onImagesChange(newImages);
      } else {
          onImagesChange([...images, ...newImages]);
      }
    }
  };

  const removeImage = (index: number) => {
    const newImages = [...images];
    newImages.splice(index, 1);
    onImagesChange(newImages);
  };

  return (
    <div className="w-full">
      <label className="block text-sm font-medium text-slate-700 mb-2">
        {label} <span className="text-slate-400 font-normal">(automatisch geoptimaliseerd)</span>
      </label>
      
      <div 
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed border-slate-300 rounded-lg p-6 hover:border-brand-500 hover:bg-brand-50 transition-colors cursor-pointer flex flex-col items-center justify-center text-center ${images.length > 0 && maxFiles === 1 ? 'hidden' : ''}`}
      >
        <Upload className="w-8 h-8 text-slate-400 mb-2" />
        <p className="text-sm text-slate-600">Klik om te uploaden {maxFiles > 1 ? 'of sleep bestanden hierheen' : ''}</p>
        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          multiple={maxFiles > 1}
          accept="image/*"
          onChange={handleFileChange}
        />
      </div>

      {images.length > 0 && (
        <div className={`mt-4 grid gap-3 ${maxFiles === 1 ? 'grid-cols-1' : 'grid-cols-2 sm:grid-cols-3'}`}>
          {images.map((img, idx) => (
            <div key={idx} className="relative group rounded-md overflow-hidden border border-slate-200 aspect-square bg-slate-100">
              <img src={img.previewUrl} alt="preview" className="w-full h-full object-cover" />
              <button 
                onClick={(e) => { e.stopPropagation(); removeImage(idx); }}
                className="absolute top-1 right-1 bg-white/90 p-1 rounded-full text-red-500 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
              >
                <X size={14} />
              </button>
              <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] p-1 truncate flex justify-between">
                <span>WEBP</span>
                {img.description && <span>AI: OK</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
import React, { useRef } from 'react';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { ImageData } from '../types';

interface Props {
  images: ImageData[];
  onImagesChange: (images: ImageData[]) => void;
}

export const ImageUploader: React.FC<Props> = ({ images, onImagesChange }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processImage = async (file: File): Promise<{ blob: Blob, base64: string }> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = URL.createObjectURL(file);
      img.onload = () => {
        const canvas = document.createElement('canvas');
        // Resize logic: Max width 1200px (good for blogs)
        const MAX_WIDTH = 1200;
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

        // Convert to WebP with 0.8 quality
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
        }, 'image/webp', 0.8);
      };
      img.onerror = (e) => reject(e);
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newImages: ImageData[] = [];
      
      for (let i = 0; i < e.target.files.length; i++) {
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
      
      onImagesChange([...images, ...newImages]);
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
        Upload Foto's (automatisch geoptimaliseerd naar WebP)
      </label>
      
      <div 
        onClick={() => fileInputRef.current?.click()}
        className="border-2 border-dashed border-slate-300 rounded-lg p-6 hover:border-brand-500 hover:bg-brand-50 transition-colors cursor-pointer flex flex-col items-center justify-center text-center"
      >
        <Upload className="w-8 h-8 text-slate-400 mb-2" />
        <p className="text-sm text-slate-600">Klik om te uploaden of sleep bestanden hierheen</p>
        <p className="text-xs text-slate-400 mt-1">Wordt automatisch gecomprimeerd voor snelle laadtijden</p>
        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          multiple 
          accept="image/*"
          onChange={handleFileChange}
        />
      </div>

      {images.length > 0 && (
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
          {images.map((img, idx) => (
            <div key={idx} className="relative group rounded-md overflow-hidden border border-slate-200 aspect-square bg-slate-100">
              <img src={img.previewUrl} alt="preview" className="w-full h-full object-cover" />
              <button 
                onClick={(e) => { e.stopPropagation(); removeImage(idx); }}
                className="absolute top-1 right-1 bg-white/90 p-1 rounded-full text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
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
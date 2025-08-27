'use client';

import React from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';

interface ImageLightboxProps {
  open: boolean;
  src: string | null;
  alt?: string;
  onOpenChange: (open: boolean) => void;
}

export default function ImageLightbox({ open, src, alt = 'صورة', onOpenChange }: ImageLightboxProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-[96vw] p-2 bg-transparent border-0 shadow-none">
        {src && (
          <div className="w-full h-full flex items-center justify-center">
            <img
              src={src}
              alt={alt}
              className="max-w-[95vw] max-h-[90vh] object-contain rounded-md"
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}


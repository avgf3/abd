import React, { useRef } from 'react';

interface AttachmentPickerProps {
  onPick: (file: File) => void;
  children: (open: () => void) => React.ReactNode;
}

export function AttachmentPicker({ onPick, children }: AttachmentPickerProps) {
  const ref = useRef<HTMLInputElement | null>(null);

  return (
    <>
      <input
        ref={ref}
        type="file"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            onPick(file);
            e.currentTarget.value = '';
          }
        }}
      />
      {children(() => ref.current?.click?.())}
    </>
  );
}
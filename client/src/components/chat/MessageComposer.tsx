import { Send, Image as ImageIcon, Smile } from 'lucide-react';
import React, { useCallback } from 'react';

import EmojiPicker from './EmojiPicker';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface MessageComposerProps {
	value: string;
	onChange: (v: string) => void;
	onTyping: () => void;
	onSend: (text: string) => void;
	showEmojiPicker: boolean;
	setShowEmojiPicker: (v: boolean) => void;
	inputRef: React.RefObject<HTMLInputElement>;
	fileInputRef: React.RefObject<HTMLInputElement>;
	isMobile: boolean;
	onFileSelected: (file: File) => void;
}

export default function MessageComposer({
	value,
	onChange,
	onTyping,
	onSend,
	showEmojiPicker,
	setShowEmojiPicker,
	inputRef,
	fileInputRef,
	isMobile,
	onFileSelected,
}: MessageComposerProps) {
	const handleKeyPress = useCallback(
		(e: React.KeyboardEvent) => {
			if (e.key === 'Enter' && !e.shiftKey) {
				e.preventDefault();
				onSend(value);
			} else if (e.key !== 'Enter') {
				onTyping();
			}
		},
		[onSend, onTyping, value]
	);

	const handleEmojiSelect = useCallback(
		(emoji: string) => {
			onChange(value + emoji);
			setShowEmojiPicker(false);
			inputRef.current?.focus();
		},
		[onChange, setShowEmojiPicker, inputRef, value]
	);

	const handleFileUpload = useCallback(async () => {
		fileInputRef.current?.click();
	}, [fileInputRef]);

	const onFileChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			const file = e.target.files?.[0];
			if (file) {
				onFileSelected(file);
				e.target.value = '';
			}
		},
		[onFileSelected]
	);

	return (
		<div className={`${isMobile ? 'p-2.5' : 'p-3'} bg-white border-t border-gray-200 fixed bottom-0 left-0 right-0 z-20 shadow-lg chat-input`} style={{ bottom: '80px' }}>
			<div className={`flex ${isMobile ? 'gap-2' : 'gap-3'} items-end max-w-full mx-auto`} style={{ paddingBottom: isMobile ? 'env(safe-area-inset-bottom)' : '0' }}>
				<div className="relative">
					<Button type="button" variant="outline" size="sm" onClick={() => setShowEmojiPicker(!showEmojiPicker)} className={`aspect-square mobile-touch-button ${isMobile ? 'min-w-[44px] min-h-[44px]' : ''}`}>
						<Smile className="w-4 h-4" />
					</Button>
					{showEmojiPicker && (
						<div className="absolute bottom-full mb-2 z-30">
							<EmojiPicker onEmojiSelect={handleEmojiSelect} onClose={() => setShowEmojiPicker(false)} />
						</div>
					)}
				</div>

				<Button type="button" variant="outline" size="sm" onClick={handleFileUpload} className={`aspect-square mobile-touch-button ${isMobile ? 'min-w-[44px] min-h-[44px]' : ''}`}>
					<ImageIcon className="w-4 h-4" />
				</Button>

				<Input ref={inputRef} value={value} onChange={(e) => onChange(e.target.value)} onKeyPress={handleKeyPress} placeholder="اكتب رسالتك هنا..." className={`flex-1 resize-none bg-white text-gray-900 placeholder:text-gray-500 ring-offset-white ${isMobile ? 'mobile-text' : ''}`} maxLength={1000} autoComplete="off" style={isMobile ? { fontSize: '16px' } : {}} />

				<Button onClick={() => onSend(value)} disabled={!value.trim()} className={`aspect-square bg-primary hover:bg-primary/90 mobile-touch-button ${isMobile ? 'min-w-[44px] min-h-[44px]' : ''}`}>
					<Send className="w-4 h-4" />
				</Button>

				<input ref={fileInputRef} type="file" accept="image/*" onChange={onFileChange} className="hidden" />
			</div>
		</div>
	);
}
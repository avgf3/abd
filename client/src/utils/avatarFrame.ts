import type { FrameType } from '@/types/avatarFrame';
import { isValidFrameId } from '@/data/frames';

export function normalizeFrameId(frameId?: string | null): FrameType {
	if (!frameId) return 'none';
	const trimmed = String(frameId).trim();
	if (isValidFrameId(trimmed)) return trimmed as FrameType;
	return 'none';
}


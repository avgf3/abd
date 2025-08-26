import React, { useMemo } from 'react';
import RoomComponent from '@/components/chat/RoomComponent';
import { useRoomManager } from '@/hooks/useRoomManager';
import type { ChatUser } from '@/types/chat';
import { getSocket } from '@/lib/socket';

interface RoomSelectorScreenProps {
	currentUser: ChatUser | null;
	onSelectRoom: (roomId: string) => void;
}

export default function RoomSelectorScreen({ currentUser, onSelectRoom }: RoomSelectorScreenProps) {
	const { rooms, loading, error, fetchRooms } = useRoomManager({ autoRefresh: false, cacheTimeout: 5 * 60 * 1000 });

	const handleSelect = (roomId: string) => {
		try {
			onSelectRoom(roomId);
		} catch {}
	};

	// Socket listener for live updates
	React.useEffect(() => {
		let mounted = true;
		try {
			const s = getSocket();
			const onUpdate = (_payload: any) => {
				if (!mounted) return;
				fetchRooms(true);
			};
			s.on('roomUpdate', onUpdate);
			return () => {
				mounted = false;
				try { s.off('roomUpdate', onUpdate); } catch {}
			};
		} catch {
			return () => {};
		}
	}, [fetchRooms]);

	// Backup polling every ~45s
	React.useEffect(() => {
		const id = window.setInterval(() => {
			fetchRooms(true);
		}, 45000);
		return () => window.clearInterval(id);
	}, [fetchRooms]);

	const content = useMemo(() => {
		if (loading && rooms.length === 0) {
			return (
				<div className="min-h-[60vh] flex items-center justify-center">
					<div className="animate-pulse space-y-3 w-full max-w-2xl p-6">
						<div className="h-6 bg-muted rounded w-1/3" />
						<div className="grid grid-cols-2 md:grid-cols-3 gap-4">
							<div className="h-28 bg-muted rounded" />
							<div className="h-28 bg-muted rounded" />
							<div className="h-28 bg-muted rounded" />
						</div>
					</div>
				</div>
			);
		}
		return (
			<RoomComponent
				currentUser={currentUser}
				rooms={rooms}
				currentRoomId={''}
				onRoomChange={handleSelect}
				viewMode="selector"
				showSearch={false}
				showStats={true}
				compact={false}
				allowCreate={false}
				allowDelete={false}
				allowRefresh={true}
				onRefreshRooms={() => fetchRooms(true)}
			/>
		);
	}, [rooms, loading, currentUser, fetchRooms]);

	return (
		<div className="min-h-[100dvh] flex items-center justify-center p-4">
			<div className="w-full max-w-5xl">
				{content}
				{error && <div className="text-center text-destructive mt-4">فشل في جلب الغرف</div>}
			</div>
		</div>
	);
}
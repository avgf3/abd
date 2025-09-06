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
	const [joiningRoom, setJoiningRoom] = React.useState<string | null>(null);
	const [joinError, setJoinError] = React.useState<string | null>(null);

	const handleSelect = (roomId: string) => {
		if (joiningRoom) return; // منع الضغط المتعدد
		
		setJoiningRoom(roomId);
		setJoinError(null);
		
		try {
			onSelectRoom(roomId);
			
			// إضافة timeout للتحقق من نجاح الانضمام
			const timeoutId = setTimeout(() => {
				setJoiningRoom(null);
				setJoinError('انتهت مهلة الانضمام للغرفة. يرجى المحاولة مرة أخرى.');
			}, 10000); // 10 ثوان
			
			// إلغاء timeout عند نجاح الانضمام (سيتم التعامل معه في مكان آخر)
			const cleanup = () => {
				clearTimeout(timeoutId);
				setJoiningRoom(null);
			};
			
			// حفظ cleanup function للاستخدام لاحقاً
			(window as any).__roomJoinCleanup = cleanup;
			
		} catch (err) {
			setJoiningRoom(null);
			setJoinError('خطأ في الانضمام للغرفة');
		}
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

	// تمت إزالة polling الاحتياطي؛ نعتمد على أحداث socket 'roomUpdate'

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
		<div className="min-h-[100dvh] flex items-center justify-center p-4 relative overflow-hidden">
			{/* Modern Background Effects */}
			<div className="absolute inset-0 overflow-hidden pointer-events-none">
				<div className="absolute -top-1/4 -left-1/4 w-1/2 h-1/2 bg-gradient-radial from-cyan-500/10 to-transparent rounded-full blur-3xl animate-pulse"></div>
				<div className="absolute -bottom-1/4 -right-1/4 w-1/2 h-1/2 bg-gradient-radial from-purple-500/10 to-transparent rounded-full blur-3xl animate-pulse" style={{ animationDelay: '3s' }}></div>
			</div>
			
			<div className="w-full max-w-5xl relative z-10">
				<div className="text-center mb-8 animate-fade-in">
					<h1 className="text-4xl font-bold gradient-text mb-3">اختر غرفة للدردشة</h1>
					<p className="text-xl text-muted-foreground">انضم إلى إحدى الغرف المتاحة وابدأ المحادثة</p>
				</div>
				
				<div className="modern-card glass-effect p-6 animate-slide-up">
					{content}
					{error && (
						<div className="modern-notification bg-red-500/10 border-red-500/20 text-red-400 mt-4 text-center">
							فشل في جلب الغرف
						</div>
					)}
					{joinError && (
						<div className="modern-notification bg-red-500/10 border-red-500/20 text-red-400 mt-4 text-center">
							{joinError}
							<button 
								onClick={() => setJoinError(null)}
								className="ml-2 text-red-300 hover:text-red-100 underline"
							>
								إغلاق
							</button>
						</div>
					)}
					{joiningRoom && (
						<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
							<div className="bg-card rounded-lg p-6 shadow-xl border">
								<div className="flex items-center gap-3">
									<div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
									<span className="text-foreground">جاري الانضمام للغرفة...</span>
								</div>
								<div className="mt-4 text-sm text-muted-foreground text-center">
									إذا استغرق الأمر وقتاً طويلاً، تحقق من اتصال الإنترنت
								</div>
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
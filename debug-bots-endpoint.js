// إضافة endpoint لفحص البوتات بدون غرف
// في server/routes.ts

app.get('/api/debug/bots-rooms-status', async (req, res) => {
  try {
    const { db } = await import('./database-adapter');
    const { bots } = await import('../shared/schema');
    
    // جلب جميع البوتات
    const allBots = await db.select().from(bots);
    
    // جلب جميع الغرف
    const { rooms } = await import('../shared/schema');
    const allRooms = await db.select().from(rooms);
    const roomIds = allRooms.map(room => room.id);
    
    // تحليل البوتات
    const analysis = {
      totalBots: allBots.length,
      botsWithoutRooms: [],
      botsWithInvalidRooms: [],
      botsWithValidRooms: [],
      roomIds: roomIds
    };
    
    allBots.forEach(bot => {
      if (!bot.currentRoom || bot.currentRoom.trim() === '') {
        analysis.botsWithoutRooms.push({
          id: bot.id,
          username: bot.username,
          currentRoom: bot.currentRoom,
          issue: 'لا توجد غرفة'
        });
      } else if (!roomIds.includes(bot.currentRoom)) {
        analysis.botsWithInvalidRooms.push({
          id: bot.id,
          username: bot.username,
          currentRoom: bot.currentRoom,
          issue: 'غرفة غير موجودة'
        });
      } else {
        analysis.botsWithValidRooms.push({
          id: bot.id,
          username: bot.username,
          currentRoom: bot.currentRoom,
          issue: 'غرفة صحيحة'
        });
      }
    });
    
    res.json(analysis);
  } catch (error) {
    console.error('خطأ في فحص البوتات:', error);
    res.status(500).json({ error: 'خطأ في فحص البوتات' });
  }
});
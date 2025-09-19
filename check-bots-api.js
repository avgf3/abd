// فحص البوتات بدون غرف من خلال API
// تشغيل هذا الكود في المتصفح أو Postman

// 1. الحصول على جميع البوتات
fetch('/api/bots')
  .then(response => response.json())
  .then(bots => {
    console.log('جميع البوتات:', bots);
    
    // 2. فحص البوتات بدون غرف
    const botsWithoutRooms = bots.filter(bot => 
      !bot.currentRoom || 
      bot.currentRoom.trim() === '' ||
      bot.currentRoom === null
    );
    
    console.log('البوتات بدون غرف:', botsWithoutRooms);
    
    // 3. فحص البوتات بغرف غير صحيحة
    const botsWithInvalidRooms = bots.filter(bot => 
      bot.currentRoom && 
      bot.currentRoom.trim() !== '' &&
      !['general', 'vip', 'welcome'].includes(bot.currentRoom)
    );
    
    console.log('البوتات بغرف مشكوك فيها:', botsWithInvalidRooms);
    
    // 4. إحصائيات
    console.log('إجمالي البوتات:', bots.length);
    console.log('بوتات بدون غرف:', botsWithoutRooms.length);
    console.log('بوتات بغرف مشكوك فيها:', botsWithInvalidRooms.length);
  })
  .catch(error => {
    console.error('خطأ في جلب البوتات:', error);
  });

// 5. فحص الغرف المتاحة
fetch('/api/rooms')
  .then(response => response.json())
  .then(rooms => {
    console.log('الغرف المتاحة:', rooms);
    
    const roomIds = rooms.map(room => room.id);
    console.log('معرفات الغرف:', roomIds);
  })
  .catch(error => {
    console.error('خطأ في جلب الغرف:', error);
  });
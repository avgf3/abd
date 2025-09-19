// فحص البوتات من خلال console في المتصفح
// فتح Developer Tools (F12) وتشغيل هذا الكود

// 1. فحص البوتات في الذاكرة المحلية
if (window.socket && window.socket.connected) {
  // طلب قائمة البوتات
  window.socket.emit('getBots');
  
  // الاستماع للرد
  window.socket.on('botsList', (bots) => {
    console.log('البوتات من السيرفر:', bots);
    
    // فحص البوتات بدون غرف
    const botsWithoutRooms = bots.filter(bot => 
      !bot.currentRoom || 
      bot.currentRoom.trim() === ''
    );
    
    console.log('البوتات بدون غرف:', botsWithoutRooms);
    
    // فحص البوتات في كل غرفة
    const roomGroups = {};
    bots.forEach(bot => {
      const room = bot.currentRoom || 'بدون غرفة';
      if (!roomGroups[room]) {
        roomGroups[room] = [];
      }
      roomGroups[room].push(bot.username);
    });
    
    console.log('توزيع البوتات حسب الغرف:', roomGroups);
  });
}

// 2. فحص البوتات في قائمة المتصلين
if (window.chat && window.chat.onlineUsers) {
  const onlineBots = window.chat.onlineUsers.filter(user => 
    user.userType === 'bot'
  );
  
  console.log('البوتات المتصلة:', onlineBots);
  
  // فحص غرف البوتات المتصلة
  onlineBots.forEach(bot => {
    console.log(`البوت ${bot.username} في الغرفة: ${bot.currentRoom || 'غير محدد'}`);
  });
}

// 3. فحص البوتات في الغرفة الحالية
if (window.chat && window.chat.currentRoom) {
  const currentRoomBots = window.chat.onlineUsers.filter(user => 
    user.userType === 'bot' && 
    user.currentRoom === window.chat.currentRoom
  );
  
  console.log(`البوتات في الغرفة ${window.chat.currentRoom}:`, currentRoomBots);
}
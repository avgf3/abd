import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function fixChatDuplicates() {
  console.log('💬 إصلاح مشكلة تكرار الرسائل...\n');

  const routesPath = path.join(__dirname, 'server', 'routes.ts');
  let routesContent = fs.readFileSync(routesPath, 'utf8');

  // 1. Add message deduplication middleware
  const deduplicationMiddleware = `
// Message deduplication middleware
const messageDeduplication = new Map();
const MESSAGE_DUPLICATE_WINDOW = 2000; // 2 seconds

function isDuplicateMessage(userId, content, roomId = 'general') {
  const key = \`\${userId}-\${roomId}-\${content}\`;
  const now = Date.now();
  const lastSent = messageDeduplication.get(key);
  
  if (lastSent && (now - lastSent) < MESSAGE_DUPLICATE_WINDOW) {
    return true;
  }
  
  messageDeduplication.set(key, now);
  
  // Clean old entries every 100 messages
  if (messageDeduplication.size > 100) {
    const cutoff = now - MESSAGE_DUPLICATE_WINDOW;
    for (const [k, v] of messageDeduplication.entries()) {
      if (v < cutoff) {
        messageDeduplication.delete(k);
      }
    }
  }
  
  return false;
}
`;

  // Insert deduplication middleware after imports
  const middlewareInsertPoint = routesContent.indexOf('export function configureRoutes');
  if (middlewareInsertPoint !== -1) {
    routesContent = routesContent.slice(0, middlewareInsertPoint) + 
      deduplicationMiddleware + '\n' +
      routesContent.slice(middlewareInsertPoint);
  }

  // 2. Fix publicMessage handler to prevent duplicates
  routesContent = routesContent.replace(
    /socket\.on\(['"]publicMessage['"],\s*async\s*\(data\)\s*=>\s*{/,
    `socket.on('publicMessage', async (data) => {
      // Check for duplicate message
      if (socket.user && isDuplicateMessage(socket.user.id, data.content, data.roomId)) {
        console.log('🚫 منع رسالة مكررة من:', socket.user.username);
        return;
      }`
  );

  // 3. Fix multiple message emissions
  // Replace duplicate io.emit('message') with more specific event types
  routesContent = routesContent.replace(
    /io\.emit\('message',\s*{\s*type:\s*'userJoined'/g,
    "io.emit('userJoined', { type: 'userJoined'"
  );

  routesContent = routesContent.replace(
    /io\.emit\('message',\s*{\s*type:\s*'userLeft'/g,
    "io.emit('userLeft', { type: 'userLeft'"
  );

  // 4. Add message ID to prevent client-side duplicates
  routesContent = routesContent.replace(
    /const\s+message\s*=\s*{\s*type:\s*'public',/g,
    `const message = {
      id: \`msg-\${Date.now()}-\${Math.random().toString(36).substr(2, 9)}\`,
      type: 'public',`
  );

  // 5. Fix room message broadcasts
  routesContent = routesContent.replace(
    /io\.to\(roomId\)\.emit\('message',/g,
    "io.to(roomId).emit('roomMessage',"
  );

  // Save the fixed routes file
  fs.writeFileSync(routesPath, routesContent, 'utf8');
  console.log('✅ تم تحديث server/routes.ts بآلية منع التكرار');

  // Now fix the client-side to handle duplicates
  const useChatPath = path.join(__dirname, 'client', 'src', 'hooks', 'useChat.ts');
  if (fs.existsSync(useChatPath)) {
    let useChatContent = fs.readFileSync(useChatPath, 'utf8');

    // Add message deduplication on client side
    const clientDeduplication = `
  // Message deduplication
  const messageIdsRef = useRef(new Set<string>());
  const addMessageIfNotDuplicate = useCallback((message: any) => {
    if (message.id && messageIdsRef.current.has(message.id)) {
      console.log('🚫 منع رسالة مكررة:', message.id);
      return false;
    }
    if (message.id) {
      messageIdsRef.current.add(message.id);
      // Keep only last 1000 message IDs
      if (messageIdsRef.current.size > 1000) {
        const ids = Array.from(messageIdsRef.current);
        ids.slice(0, ids.length - 1000).forEach(id => messageIdsRef.current.delete(id));
      }
    }
    return true;
  }, []);
`;

    // Insert client deduplication after imports
    const insertPoint = useChatContent.indexOf('export function useChat()');
    if (insertPoint !== -1) {
      const functionStart = useChatContent.indexOf('{', insertPoint);
      useChatContent = useChatContent.slice(0, functionStart + 1) + 
        clientDeduplication + 
        useChatContent.slice(functionStart + 1);
    }

    // Update message handlers to check for duplicates
    useChatContent = useChatContent.replace(
      /setMessages\(\(prev\)\s*=>\s*\[\.\.\.prev,/g,
      'setMessages((prev) => addMessageIfNotDuplicate(message) ? [...prev,'
    );

    fs.writeFileSync(useChatPath, useChatContent, 'utf8');
    console.log('✅ تم تحديث client/src/hooks/useChat.ts بآلية منع التكرار');
  }

  console.log('\n✅ تم إصلاح مشكلة تكرار الرسائل!');
  console.log('\n📝 التحسينات المطبقة:');
  console.log('1. إضافة middleware لمنع الرسائل المكررة من نفس المستخدم');
  console.log('2. إضافة معرف فريد لكل رسالة');
  console.log('3. فحص التكرار في جانب العميل');
  console.log('4. تنظيف الذاكرة بشكل دوري');
  console.log('5. استخدام أحداث مخصصة بدلاً من "message" العام');
}

// Run the fix
fixChatDuplicates().catch(console.error);
import { storage } from '../storage';
import { db, dbType } from '../database-adapter';

export interface DefaultRoom {
  id: string;
  name: string;
  description: string;
  isDefault: boolean;
  isActive: boolean;
  isBroadcast: boolean;
  createdBy: number;
}

// الغرف الافتراضية المطلوبة
export const DEFAULT_ROOMS: DefaultRoom[] = [
  {
    id: 'general',
    name: 'الغرفة العامة',
    description: 'الغرفة العامة للدردشة والتفاعل',
    isDefault: true,
    isActive: true,
    isBroadcast: false,
    createdBy: 1
  },
  {
    id: 'broadcast_1',
    name: 'غرفة البث الأولى',
    description: 'غرفة للبث الصوتي والمحادثات المباشرة',
    isDefault: true,
    isActive: true,
    isBroadcast: true,
    createdBy: 1
  }
];

/**
 * تهيئة الغرف الافتراضية في قاعدة البيانات
 */
export async function initializeDefaultRooms(): Promise<boolean> {
  try {
    if (!db || dbType === 'disabled') {
      console.log('🏠 قاعدة البيانات غير متصلة، تخطي تهيئة الغرف');
      return true;
    }

    console.log('🏠 بدء تهيئة الغرف الافتراضية...');

    for (const defaultRoom of DEFAULT_ROOMS) {
      try {
        // تحقق من وجود الغرفة
        const existingRoom = await storage.getRoom(defaultRoom.id);
        
        if (!existingRoom) {
          console.log(`📝 إنشاء الغرفة الافتراضية: ${defaultRoom.name}`);
          
          await storage.createRoom({
            id: defaultRoom.id,
            name: defaultRoom.name,
            description: defaultRoom.description,
            createdBy: defaultRoom.createdBy,
            isDefault: defaultRoom.isDefault,
            isActive: defaultRoom.isActive,
            isBroadcast: defaultRoom.isBroadcast,
            hostId: defaultRoom.isBroadcast ? defaultRoom.createdBy : null,
            speakers: [],
            micQueue: [],
            icon: null,
            userCount: 0
          });
          
          console.log(`✅ تم إنشاء الغرفة: ${defaultRoom.name}`);
        } else {
          console.log(`✅ الغرفة موجودة مسبقاً: ${defaultRoom.name}`);
        }
      } catch (roomError) {
        console.error(`❌ خطأ في تهيئة الغرفة ${defaultRoom.name}:`, roomError);
      }
    }

    console.log('✅ تم الانتهاء من تهيئة الغرف الافتراضية');
    return true;
    
  } catch (error) {
    console.error('❌ خطأ عام في تهيئة الغرف الافتراضية:', error);
    return false;
  }
}

/**
 * التحقق من وجود الغرف المطلوبة
 */
export async function verifyDefaultRooms(): Promise<{ total: number; existing: number; missing: string[] }> {
  const result = {
    total: DEFAULT_ROOMS.length,
    existing: 0,
    missing: [] as string[]
  };

  try {
    if (!db || dbType === 'disabled') {
      return result;
    }

    for (const defaultRoom of DEFAULT_ROOMS) {
      const exists = await storage.getRoom(defaultRoom.id);
      if (exists) {
        result.existing++;
      } else {
        result.missing.push(defaultRoom.name);
      }
    }
  } catch (error) {
    console.error('خطأ في التحقق من الغرف:', error);
  }

  return result;
}

/**
 * إنشاء غرفة جديدة مع التحقق من التكرار
 */
export async function createRoomSafely(roomData: Partial<DefaultRoom>): Promise<boolean> {
  try {
    if (!roomData.id || !roomData.name) {
      console.error('❌ بيانات الغرفة غير مكتملة');
      return false;
    }

    // تحقق من عدم وجود الغرفة
    const existing = await storage.getRoom(roomData.id);
    if (existing) {
      console.log(`⚠️ الغرفة ${roomData.name} موجودة مسبقاً`);
      return true;
    }

    // إنشاء الغرفة
    const created = await storage.createRoom({
      id: roomData.id,
      name: roomData.name,
      description: roomData.description || '',
      createdBy: roomData.createdBy || 1,
      isDefault: roomData.isDefault || false,
      isActive: roomData.isActive !== false,
      isBroadcast: roomData.isBroadcast || false,
      hostId: roomData.isBroadcast ? (roomData.createdBy || 1) : null,
      speakers: [],
      micQueue: [],
      icon: null,
      userCount: 0
    });

    if (created) {
      console.log(`✅ تم إنشاء الغرفة: ${roomData.name}`);
      return true;
    } else {
      console.error(`❌ فشل في إنشاء الغرفة: ${roomData.name}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ خطأ في إنشاء الغرفة ${roomData.name}:`, error);
    return false;
  }
}
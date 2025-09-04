import { BotManager } from './bot-manager';
import { OwnerControlPanel } from './owner-control';
import { BotConfig } from './types';
import { logger } from './logger';

let botManager: BotManager | null = null;
let controlPanel: OwnerControlPanel | null = null;

export async function initializeBotSystem(serverUrl: string): Promise<void> {
  try {
    logger.info('بدء تهيئة نظام البوتات...');

    const totalBots = Number(process.env.BOT_TOTAL || (process.env.NODE_ENV === 'development' ? 50 : 300));
    const ownerBots = Number(process.env.BOT_OWNER_COUNT || 5);

    const config: BotConfig = {
      serverUrl,
      totalBots,
      ownerBots,
      
      behaviorSettings: {
        minActivityLevel: 0.1,
        maxActivityLevel: 0.8,
        messageRateLimit: 30, // رسالة في الساعة كحد أقصى
        typingSimulation: true,
        randomMovement: true,
        naturalTiming: true
      },
      
      securitySettings: {
        useProxies: process.env.BOT_USE_PROXIES === 'true', // يمكن تفعيلها في الإنتاج
        rotateUserAgents: true,
        randomizeTimings: true,
        mimicHumanErrors: true
      }
    };

    botManager = new BotManager(config);
    controlPanel = new OwnerControlPanel(botManager);

    logger.info('تم تهيئة نظام البوتات بنجاح');
  } catch (error) {
    logger.error('فشل تهيئة نظام البوتات', error);
    throw error;
  }
}

export async function startBotSystem(): Promise<void> {
  if (!botManager) {
    throw new Error('نظام البوتات غير مهيأ');
  }

  await botManager.start();
}

export async function stopBotSystem(): Promise<void> {
  if (botManager) {
    await botManager.stop();
  }
}

export function getBotControlPanel(): OwnerControlPanel | null {
  return controlPanel;
}

export function getBotManager(): BotManager | null {
  return botManager;
}

// معالج إيقاف النظام بشكل آمن
process.on('SIGINT', async () => {
  logger.info('تلقي إشارة إيقاف، جاري إيقاف نظام البوتات...');
  
  if (botManager) {
    await botManager.stop();
  }
  
  logger.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('تلقي إشارة إنهاء، جاري إيقاف نظام البوتات...');
  
  if (botManager) {
    await botManager.stop();
  }
  
  logger.close();
  process.exit(0);
});
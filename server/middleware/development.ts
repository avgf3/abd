import { Request, Response, NextFunction } from 'express';

// Middleware لحماية endpoints التطوير في الإنتاج
export const developmentOnly = (req: Request, res: Response, next: NextFunction) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ 
      error: 'Not Found',
      message: 'هذا الـ endpoint متاح فقط في بيئة التطوير' 
    });
  }
  next();
};

// Middleware للتحقق من صحة البيئة
export const isProduction = (): boolean => {
  return process.env.NODE_ENV === 'production';
};

// دالة لتسجيل endpoints التطوير
export const logDevelopmentEndpoint = (endpoint: string) => {
  if (!isProduction()) {
    console.log(`🔧 [DEV] Endpoint ${endpoint} متاح في بيئة التطوير فقط`);
  }
};
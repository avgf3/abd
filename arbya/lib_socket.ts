import { io } from "/@fs/var/www/abd/node_modules/.vite/deps/socket__io-client.js?v=197578e1";
const STORAGE_KEY = "chat_session";
export function saveSession(partial) {
  try {
    const existing = getSession();
    const merged = { ...existing, ...partial };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
  } catch {
  }
}
export function getSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}
export function clearSession() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
  }
  if (socketInstance) {
    socketInstance.removeAllListeners();
    socketInstance.disconnect();
    socketInstance = null;
  }
}
let socketInstance = null;
function getServerUrl() {
  try {
    const isDev = import.meta?.env?.DEV;
    if (isDev) return "http://localhost:5000";
    const protocol = window.location.protocol;
    const host = window.location.host;
    return `${protocol}//${host}`;
  } catch {
    return window.location.origin;
  }
}
function attachCoreListeners(socket) {
  const anySocket = socket;
  if (anySocket.__coreListenersAttached) return;
  anySocket.__coreListenersAttached = true;
  const reauth = (isReconnect) => {
    const session = getSession();
    if (!session || !session.userId && !session.username) return;
    try {
      socket.emit("auth", {
        userId: session.userId,
        username: session.username,
        userType: session.userType,
        token: session.token,
        reconnect: isReconnect
      });
    } catch {
    }
  };
  socket.on("connect", () => {
    reauth(false);
  });
  socket.on("reconnect", () => {
    reauth(true);
  });
  window.addEventListener("online", () => {
    if (!socket.connected) {
      try {
        socket.connect();
      } catch {
      }
    }
  });
}
export function getSocket() {
  if (socketInstance && !getSession().userId && !getSession().username) {
    socketInstance.removeAllListeners();
    socketInstance.disconnect();
    socketInstance = null;
  }
  if (socketInstance) return socketInstance;
  const deviceId = (() => {
    try {
      const existing = localStorage.getItem("deviceId");
      if (existing) return existing;
      const id = "web-" + Math.random().toString(36).slice(2);
      localStorage.setItem("deviceId", id);
      return id;
    } catch {
      return "web-unknown";
    }
  })();
  const serverUrl = getServerUrl();
  const isDevelopment = import.meta?.env?.DEV;
  const isProduction = !isDevelopment;
  const sessionForHandshake = getSession();
  socketInstance = io(serverUrl, {
    path: "/socket.io",
    // 🔥 ابدأ بـ polling لضمان النجاح ثم حاول الترقية إلى WebSocket
    transports: ["polling", "websocket"],
    upgrade: true,
    rememberUpgrade: false,
    // تجنب محاولة WS مباشرة إذا فشل سابقاً
    autoConnect: false,
    reconnection: true,
    // 🔥 تحسين إعادة الاتصال - محاولات محدودة مع تدرج ذكي
    reconnectionAttempts: isProduction ? 10 : 5,
    // محاولات محدودة بدلاً من لانهائية
    reconnectionDelay: isDevelopment ? 1e3 : 2e3,
    // تقليل التأخير في التطوير
    reconnectionDelayMax: isProduction ? 1e4 : 5e3,
    // تقليل الحد الأقصى
    randomizationFactor: 0.3,
    // تقليل العشوائية لاتصال أسرع
    // 🔥 تحسين أوقات الاستجابة
    timeout: isDevelopment ? 15e3 : 2e4,
    // timeout أقل لاستجابة أسرع
    forceNew: false,
    // إعادة استخدام الاتصالات الموجودة
    withCredentials: true,
    auth: { deviceId, token: sessionForHandshake?.token },
    extraHeaders: { "x-device-id": deviceId },
    // 🔥 إعدادات محسّنة للاستقرار والأداء
    closeOnBeforeunload: false,
    // لا تغلق عند إعادة التحميل
    // 🔥 تحسين إدارة الاتصال
    multiplex: true,
    // تمكين multiplexing للأداء الأفضل
    forceBase64: false,
    // استخدام binary للأداء الأفضل
    // 🔥 إعدادات ping مخصصة (هذه الخيارات للخادم فقط، لكن نتركها للتوثيق)
    // pingTimeout: isProduction ? 60000 : 30000, // مطابق للخادم
    // pingInterval: isProduction ? 25000 : 15000, // مطابق للخادم
    query: {
      deviceId,
      t: Date.now(),
      // timestamp لتجنب الكاش
      // 🔥 إضافة معلومات إضافية للتشخيص
      userAgent: navigator.userAgent.slice(0, 100),
      // معلومات المتصفح (محدودة)
      screen: `${screen.width}x${screen.height}`,
      // دقة الشاشة
      connection: navigator.connection?.effectiveType || "unknown"
      // نوع الاتصال
    }
  });
  attachCoreListeners(socketInstance);
  return socketInstance;
}
export function connectSocket() {
  const s = getSocket();
  try {
    if (!s.connected) s.connect();
  } catch {
  }
  return s;
}

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInNvY2tldC50cyJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgdHlwZSB7IFNvY2tldCB9IGZyb20gJ3NvY2tldC5pby1jbGllbnQnO1xuaW1wb3J0IHsgaW8gfSBmcm9tICdzb2NrZXQuaW8tY2xpZW50JztcblxuLy8gU2ltcGxlIHNlc3Npb24gc3RvcmFnZSBoZWxwZXJzXG5jb25zdCBTVE9SQUdFX0tFWSA9ICdjaGF0X3Nlc3Npb24nO1xuXG50eXBlIFN0b3JlZFNlc3Npb24gPSB7XG4gIHVzZXJJZD86IG51bWJlcjtcbiAgdXNlcm5hbWU/OiBzdHJpbmc7XG4gIHVzZXJUeXBlPzogc3RyaW5nO1xuICB0b2tlbj86IHN0cmluZztcbiAgcm9vbUlkPzogc3RyaW5nO1xuICB3YWxsVGFiPzogc3RyaW5nO1xufTtcblxuZXhwb3J0IGZ1bmN0aW9uIHNhdmVTZXNzaW9uKHBhcnRpYWw6IFBhcnRpYWw8U3RvcmVkU2Vzc2lvbj4pIHtcbiAgdHJ5IHtcbiAgICBjb25zdCBleGlzdGluZyA9IGdldFNlc3Npb24oKTtcbiAgICBjb25zdCBtZXJnZWQ6IFN0b3JlZFNlc3Npb24gPSB7IC4uLmV4aXN0aW5nLCAuLi5wYXJ0aWFsIH07XG4gICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oU1RPUkFHRV9LRVksIEpTT04uc3RyaW5naWZ5KG1lcmdlZCkpO1xuICB9IGNhdGNoIHt9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRTZXNzaW9uKCk6IFN0b3JlZFNlc3Npb24ge1xuICB0cnkge1xuICAgIGNvbnN0IHJhdyA9IGxvY2FsU3RvcmFnZS5nZXRJdGVtKFNUT1JBR0VfS0VZKTtcbiAgICBpZiAoIXJhdykgcmV0dXJuIHt9O1xuICAgIHJldHVybiBKU09OLnBhcnNlKHJhdykgYXMgU3RvcmVkU2Vzc2lvbjtcbiAgfSBjYXRjaCB7XG4gICAgcmV0dXJuIHt9O1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBjbGVhclNlc3Npb24oKSB7XG4gIHRyeSB7XG4gICAgbG9jYWxTdG9yYWdlLnJlbW92ZUl0ZW0oU1RPUkFHRV9LRVkpO1xuICB9IGNhdGNoIHt9XG4gIC8vINil2LnYp9iv2Kkg2KrYudmK2YrZhiBTb2NrZXQgaW5zdGFuY2Ug2LnZhtivINmF2LPYrSDYp9mE2KzZhNiz2KlcbiAgaWYgKHNvY2tldEluc3RhbmNlKSB7XG4gICAgc29ja2V0SW5zdGFuY2UucmVtb3ZlQWxsTGlzdGVuZXJzKCk7XG4gICAgc29ja2V0SW5zdGFuY2UuZGlzY29ubmVjdCgpO1xuICAgIHNvY2tldEluc3RhbmNlID0gbnVsbDtcbiAgICAvLyBsaXN0ZW5lcnMgYXJlIHNjb3BlZCB0byBpbnN0YW5jZSB2aWEgYSBwcml2YXRlIGZsYWcgbm93XG4gIH1cbn1cblxubGV0IHNvY2tldEluc3RhbmNlOiBTb2NrZXQgfCBudWxsID0gbnVsbDtcblxuZnVuY3Rpb24gZ2V0U2VydmVyVXJsKCk6IHN0cmluZyB7XG4gIHRyeSB7XG4gICAgY29uc3QgaXNEZXYgPSAoaW1wb3J0Lm1ldGEgYXMgYW55KT8uZW52Py5ERVY7XG4gICAgaWYgKGlzRGV2KSByZXR1cm4gJ2h0dHA6Ly9sb2NhbGhvc3Q6NTAwMCc7XG4gICAgXG4gICAgLy8g2YHZiiDYp9mE2KXZhtiq2KfYrNiMINin2LPYqtiu2K/ZhSDZhtmB2LMg2KfZhNij2LXZhCDYr9in2KbZhdin2YtcbiAgICAvLyDZh9iw2Kcg2YrYttmF2YYg2KfZhNiq2YjYp9mB2YIg2YXYuSDYo9mKINio2YrYptipINin2LPYqti22KfZgdipXG4gICAgY29uc3QgcHJvdG9jb2wgPSB3aW5kb3cubG9jYXRpb24ucHJvdG9jb2w7XG4gICAgY29uc3QgaG9zdCA9IHdpbmRvdy5sb2NhdGlvbi5ob3N0O1xuICAgIHJldHVybiBgJHtwcm90b2NvbH0vLyR7aG9zdH1gO1xuICB9IGNhdGNoIHtcbiAgICByZXR1cm4gd2luZG93LmxvY2F0aW9uLm9yaWdpbjtcbiAgfVxufVxuXG5mdW5jdGlvbiBhdHRhY2hDb3JlTGlzdGVuZXJzKHNvY2tldDogU29ja2V0KSB7XG4gIGNvbnN0IGFueVNvY2tldCA9IHNvY2tldCBhcyBhbnk7XG4gIGlmIChhbnlTb2NrZXQuX19jb3JlTGlzdGVuZXJzQXR0YWNoZWQpIHJldHVybjtcbiAgYW55U29ja2V0Ll9fY29yZUxpc3RlbmVyc0F0dGFjaGVkID0gdHJ1ZTtcblxuICBjb25zdCByZWF1dGggPSAoaXNSZWNvbm5lY3Q6IGJvb2xlYW4pID0+IHtcbiAgICBjb25zdCBzZXNzaW9uID0gZ2V0U2Vzc2lvbigpO1xuICAgIC8vINmE2Kcg2KrYsdiz2YQgYXV0aCDYpdiw2Kcg2YTZhSDYqtiq2YjZgdixINis2YTYs9ipINmF2K3ZgdmI2LjYqSDYtdin2YTYrdipXG4gICAgaWYgKCFzZXNzaW9uIHx8ICghc2Vzc2lvbi51c2VySWQgJiYgIXNlc3Npb24udXNlcm5hbWUpKSByZXR1cm47XG4gICAgdHJ5IHtcbiAgICAgIHNvY2tldC5lbWl0KCdhdXRoJywge1xuICAgICAgICB1c2VySWQ6IHNlc3Npb24udXNlcklkLFxuICAgICAgICB1c2VybmFtZTogc2Vzc2lvbi51c2VybmFtZSxcbiAgICAgICAgdXNlclR5cGU6IHNlc3Npb24udXNlclR5cGUsXG4gICAgICAgIHRva2VuOiBzZXNzaW9uLnRva2VuLFxuICAgICAgICByZWNvbm5lY3Q6IGlzUmVjb25uZWN0LFxuICAgICAgfSk7XG4gICAgfSBjYXRjaCB7fVxuICB9O1xuXG4gIHNvY2tldC5vbignY29ubmVjdCcsICgpID0+IHtcbiAgICByZWF1dGgoZmFsc2UpO1xuICAgIC8vINil2LDYpyDZhNmFINiq2YPZhiDZh9mG2KfZgyDYrNmE2LPYqSDZhdit2YHZiNi42KnYjCDZhNinINmG2LHYs9mEIGF1dGgg2YfZhtinINmE2KrZgdin2K/ZiiDZhdmH2YTYqSDYutmK2LEg2LbYsdmI2LHZitipXG4gIH0pO1xuXG4gIHNvY2tldC5vbigncmVjb25uZWN0JywgKCkgPT4ge1xuICAgIHJlYXV0aCh0cnVlKTtcbiAgfSk7XG5cbiAgLy8gSWYgbmV0d29yayBnb2VzIGJhY2sgb25saW5lLCB0cnkgdG8gY29ubmVjdFxuICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignb25saW5lJywgKCkgPT4ge1xuICAgIGlmICghc29ja2V0LmNvbm5lY3RlZCkge1xuICAgICAgdHJ5IHtcbiAgICAgICAgc29ja2V0LmNvbm5lY3QoKTtcbiAgICAgIH0gY2F0Y2gge31cbiAgICB9XG4gIH0pO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0U29ja2V0KCk6IFNvY2tldCB7XG4gIC8vINil2LDYpyDZg9in2YYg2YfZhtin2YMgc29ja2V0INmC2K/ZitmFINmI2KrZhSDZhdiz2K0g2KfZhNis2YTYs9ip2Iwg2KPZhti02KYg2YjYp9it2K8g2KzYr9mK2K9cbiAgaWYgKHNvY2tldEluc3RhbmNlICYmICFnZXRTZXNzaW9uKCkudXNlcklkICYmICFnZXRTZXNzaW9uKCkudXNlcm5hbWUpIHtcbiAgICBzb2NrZXRJbnN0YW5jZS5yZW1vdmVBbGxMaXN0ZW5lcnMoKTtcbiAgICBzb2NrZXRJbnN0YW5jZS5kaXNjb25uZWN0KCk7XG4gICAgc29ja2V0SW5zdGFuY2UgPSBudWxsO1xuICAgIC8vIGxpc3RlbmVycyBhcmUgc2NvcGVkIHRvIGluc3RhbmNlIHZpYSBhIHByaXZhdGUgZmxhZyBub3dcbiAgfVxuXG4gIGlmIChzb2NrZXRJbnN0YW5jZSkgcmV0dXJuIHNvY2tldEluc3RhbmNlO1xuXG4gIGNvbnN0IGRldmljZUlkID0gKCgpID0+IHtcbiAgICB0cnkge1xuICAgICAgY29uc3QgZXhpc3RpbmcgPSBsb2NhbFN0b3JhZ2UuZ2V0SXRlbSgnZGV2aWNlSWQnKTtcbiAgICAgIGlmIChleGlzdGluZykgcmV0dXJuIGV4aXN0aW5nO1xuICAgICAgY29uc3QgaWQgPSAnd2ViLScgKyBNYXRoLnJhbmRvbSgpLnRvU3RyaW5nKDM2KS5zbGljZSgyKTtcbiAgICAgIGxvY2FsU3RvcmFnZS5zZXRJdGVtKCdkZXZpY2VJZCcsIGlkKTtcbiAgICAgIHJldHVybiBpZDtcbiAgICB9IGNhdGNoIHtcbiAgICAgIHJldHVybiAnd2ViLXVua25vd24nO1xuICAgIH1cbiAgfSkoKTtcblxuICBjb25zdCBzZXJ2ZXJVcmwgPSBnZXRTZXJ2ZXJVcmwoKTtcbiAgXG4gIC8vIPCflKUg2KXYudiv2KfYr9in2Kog2YXYrdiz2ZHZhtipINmE2YTYo9iv2KfYoSDZiNin2YTYp9iz2KrZgtix2KfYsVxuICBjb25zdCBpc0RldmVsb3BtZW50ID0gKGltcG9ydC5tZXRhIGFzIGFueSk/LmVudj8uREVWO1xuICBjb25zdCBpc1Byb2R1Y3Rpb24gPSAhaXNEZXZlbG9wbWVudDtcbiAgY29uc3Qgc2Vzc2lvbkZvckhhbmRzaGFrZSA9IGdldFNlc3Npb24oKTtcbiAgXG4gIHNvY2tldEluc3RhbmNlID0gaW8oc2VydmVyVXJsLCB7XG4gICAgcGF0aDogJy9zb2NrZXQuaW8nLFxuICAgIC8vIPCflKUg2KfYqNiv2KMg2KjZgCBwb2xsaW5nINmE2LbZhdin2YYg2KfZhNmG2KzYp9itINir2YUg2K3Yp9mI2YQg2KfZhNiq2LHZgtmK2Kkg2KXZhNmJIFdlYlNvY2tldFxuICAgIHRyYW5zcG9ydHM6IFsncG9sbGluZycsICd3ZWJzb2NrZXQnXSxcbiAgICB1cGdyYWRlOiB0cnVlLFxuICAgIHJlbWVtYmVyVXBncmFkZTogZmFsc2UsIC8vINiq2KzZhtioINmF2K3Yp9mI2YTYqSBXUyDZhdio2KfYtNix2Kkg2KXYsNinINmB2LTZhCDYs9in2KjZgtin2YtcbiAgICBhdXRvQ29ubmVjdDogZmFsc2UsXG4gICAgcmVjb25uZWN0aW9uOiB0cnVlLFxuICAgIC8vIPCflKUg2KrYrdiz2YrZhiDYpdi52KfYr9ipINin2YTYp9iq2LXYp9mEIC0g2YXYrdin2YjZhNin2Kog2YXYrdiv2YjYr9ipINmF2Lkg2KrYr9ix2Kwg2LDZg9mKXG4gICAgcmVjb25uZWN0aW9uQXR0ZW1wdHM6IGlzUHJvZHVjdGlvbiA/IDEwIDogNSwgLy8g2YXYrdin2YjZhNin2Kog2YXYrdiv2YjYr9ipINio2K/ZhNin2Ysg2YXZhiDZhNin2YbZh9in2KbZitipXG4gICAgcmVjb25uZWN0aW9uRGVsYXk6IGlzRGV2ZWxvcG1lbnQgPyAxMDAwIDogMjAwMCwgLy8g2KrZgtmE2YrZhCDYp9mE2KrYo9iu2YrYsSDZgdmKINin2YTYqti32YjZitixXG4gICAgcmVjb25uZWN0aW9uRGVsYXlNYXg6IGlzUHJvZHVjdGlvbiA/IDEwMDAwIDogNTAwMCwgLy8g2KrZgtmE2YrZhCDYp9mE2K3YryDYp9mE2KPZgti12YlcbiAgICByYW5kb21pemF0aW9uRmFjdG9yOiAwLjMsIC8vINiq2YLZhNmK2YQg2KfZhNi52LTZiNin2KbZitipINmE2KfYqti12KfZhCDYo9iz2LHYuVxuICAgIC8vIPCflKUg2KrYrdiz2YrZhiDYo9mI2YLYp9iqINin2YTYp9iz2KrYrNin2KjYqVxuICAgIHRpbWVvdXQ6IGlzRGV2ZWxvcG1lbnQgPyAxNTAwMCA6IDIwMDAwLCAvLyB0aW1lb3V0INij2YLZhCDZhNin2LPYqtis2KfYqNipINij2LPYsdi5XG4gICAgZm9yY2VOZXc6IGZhbHNlLCAvLyDYpdi52KfYr9ipINin2LPYqtiu2K/Yp9mFINin2YTYp9iq2LXYp9mE2KfYqiDYp9mE2YXZiNis2YjYr9ipXG4gICAgd2l0aENyZWRlbnRpYWxzOiB0cnVlLFxuICAgIGF1dGg6IHsgZGV2aWNlSWQsIHRva2VuOiBzZXNzaW9uRm9ySGFuZHNoYWtlPy50b2tlbiB9LFxuICAgIGV4dHJhSGVhZGVyczogeyAneC1kZXZpY2UtaWQnOiBkZXZpY2VJZCB9LFxuICAgIC8vIPCflKUg2KXYudiv2KfYr9in2Kog2YXYrdiz2ZHZhtipINmE2YTYp9iz2KrZgtix2KfYsSDZiNin2YTYo9iv2KfYoVxuICAgIGNsb3NlT25CZWZvcmV1bmxvYWQ6IGZhbHNlLCAvLyDZhNinINiq2LrZhNmCINi52YbYryDYpdi52KfYr9ipINin2YTYqtit2YXZitmEXG4gICAgLy8g8J+UpSDYqtit2LPZitmGINil2K/Yp9ix2Kkg2KfZhNin2KrYtdin2YRcbiAgICBtdWx0aXBsZXg6IHRydWUsIC8vINiq2YXZg9mK2YYgbXVsdGlwbGV4aW5nINmE2YTYo9iv2KfYoSDYp9mE2KPZgdi22YRcbiAgICBmb3JjZUJhc2U2NDogZmFsc2UsIC8vINin2LPYqtiu2K/Yp9mFIGJpbmFyeSDZhNmE2KPYr9in2KEg2KfZhNij2YHYttmEXG4gICAgLy8g8J+UpSDYpdi52K/Yp9iv2KfYqiBwaW5nINmF2K7Ytdi12KkgKNmH2LDZhyDYp9mE2K7Zitin2LHYp9iqINmE2YTYrtin2K/ZhSDZgdmC2LfYjCDZhNmD2YYg2YbYqtix2YPZh9inINmE2YTYqtmI2KvZitmCKVxuICAgIC8vIHBpbmdUaW1lb3V0OiBpc1Byb2R1Y3Rpb24gPyA2MDAwMCA6IDMwMDAwLCAvLyDZhdi32KfYqNmCINmE2YTYrtin2K/ZhVxuICAgIC8vIHBpbmdJbnRlcnZhbDogaXNQcm9kdWN0aW9uID8gMjUwMDAgOiAxNTAwMCwgLy8g2YXYt9in2KjZgiDZhNmE2K7Yp9iv2YVcbiAgICBxdWVyeToge1xuICAgICAgZGV2aWNlSWQsXG4gICAgICB0OiBEYXRlLm5vdygpLCAvLyB0aW1lc3RhbXAg2YTYqtis2YbYqCDYp9mE2YPYp9i0XG4gICAgICAvLyDwn5SlINil2LbYp9mB2Kkg2YXYudmE2YjZhdin2Kog2KXYttin2YHZitipINmE2YTYqti02K7Ziti1XG4gICAgICB1c2VyQWdlbnQ6IG5hdmlnYXRvci51c2VyQWdlbnQuc2xpY2UoMCwgMTAwKSwgLy8g2YXYudmE2YjZhdin2Kog2KfZhNmF2KrYtdmB2K0gKNmF2K3Yr9mI2K/YqSlcbiAgICAgIHNjcmVlbjogYCR7c2NyZWVuLndpZHRofXgke3NjcmVlbi5oZWlnaHR9YCwgLy8g2K/ZgtipINin2YTYtNin2LTYqVxuICAgICAgY29ubmVjdGlvbjogKG5hdmlnYXRvciBhcyBhbnkpLmNvbm5lY3Rpb24/LmVmZmVjdGl2ZVR5cGUgfHwgJ3Vua25vd24nLCAvLyDZhtmI2Lkg2KfZhNin2KrYtdin2YRcbiAgICB9LFxuICB9KTtcblxuICBhdHRhY2hDb3JlTGlzdGVuZXJzKHNvY2tldEluc3RhbmNlKTtcbiAgXG4gIC8vINmE2Kcg2YbYqti12YQg2KrZhNmC2KfYptmK2KfZiyDZh9mG2Kcg2KjYudivINin2YTYotmG2Jsg2KfZhNin2KrYtdin2YQg2YrYqtmFINi12LHYp9it2KnZiyDYudio2LEgY29ubmVjdFNvY2tldCgpXG4gIHJldHVybiBzb2NrZXRJbnN0YW5jZTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNvbm5lY3RTb2NrZXQoKTogU29ja2V0IHtcbiAgY29uc3QgcyA9IGdldFNvY2tldCgpO1xuICB0cnkge1xuICAgIGlmICghcy5jb25uZWN0ZWQpIHMuY29ubmVjdCgpO1xuICB9IGNhdGNoIHt9XG4gIHJldHVybiBzO1xufVxuIl0sIm1hcHBpbmdzIjoiQUFDQSxTQUFTLFVBQVU7QUFHbkIsTUFBTSxjQUFjO0FBV2IsZ0JBQVMsWUFBWSxTQUFpQztBQUMzRCxNQUFJO0FBQ0YsVUFBTSxXQUFXLFdBQVc7QUFDNUIsVUFBTSxTQUF3QixFQUFFLEdBQUcsVUFBVSxHQUFHLFFBQVE7QUFDeEQsaUJBQWEsUUFBUSxhQUFhLEtBQUssVUFBVSxNQUFNLENBQUM7QUFBQSxFQUMxRCxRQUFRO0FBQUEsRUFBQztBQUNYO0FBRU8sZ0JBQVMsYUFBNEI7QUFDMUMsTUFBSTtBQUNGLFVBQU0sTUFBTSxhQUFhLFFBQVEsV0FBVztBQUM1QyxRQUFJLENBQUMsSUFBSyxRQUFPLENBQUM7QUFDbEIsV0FBTyxLQUFLLE1BQU0sR0FBRztBQUFBLEVBQ3ZCLFFBQVE7QUFDTixXQUFPLENBQUM7QUFBQSxFQUNWO0FBQ0Y7QUFFTyxnQkFBUyxlQUFlO0FBQzdCLE1BQUk7QUFDRixpQkFBYSxXQUFXLFdBQVc7QUFBQSxFQUNyQyxRQUFRO0FBQUEsRUFBQztBQUVULE1BQUksZ0JBQWdCO0FBQ2xCLG1CQUFlLG1CQUFtQjtBQUNsQyxtQkFBZSxXQUFXO0FBQzFCLHFCQUFpQjtBQUFBLEVBRW5CO0FBQ0Y7QUFFQSxJQUFJLGlCQUFnQztBQUVwQyxTQUFTLGVBQXVCO0FBQzlCLE1BQUk7QUFDRixVQUFNLFFBQVMsYUFBcUIsS0FBSztBQUN6QyxRQUFJLE1BQU8sUUFBTztBQUlsQixVQUFNLFdBQVcsT0FBTyxT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
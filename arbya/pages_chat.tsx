import { createHotContext as __vite__createHotContext } from "/@vite/client";import.meta.hot = __vite__createHotContext("/src/pages/chat.tsx");import __vite__cjsImport0_react_jsxDevRuntime from "/@fs/var/www/abd/node_modules/.vite/deps/react_jsx-dev-runtime.js?v=197578e1"; const jsxDEV = __vite__cjsImport0_react_jsxDevRuntime["jsxDEV"];
import * as RefreshRuntime from "/@react-refresh";
const inWebWorker = typeof WorkerGlobalScope !== "undefined" && self instanceof WorkerGlobalScope;
let prevRefreshReg;
let prevRefreshSig;
if (import.meta.hot && !inWebWorker) {
  if (!window.$RefreshReg$) {
    throw new Error(
      "@vitejs/plugin-react can't detect preamble. Something is wrong."
    );
  }
  prevRefreshReg = window.$RefreshReg$;
  prevRefreshSig = window.$RefreshSig$;
  window.$RefreshReg$ = RefreshRuntime.getRefreshReg("/var/www/abd/client/src/pages/chat.tsx");
  window.$RefreshSig$ = RefreshRuntime.createSignatureFunctionForTransform;
}
var _s = $RefreshSig$();
import __vite__cjsImport3_react from "/@fs/var/www/abd/node_modules/.vite/deps/react.js?v=197578e1"; const lazy = __vite__cjsImport3_react["lazy"]; const Suspense = __vite__cjsImport3_react["Suspense"]; const useState = __vite__cjsImport3_react["useState"]; const useEffect = __vite__cjsImport3_react["useEffect"];
const ChatInterface = lazy(_c = () => import("/src/components/chat/ChatInterface.tsx"));
_c2 = ChatInterface;
const WelcomeScreen = lazy(_c3 = () => import("/src/components/chat/WelcomeScreen.tsx"));
_c4 = WelcomeScreen;
import KickCountdown from "/src/components/moderation/KickCountdown.tsx";
import { useChat } from "/src/hooks/useChat.ts";
import { clearSession, getSession } from "/src/lib/socket.ts";
import { apiRequest } from "/src/lib/queryClient.ts";
import RoomSelectorScreen from "/src/components/chat/RoomSelectorScreen.tsx";
try {
  const saveData = navigator?.connection?.saveData === true;
  const run = () => {
    if (saveData) return;
    import("/src/components/chat/MessagesPanel.tsx");
    import("/src/components/chat/PrivateMessageBox.tsx");
    import("/src/components/chat/UserSidebarWithWalls.tsx");
    import("/src/components/chat/MessageArea.tsx");
    import("/src/components/chat/NotificationPanel.tsx");
  };
  if (typeof window !== "undefined") {
    if ("requestIdleCallback" in window) {
      window.requestIdleCallback(run, { timeout: 3e3 });
    } else {
      setTimeout(run, 2e3);
    }
  }
} catch {
}
export default function ChatPage() {
  _s();
  const initialSession = (() => {
    try {
      return getSession();
    } catch {
      return {};
    }
  })();
  const hasSavedUser = !!initialSession?.userId;
  const [showWelcome, setShowWelcome] = useState(!hasSavedUser);
  const [selectedRoomId, setSelectedRoomId] = useState(() => {
    if (!hasSavedUser) return null;
    const roomId = initialSession?.roomId;
    return roomId && roomId !== "public" && roomId !== "friends" ? roomId : null;
  });
  const [isRestoring, setIsRestoring] = useState(false);
  const chat = useChat();
  useEffect(() => {
    const session = getSession();
    const savedUserId = session?.userId;
    const roomId = session?.roomId && session.roomId !== "public" && session.roomId !== "friends" ? session.roomId : null;
    if (savedUserId) {
      chat.connect({ id: savedUserId, username: session?.username || `User#${savedUserId}`, userType: session?.userType || "member", isOnline: true, role: "member" });
      setShowWelcome(false);
      if (roomId) {
        setSelectedRoomId(roomId);
      } else {
        setSelectedRoomId(null);
      }
    }
    (async () => {
      try {
        if (savedUserId) {
          const user = await apiRequest(`/api/users/${savedUserId}`);
          if (user?.id) {
            chat.connect(user);
          }
        } else {
          const data = await apiRequest("/api/auth/session");
          if (data?.user) {
            chat.connect(data.user);
            setShowWelcome(false);
            const r = session?.roomId && session.roomId !== "public" && session.roomId !== "friends" ? session.roomId : null;
            if (r) {
              setSelectedRoomId(r);
            }
          } else {
            setShowWelcome(true);
          }
        }
      } catch {
        if (!savedUserId) setShowWelcome(true);
      }
    })();
  }, []);
  const handleUserLogin = (user) => {
    clearSession();
    chat.connect(user);
    setShowWelcome(false);
    setSelectedRoomId(null);
  };
  const handleSelectRoom = (roomId) => {
    setSelectedRoomId(roomId);
    chat.joinRoom(roomId);
  };
  const handleLogout = async () => {
    try {
      await apiRequest("/api/auth/logout", { method: "POST" });
    } catch (error) {
      console.error("خطأ في تسجيل الخروج:", error);
    }
    clearSession();
    chat.disconnect();
    setShowWelcome(true);
    setSelectedRoomId(null);
  };
  return /* @__PURE__ */ jsxDEV("div", { className: "min-h-[100dvh] bg-background text-foreground font-['Cairo'] overflow-hidden", dir: "rtl", style: { minHeight: "100dvh" }, children: [
    /* @__PURE__ */ jsxDEV(Suspense, { fallback: null, children: isRestoring ? /* @__PURE__ */ jsxDEV("div", { className: "p-6 text-center", children: "...جاري استعادة الجلسة" }, void 0, false, {
      fileName: "/var/www/abd/client/src/pages/chat.tsx",
      lineNumber: 155,
      columnNumber: 9
    }, this) : showWelcome ? /* @__PURE__ */ jsxDEV(WelcomeScreen, { onUserLogin: handleUserLogin }, void 0, false, {
      fileName: "/var/www/abd/client/src/pages/chat.tsx",
      lineNumber: 157,
      columnNumber: 9
    }, this) : selectedRoomId ? /* @__PURE__ */ jsxDEV(ChatInterface, { chat, onLogout: handleLogout }, void 0, false, {
      fileName: "/var/www/abd/client/src/pages/chat.tsx",
      lineNumber: 159,
      columnNumber: 9
    }, this) : /* @__PURE__ */ jsxDEV(RoomSelectorScreen, { currentUser: chat.currentUser, onSelectRoom: handleSelectRoom }, void 0, false, {
      fileName: "/var/www/abd/client/src/pages/chat.tsx",
      lineNumber: 161,
      columnNumber: 9
    }, this) }, void 0, false, {
      fileName: "/var/www/abd/client/src/pages/chat.tsx",
      lineNumber: 153,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(
      KickCountdown,
      {
        isVisible: chat.showKickCountdown || false,
        onClose: () => chat.setShowKickCountdown?.(false),
        durationMinutes: 15
      },
      void 0,
      false,
      {
        fileName: "/var/www/abd/client/src/pages/chat.tsx",
        lineNumber: 166,
        columnNumber: 7
      },
      this
    )
  ] }, void 0, true, {
    fileName: "/var/www/abd/client/src/pages/chat.tsx",
    lineNumber: 152,
    columnNumber: 5
  }, this);
}
_s(ChatPage, "WbxqbXhvt01PEvynKIUZem78fn0=", false, function() {
  return [useChat];
});
_c5 = ChatPage;
var _c, _c2, _c3, _c4, _c5;
$RefreshReg$(_c, "ChatInterface$lazy");
$RefreshReg$(_c2, "ChatInterface");
$RefreshReg$(_c3, "WelcomeScreen$lazy");
$RefreshReg$(_c4, "WelcomeScreen");
$RefreshReg$(_c5, "ChatPage");
if (import.meta.hot && !inWebWorker) {
  window.$RefreshReg$ = prevRefreshReg;
  window.$RefreshSig$ = prevRefreshSig;
}
if (import.meta.hot && !inWebWorker) {
  RefreshRuntime.__hmr_import(import.meta.url).then((currentExports) => {
    RefreshRuntime.registerExportsForReactRefresh("/var/www/abd/client/src/pages/chat.tsx", currentExports);
    import.meta.hot.accept((nextExports) => {
      if (!nextExports) return;
      const invalidateMessage = RefreshRuntime.validateRefreshBoundaryAndEnqueueUpdate("/var/www/abd/client/src/pages/chat.tsx", currentExports, nextExports);
      if (invalidateMessage) import.meta.hot.invalidate(invalidateMessage);
    });
  });
}

//# sourceMappingURL=data:application/json;base64,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QTtBQUFBO0FBQUEsV0FBNEMsSUFDMUNqQixpQkFDRix1QkFBQyxpQkFBYyxNQUFZLFVBQVVvQixnQkFBckM7QUFBQTtBQUFBO0FBQUE7QUFBQSxXQUFrRCxJQUVsRCx1QkFBQyxzQkFBbUIsYUFBYWYsS0FBS3FCLGFBQWEsY0FBY1Isb0JBQWpFO0FBQUE7QUFBQTtBQUFBO0FBQUEsV0FBa0YsS0FSdEY7QUFBQTtBQUFBO0FBQUE7QUFBQSxXQVVBO0FBQUEsSUFHQTtBQUFBLE1BQUM7QUFBQTtBQUFBLFFBQ0MsV0FBV2IsS0FBS3NCLHFCQUFxQjtBQUFBLFFBQ3JDLFNBQVMsTUFBTXRCLEtBQUt1Qix1QkFBdUIsS0FBSztBQUFBLFFBQ2hELGlCQUFpQjtBQUFBO0FBQUEsTUFIbkI7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLElBR3NCO0FBQUEsT0FqQnhCO0FBQUE7QUFBQTtBQUFBO0FBQUEsU0FtQkE7QUFFSjtBQUFDbEMsR0F4SHVCRCxVQUFRO0FBQUEsVUFrQmpCYixPQUFPO0FBQUE7QUFBQWlELE1BbEJFcEM7QUFBUSxJQUFBbkIsSUFBQUMsS0FBQUUsS0FBQUMsS0FBQW1EO0FBQUFDLGFBQUF4RCxJQUFBO0FBQUF3RCxhQUFBdkQsS0FBQTtBQUFBdUQsYUFBQXJELEtBQUE7QUFBQXFELGFBQUFwRCxLQUFBO0FBQUFvRCxhQUFBRCxLQUFBIiwibmFtZXMiOlsibGF6eSIsIlN1c3BlbnNlIiwidXNlU3RhdGUiLCJ1c2VFZmZlY3QiLCJDaGF0SW50ZXJmYWNlIiwiX2MiLCJfYzIiLCJXZWxjb21lU2NyZWVuIiwiX2MzIiwiX2M0IiwiS2lja0NvdW50ZG93biIsInVzZUNoYXQiLCJjbGVhclNlc3Npb24iLCJnZXRTZXNzaW9uIiwiYXBpUmVxdWVzdCIsIlJvb21TZWxlY3RvclNjcmVlbiIsInNhdmVEYXRhIiwibmF2aWdhdG9yIiwiY29ubmVjdGlvbiIsInJ1biIsIndpbmRvdyIsInJlcXVlc3RJZGxlQ2FsbGJhY2siLCJ0aW1lb3V0Iiwic2V0VGltZW91dCIsIkNoYXRQYWdlIiwiX3MiLCJpbml0aWFsU2Vzc2lvbiIsImhhc1NhdmVkVXNlciIsInVzZXJJZCIsInNob3dXZWxjb21lIiwic2V0U2hvd1dlbGNvbWUiLCJzZWxlY3RlZFJvb21JZCIsInNldFNlbGVjdGVkUm9vbUlkIiwicm9vbUlkIiwiaXNSZXN0b3JpbmciLCJzZXRJc1Jlc3RvcmluZyIsImNoYXQiLCJzZXNzaW9uIiwic2F2ZWRVc2VySWQiLCJjb25uZWN0IiwiaWQiLCJ1c2VybmFtZSIsInVzZXJUeXBlIiwiaXNPbmxpbmUiLCJyb2xlIiwidXNlciIsImRhdGEiLCJyIiwiaGFuZGxlVXNlckxvZ2luIiwiaGFuZGxlU2VsZWN0Um9vbSIsImpvaW5Sb29tIiwiaGFuZGxlTG9nb3V0IiwibWV0aG9kIiwiZXJyb3IiLCJjb25zb2xlIiwiZGlzY29ubmVjdCIsIm1pbkhlaWdodCIsImN1cnJlbnRVc2VyIiwic2hvd0tpY2tDb3VudGRvd24iLCJzZXRTaG93S2lja0NvdW50ZG93biIsIl9jNSIsIiRSZWZyZXNoUmVnJCJdLCJpZ25vcmVMaXN0IjpbXSwic291cmNlcyI6WyJjaGF0LnRzeCJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBsYXp5LCBTdXNwZW5zZSwgdXNlU3RhdGUsIHVzZUVmZmVjdCB9IGZyb20gJ3JlYWN0JztcblxuY29uc3QgQ2hhdEludGVyZmFjZSA9IGxhenkoKCkgPT4gaW1wb3J0KCdAL2NvbXBvbmVudHMvY2hhdC9DaGF0SW50ZXJmYWNlJykpO1xuY29uc3QgV2VsY29tZVNjcmVlbiA9IGxhenkoKCkgPT4gaW1wb3J0KCdAL2NvbXBvbmVudHMvY2hhdC9XZWxjb21lU2NyZWVuJykpO1xuLy8g2K3YsNmBINin2YTZhdit2K/YryDYp9mE2YXYrdmE2Yog2YTZhNi62LHZgSDZhNiq2KzZhtioINin2YTYqtmD2LHYp9ixXG5pbXBvcnQgS2lja0NvdW50ZG93biBmcm9tICdAL2NvbXBvbmVudHMvbW9kZXJhdGlvbi9LaWNrQ291bnRkb3duJztcbmltcG9ydCB7IHVzZUNoYXQgfSBmcm9tICdAL2hvb2tzL3VzZUNoYXQnO1xuaW1wb3J0IHsgY2xlYXJTZXNzaW9uLCBnZXRTZXNzaW9uIH0gZnJvbSAnQC9saWIvc29ja2V0JztcbmltcG9ydCB7IGFwaVJlcXVlc3QgfSBmcm9tICdAL2xpYi9xdWVyeUNsaWVudCc7XG5pbXBvcnQgdHlwZSB7IENoYXRVc2VyLCBDaGF0Um9vbSB9IGZyb20gJ0AvdHlwZXMvY2hhdCc7XG5pbXBvcnQgUm9vbVNlbGVjdG9yU2NyZWVuIGZyb20gJ0AvY29tcG9uZW50cy9jaGF0L1Jvb21TZWxlY3RvclNjcmVlbic7XG5cbi8vIFByZWZldGNoIGhlYXZ5IG1vZHVsZXMgZHVyaW5nIGlkbGUgdGltZSAoZ3VhcmRlZCBieSBTYXZlLURhdGEpXG50cnkge1xuXHRjb25zdCBzYXZlRGF0YSA9IChuYXZpZ2F0b3IgYXMgYW55KT8uY29ubmVjdGlvbj8uc2F2ZURhdGEgPT09IHRydWU7XG5cdGNvbnN0IHJ1biA9ICgpID0+IHtcblx0XHRpZiAoc2F2ZURhdGEpIHJldHVybjtcblx0XHQvLyBQYW5lbHMgYW5kIGhlYXZ5IGNvbXBvbmVudHNcblx0XHRpbXBvcnQoJ0AvY29tcG9uZW50cy9jaGF0L01lc3NhZ2VzUGFuZWwnKTtcblx0XHRpbXBvcnQoJ0AvY29tcG9uZW50cy9jaGF0L1ByaXZhdGVNZXNzYWdlQm94Jyk7XG5cdFx0aW1wb3J0KCdAL2NvbXBvbmVudHMvY2hhdC9Vc2VyU2lkZWJhcldpdGhXYWxscycpO1xuXHRcdGltcG9ydCgnQC9jb21wb25lbnRzL2NoYXQvTWVzc2FnZUFyZWEnKTtcblx0XHRpbXBvcnQoJ0AvY29tcG9uZW50cy9jaGF0L05vdGlmaWNhdGlvblBhbmVsJyk7XG5cdH07XG5cdGlmICh0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJykge1xuXHRcdGlmICgncmVxdWVzdElkbGVDYWxsYmFjaycgaW4gd2luZG93KSB7XG5cdFx0XHQod2luZG93IGFzIGFueSkucmVxdWVzdElkbGVDYWxsYmFjayhydW4sIHsgdGltZW91dDogMzAwMCB9KTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0c2V0VGltZW91dChydW4sIDIwMDApO1xuXHRcdH1cblx0fVxufSBjYXRjaCB7fVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBDaGF0UGFnZSgpIHtcbiAgLy8g2KrZh9mK2KbYqSDYp9mE2K3Yp9mE2Kkg2YXZhiDYp9mE2KzZhNiz2Kkg2KjYtNmD2YQg2YXYqtiy2KfZhdmGINmE2YXZhti5INmI2YXZiti2INi02KfYtNipINin2YTYqtix2K3ZitioINi52YbYryDYpdi52KfYr9ipINin2YTYqtit2YXZitmEXG4gIGNvbnN0IGluaXRpYWxTZXNzaW9uID0gKCgpID0+IHtcbiAgICB0cnkge1xuICAgICAgcmV0dXJuIGdldFNlc3Npb24oKTtcbiAgICB9IGNhdGNoIHtcbiAgICAgIHJldHVybiB7fSBhcyBhbnk7XG4gICAgfVxuICB9KSgpO1xuICBjb25zdCBoYXNTYXZlZFVzZXIgPSAhIShpbml0aWFsU2Vzc2lvbiBhcyBhbnkpPy51c2VySWQ7XG5cbiAgY29uc3QgW3Nob3dXZWxjb21lLCBzZXRTaG93V2VsY29tZV0gPSB1c2VTdGF0ZSghaGFzU2F2ZWRVc2VyKTtcbiAgY29uc3QgW3NlbGVjdGVkUm9vbUlkLCBzZXRTZWxlY3RlZFJvb21JZF0gPSB1c2VTdGF0ZTxzdHJpbmcgfCBudWxsPigoKSA9PiB7XG4gICAgaWYgKCFoYXNTYXZlZFVzZXIpIHJldHVybiBudWxsO1xuICAgIGNvbnN0IHJvb21JZCA9IChpbml0aWFsU2Vzc2lvbiBhcyBhbnkpPy5yb29tSWQ7XG4gICAgcmV0dXJuIHJvb21JZCAmJiByb29tSWQgIT09ICdwdWJsaWMnICYmIHJvb21JZCAhPT0gJ2ZyaWVuZHMnID8gcm9vbUlkIDogbnVsbDtcbiAgfSk7XG4gIGNvbnN0IFtpc1Jlc3RvcmluZywgc2V0SXNSZXN0b3JpbmddID0gdXNlU3RhdGU8Ym9vbGVhbj4oZmFsc2UpO1xuICBjb25zdCBjaGF0ID0gdXNlQ2hhdCgpO1xuXG4gIC8vINin2LPYqtix2KzYp9i5INin2YTYrNmE2LPYqSDZiNin2YTYutix2YHYqSDYqNi52K8g2KXYudin2K/YqSDYp9mE2KrYrdmF2YrZhDog2KfYqNiv2KMg2YXYrdmE2YrYp9mLINmB2YjYsdin2Ysg2KvZhSDYrdiv2Ksg2KfZhNiu2YTZgdmK2KlcbiAgdXNlRWZmZWN0KCgpID0+IHtcbiAgICBjb25zdCBzZXNzaW9uID0gZ2V0U2Vzc2lvbigpO1xuICAgIGNvbnN0IHNhdmVkVXNlcklkID0gc2Vzc2lvbj8udXNlcklkO1xuICAgIGNvbnN0IHJvb21JZCA9IHNlc3Npb24/LnJvb21JZCAmJiBzZXNzaW9uLnJvb21JZCAhPT0gJ3B1YmxpYycgJiYgc2Vzc2lvbi5yb29tSWQgIT09ICdmcmllbmRzJ1xuICAgICAgPyBzZXNzaW9uLnJvb21JZFxuICAgICAgOiBudWxsO1xuXG4gICAgLy8g2KrYtNi62YrZhCDZgdmI2LHZiiDZhdmGINin2YTYqtiu2LLZitmGINin2YTZhdit2YTZiiDZhNiq2KzZhtioINmI2YXZiti2IFwi2KzYp9ix2Yog2KfYs9iq2LnYp9iv2Kkg2KfZhNis2YTYs9ipXCJcbiAgICBpZiAoc2F2ZWRVc2VySWQpIHtcbiAgICAgIC8vINmI2LXZhCDYp9mE2LPZiNmD2Kog2KjYrdiz2KfYqCDZhdiu2LLZhiDZhdik2YLYqtin2YsgKNiz2YbYrdiv2ZHYqyDYp9mE2KjZitin2YbYp9iqINmE2KfYrdmC2KfZiyDZhdmGINin2YTYrtin2K/ZhSlcbiAgICAgIC8vINmF2YTYp9it2LjYqTogY29ubmVjdCDZh9mG2Kcg2YTYpyDZitix2LPZhCBqb2luUm9vbSDigJQg2KfZhNin2YbYttmF2KfZhSDZitiq2YUg2KjYudivIGF1dGhlbnRpY2F0ZWQg2K/Yp9iu2YQgdXNlQ2hhdFxuICAgICAgY2hhdC5jb25uZWN0KHsgaWQ6IHNhdmVkVXNlcklkLCB1c2VybmFtZTogc2Vzc2lvbj8udXNlcm5hbWUgfHwgYFVzZXIjJHtzYXZlZFVzZXJJZH1gLCB1c2VyVHlwZTogc2Vzc2lvbj8udXNlclR5cGUgfHwgJ21lbWJlcicsIGlzT25saW5lOiB0cnVlLCByb2xlOiAnbWVtYmVyJyB9IGFzIGFueSk7XG4gICAgICBzZXRTaG93V2VsY29tZShmYWxzZSk7XG4gICAgICBpZiAocm9vbUlkKSB7XG4gICAgICAgIHNldFNlbGVjdGVkUm9vbUlkKHJvb21JZCk7XG4gICAgICAgIC8vINmE2Kcg2YbYs9iq2K/YudmKIGpvaW5Sb29tINmH2YbYpyDZhNiq2KzZhtioINin2YTYqtmD2LHYp9ixIOKAlCDYs9mK2KrZhSDYqNi52K8gYXV0aGVudGljYXRlZFxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgc2V0U2VsZWN0ZWRSb29tSWQobnVsbCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8g2KrYrdiv2YrYqyDYp9mE2K7ZhNmB2YrYqSDZhdmGINin2YTYrtin2K/ZhSDYo9mIINmD2YjZg9mKXG4gICAgKGFzeW5jICgpID0+IHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGlmIChzYXZlZFVzZXJJZCkge1xuICAgICAgICAgIGNvbnN0IHVzZXIgPSBhd2FpdCBhcGlSZXF1ZXN0KGAvYXBpL3VzZXJzLyR7c2F2ZWRVc2VySWR9YCk7XG4gICAgICAgICAgaWYgKHVzZXI/LmlkKSB7XG4gICAgICAgICAgICBjaGF0LmNvbm5lY3QodXNlcik7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGNvbnN0IGRhdGEgPSBhd2FpdCBhcGlSZXF1ZXN0KCcvYXBpL2F1dGgvc2Vzc2lvbicpO1xuICAgICAgICAgIGlmIChkYXRhPy51c2VyKSB7XG4gICAgICAgICAgICBjaGF0LmNvbm5lY3QoZGF0YS51c2VyKTtcbiAgICAgICAgICAgIHNldFNob3dXZWxjb21lKGZhbHNlKTtcbiAgICAgICAgICAgIGNvbnN0IHIgPSBzZXNzaW9uPy5yb29tSWQgJiYgc2Vzc2lvbi5yb29tSWQgIT09ICdwdWJsaWMnICYmIHNlc3Npb24ucm9vbUlkICE9PSAnZnJpZW5kcycgPyBzZXNzaW9uLnJvb21JZCA6IG51bGw7XG4gICAgICAgICAgICBpZiAocikge1xuICAgICAgICAgICAgICBzZXRTZWxlY3RlZFJvb21JZChyKTtcbiAgICAgICAgICAgICAgLy8g2KfZhNin2YbYttmF2KfZhSDYs9mK2KrZhSDYqtmE2YLYp9im2YrYp9mLINio2LnYryBhdXRoZW50aWNhdGVkXG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHNldFNob3dXZWxjb21lKHRydWUpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSBjYXRjaCB7XG4gICAgICAgIGlmICghc2F2ZWRVc2VySWQpIHNldFNob3dXZWxjb21lKHRydWUpO1xuICAgICAgfVxuICAgIH0pKCk7XG4gIH0sIFtdKTtcblxuICBjb25zdCBoYW5kbGVVc2VyTG9naW4gPSAodXNlcjogQ2hhdFVzZXIpID0+IHtcbiAgICBjbGVhclNlc3Npb24oKTsgLy8g2YXYs9itINij2Yog2KzZhNiz2Kkg2LPYp9io2YLYqSDZgtio2YQg2KrYs9is2YrZhCDYr9iu2YjZhCDYrNiv2YrYr1xuICAgIGNoYXQuY29ubmVjdCh1c2VyKTtcbiAgICBzZXRTaG93V2VsY29tZShmYWxzZSk7XG4gICAgLy8g2YTYpyDZhtmG2LbZhSDZhNij2Yog2LrYsdmB2Kkg2K3YqtmJINmK2K7Yqtin2LEg2KfZhNmF2LPYqtiu2K/ZhVxuICAgIHNldFNlbGVjdGVkUm9vbUlkKG51bGwpO1xuICB9O1xuXG4gIGNvbnN0IGhhbmRsZVNlbGVjdFJvb20gPSAocm9vbUlkOiBzdHJpbmcpID0+IHtcbiAgICBzZXRTZWxlY3RlZFJvb21JZChyb29tSWQpO1xuICAgIGNoYXQuam9pblJvb20ocm9vbUlkKTtcbiAgfTtcblxuICBjb25zdCBoYW5kbGVMb2dvdXQgPSBhc3luYyAoKSA9PiB7XG4gICAgdHJ5IHtcbiAgICAgIC8vINin2LPYqtiv2LnYp9ihIEFQSSDYqtiz2KzZitmEINin2YTYrtix2YjYrCDZhNmF2LPYrSDYp9mE2YPZiNmD2Yog2YXZhiDYp9mE2K7Yp9iv2YVcbiAgICAgIGF3YWl0IGFwaVJlcXVlc3QoJy9hcGkvYXV0aC9sb2dvdXQnLCB7IG1ldGhvZDogJ1BPU1QnIH0pO1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICBjb25zb2xlLmVycm9yKCfYrti32KMg2YHZiiDYqtiz2KzZitmEINin2YTYrtix2YjYrDonLCBlcnJvcik7XG4gICAgICAvLyDZhtmD2YXZhCDYudmF2YTZitipINin2YTYrtix2YjYrCDYrdiq2Ykg2YTZiCDZgdi02YQg2KfZhNi32YTYqFxuICAgIH1cbiAgICBcbiAgICBjbGVhclNlc3Npb24oKTsgLy8g2YXYs9itINio2YrYp9mG2KfYqiDYp9mE2KzZhNiz2Kkg2KfZhNmF2K3ZgdmI2LjYqVxuICAgIGNoYXQuZGlzY29ubmVjdCgpO1xuICAgIHNldFNob3dXZWxjb21lKHRydWUpO1xuICAgIHNldFNlbGVjdGVkUm9vbUlkKG51bGwpO1xuICB9O1xuXG4gIHJldHVybiAoXG4gICAgPGRpdiBjbGFzc05hbWU9XCJtaW4taC1bMTAwZHZoXSBiZy1iYWNrZ3JvdW5kIHRleHQtZm9yZWdyb3VuZCBmb250LVsnQ2Fpcm8nXSBvdmVyZmxvdy1oaWRkZW5cIiBkaXI9XCJydGxcIiBzdHlsZT17eyBtaW5IZWlnaHQ6ICcxMDBkdmgnIH19PlxuICAgICAgPFN1c3BlbnNlIGZhbGxiYWNrPXtudWxsfT5cbiAgICAgICAge2lzUmVzdG9yaW5nID8gKFxuICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwicC02IHRleHQtY2VudGVyXCI+Li4u2KzYp9ix2Yog2KfYs9iq2LnYp9iv2Kkg2KfZhNis2YTYs9ipPC9kaXY+XG4gICAgICAgICkgOiBzaG93V2VsY29tZSA/IChcbiAgICAgICAgICA8V2VsY29tZVNjcmVlbiBvblVzZXJMb2dpbj17aGFuZGxlVXNlckxvZ2lufSAvPlxuICAgICAgICApIDogc2VsZWN0ZWRSb29tSWQgPyAoXG4gICAgICAgICAgPENoYXRJbnRlcmZhY2UgY2hhdD17Y2hhdH0gb25Mb2dvdXQ9e2hhbmRsZUxvZ291dH0gLz5cbiAgICAgICAgKSA6IChcbiAgICAgICAgICA8Um9vbVNlbGVjdG9yU2NyZWVuIGN1cnJlbnRVc2VyPXtjaGF0LmN1cnJlbnRVc2VyfSBvblNlbGVjdFJvb209e2hhbmRsZVNlbGVjdFJvb219IC8+XG4gICAgICAgICl9XG4gICAgICA8L1N1c3BlbnNlPlxuXG4gICAgICB7Lyog2LnYr9in2K8g2KfZhNi32LHYryAqL31cbiAgICAgIDxLaWNrQ291bnRkb3duXG4gICAgICAgIGlzVmlzaWJsZT17Y2hhdC5zaG93S2lja0NvdW50ZG93biB8fCBmYWxzZX1cbiAgICAgICAgb25DbG9zZT17KCkgPT4gY2hhdC5zZXRTaG93S2lja0NvdW50ZG93bj8uKGZhbHNlKX1cbiAgICAgICAgZHVyYXRpb25NaW51dGVzPXsxNX1cbiAgICAgIC8+XG4gICAgPC9kaXY+XG4gICk7XG59XG4iXSwiZmlsZSI6Ii92YXIvd3d3L2FiZC9jbGllbnQvc3JjL3BhZ2VzL2NoYXQudHN4In0=
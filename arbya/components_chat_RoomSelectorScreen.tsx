import { createHotContext as __vite__createHotContext } from "/@vite/client";import.meta.hot = __vite__createHotContext("/src/components/chat/RoomSelectorScreen.tsx");import __vite__cjsImport0_react_jsxDevRuntime from "/@fs/var/www/abd/node_modules/.vite/deps/react_jsx-dev-runtime.js?v=197578e1"; const jsxDEV = __vite__cjsImport0_react_jsxDevRuntime["jsxDEV"];
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
  window.$RefreshReg$ = RefreshRuntime.getRefreshReg("/var/www/abd/client/src/components/chat/RoomSelectorScreen.tsx");
  window.$RefreshSig$ = RefreshRuntime.createSignatureFunctionForTransform;
}
var _s = $RefreshSig$();
import __vite__cjsImport3_react from "/@fs/var/www/abd/node_modules/.vite/deps/react.js?v=197578e1"; const React = __vite__cjsImport3_react.__esModule ? __vite__cjsImport3_react.default : __vite__cjsImport3_react; const useMemo = __vite__cjsImport3_react["useMemo"];
import RoomComponent from "/src/components/chat/RoomComponent.tsx";
import { useRoomManager } from "/src/hooks/useRoomManager.ts";
import { getSocket } from "/src/lib/socket.ts";
export default function RoomSelectorScreen({ currentUser, onSelectRoom }) {
  _s();
  const { rooms, loading, error, fetchRooms } = useRoomManager({ autoRefresh: false, cacheTimeout: 5 * 60 * 1e3 });
  const handleSelect = (roomId) => {
    try {
      onSelectRoom(roomId);
    } catch {
    }
  };
  React.useEffect(() => {
    let mounted = true;
    try {
      const s = getSocket();
      const onUpdate = (_payload) => {
        if (!mounted) return;
        fetchRooms(true);
      };
      s.on("roomUpdate", onUpdate);
      return () => {
        mounted = false;
        try {
          s.off("roomUpdate", onUpdate);
        } catch {
        }
      };
    } catch {
      return () => {
      };
    }
  }, [fetchRooms]);
  const content = useMemo(() => {
    if (loading && rooms.length === 0) {
      return /* @__PURE__ */ jsxDEV("div", { className: "min-h-[60vh] flex items-center justify-center", children: /* @__PURE__ */ jsxDEV("div", { className: "animate-pulse space-y-3 w-full max-w-2xl p-6", children: [
        /* @__PURE__ */ jsxDEV("div", { className: "h-6 bg-muted rounded w-1/3" }, void 0, false, {
          fileName: "/var/www/abd/client/src/components/chat/RoomSelectorScreen.tsx",
          lineNumber: 66,
          columnNumber: 7
        }, this),
        /* @__PURE__ */ jsxDEV("div", { className: "grid grid-cols-2 md:grid-cols-3 gap-4", children: [
          /* @__PURE__ */ jsxDEV("div", { className: "h-28 bg-muted rounded" }, void 0, false, {
            fileName: "/var/www/abd/client/src/components/chat/RoomSelectorScreen.tsx",
            lineNumber: 68,
            columnNumber: 8
          }, this),
          /* @__PURE__ */ jsxDEV("div", { className: "h-28 bg-muted rounded" }, void 0, false, {
            fileName: "/var/www/abd/client/src/components/chat/RoomSelectorScreen.tsx",
            lineNumber: 69,
            columnNumber: 8
          }, this),
          /* @__PURE__ */ jsxDEV("div", { className: "h-28 bg-muted rounded" }, void 0, false, {
            fileName: "/var/www/abd/client/src/components/chat/RoomSelectorScreen.tsx",
            lineNumber: 70,
            columnNumber: 8
          }, this)
        ] }, void 0, true, {
          fileName: "/var/www/abd/client/src/components/chat/RoomSelectorScreen.tsx",
          lineNumber: 67,
          columnNumber: 7
        }, this)
      ] }, void 0, true, {
        fileName: "/var/www/abd/client/src/components/chat/RoomSelectorScreen.tsx",
        lineNumber: 65,
        columnNumber: 6
      }, this) }, void 0, false, {
        fileName: "/var/www/abd/client/src/components/chat/RoomSelectorScreen.tsx",
        lineNumber: 64,
        columnNumber: 9
      }, this);
    }
    return /* @__PURE__ */ jsxDEV(
      RoomComponent,
      {
        currentUser,
        rooms,
        currentRoomId: "",
        onRoomChange: handleSelect,
        viewMode: "selector",
        showSearch: false,
        showStats: true,
        compact: false,
        allowCreate: false,
        allowDelete: false,
        allowRefresh: true,
        onRefreshRooms: () => fetchRooms(true)
      },
      void 0,
      false,
      {
        fileName: "/var/www/abd/client/src/components/chat/RoomSelectorScreen.tsx",
        lineNumber: 77,
        columnNumber: 7
      },
      this
    );
  }, [rooms, loading, currentUser, fetchRooms]);
  return /* @__PURE__ */ jsxDEV("div", { className: "min-h-[100dvh] flex items-center justify-center p-4 relative overflow-hidden", children: [
    /* @__PURE__ */ jsxDEV("div", { className: "absolute inset-0 overflow-hidden pointer-events-none", children: [
      /* @__PURE__ */ jsxDEV("div", { className: "absolute -top-1/4 -left-1/4 w-1/2 h-1/2 bg-gradient-radial from-cyan-500/10 to-transparent rounded-full blur-3xl animate-pulse" }, void 0, false, {
        fileName: "/var/www/abd/client/src/components/chat/RoomSelectorScreen.tsx",
        lineNumber: 98,
        columnNumber: 5
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "absolute -bottom-1/4 -right-1/4 w-1/2 h-1/2 bg-gradient-radial from-purple-500/10 to-transparent rounded-full blur-3xl animate-pulse", style: { animationDelay: "3s" } }, void 0, false, {
        fileName: "/var/www/abd/client/src/components/chat/RoomSelectorScreen.tsx",
        lineNumber: 99,
        columnNumber: 5
      }, this)
    ] }, void 0, true, {
      fileName: "/var/www/abd/client/src/components/chat/RoomSelectorScreen.tsx",
      lineNumber: 97,
      columnNumber: 4
    }, this),
    /* @__PURE__ */ jsxDEV("div", { className: "w-full max-w-5xl relative z-10", children: [
      /* @__PURE__ */ jsxDEV("div", { className: "text-center mb-8 animate-fade-in", children: [
        /* @__PURE__ */ jsxDEV("h1", { className: "text-4xl font-bold gradient-text mb-3", children: "اختر غرفة للدردشة" }, void 0, false, {
          fileName: "/var/www/abd/client/src/components/chat/RoomSelectorScreen.tsx",
          lineNumber: 104,
          columnNumber: 6
        }, this),
        /* @__PURE__ */ jsxDEV("p", { className: "text-xl text-muted-foreground", children: "انضم إلى إحدى الغرف المتاحة وابدأ المحادثة" }, void 0, false, {
          fileName: "/var/www/abd/client/src/components/chat/RoomSelectorScreen.tsx",
          lineNumber: 105,
          columnNumber: 6
        }, this)
      ] }, void 0, true, {
        fileName: "/var/www/abd/client/src/components/chat/RoomSelectorScreen.tsx",
        lineNumber: 103,
        columnNumber: 5
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "modern-card glass-effect p-6 animate-slide-up", children: [
        content,
        error && /* @__PURE__ */ jsxDEV("div", { className: "modern-notification bg-red-500/10 border-red-500/20 text-red-400 mt-4 text-center", children: "فشل في جلب الغرف" }, void 0, false, {
          fileName: "/var/www/abd/client/src/components/chat/RoomSelectorScreen.tsx",
          lineNumber: 111,
          columnNumber: 11
        }, this)
      ] }, void 0, true, {
        fileName: "/var/www/abd/client/src/components/chat/RoomSelectorScreen.tsx",
        lineNumber: 108,
        columnNumber: 5
      }, this)
    ] }, void 0, true, {
      fileName: "/var/www/abd/client/src/components/chat/RoomSelectorScreen.tsx",
      lineNumber: 102,
      columnNumber: 4
    }, this)
  ] }, void 0, true, {
    fileName: "/var/www/abd/client/src/components/chat/RoomSelectorScreen.tsx",
    lineNumber: 95,
    columnNumber: 5
  }, this);
}
_s(RoomSelectorScreen, "EDDlCMqs1zqZVB81ZSxLJO8MaEo=", false, function() {
  return [useRoomManager];
});
_c = RoomSelectorScreen;
var _c;
$RefreshReg$(_c, "RoomSelectorScreen");
if (import.meta.hot && !inWebWorker) {
  window.$RefreshReg$ = prevRefreshReg;
  window.$RefreshSig$ = prevRefreshSig;
}
if (import.meta.hot && !inWebWorker) {
  RefreshRuntime.__hmr_import(import.meta.url).then((currentExports) => {
    RefreshRuntime.registerExportsForReactRefresh("/var/www/abd/client/src/components/chat/RoomSelectorScreen.tsx", currentExports);
    import.meta.hot.accept((nextExports) => {
      if (!nextExports) return;
      const invalidateMessage = RefreshRuntime.validateRefreshBoundaryAndEnqueueUpdate("/var/www/abd/client/src/components/chat/RoomSelectorScreen.tsx", currentExports, nextExports);
      if (invalidateMessage) import.meta.hot.invalidate(invalidateMessage);
    });
  });
}

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJtYXBwaW5ncyI6IkFBOENNOzs7Ozs7Ozs7Ozs7Ozs7OztBQTlDTixPQUFPQSxTQUFTQyxlQUFlO0FBQy9CLE9BQU9DLG1CQUFtQjtBQUMxQixTQUFTQyxzQkFBc0I7QUFFL0IsU0FBU0MsaUJBQWlCO0FBTzFCLHdCQUF3QkMsbUJBQW1CLEVBQUVDLGFBQWFDLGFBQXNDLEdBQUc7QUFBQUMsS0FBQTtBQUNsRyxRQUFNLEVBQUVDLE9BQU9DLFNBQVNDLE9BQU9DLFdBQVcsSUFBSVQsZUFBZSxFQUFFVSxhQUFhLE9BQU9DLGNBQWMsSUFBSSxLQUFLLElBQUssQ0FBQztBQUVoSCxRQUFNQyxlQUFlQSxDQUFDQyxXQUFtQjtBQUN4QyxRQUFJO0FBQ0hULG1CQUFhUyxNQUFNO0FBQUEsSUFDcEIsUUFBUTtBQUFBLElBQUM7QUFBQSxFQUNWO0FBR0FoQixRQUFNaUIsVUFBVSxNQUFNO0FBQ3JCLFFBQUlDLFVBQVU7QUFDZCxRQUFJO0FBQ0gsWUFBTUMsSUFBSWYsVUFBVTtBQUNwQixZQUFNZ0IsV0FBV0EsQ0FBQ0MsYUFBa0I7QUFDbkMsWUFBSSxDQUFDSCxRQUFTO0FBQ2ROLG1CQUFXLElBQUk7QUFBQSxNQUNoQjtBQUNBTyxRQUFFRyxHQUFHLGNBQWNGLFFBQVE7QUFDM0IsYUFBTyxNQUFNO0FBQ1pGLGtCQUFVO0FBQ1YsWUFBSTtBQUFFQyxZQUFFSSxJQUFJLGNBQWNILFFBQVE7QUFBQSxRQUFHLFFBQVE7QUFBQSxRQUFDO0FBQUEsTUFDL0M7QUFBQSxJQUNELFFBQVE7QUFDUCxhQUFPLE1BQU07QUFBQSxNQUFDO0FBQUEsSUFDZjtBQUFBLEVBQ0QsR0FBRyxDQUFDUixVQUFVLENBQUM7QUFJZixRQUFNWSxVQUFVdkIsUUFBUSxNQUFNO0FBQzdCLFFBQUlTLFdBQVdELE1BQU1nQixXQUFXLEdBQUc7QUFDbEMsYUFDQyx1QkFBQyxTQUFJLFdBQVUsaURBQ2QsaUNBQUMsU0FBSSxXQUFVLGdEQUNkO0FBQUEsK0JBQUMsU0FBSSxXQUFVLGdDQUFmO0FBQUE7QUFBQTtBQUFBO0FBQUEsZUFBMkM7QUFBQSxRQUMzQyx1QkFBQyxTQUFJLFdBQVUseUNBQ2Q7QUFBQSxpQ0FBQyxTQUFJLFdBQVUsMkJBQWY7QUFBQTtBQUFBO0FBQUE7QUFBQSxpQkFBc0M7QUFBQSxVQUN0Qyx1QkFBQyxTQUFJLFdBQVUsMkJBQWY7QUFBQTtBQUFBO0FBQUE7QUFBQSxpQkFBc0M7QUFBQSxVQUN0Qyx1QkFBQyxTQUFJLFdBQVUsMkJBQWY7QUFBQTtBQUFBO0FBQUE7QUFBQSxpQkFBc0M7QUFBQSxhQUh2QztBQUFBO0FBQUE7QUFBQTtBQUFBLGVBSUE7QUFBQSxXQU5EO0FBQUE7QUFBQTtBQUFBO0FBQUEsYUFPQSxLQVJEO0FBQUE7QUFBQTtBQUFBO0FBQUEsYUFTQTtBQUFBLElBRUY7QUFDQSxXQUNDO0FBQUEsTUFBQztBQUFBO0FBQUEsUUFDQTtBQUFBLFFBQ0E7QUFBQSxRQUNBLGVBQWU7QUFBQSxRQUNmLGNBQWNWO0FBQUFBLFFBQ2QsVUFBUztBQUFBLFFBQ1QsWUFBWTtBQUFBLFFBQ1osV0FBVztBQUFBLFFBQ1gsU0FBUztBQUFBLFFBQ1QsYUFBYTtBQUFBLFFBQ2IsYUFBYTtBQUFBLFFBQ2IsY0FBYztBQUFBLFFBQ2QsZ0JBQWdCLE1BQU1ILFdBQVcsSUFBSTtBQUFBO0FBQUEsTUFadEM7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLElBWXdDO0FBQUEsRUFHMUMsR0FBRyxDQUFDSCxPQUFPQyxTQUFTSixhQUFhTSxVQUFVLENBQUM7QUFFNUMsU0FDQyx1QkFBQyxTQUFJLFdBQVUsZ0ZBRWQ7QUFBQSwyQkFBQyxTQUFJLFdBQVUsd0RBQ2Q7QUFBQSw2QkFBQyxTQUFJLFdBQVUsb0lBQWY7QUFBQTtBQUFBO0FBQUE7QUFBQSxhQUFnSjtBQUFBLE1BQ2hKLHVCQUFDLFNBQUksV0FBVSx3SUFBdUksT0FBTyxFQUFFYyxnQkFBZ0IsS0FBSyxLQUFwTDtBQUFBO0FBQUE7QUFBQTtBQUFBLGFBQXVMO0FBQUEsU0FGeEw7QUFBQTtBQUFBO0FBQUE7QUFBQSxXQUdBO0FBQUEsSUFFQSx1QkFBQyxTQUFJLFdBQVUsa0NBQ2Q7QUFBQSw2QkFBQyxTQUFJLFdBQVUsb0NBQ2Q7QUFBQSwrQkFBQyxRQUFHLFdBQVUseUNBQXdDLGlDQUF0RDtBQUFBO0FBQUE7QUFBQTtBQUFBLGVBQXVFO0FBQUEsUUFDdkUsdUJBQUMsT0FBRSxXQUFVLGlDQUFnQywwREFBN0M7QUFBQTtBQUFBO0FBQUE7QUFBQSxlQUF1RjtBQUFBLFdBRnhGO0FBQUE7QUFBQTtBQUFBO0FBQUEsYUFHQTtBQUFBLE1BRUEsdUJBQUMsU0FBSSxXQUFVLGlEQUNiRjtBQUFBQTtBQUFBQSxRQUNBYixTQUNBLHVCQUFDLFNBQUksV0FBVSxxRkFBbUYsZ0NBQWxHO0FBQUE7QUFBQTtBQUFBO0FBQUEsZUFFQTtBQUFBLFdBTEY7QUFBQTtBQUFBO0FBQUE7QUFBQSxhQU9BO0FBQUEsU0FiRDtBQUFBO0FBQUE7QUFBQTtBQUFBLFdBY0E7QUFBQSxPQXJCRDtBQUFBO0FBQUE7QUFBQTtBQUFBLFNBc0JBO0FBRUY7QUFBQ0gsR0F4RnVCSCxvQkFBa0I7QUFBQSxVQUNLRixjQUFjO0FBQUE7QUFBQXdCLEtBRHJDdEI7QUFBa0IsSUFBQXNCO0FBQUFDLGFBQUFELElBQUEiLCJuYW1lcyI6WyJSZWFjdCIsInVzZU1lbW8iLCJSb29tQ29tcG9uZW50IiwidXNlUm9vbU1hbmFnZXIiLCJnZXRTb2NrZXQiLCJSb29tU2VsZWN0b3JTY3JlZW4iLCJjdXJyZW50VXNlciIsIm9uU2VsZWN0Um9vbSIsIl9zIiwicm9vbXMiLCJsb2FkaW5nIiwiZXJyb3IiLCJmZXRjaFJvb21zIiwiYXV0b1JlZnJlc2giLCJjYWNoZVRpbWVvdXQiLCJoYW5kbGVTZWxlY3QiLCJyb29tSWQiLCJ1c2VFZmZlY3QiLCJtb3VudGVkIiwicyIsIm9uVXBkYXRlIiwiX3BheWxvYWQiLCJvbiIsIm9mZiIsImNvbnRlbnQiLCJsZW5ndGgiLCJhbmltYXRpb25EZWxheSIsIl9jIiwiJFJlZnJlc2hSZWckIl0sImlnbm9yZUxpc3QiOltdLCJzb3VyY2VzIjpbIlJvb21TZWxlY3RvclNjcmVlbi50c3giXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IFJlYWN0LCB7IHVzZU1lbW8gfSBmcm9tICdyZWFjdCc7XG5pbXBvcnQgUm9vbUNvbXBvbmVudCBmcm9tICdAL2NvbXBvbmVudHMvY2hhdC9Sb29tQ29tcG9uZW50JztcbmltcG9ydCB7IHVzZVJvb21NYW5hZ2VyIH0gZnJvbSAnQC9ob29rcy91c2VSb29tTWFuYWdlcic7XG5pbXBvcnQgdHlwZSB7IENoYXRVc2VyIH0gZnJvbSAnQC90eXBlcy9jaGF0JztcbmltcG9ydCB7IGdldFNvY2tldCB9IGZyb20gJ0AvbGliL3NvY2tldCc7XG5cbmludGVyZmFjZSBSb29tU2VsZWN0b3JTY3JlZW5Qcm9wcyB7XG5cdGN1cnJlbnRVc2VyOiBDaGF0VXNlciB8IG51bGw7XG5cdG9uU2VsZWN0Um9vbTogKHJvb21JZDogc3RyaW5nKSA9PiB2b2lkO1xufVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBSb29tU2VsZWN0b3JTY3JlZW4oeyBjdXJyZW50VXNlciwgb25TZWxlY3RSb29tIH06IFJvb21TZWxlY3RvclNjcmVlblByb3BzKSB7XG5cdGNvbnN0IHsgcm9vbXMsIGxvYWRpbmcsIGVycm9yLCBmZXRjaFJvb21zIH0gPSB1c2VSb29tTWFuYWdlcih7IGF1dG9SZWZyZXNoOiBmYWxzZSwgY2FjaGVUaW1lb3V0OiA1ICogNjAgKiAxMDAwIH0pO1xuXG5cdGNvbnN0IGhhbmRsZVNlbGVjdCA9IChyb29tSWQ6IHN0cmluZykgPT4ge1xuXHRcdHRyeSB7XG5cdFx0XHRvblNlbGVjdFJvb20ocm9vbUlkKTtcblx0XHR9IGNhdGNoIHt9XG5cdH07XG5cblx0Ly8gU29ja2V0IGxpc3RlbmVyIGZvciBsaXZlIHVwZGF0ZXNcblx0UmVhY3QudXNlRWZmZWN0KCgpID0+IHtcblx0XHRsZXQgbW91bnRlZCA9IHRydWU7XG5cdFx0dHJ5IHtcblx0XHRcdGNvbnN0IHMgPSBnZXRTb2NrZXQoKTtcblx0XHRcdGNvbnN0IG9uVXBkYXRlID0gKF9wYXlsb2FkOiBhbnkpID0+IHtcblx0XHRcdFx0aWYgKCFtb3VudGVkKSByZXR1cm47XG5cdFx0XHRcdGZldGNoUm9vbXModHJ1ZSk7XG5cdFx0XHR9O1xuXHRcdFx0cy5vbigncm9vbVVwZGF0ZScsIG9uVXBkYXRlKTtcblx0XHRcdHJldHVybiAoKSA9PiB7XG5cdFx0XHRcdG1vdW50ZWQgPSBmYWxzZTtcblx0XHRcdFx0dHJ5IHsgcy5vZmYoJ3Jvb21VcGRhdGUnLCBvblVwZGF0ZSk7IH0gY2F0Y2gge31cblx0XHRcdH07XG5cdFx0fSBjYXRjaCB7XG5cdFx0XHRyZXR1cm4gKCkgPT4ge307XG5cdFx0fVxuXHR9LCBbZmV0Y2hSb29tc10pO1xuXG5cdC8vINiq2YXYqiDYpdiy2KfZhNipIHBvbGxpbmcg2KfZhNin2K3YqtmK2KfYt9mK2Jsg2YbYudiq2YXYryDYudmE2Ykg2KPYrdiv2KfYqyBzb2NrZXQgJ3Jvb21VcGRhdGUnXG5cblx0Y29uc3QgY29udGVudCA9IHVzZU1lbW8oKCkgPT4ge1xuXHRcdGlmIChsb2FkaW5nICYmIHJvb21zLmxlbmd0aCA9PT0gMCkge1xuXHRcdFx0cmV0dXJuIChcblx0XHRcdFx0PGRpdiBjbGFzc05hbWU9XCJtaW4taC1bNjB2aF0gZmxleCBpdGVtcy1jZW50ZXIganVzdGlmeS1jZW50ZXJcIj5cblx0XHRcdFx0XHQ8ZGl2IGNsYXNzTmFtZT1cImFuaW1hdGUtcHVsc2Ugc3BhY2UteS0zIHctZnVsbCBtYXgtdy0yeGwgcC02XCI+XG5cdFx0XHRcdFx0XHQ8ZGl2IGNsYXNzTmFtZT1cImgtNiBiZy1tdXRlZCByb3VuZGVkIHctMS8zXCIgLz5cblx0XHRcdFx0XHRcdDxkaXYgY2xhc3NOYW1lPVwiZ3JpZCBncmlkLWNvbHMtMiBtZDpncmlkLWNvbHMtMyBnYXAtNFwiPlxuXHRcdFx0XHRcdFx0XHQ8ZGl2IGNsYXNzTmFtZT1cImgtMjggYmctbXV0ZWQgcm91bmRlZFwiIC8+XG5cdFx0XHRcdFx0XHRcdDxkaXYgY2xhc3NOYW1lPVwiaC0yOCBiZy1tdXRlZCByb3VuZGVkXCIgLz5cblx0XHRcdFx0XHRcdFx0PGRpdiBjbGFzc05hbWU9XCJoLTI4IGJnLW11dGVkIHJvdW5kZWRcIiAvPlxuXHRcdFx0XHRcdFx0PC9kaXY+XG5cdFx0XHRcdFx0PC9kaXY+XG5cdFx0XHRcdDwvZGl2PlxuXHRcdFx0KTtcblx0XHR9XG5cdFx0cmV0dXJuIChcblx0XHRcdDxSb29tQ29tcG9uZW50XG5cdFx0XHRcdGN1cnJlbnRVc2VyPXtjdXJyZW50VXNlcn1cblx0XHRcdFx0cm9vbXM9e3Jvb21zfVxuXHRcdFx0XHRjdXJyZW50Um9vbUlkPXsnJ31cblx0XHRcdFx0b25Sb29tQ2hhbmdlPXtoYW5kbGVTZWxlY3R9XG5cdFx0XHRcdHZpZXdNb2RlPVwic2VsZWN0b3JcIlxuXHRcdFx0XHRzaG93U2VhcmNoPXtmYWxzZX1cblx0XHRcdFx0c2hvd1N0YXRzPXt0cnVlfVxuXHRcdFx0XHRjb21wYWN0PXtmYWxzZX1cblx0XHRcdFx0YWxsb3dDcmVhdGU9e2ZhbHNlfVxuXHRcdFx0XHRhbGxvd0RlbGV0ZT17ZmFsc2V9XG5cdFx0XHRcdGFsbG93UmVmcmVzaD17dHJ1ZX1cblx0XHRcdFx0b25SZWZyZXNoUm9vbXM9eygpID0+IGZldGNoUm9vbXModHJ1ZSl9XG5cdFx0XHQvPlxuXHRcdCk7XG5cdH0sIFtyb29tcywgbG9hZGluZywgY3VycmVudFVzZXIsIGZldGNoUm9vbXNdKTtcblxuXHRyZXR1cm4gKFxuXHRcdDxkaXYgY2xhc3NOYW1lPVwibWluLWgtWzEwMGR2aF0gZmxleCBpdGVtcy1jZW50ZXIganVzdGlmeS1jZW50ZXIgcC00IHJlbGF0aXZlIG92ZXJmbG93LWhpZGRlblwiPlxuXHRcdFx0ey8qIE1vZGVybiBCYWNrZ3JvdW5kIEVmZmVjdHMgKi99XG5cdFx0XHQ8ZGl2IGNsYXNzTmFtZT1cImFic29sdXRlIGluc2V0LTAgb3ZlcmZsb3ctaGlkZGVuIHBvaW50ZXItZXZlbnRzLW5vbmVcIj5cblx0XHRcdFx0PGRpdiBjbGFzc05hbWU9XCJhYnNvbHV0ZSAtdG9wLTEvNCAtbGVmdC0xLzQgdy0xLzIgaC0xLzIgYmctZ3JhZGllbnQtcmFkaWFsIGZyb20tY3lhbi01MDAvMTAgdG8tdHJhbnNwYXJlbnQgcm91bmRlZC1mdWxsIGJsdXItM3hsIGFuaW1hdGUtcHVsc2VcIj48L2Rpdj5cblx0XHRcdFx0PGRpdiBjbGFzc05hbWU9XCJhYnNvbHV0ZSAtYm90dG9tLTEvNCAtcmlnaHQtMS80IHctMS8yIGgtMS8yIGJnLWdyYWRpZW50LXJhZGlhbCBmcm9tLXB1cnBsZS01MDAvMTAgdG8tdHJhbnNwYXJlbnQgcm91bmRlZC1mdWxsIGJsdXItM3hsIGFuaW1hdGUtcHVsc2VcIiBzdHlsZT17eyBhbmltYXRpb25EZWxheTogJzNzJyB9fT48L2Rpdj5cblx0XHRcdDwvZGl2PlxuXHRcdFx0XG5cdFx0XHQ8ZGl2IGNsYXNzTmFtZT1cInctZnVsbCBtYXgtdy01eGwgcmVsYXRpdmUgei0xMFwiPlxuXHRcdFx0XHQ8ZGl2IGNsYXNzTmFtZT1cInRleHQtY2VudGVyIG1iLTggYW5pbWF0ZS1mYWRlLWluXCI+XG5cdFx0XHRcdFx0PGgxIGNsYXNzTmFtZT1cInRleHQtNHhsIGZvbnQtYm9sZCBncmFkaWVudC10ZXh0IG1iLTNcIj7Yp9iu2KrYsSDYutix2YHYqSDZhNmE2K/Ysdiv2LTYqTwvaDE+XG5cdFx0XHRcdFx0PHAgY2xhc3NOYW1lPVwidGV4dC14bCB0ZXh0LW11dGVkLWZvcmVncm91bmRcIj7Yp9mG2LbZhSDYpdmE2Ykg2KXYrdiv2Ykg2KfZhNi62LHZgSDYp9mE2YXYqtin2K3YqSDZiNin2KjYr9ijINin2YTZhdit2KfYr9ir2Kk8L3A+XG5cdFx0XHRcdDwvZGl2PlxuXHRcdFx0XHRcblx0XHRcdFx0PGRpdiBjbGFzc05hbWU9XCJtb2Rlcm4tY2FyZCBnbGFzcy1lZmZlY3QgcC02IGFuaW1hdGUtc2xpZGUtdXBcIj5cblx0XHRcdFx0XHR7Y29udGVudH1cblx0XHRcdFx0XHR7ZXJyb3IgJiYgKFxuXHRcdFx0XHRcdFx0PGRpdiBjbGFzc05hbWU9XCJtb2Rlcm4tbm90aWZpY2F0aW9uIGJnLXJlZC01MDAvMTAgYm9yZGVyLXJlZC01MDAvMjAgdGV4dC1yZWQtNDAwIG10LTQgdGV4dC1jZW50ZXJcIj5cblx0XHRcdFx0XHRcdFx02YHYtNmEINmB2Yog2KzZhNioINin2YTYutix2YFcblx0XHRcdFx0XHRcdDwvZGl2PlxuXHRcdFx0XHRcdCl9XG5cdFx0XHRcdDwvZGl2PlxuXHRcdFx0PC9kaXY+XG5cdFx0PC9kaXY+XG5cdCk7XG59Il0sImZpbGUiOiIvdmFyL3d3dy9hYmQvY2xpZW50L3NyYy9jb21wb25lbnRzL2NoYXQvUm9vbVNlbGVjdG9yU2NyZWVuLnRzeCJ9
import { createHotContext as __vite__createHotContext } from "/@vite/client";import.meta.hot = __vite__createHotContext("/src/contexts/UserContext.tsx");import __vite__cjsImport0_react_jsxDevRuntime from "/@fs/var/www/abd/node_modules/.vite/deps/react_jsx-dev-runtime.js?v=197578e1"; const jsxDEV = __vite__cjsImport0_react_jsxDevRuntime["jsxDEV"];
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
  window.$RefreshReg$ = RefreshRuntime.getRefreshReg("/var/www/abd/client/src/contexts/UserContext.tsx");
  window.$RefreshSig$ = RefreshRuntime.createSignatureFunctionForTransform;
}
var _s = $RefreshSig$(), _s2 = $RefreshSig$(), _s3 = $RefreshSig$();
import __vite__cjsImport3_react from "/@fs/var/www/abd/node_modules/.vite/deps/react.js?v=197578e1"; const createContext = __vite__cjsImport3_react["createContext"]; const useContext = __vite__cjsImport3_react["useContext"]; const useReducer = __vite__cjsImport3_react["useReducer"]; const useCallback = __vite__cjsImport3_react["useCallback"]; const useEffect = __vite__cjsImport3_react["useEffect"];
import { useErrorHandler } from "/src/hooks/useErrorHandler.ts";
import { api } from "/src/lib/queryClient.ts";
const initialState = {
  currentUser: null,
  isLoading: false,
  isAuthenticated: false,
  error: null,
  lastUpdated: 0
};
function userReducer(state, action) {
  switch (action.type) {
    case "SET_LOADING":
      return { ...state, isLoading: action.payload };
    case "SET_USER":
      return {
        ...state,
        currentUser: action.payload,
        isAuthenticated: !!action.payload,
        error: null,
        lastUpdated: Date.now()
      };
    case "UPDATE_USER":
      if (!state.currentUser) return state;
      return {
        ...state,
        currentUser: { ...state.currentUser, ...action.payload },
        lastUpdated: Date.now()
      };
    case "SET_ERROR":
      return { ...state, error: action.payload, isLoading: false };
    case "SET_AUTHENTICATED":
      return { ...state, isAuthenticated: action.payload };
    case "CLEAR_USER":
      return {
        ...initialState,
        lastUpdated: Date.now()
      };
    case "UPDATE_LAST_SEEN":
      if (!state.currentUser) return state;
      return {
        ...state,
        currentUser: {
          ...state.currentUser,
          lastSeen: /* @__PURE__ */ new Date()
        }
      };
    case "UPDATE_TIMESTAMP":
      return { ...state, lastUpdated: Date.now() };
    default:
      return state;
  }
}
const UserContext = createContext(void 0);
export function UserProvider({ children }) {
  _s();
  const [state, dispatch] = useReducer(userReducer, initialState);
  const { handleError, handleSuccess } = useErrorHandler();
  const setUser = useCallback((user) => {
    dispatch({ type: "SET_USER", payload: user });
  }, []);
  const updateUser = useCallback((updates) => {
    dispatch({ type: "UPDATE_USER", payload: updates });
  }, []);
  const clearUser = useCallback(() => {
    dispatch({ type: "CLEAR_USER" });
  }, []);
  const refreshUser = useCallback(async () => {
    if (!state.currentUser?.id) return;
    dispatch({ type: "SET_LOADING", payload: true });
    try {
      const updatedUser = await api.get(`/api/users/${state.currentUser.id}`);
      dispatch({ type: "SET_USER", payload: updatedUser });
    } catch (error) {
      handleError(error, "فشل في تحديث بيانات المستخدم");
      dispatch({ type: "SET_ERROR", payload: "فشل في تحديث البيانات" });
    } finally {
      dispatch({ type: "SET_LOADING", payload: false });
    }
  }, [state.currentUser?.id, handleError]);
  const updateProfile = useCallback(
    async (updates) => {
      if (!state.currentUser?.id) {
        throw new Error("المستخدم غير مسجل");
      }
      dispatch({ type: "SET_LOADING", payload: true });
      try {
        const updatedUser = await api.put(`/api/users/${state.currentUser.id}`, updates);
        dispatch({ type: "SET_USER", payload: updatedUser });
        handleSuccess("تم تحديث الملف الشخصي بنجاح");
      } catch (error) {
        handleError(error, "فشل في تحديث الملف الشخصي");
        throw error;
      } finally {
        dispatch({ type: "SET_LOADING", payload: false });
      }
    },
    [state.currentUser?.id, handleError, handleSuccess]
  );
  const updateLastSeen = useCallback(() => {
    dispatch({ type: "UPDATE_LAST_SEEN" });
  }, []);
  const hasPermission = useCallback(
    (requiredRole) => {
      if (!state.currentUser) return false;
      const roleHierarchy = {
        guest: 0,
        member: 1,
        moderator: 2,
        admin: 3,
        owner: 4
      };
      const userLevel = roleHierarchy[state.currentUser.userType] || 0;
      const requiredLevel = roleHierarchy[requiredRole] || 0;
      return userLevel >= requiredLevel;
    },
    [state.currentUser]
  );
  const isCurrentUser = useCallback(
    (userId) => {
      return state.currentUser?.id === userId;
    },
    [state.currentUser?.id]
  );
  useEffect(() => {
    if (!state.isAuthenticated) return;
    const interval = setInterval(() => {
      updateLastSeen();
    }, 6e4);
    return () => clearInterval(interval);
  }, [state.isAuthenticated, updateLastSeen]);
  const contextValue = {
    // State
    user: state.currentUser,
    isLoading: state.isLoading,
    isAuthenticated: state.isAuthenticated,
    error: state.error,
    lastUpdated: state.lastUpdated,
    // Actions
    setUser,
    updateUser,
    clearUser,
    refreshUser,
    updateProfile,
    updateLastSeen,
    // Utilities
    hasPermission,
    isCurrentUser
  };
  return /* @__PURE__ */ jsxDEV(UserContext.Provider, { value: contextValue, children }, void 0, false, {
    fileName: "/var/www/abd/client/src/contexts/UserContext.tsx",
    lineNumber: 260,
    columnNumber: 10
  }, this);
}
_s(UserProvider, "XjQrukAAzkUvmyV6pvHMDnEHa04=", false, function() {
  return [useErrorHandler];
});
_c = UserProvider;
export function useUser() {
  _s2();
  const context = useContext(UserContext);
  if (context === void 0) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
}
_s2(useUser, "b9L3QQ+jgeyIrH0NfHrJ8nn7VMU=");
export function useAuth() {
  _s3();
  const { user, isAuthenticated, isLoading } = useUser();
  return {
    user,
    isAuthenticated,
    isLoading,
    isGuest: user?.userType === "guest",
    isMember: user?.userType === "member",
    isModerator: user?.userType === "moderator",
    isAdmin: user?.userType === "admin",
    isOwner: user?.userType === "owner"
  };
}
_s3(useAuth, "tIEeLywtoTWUf4exF4C8vl47SFU=", false, function() {
  return [useUser];
});
var _c;
$RefreshReg$(_c, "UserProvider");
if (import.meta.hot && !inWebWorker) {
  window.$RefreshReg$ = prevRefreshReg;
  window.$RefreshSig$ = prevRefreshSig;
}
if (import.meta.hot && !inWebWorker) {
  RefreshRuntime.__hmr_import(import.meta.url).then((currentExports) => {
    RefreshRuntime.registerExportsForReactRefresh("/var/www/abd/client/src/contexts/UserContext.tsx", currentExports);
    import.meta.hot.accept((nextExports) => {
      if (!nextExports) return;
      const invalidateMessage = RefreshRuntime.validateRefreshBoundaryAndEnqueueUpdate("/var/www/abd/client/src/contexts/UserContext.tsx", currentExports, nextExports);
      if (invalidateMessage) import.meta.hot.invalidate(invalidateMessage);
    });
  });
}

//# sourceMappingURL=data:application/json;base64,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QUFBLEVBQ0Y7QUFFQSxTQUFPLHVCQUFDLFlBQVksVUFBWixFQUFxQixPQUFPSyxjQUFlbEMsWUFBNUM7QUFBQTtBQUFBO0FBQUE7QUFBQSxTQUFxRDtBQUM5RDtBQUVBQyxHQWpJZ0JGLGNBQVk7QUFBQSxVQUVhbEIsZUFBZTtBQUFBO0FBQUFzRCxLQUZ4Q3BDO0FBa0lULGdCQUFTcUMsVUFBVTtBQUFBQyxNQUFBO0FBQ3hCLFFBQU1DLFVBQVU3RCxXQUFXb0IsV0FBVztBQUV0QyxNQUFJeUMsWUFBWXhDLFFBQVc7QUFDekIsVUFBTSxJQUFJaUIsTUFBTSw0Q0FBNEM7QUFBQSxFQUM5RDtBQUVBLFNBQU91QjtBQUNUO0FBRUFELElBVmdCRCxTQUFPO0FBV2hCLGdCQUFTRyxVQUFVO0FBQUFDLE1BQUE7QUFDeEIsUUFBTSxFQUFFbEMsTUFBTXBCLGlCQUFpQkQsVUFBVSxJQUFJbUQsUUFBUTtBQUVyRCxTQUFPO0FBQUEsSUFDTDlCO0FBQUFBLElBQ0FwQjtBQUFBQSxJQUNBRDtBQUFBQSxJQUNBd0QsU0FBU25DLE1BQU1xQixhQUFhO0FBQUEsSUFDNUJlLFVBQVVwQyxNQUFNcUIsYUFBYTtBQUFBLElBQzdCZ0IsYUFBYXJDLE1BQU1xQixhQUFhO0FBQUEsSUFDaENpQixTQUFTdEMsTUFBTXFCLGFBQWE7QUFBQSxJQUM1QmtCLFNBQVN2QyxNQUFNcUIsYUFBYTtBQUFBLEVBQzlCO0FBQ0Y7QUFBQ2EsSUFiZUQsU0FBTztBQUFBLFVBQ3dCSCxPQUFPO0FBQUE7QUFBQSxJQUFBRDtBQUFBVyxhQUFBWCxJQUFBIiwibmFtZXMiOlsiY3JlYXRlQ29udGV4dCIsInVzZUNvbnRleHQiLCJ1c2VSZWR1Y2VyIiwidXNlQ2FsbGJhY2siLCJ1c2VFZmZlY3QiLCJ1c2VFcnJvckhhbmRsZXIiLCJhcGkiLCJpbml0aWFsU3RhdGUiLCJjdXJyZW50VXNlciIsImlzTG9hZGluZyIsImlzQXV0aGVudGljYXRlZCIsImVycm9yIiwibGFzdFVwZGF0ZWQiLCJ1c2VyUmVkdWNlciIsInN0YXRlIiwiYWN0aW9uIiwidHlwZSIsInBheWxvYWQiLCJEYXRlIiwibm93IiwibGFzdFNlZW4iLCJVc2VyQ29udGV4dCIsInVuZGVmaW5lZCIsIlVzZXJQcm92aWRlciIsImNoaWxkcmVuIiwiX3MiLCJkaXNwYXRjaCIsImhhbmRsZUVycm9yIiwiaGFuZGxlU3VjY2VzcyIsInNldFVzZXIiLCJ1c2VyIiwidXBkYXRlVXNlciIsInVwZGF0ZXMiLCJjbGVhclVzZXIiLCJyZWZyZXNoVXNlciIsImlkIiwidXBkYXRlZFVzZXIiLCJnZXQiLCJ1cGRhdGVQcm9maWxlIiwiRXJyb3IiLCJwdXQiLCJ1cGRhdGVMYXN0U2VlbiIsImhhc1Blcm1pc3Npb24iLCJyZXF1aXJlZFJvbGUiLCJyb2xlSGllcmFyY2h5IiwiZ3Vlc3QiLCJtZW1iZXIiLCJtb2RlcmF0b3IiLCJhZG1pbiIsIm93bmVyIiwidXNlckxldmVsIiwidXNlclR5cGUiLCJyZXF1aXJlZExldmVsIiwiaXNDdXJyZW50VXNlciIsInVzZXJJZCIsImludGVydmFsIiwic2V0SW50ZXJ2YWwiLCJjbGVhckludGVydmFsIiwiY29udGV4dFZhbHVlIiwiX2MiLCJ1c2VVc2VyIiwiX3MyIiwiY29udGV4dCIsInVzZUF1dGgiLCJfczMiLCJpc0d1ZXN0IiwiaXNNZW1iZXIiLCJpc01vZGVyYXRvciIsImlzQWRtaW4iLCJpc093bmVyIiwiJFJlZnJlc2hSZWckIl0sImlnbm9yZUxpc3QiOltdLCJzb3VyY2VzIjpbIlVzZXJDb250ZXh0LnRzeCJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgUmVhY3QsIHsgY3JlYXRlQ29udGV4dCwgdXNlQ29udGV4dCwgdXNlUmVkdWNlciwgdXNlQ2FsbGJhY2ssIHVzZUVmZmVjdCB9IGZyb20gJ3JlYWN0JztcblxuaW1wb3J0IHsgdXNlRXJyb3JIYW5kbGVyIH0gZnJvbSAnQC9ob29rcy91c2VFcnJvckhhbmRsZXInO1xuaW1wb3J0IHsgYXBpIH0gZnJvbSAnQC9saWIvcXVlcnlDbGllbnQnO1xuaW1wb3J0IHR5cGUgeyBDaGF0VXNlciB9IGZyb20gJ0AvdHlwZXMvY2hhdCc7XG5cbi8vINij2YbZiNin2Lkg2KfZhNit2KfZhNipXG5pbnRlcmZhY2UgVXNlclN0YXRlIHtcbiAgY3VycmVudFVzZXI6IENoYXRVc2VyIHwgbnVsbDtcbiAgaXNMb2FkaW5nOiBib29sZWFuO1xuICBpc0F1dGhlbnRpY2F0ZWQ6IGJvb2xlYW47XG4gIGVycm9yOiBzdHJpbmcgfCBudWxsO1xuICBsYXN0VXBkYXRlZDogbnVtYmVyO1xufVxuXG4vLyDYo9mG2YjYp9i5INin2YTYpdis2LHYp9ih2KfYqlxudHlwZSBVc2VyQWN0aW9uID1cbiAgfCB7IHR5cGU6ICdTRVRfTE9BRElORyc7IHBheWxvYWQ6IGJvb2xlYW4gfVxuICB8IHsgdHlwZTogJ1NFVF9VU0VSJzsgcGF5bG9hZDogQ2hhdFVzZXIgfCBudWxsIH1cbiAgfCB7IHR5cGU6ICdVUERBVEVfVVNFUic7IHBheWxvYWQ6IFBhcnRpYWw8Q2hhdFVzZXI+IH1cbiAgfCB7IHR5cGU6ICdTRVRfRVJST1InOyBwYXlsb2FkOiBzdHJpbmcgfCBudWxsIH1cbiAgfCB7IHR5cGU6ICdTRVRfQVVUSEVOVElDQVRFRCc7IHBheWxvYWQ6IGJvb2xlYW4gfVxuICB8IHsgdHlwZTogJ0NMRUFSX1VTRVInIH1cbiAgfCB7IHR5cGU6ICdVUERBVEVfTEFTVF9TRUVOJyB9XG4gIHwgeyB0eXBlOiAnVVBEQVRFX1RJTUVTVEFNUCcgfTtcblxuLy8g2KfZhNit2KfZhNipINin2YTYo9mI2YTZitipXG5jb25zdCBpbml0aWFsU3RhdGU6IFVzZXJTdGF0ZSA9IHtcbiAgY3VycmVudFVzZXI6IG51bGwsXG4gIGlzTG9hZGluZzogZmFsc2UsXG4gIGlzQXV0aGVudGljYXRlZDogZmFsc2UsXG4gIGVycm9yOiBudWxsLFxuICBsYXN0VXBkYXRlZDogMCxcbn07XG5cbi8vINmF2K7Zgdi2INin2YTYrdin2YTYqVxuZnVuY3Rpb24gdXNlclJlZHVjZXIoc3RhdGU6IFVzZXJTdGF0ZSwgYWN0aW9uOiBVc2VyQWN0aW9uKTogVXNlclN0YXRlIHtcbiAgc3dpdGNoIChhY3Rpb24udHlwZSkge1xuICAgIGNhc2UgJ1NFVF9MT0FESU5HJzpcbiAgICAgIHJldHVybiB7IC4uLnN0YXRlLCBpc0xvYWRpbmc6IGFjdGlvbi5wYXlsb2FkIH07XG5cbiAgICBjYXNlICdTRVRfVVNFUic6XG4gICAgICByZXR1cm4ge1xuICAgICAgICAuLi5zdGF0ZSxcbiAgICAgICAgY3VycmVudFVzZXI6IGFjdGlvbi5wYXlsb2FkLFxuICAgICAgICBpc0F1dGhlbnRpY2F0ZWQ6ICEhYWN0aW9uLnBheWxvYWQsXG4gICAgICAgIGVycm9yOiBudWxsLFxuICAgICAgICBsYXN0VXBkYXRlZDogRGF0ZS5ub3coKSxcbiAgICAgIH07XG5cbiAgICBjYXNlICdVUERBVEVfVVNFUic6XG4gICAgICBpZiAoIXN0YXRlLmN1cnJlbnRVc2VyKSByZXR1cm4gc3RhdGU7XG4gICAgICByZXR1cm4ge1xuICAgICAgICAuLi5zdGF0ZSxcbiAgICAgICAgY3VycmVudFVzZXI6IHsgLi4uc3RhdGUuY3VycmVudFVzZXIsIC4uLmFjdGlvbi5wYXlsb2FkIH0sXG4gICAgICAgIGxhc3RVcGRhdGVkOiBEYXRlLm5vdygpLFxuICAgICAgfTtcblxuICAgIGNhc2UgJ1NFVF9FUlJPUic6XG4gICAgICByZXR1cm4geyAuLi5zdGF0ZSwgZXJyb3I6IGFjdGlvbi5wYXlsb2FkLCBpc0xvYWRpbmc6IGZhbHNlIH07XG5cbiAgICBjYXNlICdTRVRfQVVUSEVOVElDQVRFRCc6XG4gICAgICByZXR1cm4geyAuLi5zdGF0ZSwgaXNBdXRoZW50aWNhdGVkOiBhY3Rpb24ucGF5bG9hZCB9O1xuXG4gICAgY2FzZSAnQ0xFQVJfVVNFUic6XG4gICAgICByZXR1cm4ge1xuICAgICAgICAuLi5pbml0aWFsU3RhdGUsXG4gICAgICAgIGxhc3RVcGRhdGVkOiBEYXRlLm5vdygpLFxuICAgICAgfTtcblxuICAgIGNhc2UgJ1VQREFURV9MQVNUX1NFRU4nOlxuICAgICAgaWYgKCFzdGF0ZS5jdXJyZW50VXNlcikgcmV0dXJuIHN0YXRlO1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgLi4uc3RhdGUsXG4gICAgICAgIGN1cnJlbnRVc2VyOiB7XG4gICAgICAgICAgLi4uc3RhdGUuY3VycmVudFVzZXIsXG4gICAgICAgICAgbGFzdFNlZW46IG5ldyBEYXRlKCksXG4gICAgICAgIH0sXG4gICAgICB9O1xuXG4gICAgY2FzZSAnVVBEQVRFX1RJTUVTVEFNUCc6XG4gICAgICByZXR1cm4geyAuLi5zdGF0ZSwgbGFzdFVwZGF0ZWQ6IERhdGUubm93KCkgfTtcblxuICAgIGRlZmF1bHQ6XG4gICAgICByZXR1cm4gc3RhdGU7XG4gIH1cbn1cblxuLy8g2KXZhtiq2LHZgdmK2LMg2KfZhNmF2K3YqtmI2YlcbmludGVyZmFjZSBVc2VyQ29udGV4dFR5cGUge1xuICAvLyBTdGF0ZVxuICB1c2VyOiBDaGF0VXNlciB8IG51bGw7XG4gIGlzTG9hZGluZzogYm9vbGVhbjtcbiAgaXNBdXRoZW50aWNhdGVkOiBib29sZWFuO1xuICBlcnJvcjogc3RyaW5nIHwgbnVsbDtcbiAgbGFzdFVwZGF0ZWQ6IG51bWJlcjtcblxuICAvLyBBY3Rpb25zXG4gIHNldFVzZXI6ICh1c2VyOiBDaGF0VXNlciB8IG51bGwpID0+IHZvaWQ7XG4gIHVwZGF0ZVVzZXI6ICh1cGRhdGVzOiBQYXJ0aWFsPENoYXRVc2VyPikgPT4gdm9pZDtcbiAgY2xlYXJVc2VyOiAoKSA9PiB2b2lkO1xuICByZWZyZXNoVXNlcjogKCkgPT4gUHJvbWlzZTx2b2lkPjtcbiAgdXBkYXRlUHJvZmlsZTogKHVwZGF0ZXM6IFBhcnRpYWw8Q2hhdFVzZXI+KSA9PiBQcm9taXNlPHZvaWQ+O1xuICB1cGRhdGVMYXN0U2VlbjogKCkgPT4gdm9pZDtcblxuICAvLyBVdGlsaXRpZXNcbiAgaGFzUGVybWlzc2lvbjogKHJlcXVpcmVkUm9sZTogQ2hhdFVzZXJbJ3VzZXJUeXBlJ10pID0+IGJvb2xlYW47XG4gIGlzQ3VycmVudFVzZXI6ICh1c2VySWQ6IG51bWJlcikgPT4gYm9vbGVhbjtcbn1cblxuLy8g2KXZhti02KfYoSDYp9mE2YXYrdiq2YjZiVxuY29uc3QgVXNlckNvbnRleHQgPSBjcmVhdGVDb250ZXh0PFVzZXJDb250ZXh0VHlwZSB8IHVuZGVmaW5lZD4odW5kZWZpbmVkKTtcblxuLy8g2YXYstmI2K8g2KfZhNmF2K3YqtmI2YlcbmV4cG9ydCBmdW5jdGlvbiBVc2VyUHJvdmlkZXIoeyBjaGlsZHJlbiB9OiB7IGNoaWxkcmVuOiBSZWFjdC5SZWFjdE5vZGUgfSkge1xuICBjb25zdCBbc3RhdGUsIGRpc3BhdGNoXSA9IHVzZVJlZHVjZXIodXNlclJlZHVjZXIsIGluaXRpYWxTdGF0ZSk7XG4gIGNvbnN0IHsgaGFuZGxlRXJyb3IsIGhhbmRsZVN1Y2Nlc3MgfSA9IHVzZUVycm9ySGFuZGxlcigpO1xuXG4gIC8vINiq2K3Yr9mK2Ksg2KfZhNmF2LPYqtiu2K/ZhVxuICBjb25zdCBzZXRVc2VyID0gdXNlQ2FsbGJhY2soKHVzZXI6IENoYXRVc2VyIHwgbnVsbCkgPT4ge1xuICAgIGRpc3BhdGNoKHsgdHlwZTogJ1NFVF9VU0VSJywgcGF5bG9hZDogdXNlciB9KTtcbiAgfSwgW10pO1xuXG4gIC8vINiq2K3Yr9mK2Ksg2KjZitin2YbYp9iqINin2YTZhdiz2KrYrtiv2YUg2KzYstim2YrYp9mLXG4gIGNvbnN0IHVwZGF0ZVVzZXIgPSB1c2VDYWxsYmFjaygodXBkYXRlczogUGFydGlhbDxDaGF0VXNlcj4pID0+IHtcbiAgICBkaXNwYXRjaCh7IHR5cGU6ICdVUERBVEVfVVNFUicsIHBheWxvYWQ6IHVwZGF0ZXMgfSk7XG4gIH0sIFtdKTtcblxuICAvLyDZhdiz2K0g2KjZitin2YbYp9iqINin2YTZhdiz2KrYrtiv2YVcbiAgY29uc3QgY2xlYXJVc2VyID0gdXNlQ2FsbGJhY2soKCkgPT4ge1xuICAgIGRpc3BhdGNoKHsgdHlwZTogJ0NMRUFSX1VTRVInIH0pO1xuICB9LCBbXSk7XG5cbiAgLy8g2KXYudin2K/YqSDYqtit2YXZitmEINio2YrYp9mG2KfYqiDYp9mE2YXYs9iq2K7Yr9mFINmF2YYg2KfZhNiu2KfYr9mFXG4gIGNvbnN0IHJlZnJlc2hVc2VyID0gdXNlQ2FsbGJhY2soYXN5bmMgKCkgPT4ge1xuICAgIGlmICghc3RhdGUuY3VycmVudFVzZXI/LmlkKSByZXR1cm47XG5cbiAgICBkaXNwYXRjaCh7IHR5cGU6ICdTRVRfTE9BRElORycsIHBheWxvYWQ6IHRydWUgfSk7XG5cbiAgICB0cnkge1xuICAgICAgY29uc3QgdXBkYXRlZFVzZXIgPSBhd2FpdCBhcGkuZ2V0PENoYXRVc2VyPihgL2FwaS91c2Vycy8ke3N0YXRlLmN1cnJlbnRVc2VyLmlkfWApO1xuICAgICAgZGlzcGF0Y2goeyB0eXBlOiAnU0VUX1VTRVInLCBwYXlsb2FkOiB1cGRhdGVkVXNlciB9KTtcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgaGFuZGxlRXJyb3IoZXJyb3IgYXMgRXJyb3IsICfZgdi02YQg2YHZiiDYqtit2K/ZitirINio2YrYp9mG2KfYqiDYp9mE2YXYs9iq2K7Yr9mFJyk7XG4gICAgICBkaXNwYXRjaCh7IHR5cGU6ICdTRVRfRVJST1InLCBwYXlsb2FkOiAn2YHYtNmEINmB2Yog2KrYrdiv2YrYqyDYp9mE2KjZitin2YbYp9iqJyB9KTtcbiAgICB9IGZpbmFsbHkge1xuICAgICAgZGlzcGF0Y2goeyB0eXBlOiAnU0VUX0xPQURJTkcnLCBwYXlsb2FkOiBmYWxzZSB9KTtcbiAgICB9XG4gIH0sIFtzdGF0ZS5jdXJyZW50VXNlcj8uaWQsIGhhbmRsZUVycm9yXSk7XG5cbiAgLy8g2KrYrdiv2YrYqyDYp9mE2YXZhNmBINin2YTYtNiu2LXZilxuICBjb25zdCB1cGRhdGVQcm9maWxlID0gdXNlQ2FsbGJhY2soXG4gICAgYXN5bmMgKHVwZGF0ZXM6IFBhcnRpYWw8Q2hhdFVzZXI+KSA9PiB7XG4gICAgICBpZiAoIXN0YXRlLmN1cnJlbnRVc2VyPy5pZCkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ9in2YTZhdiz2KrYrtiv2YUg2LrZitixINmF2LPYrNmEJyk7XG4gICAgICB9XG5cbiAgICAgIGRpc3BhdGNoKHsgdHlwZTogJ1NFVF9MT0FESU5HJywgcGF5bG9hZDogdHJ1ZSB9KTtcblxuICAgICAgdHJ5IHtcbiAgICAgICAgY29uc3QgdXBkYXRlZFVzZXIgPSBhd2FpdCBhcGkucHV0PENoYXRVc2VyPihgL2FwaS91c2Vycy8ke3N0YXRlLmN1cnJlbnRVc2VyLmlkfWAsIHVwZGF0ZXMpO1xuICAgICAgICBkaXNwYXRjaCh7IHR5cGU6ICdTRVRfVVNFUicsIHBheWxvYWQ6IHVwZGF0ZWRVc2VyIH0pO1xuICAgICAgICBoYW5kbGVTdWNjZXNzKCfYqtmFINiq2K3Yr9mK2Ksg2KfZhNmF2YTZgSDYp9mE2LTYrti12Yog2KjZhtis2KfYrScpO1xuICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgaGFuZGxlRXJyb3IoZXJyb3IgYXMgRXJyb3IsICfZgdi02YQg2YHZiiDYqtit2K/ZitirINin2YTZhdmE2YEg2KfZhNi02K7YtdmKJyk7XG4gICAgICAgIHRocm93IGVycm9yO1xuICAgICAgfSBmaW5hbGx5IHtcbiAgICAgICAgZGlzcGF0Y2goeyB0eXBlOiAnU0VUX0xPQURJTkcnLCBwYXlsb2FkOiBmYWxzZSB9KTtcbiAgICAgIH1cbiAgICB9LFxuICAgIFtzdGF0ZS5jdXJyZW50VXNlcj8uaWQsIGhhbmRsZUVycm9yLCBoYW5kbGVTdWNjZXNzXVxuICApO1xuXG4gIC8vINiq2K3Yr9mK2Ksg2KLYrtixINi42YfZiNixXG4gIGNvbnN0IHVwZGF0ZUxhc3RTZWVuID0gdXNlQ2FsbGJhY2soKCkgPT4ge1xuICAgIGRpc3BhdGNoKHsgdHlwZTogJ1VQREFURV9MQVNUX1NFRU4nIH0pO1xuICB9LCBbXSk7XG5cbiAgLy8g2KfZhNiq2K3ZgtmCINmF2YYg2KfZhNi12YTYp9it2YrYp9iqXG4gIGNvbnN0IGhhc1Blcm1pc3Npb24gPSB1c2VDYWxsYmFjayhcbiAgICAocmVxdWlyZWRSb2xlOiBDaGF0VXNlclsndXNlclR5cGUnXSk6IGJvb2xlYW4gPT4ge1xuICAgICAgaWYgKCFzdGF0ZS5jdXJyZW50VXNlcikgcmV0dXJuIGZhbHNlO1xuXG4gICAgICBjb25zdCByb2xlSGllcmFyY2h5ID0ge1xuICAgICAgICBndWVzdDogMCxcbiAgICAgICAgbWVtYmVyOiAxLFxuICAgICAgICBtb2RlcmF0b3I6IDIsXG4gICAgICAgIGFkbWluOiAzLFxuICAgICAgICBvd25lcjogNCxcbiAgICAgIH07XG5cbiAgICAgIGNvbnN0IHVzZXJMZXZlbCA9IHJvbGVIaWVyYXJjaHlbc3RhdGUuY3VycmVudFVzZXIudXNlclR5cGVdIHx8IDA7XG4gICAgICBjb25zdCByZXF1aXJlZExldmVsID0gcm9sZUhpZXJhcmNoeVtyZXF1aXJlZFJvbGVdIHx8IDA7XG5cbiAgICAgIHJldHVybiB1c2VyTGV2ZWwgPj0gcmVxdWlyZWRMZXZlbDtcbiAgICB9LFxuICAgIFtzdGF0ZS5jdXJyZW50VXNlcl1cbiAgKTtcblxuICAvLyDYp9mE2KrYrdmC2YIg2YXZhiDZg9mI2YYg2KfZhNmF2LPYqtiu2K/ZhSDZh9mIINin2YTZhdiz2KrYrtiv2YUg2KfZhNit2KfZhNmKXG4gIGNvbnN0IGlzQ3VycmVudFVzZXIgPSB1c2VDYWxsYmFjayhcbiAgICAodXNlcklkOiBudW1iZXIpOiBib29sZWFuID0+IHtcbiAgICAgIHJldHVybiBzdGF0ZS5jdXJyZW50VXNlcj8uaWQgPT09IHVzZXJJZDtcbiAgICB9LFxuICAgIFtzdGF0ZS5jdXJyZW50VXNlcj8uaWRdXG4gICk7XG5cbiAgLy8g2KrYrdiv2YrYqyDYotiu2LEg2LjZh9mI2LEg2KrZhNmC2KfYptmK2KfZiyDZg9mEINiv2YLZitmC2KlcbiAgdXNlRWZmZWN0KCgpID0+IHtcbiAgICBpZiAoIXN0YXRlLmlzQXV0aGVudGljYXRlZCkgcmV0dXJuO1xuXG4gICAgY29uc3QgaW50ZXJ2YWwgPSBzZXRJbnRlcnZhbCgoKSA9PiB7XG4gICAgICB1cGRhdGVMYXN0U2VlbigpO1xuICAgIH0sIDYwMDAwKTsgLy8g2YPZhCDYr9mC2YrZgtipXG5cbiAgICByZXR1cm4gKCkgPT4gY2xlYXJJbnRlcnZhbChpbnRlcnZhbCk7XG4gIH0sIFtzdGF0ZS5pc0F1dGhlbnRpY2F0ZWQsIHVwZGF0ZUxhc3RTZWVuXSk7XG5cbiAgLy8g2YLZitmF2Kkg2KfZhNmF2K3YqtmI2YlcbiAgY29uc3QgY29udGV4dFZhbHVlOiBVc2VyQ29udGV4dFR5cGUgPSB7XG4gICAgLy8gU3RhdGVcbiAgICB1c2VyOiBzdGF0ZS5jdXJyZW50VXNlcixcbiAgICBpc0xvYWRpbmc6IHN0YXRlLmlzTG9hZGluZyxcbiAgICBpc0F1dGhlbnRpY2F0ZWQ6IHN0YXRlLmlzQXV0aGVudGljYXRlZCxcbiAgICBlcnJvcjogc3RhdGUuZXJyb3IsXG4gICAgbGFzdFVwZGF0ZWQ6IHN0YXRlLmxhc3RVcGRhdGVkLFxuXG4gICAgLy8gQWN0aW9uc1xuICAgIHNldFVzZXIsXG4gICAgdXBkYXRlVXNlcixcbiAgICBjbGVhclVzZXIsXG4gICAgcmVmcmVzaFVzZXIsXG4gICAgdXBkYXRlUHJvZmlsZSxcbiAgICB1cGRhdGVMYXN0U2VlbixcblxuICAgIC8vIFV0aWxpdGllc1xuICAgIGhhc1Blcm1pc3Npb24sXG4gICAgaXNDdXJyZW50VXNlcixcbiAgfTtcblxuICByZXR1cm4gPFVzZXJDb250ZXh0LlByb3ZpZGVyIHZhbHVlPXtjb250ZXh0VmFsdWV9PntjaGlsZHJlbn08L1VzZXJDb250ZXh0LlByb3ZpZGVyPjtcbn1cblxuLy8gSG9vayDZhNin2LPYqtiu2K/Yp9mFINin2YTZhdit2KrZiNmJXG5leHBvcnQgZnVuY3Rpb24gdXNlVXNlcigpIHtcbiAgY29uc3QgY29udGV4dCA9IHVzZUNvbnRleHQoVXNlckNvbnRleHQpO1xuXG4gIGlmIChjb250ZXh0ID09PSB1bmRlZmluZWQpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3VzZVVzZXIgbXVzdCBiZSB1c2VkIHdpdGhpbiBhIFVzZXJQcm92aWRlcicpO1xuICB9XG5cbiAgcmV0dXJuIGNvbnRleHQ7XG59XG5cbi8vIEhvb2sg2YTZhNiq2K3ZgtmCINmF2YYg2KfZhNmF2LXYp9iv2YLYqVxuZXhwb3J0IGZ1bmN0aW9uIHVzZUF1dGgoKSB7XG4gIGNvbnN0IHsgdXNlciwgaXNBdXRoZW50aWNhdGVkLCBpc0xvYWRpbmcgfSA9IHVzZVVzZXIoKTtcblxuICByZXR1cm4ge1xuICAgIHVzZXIsXG4gICAgaXNBdXRoZW50aWNhdGVkLFxuICAgIGlzTG9hZGluZyxcbiAgICBpc0d1ZXN0OiB1c2VyPy51c2VyVHlwZSA9PT0gJ2d1ZXN0JyxcbiAgICBpc01lbWJlcjogdXNlcj8udXNlclR5cGUgPT09ICdtZW1iZXInLFxuICAgIGlzTW9kZXJhdG9yOiB1c2VyPy51c2VyVHlwZSA9PT0gJ21vZGVyYXRvcicsXG4gICAgaXNBZG1pbjogdXNlcj8udXNlclR5cGUgPT09ICdhZG1pbicsXG4gICAgaXNPd25lcjogdXNlcj8udXNlclR5cGUgPT09ICdvd25lcicsXG4gIH07XG59XG4iXSwiZmlsZSI6Ii92YXIvd3d3L2FiZC9jbGllbnQvc3JjL2NvbnRleHRzL1VzZXJDb250ZXh0LnRzeCJ9
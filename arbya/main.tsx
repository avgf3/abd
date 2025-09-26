import.meta.env = {"BASE_URL": "/", "DEV": true, "MODE": "development", "PROD": false, "SSR": false};import __vite__cjsImport0_react_jsxDevRuntime from "/@fs/var/www/abd/node_modules/.vite/deps/react_jsx-dev-runtime.js?v=197578e1"; const jsxDEV = __vite__cjsImport0_react_jsxDevRuntime["jsxDEV"];
import __vite__cjsImport1_reactDom_client from "/@fs/var/www/abd/node_modules/.vite/deps/react-dom_client.js?v=197578e1"; const createRoot = __vite__cjsImport1_reactDom_client["createRoot"];
import App from "/src/App.tsx";
import "/src/index.css";
import { applyThemeById } from "/src/utils/applyTheme.ts";
import { apiRequest } from "/src/lib/queryClient.ts";
try {
  const saved = localStorage.getItem("selectedTheme");
  if (saved) applyThemeById(saved, false);
} catch {
}
(async () => {
  try {
    const data = await apiRequest(`/api/settings/site-theme`);
    if (data?.siteTheme) {
      applyThemeById(data.siteTheme, false);
      try {
        localStorage.setItem("selectedTheme", data.siteTheme);
      } catch {
      }
    }
  } catch {
  }
})();
(async () => {
  const scheduleSocketInit = () => {
    try {
      const saveData = navigator?.connection?.saveData === true;
      if (saveData) return;
      import("/src/lib/socket.ts").then((mod) => {
        const socket = mod?.getSocket?.();
        if (!socket) return;
        socket.on("message", (payload) => {
          if (payload?.type === "site_theme_update" && payload?.siteTheme) {
            applyThemeById(payload.siteTheme, false);
            try {
              localStorage.setItem("selectedTheme", payload.siteTheme);
            } catch {
            }
          }
        });
      }).catch(() => {
      });
    } catch {
    }
  };
  try {
    if ("requestIdleCallback" in window) {
      window.requestIdleCallback(scheduleSocketInit, { timeout: 3e3 });
    } else {
      setTimeout(scheduleSocketInit, 2e3);
    }
  } catch {
  }
})();
createRoot(document.getElementById("root")).render(/* @__PURE__ */ jsxDEV(App, {}, void 0, false, {
  fileName: "/var/www/abd/client/src/main.tsx",
  lineNumber: 59,
  columnNumber: 53
}, this));
try {
  if ("serviceWorker" in navigator && !import.meta.env?.DEV) {
    const enableSw = !!import.meta.env?.VITE_ENABLE_SW;
    window.addEventListener("load", async () => {
      try {
        if (enableSw) {
          await navigator.serviceWorker.register("/sw.js");
        } else {
          const swAny = navigator.serviceWorker;
          const regs = await swAny?.getRegistrations?.() || [];
          for (const reg of regs) {
            try {
              await reg.unregister();
            } catch {
            }
          }
        }
      } catch {
      }
    });
  }
} catch {
}

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJtYXBwaW5ncyI6IkFBMERvRDtBQTFEcEQsU0FBU0Esa0JBQWtCO0FBRTNCLE9BQU9DLFNBQVM7QUFFaEIsT0FBTztBQUVQLFNBQVNDLHNCQUFzQjtBQUMvQixTQUFTQyxrQkFBa0I7QUFHM0IsSUFBSTtBQUNILFFBQU1DLFFBQVFDLGFBQWFDLFFBQVEsZUFBZTtBQUNsRCxNQUFJRixNQUFPRixnQkFBZUUsT0FBTyxLQUFLO0FBQ3ZDLFFBQVE7QUFBQztBQUFBLENBR1IsWUFBWTtBQUNaLE1BQUk7QUFDSCxVQUFNRyxPQUFPLE1BQU1KLFdBQWtDLDBCQUEwQjtBQUMvRSxRQUFLSSxNQUFjQyxXQUFXO0FBQzdCTixxQkFBZ0JLLEtBQWFDLFdBQVcsS0FBSztBQUM3QyxVQUFJO0FBQUVILHFCQUFhSSxRQUFRLGlCQUFrQkYsS0FBYUMsU0FBUztBQUFBLE1BQUcsUUFBUTtBQUFBLE1BQUM7QUFBQSxJQUNoRjtBQUFBLEVBQ0QsUUFBUTtBQUFBLEVBQUM7QUFDVixHQUFHO0FBQUEsQ0FHRixZQUFZO0FBRVosUUFBTUUscUJBQXFCQSxNQUFNO0FBQ2hDLFFBQUk7QUFDSCxZQUFNQyxXQUFZQyxXQUFtQkMsWUFBWUYsYUFBYTtBQUM5RCxVQUFJQSxTQUFVO0FBQ2QsYUFBTyxjQUFjLEVBQ25CRyxLQUFLLENBQUNDLFFBQVE7QUFDZCxjQUFNQyxTQUFTRCxLQUFLRSxZQUFZO0FBQ2hDLFlBQUksQ0FBQ0QsT0FBUTtBQUNiQSxlQUFPRSxHQUFHLFdBQVcsQ0FBQ0MsWUFBaUI7QUFDdEMsY0FBSUEsU0FBU0MsU0FBUyx1QkFBdUJELFNBQVNYLFdBQVc7QUFDaEVOLDJCQUFlaUIsUUFBUVgsV0FBVyxLQUFLO0FBQ3ZDLGdCQUFJO0FBQ0hILDJCQUFhSSxRQUFRLGlCQUFpQlUsUUFBUVgsU0FBUztBQUFBLFlBQ3hELFFBQVE7QUFBQSxZQUFDO0FBQUEsVUFDVjtBQUFBLFFBQ0QsQ0FBQztBQUFBLE1BQ0YsQ0FBQyxFQUNBYSxNQUFNLE1BQU07QUFBQSxNQUFDLENBQUM7QUFBQSxJQUNqQixRQUFRO0FBQUEsSUFBQztBQUFBLEVBQ1Y7QUFDQSxNQUFJO0FBQ0gsUUFBSSx5QkFBeUJDLFFBQVE7QUFDcEMsTUFBQ0EsT0FBZUMsb0JBQW9CYixvQkFBb0IsRUFBRWMsU0FBUyxJQUFLLENBQUM7QUFBQSxJQUMxRSxPQUFPO0FBQ05DLGlCQUFXZixvQkFBb0IsR0FBSTtBQUFBLElBQ3BDO0FBQUEsRUFDRCxRQUFRO0FBQUEsRUFBQztBQUNWLEdBQUc7QUFFSFYsV0FBVzBCLFNBQVNDLGVBQWUsTUFBTSxDQUFFLEVBQUVDLE9BQU8sdUJBQUMsU0FBRDtBQUFBO0FBQUE7QUFBQTtBQUFBLE9BQUksQ0FBRztBQUczRCxJQUFJO0FBQ0gsTUFBSSxtQkFBbUJoQixhQUFhLENBQUdpQixZQUFvQkMsS0FBS0MsS0FBTTtBQUNyRSxVQUFNQyxXQUFXLENBQUMsQ0FBR0gsWUFBb0JDLEtBQUtHO0FBQzlDWCxXQUFPWSxpQkFBaUIsUUFBUSxZQUFZO0FBQzNDLFVBQUk7QUFDSCxZQUFJRixVQUFVO0FBQ2IsZ0JBQU1wQixVQUFVdUIsY0FBY0MsU0FBUyxRQUFRO0FBQUEsUUFDaEQsT0FBTztBQUNOLGdCQUFNQyxRQUFTekIsVUFBa0J1QjtBQUNqQyxnQkFBTUcsT0FBUSxNQUFNRCxPQUFPRSxtQkFBbUIsS0FBTTtBQUNwRCxxQkFBV0MsT0FBT0YsTUFBTTtBQUN2QixnQkFBSTtBQUFFLG9CQUFNRSxJQUFJQyxXQUFXO0FBQUEsWUFBRyxRQUFRO0FBQUEsWUFBQztBQUFBLFVBQ3hDO0FBQUEsUUFDRDtBQUFBLE1BQ0QsUUFBUTtBQUFBLE1BQUM7QUFBQSxJQUNWLENBQUM7QUFBQSxFQUNGO0FBQ0QsUUFBUTtBQUFDIiwibmFtZXMiOlsiY3JlYXRlUm9vdCIsIkFwcCIsImFwcGx5VGhlbWVCeUlkIiwiYXBpUmVxdWVzdCIsInNhdmVkIiwibG9jYWxTdG9yYWdlIiwiZ2V0SXRlbSIsImRhdGEiLCJzaXRlVGhlbWUiLCJzZXRJdGVtIiwic2NoZWR1bGVTb2NrZXRJbml0Iiwic2F2ZURhdGEiLCJuYXZpZ2F0b3IiLCJjb25uZWN0aW9uIiwidGhlbiIsIm1vZCIsInNvY2tldCIsImdldFNvY2tldCIsIm9uIiwicGF5bG9hZCIsInR5cGUiLCJjYXRjaCIsIndpbmRvdyIsInJlcXVlc3RJZGxlQ2FsbGJhY2siLCJ0aW1lb3V0Iiwic2V0VGltZW91dCIsImRvY3VtZW50IiwiZ2V0RWxlbWVudEJ5SWQiLCJyZW5kZXIiLCJpbXBvcnQiLCJlbnYiLCJERVYiLCJlbmFibGVTdyIsIlZJVEVfRU5BQkxFX1NXIiwiYWRkRXZlbnRMaXN0ZW5lciIsInNlcnZpY2VXb3JrZXIiLCJyZWdpc3RlciIsInN3QW55IiwicmVncyIsImdldFJlZ2lzdHJhdGlvbnMiLCJyZWciLCJ1bnJlZ2lzdGVyIl0sImlnbm9yZUxpc3QiOltdLCJzb3VyY2VzIjpbIm1haW4udHN4Il0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IGNyZWF0ZVJvb3QgfSBmcm9tICdyZWFjdC1kb20vY2xpZW50JztcblxuaW1wb3J0IEFwcCBmcm9tICcuL0FwcCc7XG5cbmltcG9ydCAnLi9pbmRleC5jc3MnO1xuLy8gaW1wb3J0IHsgZ2V0U29ja2V0IH0gZnJvbSAnQC9saWIvc29ja2V0JzsgLy8gZGVmZXIgZHluYW1pYyBpbXBvcnQgaW5zdGVhZFxuaW1wb3J0IHsgYXBwbHlUaGVtZUJ5SWQgfSBmcm9tICdAL3V0aWxzL2FwcGx5VGhlbWUnO1xuaW1wb3J0IHsgYXBpUmVxdWVzdCB9IGZyb20gJ0AvbGliL3F1ZXJ5Q2xpZW50JztcblxuLy8g2KrYt9io2YrZgiDYp9mE2KvZitmFINin2YTZhdit2YHZiNi4INi52YbYryDYqNiv2KEg2KfZhNiq2LfYqNmK2YJcbnRyeSB7XG5cdGNvbnN0IHNhdmVkID0gbG9jYWxTdG9yYWdlLmdldEl0ZW0oJ3NlbGVjdGVkVGhlbWUnKTtcblx0aWYgKHNhdmVkKSBhcHBseVRoZW1lQnlJZChzYXZlZCwgZmFsc2UpO1xufSBjYXRjaCB7fVxuXG4vLyDYrNmE2Kgg2KvZitmFINin2YTZhdmI2YLYuSDYp9mE2LHYs9mF2Yog2YjYqti32KjZitmC2Ycg2YTZhNis2YXZiti5INi52YbYryDYp9mE2KXZgtmE2KfYuVxuKGFzeW5jICgpID0+IHtcblx0dHJ5IHtcblx0XHRjb25zdCBkYXRhID0gYXdhaXQgYXBpUmVxdWVzdDx7IHNpdGVUaGVtZTogc3RyaW5nIH0+KGAvYXBpL3NldHRpbmdzL3NpdGUtdGhlbWVgKTtcblx0XHRpZiAoKGRhdGEgYXMgYW55KT8uc2l0ZVRoZW1lKSB7XG5cdFx0XHRhcHBseVRoZW1lQnlJZCgoZGF0YSBhcyBhbnkpLnNpdGVUaGVtZSwgZmFsc2UpO1xuXHRcdFx0dHJ5IHsgbG9jYWxTdG9yYWdlLnNldEl0ZW0oJ3NlbGVjdGVkVGhlbWUnLCAoZGF0YSBhcyBhbnkpLnNpdGVUaGVtZSk7IH0gY2F0Y2gge31cblx0XHR9XG5cdH0gY2F0Y2gge31cbn0pKCk7XG5cbi8vINin2YTYp9iz2KrZhdin2Lkg2YTYqtit2K/Zitir2KfYqiDYp9mE2KvZitmFINmB2YLYtyAo2KjYr9mI2YYg2LfZhNioINmF2KjZg9ixINmK2K3YrNioINin2YTYsdiz2YUpXG4oYXN5bmMgKCkgPT4ge1xuXHQvLyDYqtij2KzZitmEINin2LPYqtmK2LHYp9ivIHNvY2tldCDZiNix2KjYtyDYp9mE2YXYs9iq2YXYudmK2YYg2YHZgti3INi52YbYryDYp9mE2K7ZhdmI2YQg2YTYqtmC2YTZitmEINin2YTYqtmD2YTZgdipINin2YTZhdio2YPYsdipXG5cdGNvbnN0IHNjaGVkdWxlU29ja2V0SW5pdCA9ICgpID0+IHtcblx0XHR0cnkge1xuXHRcdFx0Y29uc3Qgc2F2ZURhdGEgPSAobmF2aWdhdG9yIGFzIGFueSk/LmNvbm5lY3Rpb24/LnNhdmVEYXRhID09PSB0cnVlO1xuXHRcdFx0aWYgKHNhdmVEYXRhKSByZXR1cm47XG5cdFx0XHRpbXBvcnQoJ0AvbGliL3NvY2tldCcpXG5cdFx0XHRcdC50aGVuKChtb2QpID0+IHtcblx0XHRcdFx0XHRjb25zdCBzb2NrZXQgPSBtb2Q/LmdldFNvY2tldD8uKCk7XG5cdFx0XHRcdFx0aWYgKCFzb2NrZXQpIHJldHVybjtcblx0XHRcdFx0XHRzb2NrZXQub24oJ21lc3NhZ2UnLCAocGF5bG9hZDogYW55KSA9PiB7XG5cdFx0XHRcdFx0XHRpZiAocGF5bG9hZD8udHlwZSA9PT0gJ3NpdGVfdGhlbWVfdXBkYXRlJyAmJiBwYXlsb2FkPy5zaXRlVGhlbWUpIHtcblx0XHRcdFx0XHRcdFx0YXBwbHlUaGVtZUJ5SWQocGF5bG9hZC5zaXRlVGhlbWUsIGZhbHNlKTtcblx0XHRcdFx0XHRcdFx0dHJ5IHtcblx0XHRcdFx0XHRcdFx0XHRsb2NhbFN0b3JhZ2Uuc2V0SXRlbSgnc2VsZWN0ZWRUaGVtZScsIHBheWxvYWQuc2l0ZVRoZW1lKTtcblx0XHRcdFx0XHRcdFx0fSBjYXRjaCB7fVxuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH0pO1xuXHRcdFx0XHR9KVxuXHRcdFx0XHQuY2F0Y2goKCkgPT4ge30pO1xuXHRcdH0gY2F0Y2gge31cblx0fTtcblx0dHJ5IHtcblx0XHRpZiAoJ3JlcXVlc3RJZGxlQ2FsbGJhY2snIGluIHdpbmRvdykge1xuXHRcdFx0KHdpbmRvdyBhcyBhbnkpLnJlcXVlc3RJZGxlQ2FsbGJhY2soc2NoZWR1bGVTb2NrZXRJbml0LCB7IHRpbWVvdXQ6IDMwMDAgfSk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHNldFRpbWVvdXQoc2NoZWR1bGVTb2NrZXRJbml0LCAyMDAwKTtcblx0XHR9XG5cdH0gY2F0Y2gge31cbn0pKCk7XG5cbmNyZWF0ZVJvb3QoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3Jvb3QnKSEpLnJlbmRlcig8QXBwIC8+KTtcblxuLy8gUmVnaXN0ZXIvY2xlYW51cCBTZXJ2aWNlIFdvcmtlciAocHJvZHVjdGlvbiBvbmx5LCBvcHQtaW4gdmlhIFZJVEVfRU5BQkxFX1NXKVxudHJ5IHtcblx0aWYgKCdzZXJ2aWNlV29ya2VyJyBpbiBuYXZpZ2F0b3IgJiYgISgoaW1wb3J0Lm1ldGEgYXMgYW55KS5lbnY/LkRFVikpIHtcblx0XHRjb25zdCBlbmFibGVTdyA9ICEhKChpbXBvcnQubWV0YSBhcyBhbnkpLmVudj8uVklURV9FTkFCTEVfU1cpO1xuXHRcdHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdsb2FkJywgYXN5bmMgKCkgPT4ge1xuXHRcdFx0dHJ5IHtcblx0XHRcdFx0aWYgKGVuYWJsZVN3KSB7XG5cdFx0XHRcdFx0YXdhaXQgbmF2aWdhdG9yLnNlcnZpY2VXb3JrZXIucmVnaXN0ZXIoJy9zdy5qcycpO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdGNvbnN0IHN3QW55ID0gKG5hdmlnYXRvciBhcyBhbnkpLnNlcnZpY2VXb3JrZXI7XG5cdFx0XHRcdFx0Y29uc3QgcmVncyA9IChhd2FpdCBzd0FueT8uZ2V0UmVnaXN0cmF0aW9ucz8uKCkpIHx8IFtdO1xuXHRcdFx0XHRcdGZvciAoY29uc3QgcmVnIG9mIHJlZ3MpIHtcblx0XHRcdFx0XHRcdHRyeSB7IGF3YWl0IHJlZy51bnJlZ2lzdGVyKCk7IH0gY2F0Y2gge31cblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH0gY2F0Y2gge31cblx0XHR9KTtcblx0fVxufSBjYXRjaCB7fVxuIl0sImZpbGUiOiIvdmFyL3d3dy9hYmQvY2xpZW50L3NyYy9tYWluLnRzeCJ9
import { createHotContext as __vite__createHotContext } from "/@vite/client";import.meta.hot = __vite__createHotContext("/src/App.tsx?v=2SqYj2lQ-j7zM-cuQBULt");import __vite__cjsImport0_react_jsxDevRuntime from "/@fs/var/www/abd/node_modules/.vite/deps/react_jsx-dev-runtime.js?v=197578e1"; const jsxDEV = __vite__cjsImport0_react_jsxDevRuntime["jsxDEV"];
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
  window.$RefreshReg$ = RefreshRuntime.getRefreshReg("/var/www/abd/client/src/App.tsx");
  window.$RefreshSig$ = RefreshRuntime.createSignatureFunctionForTransform;
}
import { QueryClientProvider } from "/@fs/var/www/abd/node_modules/.vite/deps/@tanstack_react-query.js?v=197578e1";
import { Switch, Route } from "/@fs/var/www/abd/node_modules/.vite/deps/wouter.js?v=197578e1";
import __vite__cjsImport5_react from "/@fs/var/www/abd/node_modules/.vite/deps/react.js?v=197578e1"; const Suspense = __vite__cjsImport5_react["Suspense"];
import { queryClient } from "/src/lib/queryClient.ts";
import { Toaster } from "/src/components/ui/toaster.tsx";
import { TooltipProvider } from "/src/components/ui/tooltip.tsx";
import { UserProvider } from "/src/contexts/UserContext.tsx";
import { ComposerStyleProvider } from "/src/contexts/ComposerStyleContext.tsx";
import ChatPage from "/src/pages/chat.tsx";
import ArabicChat from "/src/pages/ArabicChat.tsx";
import CountryChat from "/src/pages/CountryChat.tsx";
import CityChat from "/src/pages/CityChat.tsx";
import SubChat from "/src/pages/SubChat.tsx";
import PrivacyPolicy from "/src/pages/PrivacyPolicy.tsx";
import TermsOfService from "/src/pages/TermsOfService.tsx";
function Router() {
  return /* @__PURE__ */ jsxDEV(Switch, { children: [
    /* @__PURE__ */ jsxDEV(Route, { path: "/", component: ChatPage }, void 0, false, {
      fileName: "/var/www/abd/client/src/App.tsx",
      lineNumber: 71,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Route, { path: "/privacy", component: PrivacyPolicy }, void 0, false, {
      fileName: "/var/www/abd/client/src/App.tsx",
      lineNumber: 72,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Route, { path: "/terms", component: TermsOfService }, void 0, false, {
      fileName: "/var/www/abd/client/src/App.tsx",
      lineNumber: 73,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Route, { path: "/arabic", component: ArabicChat }, void 0, false, {
      fileName: "/var/www/abd/client/src/App.tsx",
      lineNumber: 74,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Route, { path: "/emamir/mobile", component: SubChat }, void 0, false, {
      fileName: "/var/www/abd/client/src/App.tsx",
      lineNumber: 78,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Route, { path: "/sabaya/sabaya-chat", component: SubChat }, void 0, false, {
      fileName: "/var/www/abd/client/src/App.tsx",
      lineNumber: 81,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Route, { path: "/sabaya/elegant-chat", component: SubChat }, void 0, false, {
      fileName: "/var/www/abd/client/src/App.tsx",
      lineNumber: 82,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Route, { path: "/dardashti/general-chat", component: SubChat }, void 0, false, {
      fileName: "/var/www/abd/client/src/App.tsx",
      lineNumber: 85,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Route, { path: "/dardashti/friends-chat", component: SubChat }, void 0, false, {
      fileName: "/var/www/abd/client/src/App.tsx",
      lineNumber: 86,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Route, { path: "/mezz/mezz-general", component: SubChat }, void 0, false, {
      fileName: "/var/www/abd/client/src/App.tsx",
      lineNumber: 89,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Route, { path: "/mezz/mezz-mobile", component: SubChat }, void 0, false, {
      fileName: "/var/www/abd/client/src/App.tsx",
      lineNumber: 90,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Route, { path: "/online-chat/live-chat", component: SubChat }, void 0, false, {
      fileName: "/var/www/abd/client/src/App.tsx",
      lineNumber: 93,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Route, { path: "/online-chat/instant-chat", component: SubChat }, void 0, false, {
      fileName: "/var/www/abd/client/src/App.tsx",
      lineNumber: 94,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Route, { path: "/ahla-lamma/friends-gathering", component: SubChat }, void 0, false, {
      fileName: "/var/www/abd/client/src/App.tsx",
      lineNumber: 97,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Route, { path: "/ahla-lamma/arabic-gathering", component: SubChat }, void 0, false, {
      fileName: "/var/www/abd/client/src/App.tsx",
      lineNumber: 98,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Route, { path: "/beautiful-chat/beautiful-chat", component: SubChat }, void 0, false, {
      fileName: "/var/www/abd/client/src/App.tsx",
      lineNumber: 101,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Route, { path: "/beautiful-chat/sweetest-chat", component: SubChat }, void 0, false, {
      fileName: "/var/www/abd/client/src/App.tsx",
      lineNumber: 102,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Route, { path: "/no-signup/quick-chat", component: SubChat }, void 0, false, {
      fileName: "/var/www/abd/client/src/App.tsx",
      lineNumber: 105,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Route, { path: "/no-signup/instant-entry", component: SubChat }, void 0, false, {
      fileName: "/var/www/abd/client/src/App.tsx",
      lineNumber: 106,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Route, { path: "/oman/oman-mobile", component: CityChat }, void 0, false, {
      fileName: "/var/www/abd/client/src/App.tsx",
      lineNumber: 110,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Route, { path: "/oman/batinah", component: CityChat }, void 0, false, {
      fileName: "/var/www/abd/client/src/App.tsx",
      lineNumber: 111,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Route, { path: "/oman/dhofar", component: CityChat }, void 0, false, {
      fileName: "/var/www/abd/client/src/App.tsx",
      lineNumber: 112,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Route, { path: "/oman/arab-oman", component: CityChat }, void 0, false, {
      fileName: "/var/www/abd/client/src/App.tsx",
      lineNumber: 113,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Route, { path: "/egypt/egypt-mobile", component: CityChat }, void 0, false, {
      fileName: "/var/www/abd/client/src/App.tsx",
      lineNumber: 116,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Route, { path: "/egypt/elders", component: CityChat }, void 0, false, {
      fileName: "/var/www/abd/client/src/App.tsx",
      lineNumber: 117,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Route, { path: "/egypt/upper-egypt", component: CityChat }, void 0, false, {
      fileName: "/var/www/abd/client/src/App.tsx",
      lineNumber: 118,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Route, { path: "/egypt/delta", component: CityChat }, void 0, false, {
      fileName: "/var/www/abd/client/src/App.tsx",
      lineNumber: 119,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Route, { path: "/egypt/best-gathering", component: CityChat }, void 0, false, {
      fileName: "/var/www/abd/client/src/App.tsx",
      lineNumber: 120,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Route, { path: "/saudi/saudi-mobile", component: CityChat }, void 0, false, {
      fileName: "/var/www/abd/client/src/App.tsx",
      lineNumber: 123,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Route, { path: "/saudi/pioneers", component: CityChat }, void 0, false, {
      fileName: "/var/www/abd/client/src/App.tsx",
      lineNumber: 124,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Route, { path: "/saudi/najd", component: CityChat }, void 0, false, {
      fileName: "/var/www/abd/client/src/App.tsx",
      lineNumber: 125,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Route, { path: "/algeria/algiers", component: CityChat }, void 0, false, {
      fileName: "/var/www/abd/client/src/App.tsx",
      lineNumber: 128,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Route, { path: "/algeria/oran", component: CityChat }, void 0, false, {
      fileName: "/var/www/abd/client/src/App.tsx",
      lineNumber: 129,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Route, { path: "/algeria/constantine", component: CityChat }, void 0, false, {
      fileName: "/var/www/abd/client/src/App.tsx",
      lineNumber: 130,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Route, { path: "/algeria/annaba", component: CityChat }, void 0, false, {
      fileName: "/var/www/abd/client/src/App.tsx",
      lineNumber: 131,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Route, { path: "/algeria/algeria-mobile", component: CityChat }, void 0, false, {
      fileName: "/var/www/abd/client/src/App.tsx",
      lineNumber: 132,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Route, { path: "/algeria/kabylie", component: CityChat }, void 0, false, {
      fileName: "/var/www/abd/client/src/App.tsx",
      lineNumber: 133,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Route, { path: "/algeria/sahara", component: CityChat }, void 0, false, {
      fileName: "/var/www/abd/client/src/App.tsx",
      lineNumber: 134,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Route, { path: "/algeria/million-martyrs", component: CityChat }, void 0, false, {
      fileName: "/var/www/abd/client/src/App.tsx",
      lineNumber: 135,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Route, { path: "/bahrain/bahrain-mobile", component: CityChat }, void 0, false, {
      fileName: "/var/www/abd/client/src/App.tsx",
      lineNumber: 138,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Route, { path: "/bahrain/sitrah", component: CityChat }, void 0, false, {
      fileName: "/var/www/abd/client/src/App.tsx",
      lineNumber: 139,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Route, { path: "/bahrain/isa", component: CityChat }, void 0, false, {
      fileName: "/var/www/abd/client/src/App.tsx",
      lineNumber: 140,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Route, { path: "/bahrain/pearl", component: CityChat }, void 0, false, {
      fileName: "/var/www/abd/client/src/App.tsx",
      lineNumber: 141,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Route, { path: "/uae/uae-mobile", component: CityChat }, void 0, false, {
      fileName: "/var/www/abd/client/src/App.tsx",
      lineNumber: 144,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Route, { path: "/uae/ajman", component: CityChat }, void 0, false, {
      fileName: "/var/www/abd/client/src/App.tsx",
      lineNumber: 145,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Route, { path: "/uae/al-ain", component: CityChat }, void 0, false, {
      fileName: "/var/www/abd/client/src/App.tsx",
      lineNumber: 146,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Route, { path: "/uae/ras-al-khaimah", component: CityChat }, void 0, false, {
      fileName: "/var/www/abd/client/src/App.tsx",
      lineNumber: 147,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Route, { path: "/uae/fujairah", component: CityChat }, void 0, false, {
      fileName: "/var/www/abd/client/src/App.tsx",
      lineNumber: 148,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Route, { path: "/jordan/jordan-mobile", component: CityChat }, void 0, false, {
      fileName: "/var/www/abd/client/src/App.tsx",
      lineNumber: 151,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Route, { path: "/jordan/aqaba", component: CityChat }, void 0, false, {
      fileName: "/var/www/abd/client/src/App.tsx",
      lineNumber: 152,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Route, { path: "/jordan/salt", component: CityChat }, void 0, false, {
      fileName: "/var/www/abd/client/src/App.tsx",
      lineNumber: 153,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Route, { path: "/jordan/karak", component: CityChat }, void 0, false, {
      fileName: "/var/www/abd/client/src/App.tsx",
      lineNumber: 154,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Route, { path: "/jordan/petra", component: CityChat }, void 0, false, {
      fileName: "/var/www/abd/client/src/App.tsx",
      lineNumber: 155,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Route, { path: "/kuwait/kuwait-mobile", component: CityChat }, void 0, false, {
      fileName: "/var/www/abd/client/src/App.tsx",
      lineNumber: 158,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Route, { path: "/kuwait/farwaniyah", component: CityChat }, void 0, false, {
      fileName: "/var/www/abd/client/src/App.tsx",
      lineNumber: 159,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Route, { path: "/kuwait/hawalli", component: CityChat }, void 0, false, {
      fileName: "/var/www/abd/client/src/App.tsx",
      lineNumber: 160,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Route, { path: "/kuwait/mubarak-al-kabeer", component: CityChat }, void 0, false, {
      fileName: "/var/www/abd/client/src/App.tsx",
      lineNumber: 161,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Route, { path: "/kuwait/diwaniyah", component: CityChat }, void 0, false, {
      fileName: "/var/www/abd/client/src/App.tsx",
      lineNumber: 162,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Route, { path: "/libya/libya-mobile", component: CityChat }, void 0, false, {
      fileName: "/var/www/abd/client/src/App.tsx",
      lineNumber: 165,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Route, { path: "/libya/bayda", component: CityChat }, void 0, false, {
      fileName: "/var/www/abd/client/src/App.tsx",
      lineNumber: 166,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Route, { path: "/libya/zawiya", component: CityChat }, void 0, false, {
      fileName: "/var/www/abd/client/src/App.tsx",
      lineNumber: 167,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Route, { path: "/libya/sabha", component: CityChat }, void 0, false, {
      fileName: "/var/www/abd/client/src/App.tsx",
      lineNumber: 168,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Route, { path: "/libya/ajdabiya", component: CityChat }, void 0, false, {
      fileName: "/var/www/abd/client/src/App.tsx",
      lineNumber: 169,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Route, { path: "/tunisia/tunisia-mobile", component: CityChat }, void 0, false, {
      fileName: "/var/www/abd/client/src/App.tsx",
      lineNumber: 172,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Route, { path: "/tunisia/monastir", component: CityChat }, void 0, false, {
      fileName: "/var/www/abd/client/src/App.tsx",
      lineNumber: 173,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Route, { path: "/tunisia/bizerte", component: CityChat }, void 0, false, {
      fileName: "/var/www/abd/client/src/App.tsx",
      lineNumber: 174,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Route, { path: "/tunisia/gabes", component: CityChat }, void 0, false, {
      fileName: "/var/www/abd/client/src/App.tsx",
      lineNumber: 175,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Route, { path: "/tunisia/kairouan", component: CityChat }, void 0, false, {
      fileName: "/var/www/abd/client/src/App.tsx",
      lineNumber: 176,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Route, { path: "/morocco/morocco-mobile", component: CityChat }, void 0, false, {
      fileName: "/var/www/abd/client/src/App.tsx",
      lineNumber: 179,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Route, { path: "/morocco/fes", component: CityChat }, void 0, false, {
      fileName: "/var/www/abd/client/src/App.tsx",
      lineNumber: 180,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Route, { path: "/morocco/tangier", component: CityChat }, void 0, false, {
      fileName: "/var/www/abd/client/src/App.tsx",
      lineNumber: 181,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Route, { path: "/morocco/agadir", component: CityChat }, void 0, false, {
      fileName: "/var/www/abd/client/src/App.tsx",
      lineNumber: 182,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Route, { path: "/morocco/meknes", component: CityChat }, void 0, false, {
      fileName: "/var/www/abd/client/src/App.tsx",
      lineNumber: 183,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Route, { path: "/sudan/sudan-mobile", component: CityChat }, void 0, false, {
      fileName: "/var/www/abd/client/src/App.tsx",
      lineNumber: 186,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Route, { path: "/sudan/gezira", component: CityChat }, void 0, false, {
      fileName: "/var/www/abd/client/src/App.tsx",
      lineNumber: 187,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Route, { path: "/sudan/darfur", component: CityChat }, void 0, false, {
      fileName: "/var/www/abd/client/src/App.tsx",
      lineNumber: 188,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Route, { path: "/sudan/blue-nile", component: CityChat }, void 0, false, {
      fileName: "/var/www/abd/client/src/App.tsx",
      lineNumber: 189,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Route, { path: "/palestine/palestine-mobile", component: CityChat }, void 0, false, {
      fileName: "/var/www/abd/client/src/App.tsx",
      lineNumber: 192,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Route, { path: "/palestine/nablus", component: CityChat }, void 0, false, {
      fileName: "/var/www/abd/client/src/App.tsx",
      lineNumber: 193,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Route, { path: "/palestine/hebron", component: CityChat }, void 0, false, {
      fileName: "/var/www/abd/client/src/App.tsx",
      lineNumber: 194,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Route, { path: "/palestine/bethlehem", component: CityChat }, void 0, false, {
      fileName: "/var/www/abd/client/src/App.tsx",
      lineNumber: 195,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Route, { path: "/palestine/jenin", component: CityChat }, void 0, false, {
      fileName: "/var/www/abd/client/src/App.tsx",
      lineNumber: 196,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Route, { path: "/qatar/qatar-mobile", component: CityChat }, void 0, false, {
      fileName: "/var/www/abd/client/src/App.tsx",
      lineNumber: 199,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Route, { path: "/qatar/al-khor", component: CityChat }, void 0, false, {
      fileName: "/var/www/abd/client/src/App.tsx",
      lineNumber: 200,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Route, { path: "/qatar/umm-salal", component: CityChat }, void 0, false, {
      fileName: "/var/www/abd/client/src/App.tsx",
      lineNumber: 201,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Route, { path: "/qatar/lusail", component: CityChat }, void 0, false, {
      fileName: "/var/www/abd/client/src/App.tsx",
      lineNumber: 202,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Route, { path: "/qatar/al-shamal", component: CityChat }, void 0, false, {
      fileName: "/var/www/abd/client/src/App.tsx",
      lineNumber: 203,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Route, { path: "/yemen/yemen-mobile", component: CityChat }, void 0, false, {
      fileName: "/var/www/abd/client/src/App.tsx",
      lineNumber: 206,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Route, { path: "/yemen/hodeidah", component: CityChat }, void 0, false, {
      fileName: "/var/www/abd/client/src/App.tsx",
      lineNumber: 207,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Route, { path: "/yemen/ibb", component: CityChat }, void 0, false, {
      fileName: "/var/www/abd/client/src/App.tsx",
      lineNumber: 208,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Route, { path: "/yemen/hadramaut", component: CityChat }, void 0, false, {
      fileName: "/var/www/abd/client/src/App.tsx",
      lineNumber: 209,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Route, { path: "/yemen/mukalla", component: CityChat }, void 0, false, {
      fileName: "/var/www/abd/client/src/App.tsx",
      lineNumber: 210,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Route, { path: "/lebanon/lebanon-mobile", component: CityChat }, void 0, false, {
      fileName: "/var/www/abd/client/src/App.tsx",
      lineNumber: 213,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Route, { path: "/lebanon/tyre", component: CityChat }, void 0, false, {
      fileName: "/var/www/abd/client/src/App.tsx",
      lineNumber: 214,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Route, { path: "/lebanon/zahle", component: CityChat }, void 0, false, {
      fileName: "/var/www/abd/client/src/App.tsx",
      lineNumber: 215,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Route, { path: "/lebanon/byblos", component: CityChat }, void 0, false, {
      fileName: "/var/www/abd/client/src/App.tsx",
      lineNumber: 216,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Route, { path: "/lebanon/baalbek", component: CityChat }, void 0, false, {
      fileName: "/var/www/abd/client/src/App.tsx",
      lineNumber: 217,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Route, { path: "/syria/syria-mobile", component: CityChat }, void 0, false, {
      fileName: "/var/www/abd/client/src/App.tsx",
      lineNumber: 220,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Route, { path: "/syria/latakia", component: CityChat }, void 0, false, {
      fileName: "/var/www/abd/client/src/App.tsx",
      lineNumber: 221,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Route, { path: "/syria/hama", component: CityChat }, void 0, false, {
      fileName: "/var/www/abd/client/src/App.tsx",
      lineNumber: 222,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Route, { path: "/syria/tartus", component: CityChat }, void 0, false, {
      fileName: "/var/www/abd/client/src/App.tsx",
      lineNumber: 223,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Route, { path: "/syria/deir-ez-zor", component: CityChat }, void 0, false, {
      fileName: "/var/www/abd/client/src/App.tsx",
      lineNumber: 224,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Route, { path: "/iraq/iraq-mobile", component: CityChat }, void 0, false, {
      fileName: "/var/www/abd/client/src/App.tsx",
      lineNumber: 227,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Route, { path: "/iraq/erbil", component: CityChat }, void 0, false, {
      fileName: "/var/www/abd/client/src/App.tsx",
      lineNumber: 228,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Route, { path: "/iraq/najaf", component: CityChat }, void 0, false, {
      fileName: "/var/www/abd/client/src/App.tsx",
      lineNumber: 229,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Route, { path: "/iraq/karbala", component: CityChat }, void 0, false, {
      fileName: "/var/www/abd/client/src/App.tsx",
      lineNumber: 230,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Route, { path: "/iraq/sulaymaniyah", component: CityChat }, void 0, false, {
      fileName: "/var/www/abd/client/src/App.tsx",
      lineNumber: 231,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Route, { path: "/comoros/comoros-mobile", component: CityChat }, void 0, false, {
      fileName: "/var/www/abd/client/src/App.tsx",
      lineNumber: 234,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Route, { path: "/comoros/anjouan", component: CityChat }, void 0, false, {
      fileName: "/var/www/abd/client/src/App.tsx",
      lineNumber: 235,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Route, { path: "/comoros/mohéli", component: CityChat }, void 0, false, {
      fileName: "/var/www/abd/client/src/App.tsx",
      lineNumber: 236,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Route, { path: "/comoros/grande-comore", component: CityChat }, void 0, false, {
      fileName: "/var/www/abd/client/src/App.tsx",
      lineNumber: 237,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Route, { path: "/comoros/mayotte", component: CityChat }, void 0, false, {
      fileName: "/var/www/abd/client/src/App.tsx",
      lineNumber: 238,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Route, { path: "/comoros/domoni", component: CityChat }, void 0, false, {
      fileName: "/var/www/abd/client/src/App.tsx",
      lineNumber: 239,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Route, { path: "/comoros/fomboni", component: CityChat }, void 0, false, {
      fileName: "/var/www/abd/client/src/App.tsx",
      lineNumber: 240,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Route, { path: "/djibouti/djibouti-mobile", component: CityChat }, void 0, false, {
      fileName: "/var/www/abd/client/src/App.tsx",
      lineNumber: 243,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Route, { path: "/djibouti/ali-sabieh", component: CityChat }, void 0, false, {
      fileName: "/var/www/abd/client/src/App.tsx",
      lineNumber: 244,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Route, { path: "/djibouti/tadjoura", component: CityChat }, void 0, false, {
      fileName: "/var/www/abd/client/src/App.tsx",
      lineNumber: 245,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Route, { path: "/djibouti/obock", component: CityChat }, void 0, false, {
      fileName: "/var/www/abd/client/src/App.tsx",
      lineNumber: 246,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Route, { path: "/djibouti/dikhil", component: CityChat }, void 0, false, {
      fileName: "/var/www/abd/client/src/App.tsx",
      lineNumber: 247,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Route, { path: "/djibouti/arta", component: CityChat }, void 0, false, {
      fileName: "/var/www/abd/client/src/App.tsx",
      lineNumber: 248,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Route, { path: "/djibouti/horn-of-africa", component: CityChat }, void 0, false, {
      fileName: "/var/www/abd/client/src/App.tsx",
      lineNumber: 249,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Route, { path: "/oman/muscat", component: CityChat }, void 0, false, {
      fileName: "/var/www/abd/client/src/App.tsx",
      lineNumber: 253,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Route, { path: "/oman/salalah", component: CityChat }, void 0, false, {
      fileName: "/var/www/abd/client/src/App.tsx",
      lineNumber: 254,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Route, { path: "/oman/nizwa", component: CityChat }, void 0, false, {
      fileName: "/var/www/abd/client/src/App.tsx",
      lineNumber: 255,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Route, { path: "/oman/sohar", component: CityChat }, void 0, false, {
      fileName: "/var/www/abd/client/src/App.tsx",
      lineNumber: 256,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Route, { path: "/:country/test-universal-system", component: CityChat }, void 0, false, {
      fileName: "/var/www/abd/client/src/App.tsx",
      lineNumber: 259,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Route, { path: "/egypt/cairo", component: CityChat }, void 0, false, {
      fileName: "/var/www/abd/client/src/App.tsx",
      lineNumber: 262,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Route, { path: "/egypt/alexandria", component: CityChat }, void 0, false, {
      fileName: "/var/www/abd/client/src/App.tsx",
      lineNumber: 263,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Route, { path: "/egypt/giza", component: CityChat }, void 0, false, {
      fileName: "/var/www/abd/client/src/App.tsx",
      lineNumber: 264,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Route, { path: "/saudi/riyadh", component: CityChat }, void 0, false, {
      fileName: "/var/www/abd/client/src/App.tsx",
      lineNumber: 267,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Route, { path: "/saudi/jeddah", component: CityChat }, void 0, false, {
      fileName: "/var/www/abd/client/src/App.tsx",
      lineNumber: 268,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Route, { path: "/saudi/makkah", component: CityChat }, void 0, false, {
      fileName: "/var/www/abd/client/src/App.tsx",
      lineNumber: 269,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Route, { path: "/saudi/medina", component: CityChat }, void 0, false, {
      fileName: "/var/www/abd/client/src/App.tsx",
      lineNumber: 270,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Route, { path: "/saudi/dammam", component: CityChat }, void 0, false, {
      fileName: "/var/www/abd/client/src/App.tsx",
      lineNumber: 271,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Route, { path: "/uae/dubai", component: CityChat }, void 0, false, {
      fileName: "/var/www/abd/client/src/App.tsx",
      lineNumber: 274,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Route, { path: "/uae/abudhabi", component: CityChat }, void 0, false, {
      fileName: "/var/www/abd/client/src/App.tsx",
      lineNumber: 275,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Route, { path: "/uae/sharjah", component: CityChat }, void 0, false, {
      fileName: "/var/www/abd/client/src/App.tsx",
      lineNumber: 276,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Route, { path: "/jordan/amman", component: CityChat }, void 0, false, {
      fileName: "/var/www/abd/client/src/App.tsx",
      lineNumber: 279,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Route, { path: "/jordan/zarqa", component: CityChat }, void 0, false, {
      fileName: "/var/www/abd/client/src/App.tsx",
      lineNumber: 280,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Route, { path: "/jordan/irbid", component: CityChat }, void 0, false, {
      fileName: "/var/www/abd/client/src/App.tsx",
      lineNumber: 281,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Route, { path: "/palestine/jerusalem", component: CityChat }, void 0, false, {
      fileName: "/var/www/abd/client/src/App.tsx",
      lineNumber: 284,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Route, { path: "/palestine/gaza", component: CityChat }, void 0, false, {
      fileName: "/var/www/abd/client/src/App.tsx",
      lineNumber: 285,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Route, { path: "/palestine/ramallah", component: CityChat }, void 0, false, {
      fileName: "/var/www/abd/client/src/App.tsx",
      lineNumber: 286,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Route, { path: "/:country/:city", component: CityChat }, void 0, false, {
      fileName: "/var/www/abd/client/src/App.tsx",
      lineNumber: 289,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Route, { path: "/watan", component: CountryChat }, void 0, false, {
      fileName: "/var/www/abd/client/src/App.tsx",
      lineNumber: 292,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Route, { path: "/emamir", component: CountryChat }, void 0, false, {
      fileName: "/var/www/abd/client/src/App.tsx",
      lineNumber: 293,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Route, { path: "/falastini", component: CountryChat }, void 0, false, {
      fileName: "/var/www/abd/client/src/App.tsx",
      lineNumber: 294,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Route, { path: "/palestinian", component: CountryChat }, void 0, false, {
      fileName: "/var/www/abd/client/src/App.tsx",
      lineNumber: 295,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Route, { path: "/sabaya", component: CountryChat }, void 0, false, {
      fileName: "/var/www/abd/client/src/App.tsx",
      lineNumber: 296,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Route, { path: "/jordan-chat", component: CountryChat }, void 0, false, {
      fileName: "/var/www/abd/client/src/App.tsx",
      lineNumber: 297,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Route, { path: "/dardashti", component: CountryChat }, void 0, false, {
      fileName: "/var/www/abd/client/src/App.tsx",
      lineNumber: 298,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Route, { path: "/mezz", component: CountryChat }, void 0, false, {
      fileName: "/var/www/abd/client/src/App.tsx",
      lineNumber: 299,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Route, { path: "/online-chat", component: CountryChat }, void 0, false, {
      fileName: "/var/www/abd/client/src/App.tsx",
      lineNumber: 300,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Route, { path: "/ahla-lamma", component: CountryChat }, void 0, false, {
      fileName: "/var/www/abd/client/src/App.tsx",
      lineNumber: 301,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Route, { path: "/beautiful-chat", component: CountryChat }, void 0, false, {
      fileName: "/var/www/abd/client/src/App.tsx",
      lineNumber: 302,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Route, { path: "/no-signup", component: CountryChat }, void 0, false, {
      fileName: "/var/www/abd/client/src/App.tsx",
      lineNumber: 303,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Route, { path: "/oman", component: CountryChat }, void 0, false, {
      fileName: "/var/www/abd/client/src/App.tsx",
      lineNumber: 304,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Route, { path: "/egypt", component: CountryChat }, void 0, false, {
      fileName: "/var/www/abd/client/src/App.tsx",
      lineNumber: 305,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Route, { path: "/saudi", component: CountryChat }, void 0, false, {
      fileName: "/var/www/abd/client/src/App.tsx",
      lineNumber: 306,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Route, { path: "/algeria", component: CountryChat }, void 0, false, {
      fileName: "/var/www/abd/client/src/App.tsx",
      lineNumber: 307,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Route, { path: "/bahrain", component: CountryChat }, void 0, false, {
      fileName: "/var/www/abd/client/src/App.tsx",
      lineNumber: 308,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Route, { path: "/uae", component: CountryChat }, void 0, false, {
      fileName: "/var/www/abd/client/src/App.tsx",
      lineNumber: 309,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Route, { path: "/jordan", component: CountryChat }, void 0, false, {
      fileName: "/var/www/abd/client/src/App.tsx",
      lineNumber: 310,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Route, { path: "/kuwait", component: CountryChat }, void 0, false, {
      fileName: "/var/www/abd/client/src/App.tsx",
      lineNumber: 311,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Route, { path: "/libya", component: CountryChat }, void 0, false, {
      fileName: "/var/www/abd/client/src/App.tsx",
      lineNumber: 312,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Route, { path: "/tunisia", component: CountryChat }, void 0, false, {
      fileName: "/var/www/abd/client/src/App.tsx",
      lineNumber: 313,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Route, { path: "/morocco", component: CountryChat }, void 0, false, {
      fileName: "/var/www/abd/client/src/App.tsx",
      lineNumber: 314,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Route, { path: "/sudan", component: CountryChat }, void 0, false, {
      fileName: "/var/www/abd/client/src/App.tsx",
      lineNumber: 315,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Route, { path: "/palestine", component: CountryChat }, void 0, false, {
      fileName: "/var/www/abd/client/src/App.tsx",
      lineNumber: 316,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Route, { path: "/qatar", component: CountryChat }, void 0, false, {
      fileName: "/var/www/abd/client/src/App.tsx",
      lineNumber: 317,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Route, { path: "/yemen", component: CountryChat }, void 0, false, {
      fileName: "/var/www/abd/client/src/App.tsx",
      lineNumber: 318,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Route, { path: "/lebanon", component: CountryChat }, void 0, false, {
      fileName: "/var/www/abd/client/src/App.tsx",
      lineNumber: 319,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Route, { path: "/syria", component: CountryChat }, void 0, false, {
      fileName: "/var/www/abd/client/src/App.tsx",
      lineNumber: 320,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Route, { path: "/iraq", component: CountryChat }, void 0, false, {
      fileName: "/var/www/abd/client/src/App.tsx",
      lineNumber: 321,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Route, { path: "/comoros", component: CountryChat }, void 0, false, {
      fileName: "/var/www/abd/client/src/App.tsx",
      lineNumber: 322,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Route, { path: "/djibouti", component: CountryChat }, void 0, false, {
      fileName: "/var/www/abd/client/src/App.tsx",
      lineNumber: 323,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Route, { component: ChatPage }, void 0, false, {
      fileName: "/var/www/abd/client/src/App.tsx",
      lineNumber: 325,
      columnNumber: 7
    }, this)
  ] }, void 0, true, {
    fileName: "/var/www/abd/client/src/App.tsx",
    lineNumber: 70,
    columnNumber: 5
  }, this);
}
_c = Router;
function App() {
  return /* @__PURE__ */ jsxDEV(QueryClientProvider, { client: queryClient, children: /* @__PURE__ */ jsxDEV(UserProvider, { children: /* @__PURE__ */ jsxDEV(ComposerStyleProvider, { children: /* @__PURE__ */ jsxDEV(TooltipProvider, { children: [
    /* @__PURE__ */ jsxDEV(Toaster, {}, void 0, false, {
      fileName: "/var/www/abd/client/src/App.tsx",
      lineNumber: 336,
      columnNumber: 13
    }, this),
    /* @__PURE__ */ jsxDEV(
      "a",
      {
        href: "#main-content",
        className: "sr-only focus:not-sr-only focus:absolute focus:top-2 focus:right-2 focus:bg-black focus:text-white focus:px-3 focus:py-2 focus:rounded",
        children: "تخطِ إلى المحتوى الرئيسي"
      },
      void 0,
      false,
      {
        fileName: "/var/www/abd/client/src/App.tsx",
        lineNumber: 337,
        columnNumber: 13
      },
      this
    ),
    /* @__PURE__ */ jsxDEV("main", { id: "main-content", role: "main", children: /* @__PURE__ */ jsxDEV(Suspense, { fallback: null, children: /* @__PURE__ */ jsxDEV(Router, {}, void 0, false, {
      fileName: "/var/www/abd/client/src/App.tsx",
      lineNumber: 345,
      columnNumber: 17
    }, this) }, void 0, false, {
      fileName: "/var/www/abd/client/src/App.tsx",
      lineNumber: 344,
      columnNumber: 15
    }, this) }, void 0, false, {
      fileName: "/var/www/abd/client/src/App.tsx",
      lineNumber: 343,
      columnNumber: 13
    }, this)
  ] }, void 0, true, {
    fileName: "/var/www/abd/client/src/App.tsx",
    lineNumber: 335,
    columnNumber: 11
  }, this) }, void 0, false, {
    fileName: "/var/www/abd/client/src/App.tsx",
    lineNumber: 334,
    columnNumber: 9
  }, this) }, void 0, false, {
    fileName: "/var/www/abd/client/src/App.tsx",
    lineNumber: 333,
    columnNumber: 7
  }, this) }, void 0, false, {
    fileName: "/var/www/abd/client/src/App.tsx",
    lineNumber: 332,
    columnNumber: 5
  }, this);
}
_c2 = App;
export default App;
var _c, _c2;
$RefreshReg$(_c, "Router");
$RefreshReg$(_c2, "App");
if (import.meta.hot && !inWebWorker) {
  window.$RefreshReg$ = prevRefreshReg;
  window.$RefreshSig$ = prevRefreshSig;
}
if (import.meta.hot && !inWebWorker) {
  RefreshRuntime.__hmr_import(import.meta.url).then((currentExports) => {
    RefreshRuntime.registerExportsForReactRefresh("/var/www/abd/client/src/App.tsx", currentExports);
    import.meta.hot.accept((nextExports) => {
      if (!nextExports) return;
      const invalidateMessage = RefreshRuntime.validateRefreshBoundaryAndEnqueueUpdate("/var/www/abd/client/src/App.tsx", currentExports, nextExports);
      if (invalidateMessage) import.meta.hot.invalidate(invalidateMessage);
    });
  });
}

//# sourceMappingURL=data:application/json;base64,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QWFBLEtBZEY7QUFBQTtBQUFBO0FBQUE7QUFBQSxTQWVBLEtBaEJGO0FBQUE7QUFBQTtBQUFBO0FBQUEsU0FpQkEsS0FsQkY7QUFBQTtBQUFBO0FBQUE7QUFBQSxTQW1CQTtBQUVKO0FBQUNlLE1BdkJRRDtBQXlCVCxlQUFlQTtBQUFJLElBQUFELElBQUFFO0FBQUFDLGFBQUFILElBQUE7QUFBQUcsYUFBQUQsS0FBQSIsIm5hbWVzIjpbIlF1ZXJ5Q2xpZW50UHJvdmlkZXIiLCJTd2l0Y2giLCJSb3V0ZSIsIlN1c3BlbnNlIiwicXVlcnlDbGllbnQiLCJUb2FzdGVyIiwiVG9vbHRpcFByb3ZpZGVyIiwiVXNlclByb3ZpZGVyIiwiQ29tcG9zZXJTdHlsZVByb3ZpZGVyIiwiQ2hhdFBhZ2UiLCJBcmFiaWNDaGF0IiwiQ291bnRyeUNoYXQiLCJDaXR5Q2hhdCIsIlN1YkNoYXQiLCJQcml2YWN5UG9saWN5IiwiVGVybXNPZlNlcnZpY2UiLCJSb3V0ZXIiLCJfYyIsIkFwcCIsIl9jMiIsIiRSZWZyZXNoUmVnJCJdLCJpZ25vcmVMaXN0IjpbXSwic291cmNlcyI6WyJBcHAudHN4Il0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IFF1ZXJ5Q2xpZW50UHJvdmlkZXIgfSBmcm9tICdAdGFuc3RhY2svcmVhY3QtcXVlcnknO1xuaW1wb3J0IHsgU3dpdGNoLCBSb3V0ZSB9IGZyb20gJ3dvdXRlcic7XG5pbXBvcnQgeyBTdXNwZW5zZSB9IGZyb20gJ3JlYWN0JztcblxuaW1wb3J0IHsgcXVlcnlDbGllbnQgfSBmcm9tICcuL2xpYi9xdWVyeUNsaWVudCc7XG5cbmltcG9ydCB7IFRvYXN0ZXIgfSBmcm9tICdAL2NvbXBvbmVudHMvdWkvdG9hc3Rlcic7XG5pbXBvcnQgeyBUb29sdGlwUHJvdmlkZXIgfSBmcm9tICdAL2NvbXBvbmVudHMvdWkvdG9vbHRpcCc7XG5pbXBvcnQgeyBVc2VyUHJvdmlkZXIgfSBmcm9tICdAL2NvbnRleHRzL1VzZXJDb250ZXh0JztcbmltcG9ydCB7IENvbXBvc2VyU3R5bGVQcm92aWRlciB9IGZyb20gJ0AvY29udGV4dHMvQ29tcG9zZXJTdHlsZUNvbnRleHQnO1xuaW1wb3J0IENoYXRQYWdlIGZyb20gJ0AvcGFnZXMvY2hhdCc7XG5pbXBvcnQgQXJhYmljQ2hhdCBmcm9tICdAL3BhZ2VzL0FyYWJpY0NoYXQnO1xuaW1wb3J0IENvdW50cnlDaGF0IGZyb20gJ0AvcGFnZXMvQ291bnRyeUNoYXQnO1xuaW1wb3J0IENpdHlDaGF0IGZyb20gJ0AvcGFnZXMvQ2l0eUNoYXQnO1xuaW1wb3J0IFN1YkNoYXQgZnJvbSAnQC9wYWdlcy9TdWJDaGF0JztcbmltcG9ydCBQcml2YWN5UG9saWN5IGZyb20gJ0AvcGFnZXMvUHJpdmFjeVBvbGljeSc7XG5pbXBvcnQgVGVybXNPZlNlcnZpY2UgZnJvbSAnQC9wYWdlcy9UZXJtc09mU2VydmljZSc7XG5cbi8qXG7wn5qAINmG2LjYp9mFINin2YTZhdiv2YYg2KfZhNmF2KrZg9in2YXZhCAtINin2YTZhdit2K/YqyDZgdmKIDIwMjVcbj09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxu4pyFINiq2YUg2KXYtdmE2KfYrSDYrNmF2YrYuSDYp9mE2YXYtNin2YPZhCDZgdmKINmG2LjYp9mFINin2YTZhdiv2YYg2KfZhNmH2LHZhdmKXG7inIUg2KzZhdmK2Lkg2KfZhNmF2K/ZhiDYqti52YXZhCDYqNmG2KzYp9itICgxMDArINmF2K/ZitmG2KkpXG7inIUg2YbYuNin2YUg2YXZiNit2K8g2YrYr9i52YUg2KzZhdmK2Lkg2KfZhNiv2YjZhCDZiNin2YTZhdiv2YZcbuKchSDYpdit2LXYp9im2YrYp9iqINi02KfZhdmE2Kkg2YTYrNmF2YrYuSDYp9mE2YXYr9mGXG7inIUg2KjYrdirINmF2KrZgtiv2YUg2YHZiiDYp9mE2YXYr9mGINmI2KfZhNiv2YjZhFxu4pyFINmF2LnZhNmI2YXYp9iqINiq2YHYtdmK2YTZitipINmE2YPZhCDZhdiv2YrZhtipXG5cbvCflJcg2LHZiNin2KjYtyDYp9mE2KfYrtiq2KjYp9ixOlxuLSAvb21hbi9tdXNjYXQgLSDYp9iu2KrYqNin2LEg2KfZhNmG2LjYp9mFINin2YTZhdiq2YPYp9mF2YRcbi0gL29tYW4vdGVzdC11bml2ZXJzYWwtc3lzdGVtIC0g2LXZgdit2Kkg2KfYrtiq2KjYp9ixINin2YTZhti42KfZhVxuLSDYrNmF2YrYuSDYp9mE2YXYr9mGINmB2Yog2KzZhdmK2Lkg2KfZhNiv2YjZhCDYqti52YXZhCDYp9mE2KLZhlxuXG7wn5OKINil2K3Ytdin2KbZitin2Kog2KfZhNmG2LjYp9mFOlxuLSDYpdis2YXYp9mE2Yog2KfZhNmF2K/ZhjogMTAwKyDZhdiv2YrZhtipXG4tINin2YTYr9mI2YQg2KfZhNmF2LrYt9in2Kk6IDIwINiv2YjZhNipXG4tINin2YTYudmI2KfYtdmFOiAyMCsg2LnYp9i12YXYqVxuLSDYp9mE2YXZhtin2LfZgjog2YXYqti52K/Yr9ipXG5cbvCfjq8g2KfZhNiq2K3Ys9mK2YbYp9iqINin2YTZhdi32KjZgtipOlxuMS4g2KrYrdmI2YrZhCDYrNmF2YrYuSByb3V0ZXMg2YXZhiBTdWJDaGF0INil2YTZiSBDaXR5Q2hhdFxuMi4g2KXYttin2YHYqSDYrNmF2YrYuSDYp9mE2YXYr9mGINin2YTZhdmB2YLZiNiv2Kkg2YXYuSDYqNmK2KfZhtin2KrZh9inXG4zLiDYpdmG2LTYp9ihINmG2LjYp9mFIENpdGllc1N5c3RlbSDYp9mE2YXYqtmD2KfZhdmEXG40LiDYpdi22KfZgdipINmF2LnZhNmI2YXYp9iqINiq2YHYtdmK2YTZitipINmE2YTZhdiv2YYgKNiz2YPYp9mG2Iwg2KXYrdiv2KfYq9mK2KfYqtiMINmF2YbYp9i32YIpXG41LiDYpdmG2LTYp9ihINio2K3YqyDZhdiq2YLYr9mFINmI2KXYrdi12KfYptmK2KfYqiDYtNin2YXZhNipXG42LiDZiNin2KzZh9ipINmF2LPYqtiu2K/ZhSDZhdit2LPZhtipINmF2Lkg2YXYudmE2YjZhdin2Kog2KfZhNiq2LXYrdmK2K1cbiovXG5cbmZ1bmN0aW9uIFJvdXRlcigpIHtcbiAgcmV0dXJuIChcbiAgICA8U3dpdGNoPlxuICAgICAgPFJvdXRlIHBhdGg9XCIvXCIgY29tcG9uZW50PXtDaGF0UGFnZX0gLz5cbiAgICAgIDxSb3V0ZSBwYXRoPVwiL3ByaXZhY3lcIiBjb21wb25lbnQ9e1ByaXZhY3lQb2xpY3l9IC8+XG4gICAgICA8Um91dGUgcGF0aD1cIi90ZXJtc1wiIGNvbXBvbmVudD17VGVybXNPZlNlcnZpY2V9IC8+XG4gICAgICA8Um91dGUgcGF0aD1cIi9hcmFiaWNcIiBjb21wb25lbnQ9e0FyYWJpY0NoYXR9IC8+XG5cbiAgICAgIHsvKiBTdWItY2hhdCByb3V0ZXMgZm9yIGNvdW50cnktc3BlY2lmaWMgY2hhdCByb29tcyAtIEZJUlNUICovfVxuICAgICAgey8qIEVtYW1pciBzdWItY2hhdHMgKi99XG4gICAgICA8Um91dGUgcGF0aD1cIi9lbWFtaXIvbW9iaWxlXCIgY29tcG9uZW50PXtTdWJDaGF0fSAvPlxuXG4gICAgICB7LyogU2FiYXlhIHN1Yi1jaGF0cyAqL31cbiAgICAgIDxSb3V0ZSBwYXRoPVwiL3NhYmF5YS9zYWJheWEtY2hhdFwiIGNvbXBvbmVudD17U3ViQ2hhdH0gLz5cbiAgICAgIDxSb3V0ZSBwYXRoPVwiL3NhYmF5YS9lbGVnYW50LWNoYXRcIiBjb21wb25lbnQ9e1N1YkNoYXR9IC8+XG5cbiAgICAgIHsvKiBEYXJkYXNodGkgc3ViLWNoYXRzICovfVxuICAgICAgPFJvdXRlIHBhdGg9XCIvZGFyZGFzaHRpL2dlbmVyYWwtY2hhdFwiIGNvbXBvbmVudD17U3ViQ2hhdH0gLz5cbiAgICAgIDxSb3V0ZSBwYXRoPVwiL2RhcmRhc2h0aS9mcmllbmRzLWNoYXRcIiBjb21wb25lbnQ9e1N1YkNoYXR9IC8+XG5cbiAgICAgIHsvKiBNZXp6IHN1Yi1jaGF0cyAqL31cbiAgICAgIDxSb3V0ZSBwYXRoPVwiL21lenovbWV6ei1nZW5lcmFsXCIgY29tcG9uZW50PXtTdWJDaGF0fSAvPlxuICAgICAgPFJvdXRlIHBhdGg9XCIvbWV6ei9tZXp6LW1vYmlsZVwiIGNvbXBvbmVudD17U3ViQ2hhdH0gLz5cblxuICAgICAgey8qIE9ubGluZSBDaGF0IHN1Yi1jaGF0cyAqL31cbiAgICAgIDxSb3V0ZSBwYXRoPVwiL29ubGluZS1jaGF0L2xpdmUtY2hhdFwiIGNvbXBvbmVudD17U3ViQ2hhdH0gLz5cbiAgICAgIDxSb3V0ZSBwYXRoPVwiL29ubGluZS1jaGF0L2luc3RhbnQtY2hhdFwiIGNvbXBvbmVudD17U3ViQ2hhdH0gLz5cblxuICAgICAgey8qIEFobGEgTGFtbWEgc3ViLWNoYXRzICovfVxuICAgICAgPFJvdXRlIHBhdGg9XCIvYWhsYS1sYW1tYS9mcmllbmRzLWdhdGhlcmluZ1wiIGNvbXBvbmVudD17U3ViQ2hhdH0gLz5cbiAgICAgIDxSb3V0ZSBwYXRoPVwiL2FobGEtbGFtbWEvYXJhYmljLWdhdGhlcmluZ1wiIGNvbXBvbmVudD17U3ViQ2hhdH0gLz5cblxuICAgICAgey8qIEJlYXV0aWZ1bCBDaGF0IHN1Yi1jaGF0cyAqL31cbiAgICAgIDxSb3V0ZSBwYXRoPVwiL2JlYXV0aWZ1bC1jaGF0L2JlYXV0aWZ1bC1jaGF0XCIgY29tcG9uZW50PXtTdWJDaGF0fSAvPlxuICAgICAgPFJvdXRlIHBhdGg9XCIvYmVhdXRpZnVsLWNoYXQvc3dlZXRlc3QtY2hhdFwiIGNvbXBvbmVudD17U3ViQ2hhdH0gLz5cblxuICAgICAgey8qIE5vIFNpZ251cCBzdWItY2hhdHMgKi99XG4gICAgICA8Um91dGUgcGF0aD1cIi9uby1zaWdudXAvcXVpY2stY2hhdFwiIGNvbXBvbmVudD17U3ViQ2hhdH0gLz5cbiAgICAgIDxSb3V0ZSBwYXRoPVwiL25vLXNpZ251cC9pbnN0YW50LWVudHJ5XCIgY29tcG9uZW50PXtTdWJDaGF0fSAvPlxuXG4gICAgICB7LyogQWRkaXRpb25hbCBjaXR5IHJvdXRlcyBmb3IgYWxsIGNvdW50cmllcyAtIENPTlZFUlRFRCBUTyBDSVRZIFJPVVRFUyAqL31cbiAgICAgIHsvKiBPbWFuIGFkZGl0aW9uYWwgcm91dGVzICovfVxuICAgICAgPFJvdXRlIHBhdGg9XCIvb21hbi9vbWFuLW1vYmlsZVwiIGNvbXBvbmVudD17Q2l0eUNoYXR9IC8+XG4gICAgICA8Um91dGUgcGF0aD1cIi9vbWFuL2JhdGluYWhcIiBjb21wb25lbnQ9e0NpdHlDaGF0fSAvPlxuICAgICAgPFJvdXRlIHBhdGg9XCIvb21hbi9kaG9mYXJcIiBjb21wb25lbnQ9e0NpdHlDaGF0fSAvPlxuICAgICAgPFJvdXRlIHBhdGg9XCIvb21hbi9hcmFiLW9tYW5cIiBjb21wb25lbnQ9e0NpdHlDaGF0fSAvPlxuXG4gICAgICB7LyogRWd5cHQgYWRkaXRpb25hbCByb3V0ZXMgKi99XG4gICAgICA8Um91dGUgcGF0aD1cIi9lZ3lwdC9lZ3lwdC1tb2JpbGVcIiBjb21wb25lbnQ9e0NpdHlDaGF0fSAvPlxuICAgICAgPFJvdXRlIHBhdGg9XCIvZWd5cHQvZWxkZXJzXCIgY29tcG9uZW50PXtDaXR5Q2hhdH0gLz5cbiAgICAgIDxSb3V0ZSBwYXRoPVwiL2VneXB0L3VwcGVyLWVneXB0XCIgY29tcG9uZW50PXtDaXR5Q2hhdH0gLz5cbiAgICAgIDxSb3V0ZSBwYXRoPVwiL2VneXB0L2RlbHRhXCIgY29tcG9uZW50PXtDaXR5Q2hhdH0gLz5cbiAgICAgIDxSb3V0ZSBwYXRoPVwiL2VneXB0L2Jlc3QtZ2F0aGVyaW5nXCIgY29tcG9uZW50PXtDaXR5Q2hhdH0gLz5cblxuICAgICAgey8qIFNhdWRpIGFkZGl0aW9uYWwgcm91dGVzICovfVxuICAgICAgPFJvdXRlIHBhdGg9XCIvc2F1ZGkvc2F1ZGktbW9iaWxlXCIgY29tcG9uZW50PXtDaXR5Q2hhdH0gLz5cbiAgICAgIDxSb3V0ZSBwYXRoPVwiL3NhdWRpL3Bpb25lZXJzXCIgY29tcG9uZW50PXtDaXR5Q2hhdH0gLz5cbiAgICAgIDxSb3V0ZSBwYXRoPVwiL3NhdWRpL25hamRcIiBjb21wb25lbnQ9e0NpdHlDaGF0fSAvPlxuXG4gICAgICB7LyogQWxnZXJpYSBhZGRpdGlvbmFsIHJvdXRlcyAqL31cbiAgICAgIDxSb3V0ZSBwYXRoPVwiL2FsZ2VyaWEvYWxnaWVyc1wiIGNvbXBvbmVudD17Q2l0eUNoYXR9IC8+XG4gICAgICA8Um91dGUgcGF0aD1cIi9hbGdlcmlhL29yYW5cIiBjb21wb25lbnQ9e0NpdHlDaGF0fSAvPlxuICAgICAgPFJvdXRlIHBhdGg9XCIvYWxnZXJpYS9jb25zdGFudGluZVwiIGNvbXBvbmVudD17Q2l0eUNoYXR9IC8+XG4gICAgICA8Um91dGUgcGF0aD1cIi9hbGdlcmlhL2FubmFiYVwiIGNvbXBvbmVudD17Q2l0eUNoYXR9IC8+XG4gICAgICA8Um91dGUgcGF0aD1cIi9hbGdlcmlhL2FsZ2VyaWEtbW9iaWxlXCIgY29tcG9uZW50PXtDaXR5Q2hhdH0gLz5cbiAgICAgIDxSb3V0ZSBwYXRoPVwiL2FsZ2VyaWEva2FieWxpZVwiIGNvbXBvbmVudD17Q2l0eUNoYXR9IC8+XG4gICAgICA8Um91dGUgcGF0aD1cIi9hbGdlcmlhL3NhaGFyYVwiIGNvbXBvbmVudD17Q2l0eUNoYXR9IC8+XG4gICAgICA8Um91dGUgcGF0aD1cIi9hbGdlcmlhL21pbGxpb24tbWFydHlyc1wiIGNvbXBvbmVudD17Q2l0eUNoYXR9IC8+XG5cbiAgICAgIHsvKiBCYWhyYWluIGFkZGl0aW9uYWwgcm91dGVzICovfVxuICAgICAgPFJvdXRlIHBhdGg9XCIvYmFocmFpbi9iYWhyYWluLW1vYmlsZVwiIGNvbXBvbmVudD17Q2l0eUNoYXR9IC8+XG4gICAgICA8Um91dGUgcGF0aD1cIi9iYWhyYWluL3NpdHJhaFwiIGNvbXBvbmVudD17Q2l0eUNoYXR9IC8+XG4gICAgICA8Um91dGUgcGF0aD1cIi9iYWhyYWluL2lzYVwiIGNvbXBvbmVudD17Q2l0eUNoYXR9IC8+XG4gICAgICA8Um91dGUgcGF0aD1cIi9iYWhyYWluL3BlYXJsXCIgY29tcG9uZW50PXtDaXR5Q2hhdH0gLz5cblxuICAgICAgey8qIFVBRSBhZGRpdGlvbmFsIHJvdXRlcyAqL31cbiAgICAgIDxSb3V0ZSBwYXRoPVwiL3VhZS91YWUtbW9iaWxlXCIgY29tcG9uZW50PXtDaXR5Q2hhdH0gLz5cbiAgICAgIDxSb3V0ZSBwYXRoPVwiL3VhZS9ham1hblwiIGNvbXBvbmVudD17Q2l0eUNoYXR9IC8+XG4gICAgICA8Um91dGUgcGF0aD1cIi91YWUvYWwtYWluXCIgY29tcG9uZW50PXtDaXR5Q2hhdH0gLz5cbiAgICAgIDxSb3V0ZSBwYXRoPVwiL3VhZS9yYXMtYWwta2hhaW1haFwiIGNvbXBvbmVudD17Q2l0eUNoYXR9IC8+XG4gICAgICA8Um91dGUgcGF0aD1cIi91YWUvZnVqYWlyYWhcIiBjb21wb25lbnQ9e0NpdHlDaGF0fSAvPlxuXG4gICAgICB7LyogSm9yZGFuIGFkZGl0aW9uYWwgcm91dGVzICovfVxuICAgICAgPFJvdXRlIHBhdGg9XCIvam9yZGFuL2pvcmRhbi1tb2JpbGVcIiBjb21wb25lbnQ9e0NpdHlDaGF0fSAvPlxuICAgICAgPFJvdXRlIHBhdGg9XCIvam9yZGFuL2FxYWJhXCIgY29tcG9uZW50PXtDaXR5Q2hhdH0gLz5cbiAgICAgIDxSb3V0ZSBwYXRoPVwiL2pvcmRhbi9zYWx0XCIgY29tcG9uZW50PXtDaXR5Q2hhdH0gLz5cbiAgICAgIDxSb3V0ZSBwYXRoPVwiL2pvcmRhbi9rYXJha1wiIGNvbXBvbmVudD17Q2l0eUNoYXR9IC8+XG4gICAgICA8Um91dGUgcGF0aD1cIi9qb3JkYW4vcGV0cmFcIiBjb21wb25lbnQ9e0NpdHlDaGF0fSAvPlxuXG4gICAgICB7LyogS3V3YWl0IGFkZGl0aW9uYWwgcm91dGVzICovfVxuICAgICAgPFJvdXRlIHBhdGg9XCIva3V3YWl0L2t1d2FpdC1tb2JpbGVcIiBjb21wb25lbnQ9e0NpdHlDaGF0fSAvPlxuICAgICAgPFJvdXRlIHBhdGg9XCIva3V3YWl0L2Zhcndhbml5YWhcIiBjb21wb25lbnQ9e0NpdHlDaGF0fSAvPlxuICAgICAgPFJvdXRlIHBhdGg9XCIva3V3YWl0L2hhd2FsbGlcIiBjb21wb25lbnQ9e0NpdHlDaGF0fSAvPlxuICAgICAgPFJvdXRlIHBhdGg9XCIva3V3YWl0L211YmFyYWstYWwta2FiZWVyXCIgY29tcG9uZW50PXtDaXR5Q2hhdH0gLz5cbiAgICAgIDxSb3V0ZSBwYXRoPVwiL2t1d2FpdC9kaXdhbml5YWhcIiBjb21wb25lbnQ9e0NpdHlDaGF0fSAvPlxuXG4gICAgICB7LyogTGlieWEgYWRkaXRpb25hbCByb3V0ZXMgKi99XG4gICAgICA8Um91dGUgcGF0aD1cIi9saWJ5YS9saWJ5YS1tb2JpbGVcIiBjb21wb25lbnQ9e0NpdHlDaGF0fSAvPlxuICAgICAgPFJvdXRlIHBhdGg9XCIvbGlieWEvYmF5ZGFcIiBjb21wb25lbnQ9e0NpdHlDaGF0fSAvPlxuICAgICAgPFJvdXRlIHBhdGg9XCIvbGlieWEvemF3aXlhXCIgY29tcG9uZW50PXtDaXR5Q2hhdH0gLz5cbiAgICAgIDxSb3V0ZSBwYXRoPVwiL2xpYnlhL3NhYmhhXCIgY29tcG9uZW50PXtDaXR5Q2hhdH0gLz5cbiAgICAgIDxSb3V0ZSBwYXRoPVwiL2xpYnlhL2FqZGFiaXlhXCIgY29tcG9uZW50PXtDaXR5Q2hhdH0gLz5cblxuICAgICAgey8qIFR1bmlzaWEgYWRkaXRpb25hbCByb3V0ZXMgKi99XG4gICAgICA8Um91dGUgcGF0aD1cIi90dW5pc2lhL3R1bmlzaWEtbW9iaWxlXCIgY29tcG9uZW50PXtDaXR5Q2hhdH0gLz5cbiAgICAgIDxSb3V0ZSBwYXRoPVwiL3R1bmlzaWEvbW9uYXN0aXJcIiBjb21wb25lbnQ9e0NpdHlDaGF0fSAvPlxuICAgICAgPFJvdXRlIHBhdGg9XCIvdHVuaXNpYS9iaXplcnRlXCIgY29tcG9uZW50PXtDaXR5Q2hhdH0gLz5cbiAgICAgIDxSb3V0ZSBwYXRoPVwiL3R1bmlzaWEvZ2FiZXNcIiBjb21wb25lbnQ9e0NpdHlDaGF0fSAvPlxuICAgICAgPFJvdXRlIHBhdGg9XCIvdHVuaXNpYS9rYWlyb3VhblwiIGNvbXBvbmVudD17Q2l0eUNoYXR9IC8+XG5cbiAgICAgIHsvKiBNb3JvY2NvIGFkZGl0aW9uYWwgcm91dGVzICovfVxuICAgICAgPFJvdXRlIHBhdGg9XCIvbW9yb2Njby9tb3JvY2NvLW1vYmlsZVwiIGNvbXBvbmVudD17Q2l0eUNoYXR9IC8+XG4gICAgICA8Um91dGUgcGF0aD1cIi9tb3JvY2NvL2Zlc1wiIGNvbXBvbmVudD17Q2l0eUNoYXR9IC8+XG4gICAgICA8Um91dGUgcGF0aD1cIi9tb3JvY2NvL3RhbmdpZXJcIiBjb21wb25lbnQ9e0NpdHlDaGF0fSAvPlxuICAgICAgPFJvdXRlIHBhdGg9XCIvbW9yb2Njby9hZ2FkaXJcIiBjb21wb25lbnQ9e0NpdHlDaGF0fSAvPlxuICAgICAgPFJvdXRlIHBhdGg9XCIvbW9yb2Njby9tZWtuZXNcIiBjb21wb25lbnQ9e0NpdHlDaGF0fSAvPlxuXG4gICAgICB7LyogU3VkYW4gYWRkaXRpb25hbCByb3V0ZXMgKi99XG4gICAgICA8Um91dGUgcGF0aD1cIi9zdWRhbi9zdWRhbi1tb2JpbGVcIiBjb21wb25lbnQ9e0NpdHlDaGF0fSAvPlxuICAgICAgPFJvdXRlIHBhdGg9XCIvc3VkYW4vZ2V6aXJhXCIgY29tcG9uZW50PXtDaXR5Q2hhdH0gLz5cbiAgICAgIDxSb3V0ZSBwYXRoPVwiL3N1ZGFuL2RhcmZ1clwiIGNvbXBvbmVudD17Q2l0eUNoYXR9IC8+XG4gICAgICA8Um91dGUgcGF0aD1cIi9zdWRhbi9ibHVlLW5pbGVcIiBjb21wb25lbnQ9e0NpdHlDaGF0fSAvPlxuXG4gICAgICB7LyogUGFsZXN0aW5lIGFkZGl0aW9uYWwgcm91dGVzICovfVxuICAgICAgPFJvdXRlIHBhdGg9XCIvcGFsZXN0aW5lL3BhbGVzdGluZS1tb2JpbGVcIiBjb21wb25lbnQ9e0NpdHlDaGF0fSAvPlxuICAgICAgPFJvdXRlIHBhdGg9XCIvcGFsZXN0aW5lL25hYmx1c1wiIGNvbXBvbmVudD17Q2l0eUNoYXR9IC8+XG4gICAgICA8Um91dGUgcGF0aD1cIi9wYWxlc3RpbmUvaGVicm9uXCIgY29tcG9uZW50PXtDaXR5Q2hhdH0gLz5cbiAgICAgIDxSb3V0ZSBwYXRoPVwiL3BhbGVzdGluZS9iZXRobGVoZW1cIiBjb21wb25lbnQ9e0NpdHlDaGF0fSAvPlxuICAgICAgPFJvdXRlIHBhdGg9XCIvcGFsZXN0aW5lL2plbmluXCIgY29tcG9uZW50PXtDaXR5Q2hhdH0gLz5cblxuICAgICAgey8qIFFhdGFyIGFkZGl0aW9uYWwgcm91dGVzICovfVxuICAgICAgPFJvdXRlIHBhdGg9XCIvcWF0YXIvcWF0YXItbW9iaWxlXCIgY29tcG9uZW50PXtDaXR5Q2hhdH0gLz5cbiAgICAgIDxSb3V0ZSBwYXRoPVwiL3FhdGFyL2FsLWtob3JcIiBjb21wb25lbnQ9e0NpdHlDaGF0fSAvPlxuICAgICAgPFJvdXRlIHBhdGg9XCIvcWF0YXIvdW1tLXNhbGFsXCIgY29tcG9uZW50PXtDaXR5Q2hhdH0gLz5cbiAgICAgIDxSb3V0ZSBwYXRoPVwiL3FhdGFyL2x1c2FpbFwiIGNvbXBvbmVudD17Q2l0eUNoYXR9IC8+XG4gICAgICA8Um91dGUgcGF0aD1cIi9xYXRhci9hbC1zaGFtYWxcIiBjb21wb25lbnQ9e0NpdHlDaGF0fSAvPlxuXG4gICAgICB7LyogWWVtZW4gYWRkaXRpb25hbCByb3V0ZXMgKi99XG4gICAgICA8Um91dGUgcGF0aD1cIi95ZW1lbi95ZW1lbi1tb2JpbGVcIiBjb21wb25lbnQ9e0NpdHlDaGF0fSAvPlxuICAgICAgPFJvdXRlIHBhdGg9XCIveWVtZW4vaG9kZWlkYWhcIiBjb21wb25lbnQ9e0NpdHlDaGF0fSAvPlxuICAgICAgPFJvdXRlIHBhdGg9XCIveWVtZW4vaWJiXCIgY29tcG9uZW50PXtDaXR5Q2hhdH0gLz5cbiAgICAgIDxSb3V0ZSBwYXRoPVwiL3llbWVuL2hhZHJhbWF1dFwiIGNvbXBvbmVudD17Q2l0eUNoYXR9IC8+XG4gICAgICA8Um91dGUgcGF0aD1cIi95ZW1lbi9tdWthbGxhXCIgY29tcG9uZW50PXtDaXR5Q2hhdH0gLz5cblxuICAgICAgey8qIExlYmFub24gYWRkaXRpb25hbCByb3V0ZXMgKi99XG4gICAgICA8Um91dGUgcGF0aD1cIi9sZWJhbm9uL2xlYmFub24tbW9iaWxlXCIgY29tcG9uZW50PXtDaXR5Q2hhdH0gLz5cbiAgICAgIDxSb3V0ZSBwYXRoPVwiL2xlYmFub24vdHlyZVwiIGNvbXBvbmVudD17Q2l0eUNoYXR9IC8+XG4gICAgICA8Um91dGUgcGF0aD1cIi9sZWJhbm9uL3phaGxlXCIgY29tcG9uZW50PXtDaXR5Q2hhdH0gLz5cbiAgICAgIDxSb3V0ZSBwYXRoPVwiL2xlYmFub24vYnlibG9zXCIgY29tcG9uZW50PXtDaXR5Q2hhdH0gLz5cbiAgICAgIDxSb3V0ZSBwYXRoPVwiL2xlYmFub24vYmFhbGJla1wiIGNvbXBvbmVudD17Q2l0eUNoYXR9IC8+XG5cbiAgICAgIHsvKiBTeXJpYSBhZGRpdGlvbmFsIHJvdXRlcyAqL31cbiAgICAgIDxSb3V0ZSBwYXRoPVwiL3N5cmlhL3N5cmlhLW1vYmlsZVwiIGNvbXBvbmVudD17Q2l0eUNoYXR9IC8+XG4gICAgICA8Um91dGUgcGF0aD1cIi9zeXJpYS9sYXRha2lhXCIgY29tcG9uZW50PXtDaXR5Q2hhdH0gLz5cbiAgICAgIDxSb3V0ZSBwYXRoPVwiL3N5cmlhL2hhbWFcIiBjb21wb25lbnQ9e0NpdHlDaGF0fSAvPlxuICAgICAgPFJvdXRlIHBhdGg9XCIvc3lyaWEvdGFydHVzXCIgY29tcG9uZW50PXtDaXR5Q2hhdH0gLz5cbiAgICAgIDxSb3V0ZSBwYXRoPVwiL3N5cmlhL2RlaXItZXotem9yXCIgY29tcG9uZW50PXtDaXR5Q2hhdH0gLz5cblxuICAgICAgey8qIElyYXEgYWRkaXRpb25hbCByb3V0ZXMgKi99XG4gICAgICA8Um91dGUgcGF0aD1cIi9pcmFxL2lyYXEtbW9iaWxlXCIgY29tcG9uZW50PXtDaXR5Q2hhdH0gLz5cbiAgICAgIDxSb3V0ZSBwYXRoPVwiL2lyYXEvZXJiaWxcIiBjb21wb25lbnQ9e0NpdHlDaGF0fSAvPlxuICAgICAgPFJvdXRlIHBhdGg9XCIvaXJhcS9uYWphZlwiIGNvbXBvbmVudD17Q2l0eUNoYXR9IC8+XG4gICAgICA8Um91dGUgcGF0aD1cIi9pcmFxL2thcmJhbGFcIiBjb21wb25lbnQ9e0NpdHlDaGF0fSAvPlxuICAgICAgPFJvdXRlIHBhdGg9XCIvaXJhcS9zdWxheW1hbml5YWhcIiBjb21wb25lbnQ9e0NpdHlDaGF0fSAvPlxuXG4gICAgICB7LyogQ29tb3JvcyBhZGRpdGlvbmFsIHJvdXRlcyAqL31cbiAgICAgIDxSb3V0ZSBwYXRoPVwiL2NvbW9yb3MvY29tb3Jvcy1tb2JpbGVcIiBjb21wb25lbnQ9e0NpdHlDaGF0fSAvPlxuICAgICAgPFJvdXRlIHBhdGg9XCIvY29tb3Jvcy9hbmpvdWFuXCIgY29tcG9uZW50PXtDaXR5Q2hhdH0gLz5cbiAgICAgIDxSb3V0ZSBwYXRoPVwiL2NvbW9yb3MvbW9ow6lsaVwiIGNvbXBvbmVudD17Q2l0eUNoYXR9IC8+XG4gICAgICA8Um91dGUgcGF0aD1cIi9jb21vcm9zL2dyYW5kZS1jb21vcmVcIiBjb21wb25lbnQ9e0NpdHlDaGF0fSAvPlxuICAgICAgPFJvdXRlIHBhdGg9XCIvY29tb3Jvcy9tYXlvdHRlXCIgY29tcG9uZW50PXtDaXR5Q2hhdH0gLz5cbiAgICAgIDxSb3V0ZSBwYXRoPVwiL2NvbW9yb3MvZG9tb25pXCIgY29tcG9uZW50PXtDaXR5Q2hhdH0gLz5cbiAgICAgIDxSb3V0ZSBwYXRoPVwiL2NvbW9yb3MvZm9tYm9uaVwiIGNvbXBvbmVudD17Q2l0eUNoYXR9IC8+XG5cbiAgICAgIHsvKiBEamlib3V0aSBhZGRpdGlvbmFsIHJvdXRlcyAqL31cbiAgICAgIDxSb3V0ZSBwYXRoPVwiL2RqaWJvdXRpL2RqaWJvdXRpLW1vYmlsZVwiIGNvbXBvbmVudD17Q2l0eUNoYXR9IC8+XG4gICAgICA8Um91dGUgcGF0aD1cIi9kamlib3V0aS9hbGktc2FiaWVoXCIgY29tcG9uZW50PXtDaXR5Q2hhdH0gLz5cbiAgICAgIDxSb3V0ZSBwYXRoPVwiL2RqaWJvdXRpL3RhZGpvdXJhXCIgY29tcG9uZW50PXtDaXR5Q2hhdH0gLz5cbiAgICAgIDxSb3V0ZSBwYXRoPVwiL2RqaWJvdXRpL29ib2NrXCIgY29tcG9uZW50PXtDaXR5Q2hhdH0gLz5cbiAgICAgIDxSb3V0ZSBwYXRoPVwiL2RqaWJvdXRpL2Rpa2hpbFwiIGNvbXBvbmVudD17Q2l0eUNoYXR9IC8+XG4gICAgICA8Um91dGUgcGF0aD1cIi9kamlib3V0aS9hcnRhXCIgY29tcG9uZW50PXtDaXR5Q2hhdH0gLz5cbiAgICAgIDxSb3V0ZSBwYXRoPVwiL2RqaWJvdXRpL2hvcm4tb2YtYWZyaWNhXCIgY29tcG9uZW50PXtDaXR5Q2hhdH0gLz5cblxuICAgICAgey8qIENpdHktc3BlY2lmaWMgcm91dGVzIC0gU0VDT05EICovfVxuICAgICAgey8qIE9tYW4gQ2l0aWVzICovfVxuICAgICAgPFJvdXRlIHBhdGg9XCIvb21hbi9tdXNjYXRcIiBjb21wb25lbnQ9e0NpdHlDaGF0fSAvPlxuICAgICAgPFJvdXRlIHBhdGg9XCIvb21hbi9zYWxhbGFoXCIgY29tcG9uZW50PXtDaXR5Q2hhdH0gLz5cbiAgICAgIDxSb3V0ZSBwYXRoPVwiL29tYW4vbml6d2FcIiBjb21wb25lbnQ9e0NpdHlDaGF0fSAvPlxuICAgICAgPFJvdXRlIHBhdGg9XCIvb21hbi9zb2hhclwiIGNvbXBvbmVudD17Q2l0eUNoYXR9IC8+XG5cbiAgICAgIHsvKiBUZXN0IFJvdXRlIGZvciBVbml2ZXJzYWwgQ2l0eSBTeXN0ZW0gKi99XG4gICAgICA8Um91dGUgcGF0aD1cIi86Y291bnRyeS90ZXN0LXVuaXZlcnNhbC1zeXN0ZW1cIiBjb21wb25lbnQ9e0NpdHlDaGF0fSAvPlxuXG4gICAgICB7LyogRWd5cHQgQ2l0aWVzICovfVxuICAgICAgPFJvdXRlIHBhdGg9XCIvZWd5cHQvY2Fpcm9cIiBjb21wb25lbnQ9e0NpdHlDaGF0fSAvPlxuICAgICAgPFJvdXRlIHBhdGg9XCIvZWd5cHQvYWxleGFuZHJpYVwiIGNvbXBvbmVudD17Q2l0eUNoYXR9IC8+XG4gICAgICA8Um91dGUgcGF0aD1cIi9lZ3lwdC9naXphXCIgY29tcG9uZW50PXtDaXR5Q2hhdH0gLz5cblxuICAgICAgey8qIFNhdWRpIENpdGllcyAqL31cbiAgICAgIDxSb3V0ZSBwYXRoPVwiL3NhdWRpL3JpeWFkaFwiIGNvbXBvbmVudD17Q2l0eUNoYXR9IC8+XG4gICAgICA8Um91dGUgcGF0aD1cIi9zYXVkaS9qZWRkYWhcIiBjb21wb25lbnQ9e0NpdHlDaGF0fSAvPlxuICAgICAgPFJvdXRlIHBhdGg9XCIvc2F1ZGkvbWFra2FoXCIgY29tcG9uZW50PXtDaXR5Q2hhdH0gLz5cbiAgICAgIDxSb3V0ZSBwYXRoPVwiL3NhdWRpL21lZGluYVwiIGNvbXBvbmVudD17Q2l0eUNoYXR9IC8+XG4gICAgICA8Um91dGUgcGF0aD1cIi9zYXVkaS9kYW1tYW1cIiBjb21wb25lbnQ9e0NpdHlDaGF0fSAvPlxuXG4gICAgICB7LyogVUFFIENpdGllcyAqL31cbiAgICAgIDxSb3V0ZSBwYXRoPVwiL3VhZS9kdWJhaVwiIGNvbXBvbmVudD17Q2l0eUNoYXR9IC8+XG4gICAgICA8Um91dGUgcGF0aD1cIi91YWUvYWJ1ZGhhYmlcIiBjb21wb25lbnQ9e0NpdHlDaGF0fSAvPlxuICAgICAgPFJvdXRlIHBhdGg9XCIvdWFlL3NoYXJqYWhcIiBjb21wb25lbnQ9e0NpdHlDaGF0fSAvPlxuXG4gICAgICB7LyogSm9yZGFuIENpdGllcyAqL31cbiAgICAgIDxSb3V0ZSBwYXRoPVwiL2pvcmRhbi9hbW1hblwiIGNvbXBvbmVudD17Q2l0eUNoYXR9IC8+XG4gICAgICA8Um91dGUgcGF0aD1cIi9qb3JkYW4vemFycWFcIiBjb21wb25lbnQ9e0NpdHlDaGF0fSAvPlxuICAgICAgPFJvdXRlIHBhdGg9XCIvam9yZGFuL2lyYmlkXCIgY29tcG9uZW50PXtDaXR5Q2hhdH0gLz5cblxuICAgICAgey8qIFBhbGVzdGluZSBDaXRpZXMgKi99XG4gICAgICA8Um91dGUgcGF0aD1cIi9wYWxlc3RpbmUvamVydXNhbGVtXCIgY29tcG9uZW50PXtDaXR5Q2hhdH0gLz5cbiAgICAgIDxSb3V0ZSBwYXRoPVwiL3BhbGVzdGluZS9nYXphXCIgY29tcG9uZW50PXtDaXR5Q2hhdH0gLz5cbiAgICAgIDxSb3V0ZSBwYXRoPVwiL3BhbGVzdGluZS9yYW1hbGxhaFwiIGNvbXBvbmVudD17Q2l0eUNoYXR9IC8+XG5cbiAgICAgIHsvKiBHZW5lcmljIGNpdHkgcm91dGUgLSBNVVNUIGJlIGJlZm9yZSBjb3VudHJ5IHJvdXRlcyAqL31cbiAgICAgIDxSb3V0ZSBwYXRoPVwiLzpjb3VudHJ5LzpjaXR5XCIgY29tcG9uZW50PXtDaXR5Q2hhdH0gLz5cblxuICAgICAgey8qIENvdW50cnktc3BlY2lmaWMgcm91dGVzIC0gTEFTVCAqL31cbiAgICAgIDxSb3V0ZSBwYXRoPVwiL3dhdGFuXCIgY29tcG9uZW50PXtDb3VudHJ5Q2hhdH0gLz5cbiAgICAgIDxSb3V0ZSBwYXRoPVwiL2VtYW1pclwiIGNvbXBvbmVudD17Q291bnRyeUNoYXR9IC8+XG4gICAgICA8Um91dGUgcGF0aD1cIi9mYWxhc3RpbmlcIiBjb21wb25lbnQ9e0NvdW50cnlDaGF0fSAvPlxuICAgICAgPFJvdXRlIHBhdGg9XCIvcGFsZXN0aW5pYW5cIiBjb21wb25lbnQ9e0NvdW50cnlDaGF0fSAvPlxuICAgICAgPFJvdXRlIHBhdGg9XCIvc2FiYXlhXCIgY29tcG9uZW50PXtDb3VudHJ5Q2hhdH0gLz5cbiAgICAgIDxSb3V0ZSBwYXRoPVwiL2pvcmRhbi1jaGF0XCIgY29tcG9uZW50PXtDb3VudHJ5Q2hhdH0gLz5cbiAgICAgIDxSb3V0ZSBwYXRoPVwiL2RhcmRhc2h0aVwiIGNvbXBvbmVudD17Q291bnRyeUNoYXR9IC8+XG4gICAgICA8Um91dGUgcGF0aD1cIi9tZXp6XCIgY29tcG9uZW50PXtDb3VudHJ5Q2hhdH0gLz5cbiAgICAgIDxSb3V0ZSBwYXRoPVwiL29ubGluZS1jaGF0XCIgY29tcG9uZW50PXtDb3VudHJ5Q2hhdH0gLz5cbiAgICAgIDxSb3V0ZSBwYXRoPVwiL2FobGEtbGFtbWFcIiBjb21wb25lbnQ9e0NvdW50cnlDaGF0fSAvPlxuICAgICAgPFJvdXRlIHBhdGg9XCIvYmVhdXRpZnVsLWNoYXRcIiBjb21wb25lbnQ9e0NvdW50cnlDaGF0fSAvPlxuICAgICAgPFJvdXRlIHBhdGg9XCIvbm8tc2lnbnVwXCIgY29tcG9uZW50PXtDb3VudHJ5Q2hhdH0gLz5cbiAgICAgIDxSb3V0ZSBwYXRoPVwiL29tYW5cIiBjb21wb25lbnQ9e0NvdW50cnlDaGF0fSAvPlxuICAgICAgPFJvdXRlIHBhdGg9XCIvZWd5cHRcIiBjb21wb25lbnQ9e0NvdW50cnlDaGF0fSAvPlxuICAgICAgPFJvdXRlIHBhdGg9XCIvc2F1ZGlcIiBjb21wb25lbnQ9e0NvdW50cnlDaGF0fSAvPlxuICAgICAgPFJvdXRlIHBhdGg9XCIvYWxnZXJpYVwiIGNvbXBvbmVudD17Q291bnRyeUNoYXR9IC8+XG4gICAgICA8Um91dGUgcGF0aD1cIi9iYWhyYWluXCIgY29tcG9uZW50PXtDb3VudHJ5Q2hhdH0gLz5cbiAgICAgIDxSb3V0ZSBwYXRoPVwiL3VhZVwiIGNvbXBvbmVudD17Q291bnRyeUNoYXR9IC8+XG4gICAgICA8Um91dGUgcGF0aD1cIi9qb3JkYW5cIiBjb21wb25lbnQ9e0NvdW50cnlDaGF0fSAvPlxuICAgICAgPFJvdXRlIHBhdGg9XCIva3V3YWl0XCIgY29tcG9uZW50PXtDb3VudHJ5Q2hhdH0gLz5cbiAgICAgIDxSb3V0ZSBwYXRoPVwiL2xpYnlhXCIgY29tcG9uZW50PXtDb3VudHJ5Q2hhdH0gLz5cbiAgICAgIDxSb3V0ZSBwYXRoPVwiL3R1bmlzaWFcIiBjb21wb25lbnQ9e0NvdW50cnlDaGF0fSAvPlxuICAgICAgPFJvdXRlIHBhdGg9XCIvbW9yb2Njb1wiIGNvbXBvbmVudD17Q291bnRyeUNoYXR9IC8+XG4gICAgICA8Um91dGUgcGF0aD1cIi9zdWRhblwiIGNvbXBvbmVudD17Q291bnRyeUNoYXR9IC8+XG4gICAgICA8Um91dGUgcGF0aD1cIi9wYWxlc3RpbmVcIiBjb21wb25lbnQ9e0NvdW50cnlDaGF0fSAvPlxuICAgICAgPFJvdXRlIHBhdGg9XCIvcWF0YXJcIiBjb21wb25lbnQ9e0NvdW50cnlDaGF0fSAvPlxuICAgICAgPFJvdXRlIHBhdGg9XCIveWVtZW5cIiBjb21wb25lbnQ9e0NvdW50cnlDaGF0fSAvPlxuICAgICAgPFJvdXRlIHBhdGg9XCIvbGViYW5vblwiIGNvbXBvbmVudD17Q291bnRyeUNoYXR9IC8+XG4gICAgICA8Um91dGUgcGF0aD1cIi9zeXJpYVwiIGNvbXBvbmVudD17Q291bnRyeUNoYXR9IC8+XG4gICAgICA8Um91dGUgcGF0aD1cIi9pcmFxXCIgY29tcG9uZW50PXtDb3VudHJ5Q2hhdH0gLz5cbiAgICAgIDxSb3V0ZSBwYXRoPVwiL2NvbW9yb3NcIiBjb21wb25lbnQ9e0NvdW50cnlDaGF0fSAvPlxuICAgICAgPFJvdXRlIHBhdGg9XCIvZGppYm91dGlcIiBjb21wb25lbnQ9e0NvdW50cnlDaGF0fSAvPlxuXG4gICAgICA8Um91dGUgY29tcG9uZW50PXtDaGF0UGFnZX0gLz5cbiAgICA8L1N3aXRjaD5cbiAgKTtcbn1cblxuZnVuY3Rpb24gQXBwKCkge1xuICByZXR1cm4gKFxuICAgIDxRdWVyeUNsaWVudFByb3ZpZGVyIGNsaWVudD17cXVlcnlDbGllbnR9PlxuICAgICAgPFVzZXJQcm92aWRlcj5cbiAgICAgICAgPENvbXBvc2VyU3R5bGVQcm92aWRlcj5cbiAgICAgICAgICA8VG9vbHRpcFByb3ZpZGVyPlxuICAgICAgICAgICAgPFRvYXN0ZXIgLz5cbiAgICAgICAgICAgIDxhXG4gICAgICAgICAgICAgIGhyZWY9XCIjbWFpbi1jb250ZW50XCJcbiAgICAgICAgICAgICAgY2xhc3NOYW1lPVwic3Itb25seSBmb2N1czpub3Qtc3Itb25seSBmb2N1czphYnNvbHV0ZSBmb2N1czp0b3AtMiBmb2N1czpyaWdodC0yIGZvY3VzOmJnLWJsYWNrIGZvY3VzOnRleHQtd2hpdGUgZm9jdXM6cHgtMyBmb2N1czpweS0yIGZvY3VzOnJvdW5kZWRcIlxuICAgICAgICAgICAgPlxuICAgICAgICAgICAgICDYqtiu2LfZkCDYpdmE2Ykg2KfZhNmF2K3YqtmI2Ykg2KfZhNix2KbZitiz2YpcbiAgICAgICAgICAgIDwvYT5cbiAgICAgICAgICAgIDxtYWluIGlkPVwibWFpbi1jb250ZW50XCIgcm9sZT1cIm1haW5cIj5cbiAgICAgICAgICAgICAgPFN1c3BlbnNlIGZhbGxiYWNrPXtudWxsfT5cbiAgICAgICAgICAgICAgICA8Um91dGVyIC8+XG4gICAgICAgICAgICAgIDwvU3VzcGVuc2U+XG4gICAgICAgICAgICA8L21haW4+XG4gICAgICAgICAgPC9Ub29sdGlwUHJvdmlkZXI+XG4gICAgICAgIDwvQ29tcG9zZXJTdHlsZVByb3ZpZGVyPlxuICAgICAgPC9Vc2VyUHJvdmlkZXI+XG4gICAgPC9RdWVyeUNsaWVudFByb3ZpZGVyPlxuICApO1xufVxuXG5leHBvcnQgZGVmYXVsdCBBcHA7XG4iXSwiZmlsZSI6Ii92YXIvd3d3L2FiZC9jbGllbnQvc3JjL0FwcC50c3gifQ==
import { createHotContext as __vite__createHotContext } from "/@vite/client";import.meta.hot = __vite__createHotContext("/src/components/chat/WelcomeScreen.tsx");import __vite__cjsImport0_react_jsxDevRuntime from "/@fs/var/www/abd/node_modules/.vite/deps/react_jsx-dev-runtime.js?v=197578e1"; const jsxDEV = __vite__cjsImport0_react_jsxDevRuntime["jsxDEV"];
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
  window.$RefreshReg$ = RefreshRuntime.getRefreshReg("/var/www/abd/client/src/components/chat/WelcomeScreen.tsx");
  window.$RefreshSig$ = RefreshRuntime.createSignatureFunctionForTransform;
}
var _s = $RefreshSig$();
import { MessageCircle } from "/@fs/var/www/abd/node_modules/.vite/deps/lucide-react.js?v=197578e1";
import __vite__cjsImport4_react from "/@fs/var/www/abd/node_modules/.vite/deps/react.js?v=197578e1"; const useState = __vite__cjsImport4_react["useState"];
import { Button } from "/src/components/ui/button.tsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "/src/components/ui/dialog.tsx";
import { Input } from "/src/components/ui/input.tsx";
import { useIsMobile } from "/src/hooks/use-mobile.tsx";
import { useToast } from "/src/hooks/use-toast.ts";
import { apiRequest } from "/src/lib/queryClient.ts";
export default function WelcomeScreen({ onUserLogin }) {
  _s();
  const [showGuestModal, setShowGuestModal] = useState(false);
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [guestName, setGuestName] = useState("");
  const [guestGender, setGuestGender] = useState("male");
  const [memberName, setMemberName] = useState("");
  const [memberPassword, setMemberPassword] = useState("");
  const [registerName, setRegisterName] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [registerGender, setRegisterGender] = useState("male");
  const [registerAge, setRegisterAge] = useState("");
  const [registerCountry, setRegisterCountry] = useState("");
  const [registerStatus, setRegisterStatus] = useState("");
  const [registerRelation, setRegisterRelation] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const handleGuestLogin = async () => {
    if (!guestName.trim()) {
      toast({
        title: "خطأ",
        description: "يرجى إدخال اسم الزائر",
        variant: "destructive"
      });
      return;
    }
    setLoading(true);
    try {
      const data = await apiRequest("/api/auth/guest", {
        method: "POST",
        body: {
          username: guestName.trim(),
          gender: guestGender
        }
      });
      onUserLogin(data.user);
      setShowGuestModal(false);
    } catch (error) {
      toast({
        title: "خطأ",
        description: error.message || "حدث خطأ في تسجيل الدخول",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  const handleMemberLogin = async () => {
    if (!memberName.trim() || !memberPassword.trim()) {
      toast({
        title: "خطأ",
        description: "يرجى إدخال اسم المستخدم/البريد وكلمة المرور",
        variant: "destructive"
      });
      return;
    }
    setLoading(true);
    try {
      const data = await apiRequest("/api/auth/member", {
        method: "POST",
        body: {
          identifier: memberName.trim(),
          password: memberPassword.trim()
        }
      });
      onUserLogin(data.user);
      setShowMemberModal(false);
    } catch (error) {
      toast({
        title: "خطأ",
        description: error.message || "حدث خطأ في تسجيل الدخول",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  const handleRegister = async () => {
    if (!registerName.trim() || !registerPassword.trim() || !confirmPassword.trim()) {
      toast({
        title: "خطأ",
        description: "يرجى ملء جميع الحقول المطلوبة",
        variant: "destructive"
      });
      return;
    }
    if (registerPassword !== confirmPassword) {
      toast({
        title: "خطأ",
        description: "كلمات المرور غير متطابقة",
        variant: "destructive"
      });
      return;
    }
    if (registerPassword.length < 6) {
      toast({
        title: "خطأ",
        description: "كلمة المرور يجب أن تكون 6 أحرف على الأقل",
        variant: "destructive"
      });
      return;
    }
    if (registerAge && (parseInt(registerAge) < 18 || parseInt(registerAge) > 100)) {
      toast({
        title: "خطأ",
        description: "العمر يجب أن يكون بين 18 و 100 سنة",
        variant: "destructive"
      });
      return;
    }
    setLoading(true);
    try {
      const data = await apiRequest("/api/auth/register", {
        method: "POST",
        body: {
          username: registerName.trim(),
          password: registerPassword.trim(),
          confirmPassword: confirmPassword.trim(),
          gender: registerGender,
          age: registerAge ? parseInt(registerAge) : void 0,
          country: registerCountry.trim() || void 0,
          status: registerStatus.trim() || void 0,
          relation: registerRelation.trim() || void 0
        }
      });
      toast({
        title: "نجح التسجيل",
        description: data.message
      });
      onUserLogin(data.user);
      setShowRegisterModal(false);
    } catch (error) {
      toast({
        title: "خطأ",
        description: error.message || "حدث خطأ في التسجيل",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  const handleGoogleLogin = () => {
    toast({
      title: "قريباً",
      description: "🔄 جاري تطوير خدمة تسجيل الدخول بـ Google"
    });
  };
  return /* @__PURE__ */ jsxDEV("div", { className: "min-h-screen", children: [
    /* @__PURE__ */ jsxDEV("div", { className: "bg-gray-900 text-white py-3 px-4", children: /* @__PURE__ */ jsxDEV("div", { className: "max-w-6xl mx-auto flex justify-between items-center", children: [
      /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-3 text-sm", children: [
        /* @__PURE__ */ jsxDEV("a", { href: "/privacy", className: "text-blue-400 hover:text-blue-300 transition-colors underline", children: "سياسة الخصوصية" }, void 0, false, {
          fileName: "/var/www/abd/client/src/components/chat/WelcomeScreen.tsx",
          lineNumber: 204,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV("span", { className: "text-gray-400", children: "|" }, void 0, false, {
          fileName: "/var/www/abd/client/src/components/chat/WelcomeScreen.tsx",
          lineNumber: 207,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV("a", { href: "/terms", className: "text-blue-400 hover:text-blue-300 transition-colors underline", children: "شروط الاستخدام" }, void 0, false, {
          fileName: "/var/www/abd/client/src/components/chat/WelcomeScreen.tsx",
          lineNumber: 208,
          columnNumber: 13
        }, this)
      ] }, void 0, true, {
        fileName: "/var/www/abd/client/src/components/chat/WelcomeScreen.tsx",
        lineNumber: 203,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-2 cursor-default select-none", children: [
        /* @__PURE__ */ jsxDEV(MessageCircle, { className: "w-5 h-5", style: { color: "#667eea" } }, void 0, false, {
          fileName: "/var/www/abd/client/src/components/chat/WelcomeScreen.tsx",
          lineNumber: 215,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV("div", { className: "text-xl font-bold whitespace-nowrap", style: { color: "#ffffff" }, children: [
          "Arabic",
          /* @__PURE__ */ jsxDEV("span", { style: { color: "#667eea" }, children: "Chat" }, void 0, false, {
            fileName: "/var/www/abd/client/src/components/chat/WelcomeScreen.tsx",
            lineNumber: 217,
            columnNumber: 21
          }, this)
        ] }, void 0, true, {
          fileName: "/var/www/abd/client/src/components/chat/WelcomeScreen.tsx",
          lineNumber: 216,
          columnNumber: 13
        }, this)
      ] }, void 0, true, {
        fileName: "/var/www/abd/client/src/components/chat/WelcomeScreen.tsx",
        lineNumber: 214,
        columnNumber: 11
      }, this)
    ] }, void 0, true, {
      fileName: "/var/www/abd/client/src/components/chat/WelcomeScreen.tsx",
      lineNumber: 201,
      columnNumber: 9
    }, this) }, void 0, false, {
      fileName: "/var/www/abd/client/src/components/chat/WelcomeScreen.tsx",
      lineNumber: 200,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(
      "div",
      {
        className: `min-h-[calc(100dvh-60px)] flex flex-col justify-center items-center welcome-gradient relative overflow-hidden ${isMobile ? "px-4" : ""}`,
        style: { minHeight: "calc(100dvh - 60px)" },
        children: [
          /* @__PURE__ */ jsxDEV("div", { className: "absolute inset-0 overflow-hidden pointer-events-none", children: [
            /* @__PURE__ */ jsxDEV("div", { className: "absolute -top-1/2 -left-1/2 w-[150%] h-[150%] bg-gradient-radial from-blue-500/20 to-transparent rounded-full blur-3xl animate-pulse" }, void 0, false, {
              fileName: "/var/www/abd/client/src/components/chat/WelcomeScreen.tsx",
              lineNumber: 229,
              columnNumber: 11
            }, this),
            /* @__PURE__ */ jsxDEV("div", { className: "absolute -bottom-1/2 -right-1/2 w-[150%] h-[150%] bg-gradient-radial from-purple-500/20 to-transparent rounded-full blur-3xl animate-pulse", style: { animationDelay: "2s" } }, void 0, false, {
              fileName: "/var/www/abd/client/src/components/chat/WelcomeScreen.tsx",
              lineNumber: 230,
              columnNumber: 11
            }, this),
            /* @__PURE__ */ jsxDEV("div", { className: "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-gradient-radial from-cyan-500/10 to-transparent rounded-full blur-3xl animate-pulse", style: { animationDelay: "4s" } }, void 0, false, {
              fileName: "/var/www/abd/client/src/components/chat/WelcomeScreen.tsx",
              lineNumber: 231,
              columnNumber: 11
            }, this)
          ] }, void 0, true, {
            fileName: "/var/www/abd/client/src/components/chat/WelcomeScreen.tsx",
            lineNumber: 228,
            columnNumber: 9
          }, this),
          /* @__PURE__ */ jsxDEV("div", { className: "text-center animate-slide-up relative z-10", children: [
            /* @__PURE__ */ jsxDEV("div", { className: "mb-10", children: [
              /* @__PURE__ */ jsxDEV("div", { className: "text-6xl sm:text-7xl mb-6 animate-pulse-slow modern-float", children: "💬" }, void 0, false, {
                fileName: "/var/www/abd/client/src/components/chat/WelcomeScreen.tsx",
                lineNumber: 236,
                columnNumber: 13
              }, this),
              /* @__PURE__ */ jsxDEV("h1", { className: "text-2xl sm:text-3xl font-bold mb-6 text-blue-600", children: "دردشة عربية | شات عربي | تعارف بدون تسجيل أو اشتراك مجانًا" }, void 0, false, {
                fileName: "/var/www/abd/client/src/components/chat/WelcomeScreen.tsx",
                lineNumber: 237,
                columnNumber: 13
              }, this),
              /* @__PURE__ */ jsxDEV("p", { className: "text-2xl text-muted-foreground mb-10 font-light", children: "منصة التواصل العربية الأولى" }, void 0, false, {
                fileName: "/var/www/abd/client/src/components/chat/WelcomeScreen.tsx",
                lineNumber: 240,
                columnNumber: 13
              }, this)
            ] }, void 0, true, {
              fileName: "/var/www/abd/client/src/components/chat/WelcomeScreen.tsx",
              lineNumber: 235,
              columnNumber: 11
            }, this),
            /* @__PURE__ */ jsxDEV(
              "div",
              {
                className: `flex ${isMobile ? "welcome-login-buttons" : "flex-col sm:flex-row"} gap-3 sm:gap-4 justify-center items-center px-3`,
                children: [
                  /* @__PURE__ */ jsxDEV(
                    Button,
                    {
                      className: `modern-button btn-success text-white font-semibold py-4 px-10 rounded-2xl shadow-xl flex items-center gap-3 mobile-touch-button hover-glow ${isMobile ? "w-full justify-center" : ""}`,
                      onClick: () => setShowGuestModal(true),
                      children: [
                        /* @__PURE__ */ jsxDEV("span", { className: "text-2xl", children: "👤" }, void 0, false, {
                          fileName: "/var/www/abd/client/src/components/chat/WelcomeScreen.tsx",
                          lineNumber: 250,
                          columnNumber: 13
                        }, this),
                        /* @__PURE__ */ jsxDEV("span", { className: "text-lg", children: "دخول كزائر" }, void 0, false, {
                          fileName: "/var/www/abd/client/src/components/chat/WelcomeScreen.tsx",
                          lineNumber: 251,
                          columnNumber: 13
                        }, this)
                      ]
                    },
                    void 0,
                    true,
                    {
                      fileName: "/var/www/abd/client/src/components/chat/WelcomeScreen.tsx",
                      lineNumber: 246,
                      columnNumber: 11
                    },
                    this
                  ),
                  /* @__PURE__ */ jsxDEV(
                    Button,
                    {
                      className: `modern-button btn-primary text-white font-semibold py-4 px-10 rounded-2xl shadow-xl flex items-center gap-3 mobile-touch-button hover-glow ${isMobile ? "w-full justify-center" : ""}`,
                      onClick: () => setShowMemberModal(true),
                      children: [
                        /* @__PURE__ */ jsxDEV("span", { className: "text-2xl", children: "✅" }, void 0, false, {
                          fileName: "/var/www/abd/client/src/components/chat/WelcomeScreen.tsx",
                          lineNumber: 258,
                          columnNumber: 13
                        }, this),
                        /* @__PURE__ */ jsxDEV("span", { className: "text-lg", children: "دخول كعضو" }, void 0, false, {
                          fileName: "/var/www/abd/client/src/components/chat/WelcomeScreen.tsx",
                          lineNumber: 259,
                          columnNumber: 13
                        }, this)
                      ]
                    },
                    void 0,
                    true,
                    {
                      fileName: "/var/www/abd/client/src/components/chat/WelcomeScreen.tsx",
                      lineNumber: 254,
                      columnNumber: 11
                    },
                    this
                  ),
                  /* @__PURE__ */ jsxDEV(
                    Button,
                    {
                      className: `modern-button bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold py-4 px-10 rounded-2xl shadow-xl flex items-center gap-3 transition-all duration-300 mobile-touch-button hover-glow ${isMobile ? "w-full justify-center" : ""}`,
                      onClick: () => setShowRegisterModal(true),
                      children: [
                        /* @__PURE__ */ jsxDEV("span", { children: "📝" }, void 0, false, {
                          fileName: "/var/www/abd/client/src/components/chat/WelcomeScreen.tsx",
                          lineNumber: 266,
                          columnNumber: 13
                        }, this),
                        "تسجيل عضوية جديدة"
                      ]
                    },
                    void 0,
                    true,
                    {
                      fileName: "/var/www/abd/client/src/components/chat/WelcomeScreen.tsx",
                      lineNumber: 262,
                      columnNumber: 11
                    },
                    this
                  ),
                  /* @__PURE__ */ jsxDEV(
                    Button,
                    {
                      className: `btn-danger text-white font-semibold py-3 px-8 rounded-xl shadow-lg flex items-center gap-3 mobile-touch-button ${isMobile ? "w-full justify-center" : ""}`,
                      onClick: handleGoogleLogin,
                      children: [
                        /* @__PURE__ */ jsxDEV("span", { children: "🔐" }, void 0, false, {
                          fileName: "/var/www/abd/client/src/components/chat/WelcomeScreen.tsx",
                          lineNumber: 274,
                          columnNumber: 13
                        }, this),
                        "دخول بـ Google"
                      ]
                    },
                    void 0,
                    true,
                    {
                      fileName: "/var/www/abd/client/src/components/chat/WelcomeScreen.tsx",
                      lineNumber: 270,
                      columnNumber: 11
                    },
                    this
                  )
                ]
              },
              void 0,
              true,
              {
                fileName: "/var/www/abd/client/src/components/chat/WelcomeScreen.tsx",
                lineNumber: 243,
                columnNumber: 9
              },
              this
            )
          ] }, void 0, true, {
            fileName: "/var/www/abd/client/src/components/chat/WelcomeScreen.tsx",
            lineNumber: 234,
            columnNumber: 9
          }, this)
        ]
      },
      void 0,
      true,
      {
        fileName: "/var/www/abd/client/src/components/chat/WelcomeScreen.tsx",
        lineNumber: 223,
        columnNumber: 7
      },
      this
    ),
    /* @__PURE__ */ jsxDEV(Dialog, { open: showGuestModal, onOpenChange: setShowGuestModal, children: /* @__PURE__ */ jsxDEV(DialogContent, { className: "glass-effect border border-border animate-fade-in shadow-2xl", children: [
      /* @__PURE__ */ jsxDEV(DialogHeader, { children: /* @__PURE__ */ jsxDEV(DialogTitle, { className: "text-center text-3xl font-bold gradient-text flex items-center justify-center gap-3 mb-2", children: [
        /* @__PURE__ */ jsxDEV("span", { className: "text-4xl", children: "📝" }, void 0, false, {
          fileName: "/var/www/abd/client/src/components/chat/WelcomeScreen.tsx",
          lineNumber: 288,
          columnNumber: 15
        }, this),
        "أدخل اسم الزائر"
      ] }, void 0, true, {
        fileName: "/var/www/abd/client/src/components/chat/WelcomeScreen.tsx",
        lineNumber: 287,
        columnNumber: 13
      }, this) }, void 0, false, {
        fileName: "/var/www/abd/client/src/components/chat/WelcomeScreen.tsx",
        lineNumber: 286,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "space-y-4", children: [
        /* @__PURE__ */ jsxDEV(
          Input,
          {
            value: guestName,
            onChange: (e) => setGuestName(e.target.value.slice(0, 14)),
            placeholder: "مثال: زائر_2025",
            className: "modern-input text-white",
            maxLength: 14,
            onKeyPress: (e) => e.key === "Enter" && handleGuestLogin()
          },
          void 0,
          false,
          {
            fileName: "/var/www/abd/client/src/components/chat/WelcomeScreen.tsx",
            lineNumber: 293,
            columnNumber: 13
          },
          this
        ),
        /* @__PURE__ */ jsxDEV("div", { className: "space-y-2", children: [
          /* @__PURE__ */ jsxDEV("label", { className: "text-white text-sm font-medium", children: "الجنس:" }, void 0, false, {
            fileName: "/var/www/abd/client/src/components/chat/WelcomeScreen.tsx",
            lineNumber: 302,
            columnNumber: 15
          }, this),
          /* @__PURE__ */ jsxDEV("div", { className: "flex gap-4", children: [
            /* @__PURE__ */ jsxDEV("label", { className: "flex items-center gap-2 text-white cursor-pointer", children: [
              /* @__PURE__ */ jsxDEV(
                "input",
                {
                  type: "radio",
                  name: "guestGender",
                  value: "male",
                  checked: guestGender === "male",
                  onChange: (e) => setGuestGender(e.target.value),
                  className: "text-blue-500"
                },
                void 0,
                false,
                {
                  fileName: "/var/www/abd/client/src/components/chat/WelcomeScreen.tsx",
                  lineNumber: 305,
                  columnNumber: 19
                },
                this
              ),
              "🧑 ذكر"
            ] }, void 0, true, {
              fileName: "/var/www/abd/client/src/components/chat/WelcomeScreen.tsx",
              lineNumber: 304,
              columnNumber: 17
            }, this),
            /* @__PURE__ */ jsxDEV("label", { className: "flex items-center gap-2 text-white cursor-pointer", children: [
              /* @__PURE__ */ jsxDEV(
                "input",
                {
                  type: "radio",
                  name: "guestGender",
                  value: "female",
                  checked: guestGender === "female",
                  onChange: (e) => setGuestGender(e.target.value),
                  className: "text-pink-500"
                },
                void 0,
                false,
                {
                  fileName: "/var/www/abd/client/src/components/chat/WelcomeScreen.tsx",
                  lineNumber: 316,
                  columnNumber: 19
                },
                this
              ),
              "👩 أنثى"
            ] }, void 0, true, {
              fileName: "/var/www/abd/client/src/components/chat/WelcomeScreen.tsx",
              lineNumber: 315,
              columnNumber: 17
            }, this)
          ] }, void 0, true, {
            fileName: "/var/www/abd/client/src/components/chat/WelcomeScreen.tsx",
            lineNumber: 303,
            columnNumber: 15
          }, this)
        ] }, void 0, true, {
          fileName: "/var/www/abd/client/src/components/chat/WelcomeScreen.tsx",
          lineNumber: 301,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV(
          Button,
          {
            onClick: handleGuestLogin,
            disabled: loading,
            className: "btn-success w-full text-white px-6 py-3 rounded-xl font-semibold",
            children: [
              /* @__PURE__ */ jsxDEV("span", { className: "ml-2", children: "🚀" }, void 0, false, {
                fileName: "/var/www/abd/client/src/components/chat/WelcomeScreen.tsx",
                lineNumber: 333,
                columnNumber: 15
              }, this),
              loading ? "جاري الدخول..." : "دخول الآن"
            ]
          },
          void 0,
          true,
          {
            fileName: "/var/www/abd/client/src/components/chat/WelcomeScreen.tsx",
            lineNumber: 328,
            columnNumber: 13
          },
          this
        )
      ] }, void 0, true, {
        fileName: "/var/www/abd/client/src/components/chat/WelcomeScreen.tsx",
        lineNumber: 292,
        columnNumber: 11
      }, this)
    ] }, void 0, true, {
      fileName: "/var/www/abd/client/src/components/chat/WelcomeScreen.tsx",
      lineNumber: 285,
      columnNumber: 9
    }, this) }, void 0, false, {
      fileName: "/var/www/abd/client/src/components/chat/WelcomeScreen.tsx",
      lineNumber: 284,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("div", { className: "w-full space-y-0", children: [
      /* @__PURE__ */ jsxDEV("div", { className: "bg-pink-500 text-white p-8 text-center", children: [
        /* @__PURE__ */ jsxDEV("h2", { className: "text-3xl font-bold mb-4", children: "أهلاً بك في شات كل العرب" }, void 0, false, {
          fileName: "/var/www/abd/client/src/components/chat/WelcomeScreen.tsx",
          lineNumber: 344,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV("p", { className: "text-lg leading-relaxed max-w-4xl mx-auto", children: "انضم الآن إلى افضل مجتمع دردشة عربية مجانية. تواصل مع شباب وصبايا من مختلف الدول، وابدأ تكوين صداقات حقيقية في أجواء ممتعة وآمنة." }, void 0, false, {
          fileName: "/var/www/abd/client/src/components/chat/WelcomeScreen.tsx",
          lineNumber: 345,
          columnNumber: 11
        }, this)
      ] }, void 0, true, {
        fileName: "/var/www/abd/client/src/components/chat/WelcomeScreen.tsx",
        lineNumber: 343,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "bg-blue-600 text-white p-8", children: [
        /* @__PURE__ */ jsxDEV("h2", { className: "text-3xl font-bold mb-6 text-center", children: "🎁 ما الذي ستحصل عليه فعلاً؟" }, void 0, false, {
          fileName: "/var/www/abd/client/src/components/chat/WelcomeScreen.tsx",
          lineNumber: 352,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV("div", { className: "grid md:grid-cols-2 gap-4 max-w-4xl mx-auto text-right", children: [
          /* @__PURE__ */ jsxDEV("ul", { className: "space-y-3", children: [
            /* @__PURE__ */ jsxDEV("li", { className: "flex items-start gap-2", children: [
              /* @__PURE__ */ jsxDEV("span", { children: "•" }, void 0, false, {
                fileName: "/var/www/abd/client/src/components/chat/WelcomeScreen.tsx",
                lineNumber: 356,
                columnNumber: 17
              }, this),
              /* @__PURE__ */ jsxDEV("span", { children: "تغيير نوع الخط واللون و الحجم" }, void 0, false, {
                fileName: "/var/www/abd/client/src/components/chat/WelcomeScreen.tsx",
                lineNumber: 357,
                columnNumber: 17
              }, this)
            ] }, void 0, true, {
              fileName: "/var/www/abd/client/src/components/chat/WelcomeScreen.tsx",
              lineNumber: 355,
              columnNumber: 15
            }, this),
            /* @__PURE__ */ jsxDEV("li", { className: "flex items-start gap-2", children: [
              /* @__PURE__ */ jsxDEV("span", { children: "•" }, void 0, false, {
                fileName: "/var/www/abd/client/src/components/chat/WelcomeScreen.tsx",
                lineNumber: 360,
                columnNumber: 17
              }, this),
              /* @__PURE__ */ jsxDEV("span", { children: "إرسال رسائل كتابية خاصة و عامة غير محدودة" }, void 0, false, {
                fileName: "/var/www/abd/client/src/components/chat/WelcomeScreen.tsx",
                lineNumber: 361,
                columnNumber: 17
              }, this)
            ] }, void 0, true, {
              fileName: "/var/www/abd/client/src/components/chat/WelcomeScreen.tsx",
              lineNumber: 359,
              columnNumber: 15
            }, this),
            /* @__PURE__ */ jsxDEV("li", { className: "flex items-start gap-2", children: [
              /* @__PURE__ */ jsxDEV("span", { children: "•" }, void 0, false, {
                fileName: "/var/www/abd/client/src/components/chat/WelcomeScreen.tsx",
                lineNumber: 364,
                columnNumber: 17
              }, this),
              /* @__PURE__ */ jsxDEV("span", { children: "إرسال صور من المعرض أو من كاميرا التصوير في المحادثات العامة الخاصة" }, void 0, false, {
                fileName: "/var/www/abd/client/src/components/chat/WelcomeScreen.tsx",
                lineNumber: 365,
                columnNumber: 17
              }, this)
            ] }, void 0, true, {
              fileName: "/var/www/abd/client/src/components/chat/WelcomeScreen.tsx",
              lineNumber: 363,
              columnNumber: 15
            }, this),
            /* @__PURE__ */ jsxDEV("li", { className: "flex items-start gap-2", children: [
              /* @__PURE__ */ jsxDEV("span", { children: "•" }, void 0, false, {
                fileName: "/var/www/abd/client/src/components/chat/WelcomeScreen.tsx",
                lineNumber: 368,
                columnNumber: 17
              }, this),
              /* @__PURE__ */ jsxDEV("span", { children: "إرسال رموز سمايلي في الغرف العامة والمحادثات الخاصة" }, void 0, false, {
                fileName: "/var/www/abd/client/src/components/chat/WelcomeScreen.tsx",
                lineNumber: 369,
                columnNumber: 17
              }, this)
            ] }, void 0, true, {
              fileName: "/var/www/abd/client/src/components/chat/WelcomeScreen.tsx",
              lineNumber: 367,
              columnNumber: 15
            }, this),
            /* @__PURE__ */ jsxDEV("li", { className: "flex items-start gap-2", children: [
              /* @__PURE__ */ jsxDEV("span", { children: "•" }, void 0, false, {
                fileName: "/var/www/abd/client/src/components/chat/WelcomeScreen.tsx",
                lineNumber: 372,
                columnNumber: 17
              }, this),
              /* @__PURE__ */ jsxDEV("span", { children: "تغيير أيقونة أو صورة المتحدث الشخصية في الدردشة" }, void 0, false, {
                fileName: "/var/www/abd/client/src/components/chat/WelcomeScreen.tsx",
                lineNumber: 373,
                columnNumber: 17
              }, this)
            ] }, void 0, true, {
              fileName: "/var/www/abd/client/src/components/chat/WelcomeScreen.tsx",
              lineNumber: 371,
              columnNumber: 15
            }, this)
          ] }, void 0, true, {
            fileName: "/var/www/abd/client/src/components/chat/WelcomeScreen.tsx",
            lineNumber: 354,
            columnNumber: 13
          }, this),
          /* @__PURE__ */ jsxDEV("ul", { className: "space-y-3", children: [
            /* @__PURE__ */ jsxDEV("li", { className: "flex items-start gap-2", children: [
              /* @__PURE__ */ jsxDEV("span", { children: "•" }, void 0, false, {
                fileName: "/var/www/abd/client/src/components/chat/WelcomeScreen.tsx",
                lineNumber: 378,
                columnNumber: 17
              }, this),
              /* @__PURE__ */ jsxDEV("span", { children: "يمكن تجاهل الرسائل الخاصة و العامة من شخص معين" }, void 0, false, {
                fileName: "/var/www/abd/client/src/components/chat/WelcomeScreen.tsx",
                lineNumber: 379,
                columnNumber: 17
              }, this)
            ] }, void 0, true, {
              fileName: "/var/www/abd/client/src/components/chat/WelcomeScreen.tsx",
              lineNumber: 377,
              columnNumber: 15
            }, this),
            /* @__PURE__ */ jsxDEV("li", { className: "flex items-start gap-2", children: [
              /* @__PURE__ */ jsxDEV("span", { children: "•" }, void 0, false, {
                fileName: "/var/www/abd/client/src/components/chat/WelcomeScreen.tsx",
                lineNumber: 382,
                columnNumber: 17
              }, this),
              /* @__PURE__ */ jsxDEV("span", { children: "منع استقبال رسائل خاصة من الأشخاص" }, void 0, false, {
                fileName: "/var/www/abd/client/src/components/chat/WelcomeScreen.tsx",
                lineNumber: 383,
                columnNumber: 17
              }, this)
            ] }, void 0, true, {
              fileName: "/var/www/abd/client/src/components/chat/WelcomeScreen.tsx",
              lineNumber: 381,
              columnNumber: 15
            }, this),
            /* @__PURE__ */ jsxDEV("li", { className: "flex items-start gap-2", children: [
              /* @__PURE__ */ jsxDEV("span", { children: "•" }, void 0, false, {
                fileName: "/var/www/abd/client/src/components/chat/WelcomeScreen.tsx",
                lineNumber: 386,
                columnNumber: 17
              }, this),
              /* @__PURE__ */ jsxDEV("span", { children: "البحث عن اسم حيف أو مستخدم في قائمة المتواجدين في الغرفة" }, void 0, false, {
                fileName: "/var/www/abd/client/src/components/chat/WelcomeScreen.tsx",
                lineNumber: 387,
                columnNumber: 17
              }, this)
            ] }, void 0, true, {
              fileName: "/var/www/abd/client/src/components/chat/WelcomeScreen.tsx",
              lineNumber: 385,
              columnNumber: 15
            }, this),
            /* @__PURE__ */ jsxDEV("li", { className: "flex items-start gap-2", children: [
              /* @__PURE__ */ jsxDEV("span", { children: "•" }, void 0, false, {
                fileName: "/var/www/abd/client/src/components/chat/WelcomeScreen.tsx",
                lineNumber: 390,
                columnNumber: 17
              }, this),
              /* @__PURE__ */ jsxDEV("span", { children: "تغيير لون الاسم في قائمة المستخدمين إلى ما يناسبك" }, void 0, false, {
                fileName: "/var/www/abd/client/src/components/chat/WelcomeScreen.tsx",
                lineNumber: 391,
                columnNumber: 17
              }, this)
            ] }, void 0, true, {
              fileName: "/var/www/abd/client/src/components/chat/WelcomeScreen.tsx",
              lineNumber: 389,
              columnNumber: 15
            }, this),
            /* @__PURE__ */ jsxDEV("li", { className: "flex items-start gap-2", children: [
              /* @__PURE__ */ jsxDEV("span", { children: "•" }, void 0, false, {
                fileName: "/var/www/abd/client/src/components/chat/WelcomeScreen.tsx",
                lineNumber: 394,
                columnNumber: 17
              }, this),
              /* @__PURE__ */ jsxDEV("span", { children: "تغيير لون خلفية الرسائل النصية المرسلة في الغرف والمحادثة الخاصة" }, void 0, false, {
                fileName: "/var/www/abd/client/src/components/chat/WelcomeScreen.tsx",
                lineNumber: 395,
                columnNumber: 17
              }, this)
            ] }, void 0, true, {
              fileName: "/var/www/abd/client/src/components/chat/WelcomeScreen.tsx",
              lineNumber: 393,
              columnNumber: 15
            }, this),
            /* @__PURE__ */ jsxDEV("li", { className: "flex items-start gap-2", children: [
              /* @__PURE__ */ jsxDEV("span", { children: "•" }, void 0, false, {
                fileName: "/var/www/abd/client/src/components/chat/WelcomeScreen.tsx",
                lineNumber: 398,
                columnNumber: 17
              }, this),
              /* @__PURE__ */ jsxDEV("span", { children: "عضوية أشراف تتضمن مرتبة الزوار من طرد و كتم عام و يحصل صاحب العضوية على لون مميز" }, void 0, false, {
                fileName: "/var/www/abd/client/src/components/chat/WelcomeScreen.tsx",
                lineNumber: 399,
                columnNumber: 17
              }, this)
            ] }, void 0, true, {
              fileName: "/var/www/abd/client/src/components/chat/WelcomeScreen.tsx",
              lineNumber: 397,
              columnNumber: 15
            }, this)
          ] }, void 0, true, {
            fileName: "/var/www/abd/client/src/components/chat/WelcomeScreen.tsx",
            lineNumber: 376,
            columnNumber: 13
          }, this)
        ] }, void 0, true, {
          fileName: "/var/www/abd/client/src/components/chat/WelcomeScreen.tsx",
          lineNumber: 353,
          columnNumber: 11
        }, this)
      ] }, void 0, true, {
        fileName: "/var/www/abd/client/src/components/chat/WelcomeScreen.tsx",
        lineNumber: 351,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "bg-red-600 text-white p-8 text-center", children: [
        /* @__PURE__ */ jsxDEV("h2", { className: "text-3xl font-bold mb-4", children: "🚫 كيفية تجاهل الأشخاص المزعجين؟" }, void 0, false, {
          fileName: "/var/www/abd/client/src/components/chat/WelcomeScreen.tsx",
          lineNumber: 407,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV("p", { className: "text-lg leading-relaxed max-w-4xl mx-auto", children: 'يمكن تجاهل الرسائل الخاصة والعامة من شخص معين عن طريق فتح الملف الشخصي الخاص بالعضو المزعج والضغط علامة ❌ "تجاهل" وهكذا الأمر يحول الدردشة متنفقة' }, void 0, false, {
          fileName: "/var/www/abd/client/src/components/chat/WelcomeScreen.tsx",
          lineNumber: 408,
          columnNumber: 11
        }, this)
      ] }, void 0, true, {
        fileName: "/var/www/abd/client/src/components/chat/WelcomeScreen.tsx",
        lineNumber: 406,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "bg-green-500 text-white p-8 text-center", children: [
        /* @__PURE__ */ jsxDEV("h2", { className: "text-3xl font-bold mb-4", children: "✅ ماذا على أن أفعل لتجنب الطرد من الشات؟" }, void 0, false, {
          fileName: "/var/www/abd/client/src/components/chat/WelcomeScreen.tsx",
          lineNumber: 415,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV("div", { className: "max-w-4xl mx-auto space-y-2 text-lg", children: [
          /* @__PURE__ */ jsxDEV("p", { children: "يجب عليك تجنب الدخول بأسماء غير لائقة" }, void 0, false, {
            fileName: "/var/www/abd/client/src/components/chat/WelcomeScreen.tsx",
            lineNumber: 417,
            columnNumber: 13
          }, this),
          /* @__PURE__ */ jsxDEV("p", { children: 'احترام قوانين "شات عربي" والأشخاص داخل الدردشة' }, void 0, false, {
            fileName: "/var/www/abd/client/src/components/chat/WelcomeScreen.tsx",
            lineNumber: 418,
            columnNumber: 13
          }, this),
          /* @__PURE__ */ jsxDEV("p", { children: "عدم الإساءة لأحد الأشخاص أو لأي مذهب ديني" }, void 0, false, {
            fileName: "/var/www/abd/client/src/components/chat/WelcomeScreen.tsx",
            lineNumber: 419,
            columnNumber: 13
          }, this)
        ] }, void 0, true, {
          fileName: "/var/www/abd/client/src/components/chat/WelcomeScreen.tsx",
          lineNumber: 416,
          columnNumber: 11
        }, this)
      ] }, void 0, true, {
        fileName: "/var/www/abd/client/src/components/chat/WelcomeScreen.tsx",
        lineNumber: 414,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "bg-cyan-600 text-white p-8 text-center", children: [
        /* @__PURE__ */ jsxDEV("h2", { className: "text-3xl font-bold mb-4", children: "👤 الملف الشخصي" }, void 0, false, {
          fileName: "/var/www/abd/client/src/components/chat/WelcomeScreen.tsx",
          lineNumber: 425,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV("p", { className: "text-lg leading-relaxed max-w-4xl mx-auto", children: "يمكنك تعديل الملف الشخصي الخاص بك من أيقونة 👤 تعديل الجنس العمر الحالة والبلد وكلمة المرور وتفاصيل الحساب وغير ذلك الكثير" }, void 0, false, {
          fileName: "/var/www/abd/client/src/components/chat/WelcomeScreen.tsx",
          lineNumber: 426,
          columnNumber: 11
        }, this)
      ] }, void 0, true, {
        fileName: "/var/www/abd/client/src/components/chat/WelcomeScreen.tsx",
        lineNumber: 424,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "bg-purple-600 text-white p-8 text-center", children: [
        /* @__PURE__ */ jsxDEV("h2", { className: "text-3xl font-bold mb-4", children: "🎉 قبول / إضافة أصدقاء" }, void 0, false, {
          fileName: "/var/www/abd/client/src/components/chat/WelcomeScreen.tsx",
          lineNumber: 433,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV("p", { className: "text-lg leading-relaxed max-w-4xl mx-auto", children: 'يمكنك إضافة أصدقائك المفضلة الحالية يمكنك إضافة أصدقاء من الملف الشخصي للأعضاء عن طريق النقر على زر "إضافة صديق" في أعلى الملف الشخصي. يمكنك عرض قائمة لأصدقائك الحاليين عن طريق النقر 👥 على الرمز في أسفل الصفحة.' }, void 0, false, {
          fileName: "/var/www/abd/client/src/components/chat/WelcomeScreen.tsx",
          lineNumber: 434,
          columnNumber: 11
        }, this)
      ] }, void 0, true, {
        fileName: "/var/www/abd/client/src/components/chat/WelcomeScreen.tsx",
        lineNumber: 432,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "bg-teal-500 text-white p-8 text-center", children: [
        /* @__PURE__ */ jsxDEV("h2", { className: "text-3xl font-bold mb-4", children: "💬 الرسائل الخاصة" }, void 0, false, {
          fileName: "/var/www/abd/client/src/components/chat/WelcomeScreen.tsx",
          lineNumber: 441,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV("p", { className: "text-lg leading-relaxed max-w-4xl mx-auto", children: "يمكنك بدء محادثة خاصة أو محادثة جماعية مع الأشخاص." }, void 0, false, {
          fileName: "/var/www/abd/client/src/components/chat/WelcomeScreen.tsx",
          lineNumber: 442,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV("p", { className: "text-lg mt-4 leading-relaxed max-w-4xl mx-auto", children: "في القائمة العلوية من أيقونة 💬 يمكنك عرض القائمة الخاصة للنشطة الحالية وإنشاء خاص جديد وغيرها،يمكنك فتح محادثة خاصة مع مستخدم عن طريق النقر على الصورة الرمزية للعضو المرغوب في الدردشة أو باقر على اسم المستخدم الخاص به في قائمة المستخدمين" }, void 0, false, {
          fileName: "/var/www/abd/client/src/components/chat/WelcomeScreen.tsx",
          lineNumber: 445,
          columnNumber: 11
        }, this)
      ] }, void 0, true, {
        fileName: "/var/www/abd/client/src/components/chat/WelcomeScreen.tsx",
        lineNumber: 440,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "bg-gray-600 text-white p-8 text-center", children: [
        /* @__PURE__ */ jsxDEV("h2", { className: "text-3xl font-bold mb-4", children: "🔔 إشعارات الدردشة" }, void 0, false, {
          fileName: "/var/www/abd/client/src/components/chat/WelcomeScreen.tsx",
          lineNumber: 452,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV("p", { className: "text-lg leading-relaxed max-w-4xl mx-auto", children: "يمكنك عرض الإشعار الحالي خوار ما يحدث على حسابك يوجد إخطار غير مقروء في الأعلى ولونه مختلف" }, void 0, false, {
          fileName: "/var/www/abd/client/src/components/chat/WelcomeScreen.tsx",
          lineNumber: 453,
          columnNumber: 11
        }, this)
      ] }, void 0, true, {
        fileName: "/var/www/abd/client/src/components/chat/WelcomeScreen.tsx",
        lineNumber: 451,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "bg-red-700 text-white p-8 text-center", children: [
        /* @__PURE__ */ jsxDEV("h2", { className: "text-3xl font-bold mb-4", children: "📺 مشاركة فيديوهات اليوتيوب" }, void 0, false, {
          fileName: "/var/www/abd/client/src/components/chat/WelcomeScreen.tsx",
          lineNumber: 460,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV("p", { className: "text-lg leading-relaxed max-w-4xl mx-auto", children: "الآن يمكنك مشاركة فيديوهات اليوتيوب بسهولة مع أصدقائك والجميع داخل الشات. كل ما عليك هو إرسال رابط الفيديو ليظهر مباشرة للجميع ويشاركوه معك في نفس اللحظة." }, void 0, false, {
          fileName: "/var/www/abd/client/src/components/chat/WelcomeScreen.tsx",
          lineNumber: 461,
          columnNumber: 11
        }, this)
      ] }, void 0, true, {
        fileName: "/var/www/abd/client/src/components/chat/WelcomeScreen.tsx",
        lineNumber: 459,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "bg-indigo-700 text-white p-8 text-center", children: [
        /* @__PURE__ */ jsxDEV("h2", { className: "text-3xl font-bold mb-4", children: "🎧 اسمع صوتيات أصدقائك مباشرة من بروفايلهم!" }, void 0, false, {
          fileName: "/var/www/abd/client/src/components/chat/WelcomeScreen.tsx",
          lineNumber: 468,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV("p", { className: "text-lg leading-relaxed max-w-4xl mx-auto", children: "🔊 شغّل المقاطع الصوتية من الملف الشخصي بضغطة وحدة." }, void 0, false, {
          fileName: "/var/www/abd/client/src/components/chat/WelcomeScreen.tsx",
          lineNumber: 469,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV("p", { className: "text-lg mt-2 leading-relaxed max-w-4xl mx-auto", children: "🎵 ملفك الشخصي صار أمتع… أضف وشارك صوتياتك مع الجميع." }, void 0, false, {
          fileName: "/var/www/abd/client/src/components/chat/WelcomeScreen.tsx",
          lineNumber: 472,
          columnNumber: 11
        }, this)
      ] }, void 0, true, {
        fileName: "/var/www/abd/client/src/components/chat/WelcomeScreen.tsx",
        lineNumber: 467,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "bg-pink-600 text-white p-8 text-center", children: [
        /* @__PURE__ */ jsxDEV("h2", { className: "text-3xl font-bold mb-4", children: "📸 مشاركة الصور" }, void 0, false, {
          fileName: "/var/www/abd/client/src/components/chat/WelcomeScreen.tsx",
          lineNumber: 479,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV("p", { className: "text-lg leading-relaxed max-w-4xl mx-auto", children: "يمكنك مشاركة صور من الإنترنت أو من جهازك الشخصي مع جميع الأشخاص" }, void 0, false, {
          fileName: "/var/www/abd/client/src/components/chat/WelcomeScreen.tsx",
          lineNumber: 480,
          columnNumber: 11
        }, this)
      ] }, void 0, true, {
        fileName: "/var/www/abd/client/src/components/chat/WelcomeScreen.tsx",
        lineNumber: 478,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "bg-blue-700 text-white p-8 text-center", children: [
        /* @__PURE__ */ jsxDEV("h2", { className: "text-3xl font-bold mb-4", children: "📷 حائط اليوميات" }, void 0, false, {
          fileName: "/var/www/abd/client/src/components/chat/WelcomeScreen.tsx",
          lineNumber: 487,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV("p", { className: "text-lg leading-relaxed max-w-4xl mx-auto", children: "تستطيع نشر يومياتك على حائطك الخاص بك ومشاركتها مع أصدقائك" }, void 0, false, {
          fileName: "/var/www/abd/client/src/components/chat/WelcomeScreen.tsx",
          lineNumber: 488,
          columnNumber: 11
        }, this)
      ] }, void 0, true, {
        fileName: "/var/www/abd/client/src/components/chat/WelcomeScreen.tsx",
        lineNumber: 486,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "bg-red-800 text-white p-8 text-center", children: [
        /* @__PURE__ */ jsxDEV("h2", { className: "text-3xl font-bold mb-4", children: "🔒 الأمان والخصوصية" }, void 0, false, {
          fileName: "/var/www/abd/client/src/components/chat/WelcomeScreen.tsx",
          lineNumber: 495,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV("p", { className: "text-lg leading-relaxed max-w-4xl mx-auto", children: "في شات العرب نهتم بحمايتك أولاً. جميع بياناتك ومعلوماتك يتم تشفيرها ولا نشاركها مع أي طرف ثالث. المعلومات الوحيدة التي قد يراها الآخرون هي ما تختاره أنت بنفسك وتضيفه إلى ملفك الشخصي." }, void 0, false, {
          fileName: "/var/www/abd/client/src/components/chat/WelcomeScreen.tsx",
          lineNumber: 496,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV("p", { className: "text-lg mt-2 leading-relaxed max-w-4xl mx-auto", children: "أما أي رسائل، نصوص أو وسائط تقوم بمشاركتها مع الآخرين فهي تبقى تحت مسؤوليتك الشخصية. هدفنا أن نوفر لك بيئة آمنة، والاختيار دائمًا بين يديك." }, void 0, false, {
          fileName: "/var/www/abd/client/src/components/chat/WelcomeScreen.tsx",
          lineNumber: 499,
          columnNumber: 11
        }, this)
      ] }, void 0, true, {
        fileName: "/var/www/abd/client/src/components/chat/WelcomeScreen.tsx",
        lineNumber: 494,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "bg-blue-600 text-white p-8 text-center", children: [
        /* @__PURE__ */ jsxDEV("h2", { className: "text-3xl font-bold mb-6", children: "دردشة عربية للتقي بأصدقاء عرب جدد من مختلف أنحاء العالم واستمتع بالدردشة الجماعية أو بدء محادثة خاصة في موقع شات عربي تعارف بدون تسجيل أو اشتراك مجانًا" }, void 0, false, {
          fileName: "/var/www/abd/client/src/components/chat/WelcomeScreen.tsx",
          lineNumber: 506,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV("h3", { className: "text-2xl font-semibold mb-4", children: "غرف الدردشة" }, void 0, false, {
          fileName: "/var/www/abd/client/src/components/chat/WelcomeScreen.tsx",
          lineNumber: 507,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV("div", { className: "grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto mt-6", children: [
          /* @__PURE__ */ jsxDEV("div", { className: "space-y-2", children: [
            /* @__PURE__ */ jsxDEV("a", { href: "/watan", className: "block text-yellow-300 hover:text-yellow-200 transition-colors", children: "دردشه الوطن" }, void 0, false, {
              fileName: "/var/www/abd/client/src/components/chat/WelcomeScreen.tsx",
              lineNumber: 510,
              columnNumber: 15
            }, this),
            /* @__PURE__ */ jsxDEV("a", { href: "/algeria", className: "block text-yellow-300 hover:text-yellow-200 transition-colors", children: "شات الجزائر" }, void 0, false, {
              fileName: "/var/www/abd/client/src/components/chat/WelcomeScreen.tsx",
              lineNumber: 511,
              columnNumber: 15
            }, this),
            /* @__PURE__ */ jsxDEV("a", { href: "/bahrain", className: "block text-yellow-300 hover:text-yellow-200 transition-colors", children: "شات البحرين" }, void 0, false, {
              fileName: "/var/www/abd/client/src/components/chat/WelcomeScreen.tsx",
              lineNumber: 512,
              columnNumber: 15
            }, this),
            /* @__PURE__ */ jsxDEV("a", { href: "/uae", className: "block text-yellow-300 hover:text-yellow-200 transition-colors", children: "شات الإمارات" }, void 0, false, {
              fileName: "/var/www/abd/client/src/components/chat/WelcomeScreen.tsx",
              lineNumber: 513,
              columnNumber: 15
            }, this),
            /* @__PURE__ */ jsxDEV("a", { href: "/jordan", className: "block text-yellow-300 hover:text-yellow-200 transition-colors", children: "شات الأردن" }, void 0, false, {
              fileName: "/var/www/abd/client/src/components/chat/WelcomeScreen.tsx",
              lineNumber: 514,
              columnNumber: 15
            }, this),
            /* @__PURE__ */ jsxDEV("a", { href: "/kuwait", className: "block text-yellow-300 hover:text-yellow-200 transition-colors", children: "شات الكويت" }, void 0, false, {
              fileName: "/var/www/abd/client/src/components/chat/WelcomeScreen.tsx",
              lineNumber: 515,
              columnNumber: 15
            }, this)
          ] }, void 0, true, {
            fileName: "/var/www/abd/client/src/components/chat/WelcomeScreen.tsx",
            lineNumber: 509,
            columnNumber: 13
          }, this),
          /* @__PURE__ */ jsxDEV("div", { className: "space-y-2", children: [
            /* @__PURE__ */ jsxDEV("a", { href: "/libya", className: "block text-yellow-300 hover:text-yellow-200 transition-colors", children: "شات ليبيا" }, void 0, false, {
              fileName: "/var/www/abd/client/src/components/chat/WelcomeScreen.tsx",
              lineNumber: 518,
              columnNumber: 15
            }, this),
            /* @__PURE__ */ jsxDEV("a", { href: "/tunisia", className: "block text-yellow-300 hover:text-yellow-200 transition-colors", children: "شات تونس" }, void 0, false, {
              fileName: "/var/www/abd/client/src/components/chat/WelcomeScreen.tsx",
              lineNumber: 519,
              columnNumber: 15
            }, this),
            /* @__PURE__ */ jsxDEV("a", { href: "/morocco", className: "block text-yellow-300 hover:text-yellow-200 transition-colors", children: "شات المغرب" }, void 0, false, {
              fileName: "/var/www/abd/client/src/components/chat/WelcomeScreen.tsx",
              lineNumber: 520,
              columnNumber: 15
            }, this),
            /* @__PURE__ */ jsxDEV("a", { href: "/oman", className: "block text-yellow-300 hover:text-yellow-200 transition-colors", children: "شات عمان" }, void 0, false, {
              fileName: "/var/www/abd/client/src/components/chat/WelcomeScreen.tsx",
              lineNumber: 521,
              columnNumber: 15
            }, this),
            /* @__PURE__ */ jsxDEV("a", { href: "/sudan", className: "block text-yellow-300 hover:text-yellow-200 transition-colors", children: "شات السودان" }, void 0, false, {
              fileName: "/var/www/abd/client/src/components/chat/WelcomeScreen.tsx",
              lineNumber: 522,
              columnNumber: 15
            }, this)
          ] }, void 0, true, {
            fileName: "/var/www/abd/client/src/components/chat/WelcomeScreen.tsx",
            lineNumber: 517,
            columnNumber: 13
          }, this),
          /* @__PURE__ */ jsxDEV("div", { className: "space-y-2", children: [
            /* @__PURE__ */ jsxDEV("a", { href: "/palestine", className: "block text-yellow-300 hover:text-yellow-200 transition-colors", children: "شات فلسطين" }, void 0, false, {
              fileName: "/var/www/abd/client/src/components/chat/WelcomeScreen.tsx",
              lineNumber: 525,
              columnNumber: 15
            }, this),
            /* @__PURE__ */ jsxDEV("a", { href: "/qatar", className: "block text-yellow-300 hover:text-yellow-200 transition-colors", children: "شات قطر" }, void 0, false, {
              fileName: "/var/www/abd/client/src/components/chat/WelcomeScreen.tsx",
              lineNumber: 526,
              columnNumber: 15
            }, this),
            /* @__PURE__ */ jsxDEV("a", { href: "/comoros", className: "block text-yellow-300 hover:text-yellow-200 transition-colors", children: "شات جزر القمر" }, void 0, false, {
              fileName: "/var/www/abd/client/src/components/chat/WelcomeScreen.tsx",
              lineNumber: 527,
              columnNumber: 15
            }, this),
            /* @__PURE__ */ jsxDEV("a", { href: "/yemen", className: "block text-yellow-300 hover:text-yellow-200 transition-colors", children: "شات اليمن" }, void 0, false, {
              fileName: "/var/www/abd/client/src/components/chat/WelcomeScreen.tsx",
              lineNumber: 528,
              columnNumber: 15
            }, this),
            /* @__PURE__ */ jsxDEV("a", { href: "/djibouti", className: "block text-yellow-300 hover:text-yellow-200 transition-colors", children: "شات جيبوتي" }, void 0, false, {
              fileName: "/var/www/abd/client/src/components/chat/WelcomeScreen.tsx",
              lineNumber: 529,
              columnNumber: 15
            }, this)
          ] }, void 0, true, {
            fileName: "/var/www/abd/client/src/components/chat/WelcomeScreen.tsx",
            lineNumber: 524,
            columnNumber: 13
          }, this),
          /* @__PURE__ */ jsxDEV("div", { className: "space-y-2", children: [
            /* @__PURE__ */ jsxDEV("a", { href: "/egypt", className: "block text-yellow-300 hover:text-yellow-200 transition-colors", children: "شات مصر" }, void 0, false, {
              fileName: "/var/www/abd/client/src/components/chat/WelcomeScreen.tsx",
              lineNumber: 532,
              columnNumber: 15
            }, this),
            /* @__PURE__ */ jsxDEV("a", { href: "/saudi", className: "block text-yellow-300 hover:text-yellow-200 transition-colors", children: "شات السعودية" }, void 0, false, {
              fileName: "/var/www/abd/client/src/components/chat/WelcomeScreen.tsx",
              lineNumber: 533,
              columnNumber: 15
            }, this),
            /* @__PURE__ */ jsxDEV("a", { href: "/lebanon", className: "block text-yellow-300 hover:text-yellow-200 transition-colors", children: "شات لبنان" }, void 0, false, {
              fileName: "/var/www/abd/client/src/components/chat/WelcomeScreen.tsx",
              lineNumber: 534,
              columnNumber: 15
            }, this),
            /* @__PURE__ */ jsxDEV("a", { href: "/syria", className: "block text-yellow-300 hover:text-yellow-200 transition-colors", children: "شات سوريا" }, void 0, false, {
              fileName: "/var/www/abd/client/src/components/chat/WelcomeScreen.tsx",
              lineNumber: 535,
              columnNumber: 15
            }, this),
            /* @__PURE__ */ jsxDEV("a", { href: "/iraq", className: "block text-yellow-300 hover:text-yellow-200 transition-colors", children: "شات العراق" }, void 0, false, {
              fileName: "/var/www/abd/client/src/components/chat/WelcomeScreen.tsx",
              lineNumber: 536,
              columnNumber: 15
            }, this)
          ] }, void 0, true, {
            fileName: "/var/www/abd/client/src/components/chat/WelcomeScreen.tsx",
            lineNumber: 531,
            columnNumber: 13
          }, this)
        ] }, void 0, true, {
          fileName: "/var/www/abd/client/src/components/chat/WelcomeScreen.tsx",
          lineNumber: 508,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV("div", { className: "mt-8 space-y-2", children: [
          /* @__PURE__ */ jsxDEV("div", { className: "flex justify-center items-center gap-4 text-sm", children: [
            /* @__PURE__ */ jsxDEV("a", { href: "/privacy", className: "text-blue-400 hover:text-blue-300 transition-colors underline", children: "سياسة الخصوصية" }, void 0, false, {
              fileName: "/var/www/abd/client/src/components/chat/WelcomeScreen.tsx",
              lineNumber: 541,
              columnNumber: 15
            }, this),
            /* @__PURE__ */ jsxDEV("span", { className: "text-gray-400", children: "|" }, void 0, false, {
              fileName: "/var/www/abd/client/src/components/chat/WelcomeScreen.tsx",
              lineNumber: 544,
              columnNumber: 15
            }, this),
            /* @__PURE__ */ jsxDEV("a", { href: "/terms", className: "text-blue-400 hover:text-blue-300 transition-colors underline", children: "شروط الاستخدام" }, void 0, false, {
              fileName: "/var/www/abd/client/src/components/chat/WelcomeScreen.tsx",
              lineNumber: 545,
              columnNumber: 15
            }, this)
          ] }, void 0, true, {
            fileName: "/var/www/abd/client/src/components/chat/WelcomeScreen.tsx",
            lineNumber: 540,
            columnNumber: 13
          }, this),
          /* @__PURE__ */ jsxDEV("p", { className: "text-sm text-blue-300", children: "💬 انضم إلى شات عربي وتعرف على الجميع بسهولة ومن أي مكان بالعالم… بدون أي تسجيل." }, void 0, false, {
            fileName: "/var/www/abd/client/src/components/chat/WelcomeScreen.tsx",
            lineNumber: 549,
            columnNumber: 13
          }, this)
        ] }, void 0, true, {
          fileName: "/var/www/abd/client/src/components/chat/WelcomeScreen.tsx",
          lineNumber: 539,
          columnNumber: 11
        }, this)
      ] }, void 0, true, {
        fileName: "/var/www/abd/client/src/components/chat/WelcomeScreen.tsx",
        lineNumber: 505,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "/var/www/abd/client/src/components/chat/WelcomeScreen.tsx",
      lineNumber: 341,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Dialog, { open: showMemberModal, onOpenChange: setShowMemberModal, children: /* @__PURE__ */ jsxDEV(DialogContent, { className: "glass-effect border border-border animate-fade-in", children: [
      /* @__PURE__ */ jsxDEV(DialogHeader, { children: /* @__PURE__ */ jsxDEV(DialogTitle, { className: "text-center text-2xl font-bold text-white flex items-center justify-center gap-2", children: [
        /* @__PURE__ */ jsxDEV("span", { children: "🔐" }, void 0, false, {
          fileName: "/var/www/abd/client/src/components/chat/WelcomeScreen.tsx",
          lineNumber: 559,
          columnNumber: 15
        }, this),
        "تسجيل دخول الأعضاء"
      ] }, void 0, true, {
        fileName: "/var/www/abd/client/src/components/chat/WelcomeScreen.tsx",
        lineNumber: 558,
        columnNumber: 13
      }, this) }, void 0, false, {
        fileName: "/var/www/abd/client/src/components/chat/WelcomeScreen.tsx",
        lineNumber: 557,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "space-y-4", children: [
        /* @__PURE__ */ jsxDEV(
          Input,
          {
            value: memberName,
            onChange: (e) => setMemberName(e.target.value),
            placeholder: "اسم المستخدم",
            className: "bg-secondary border-accent text-white placeholder:text-muted-foreground"
          },
          void 0,
          false,
          {
            fileName: "/var/www/abd/client/src/components/chat/WelcomeScreen.tsx",
            lineNumber: 564,
            columnNumber: 13
          },
          this
        ),
        /* @__PURE__ */ jsxDEV(
          Input,
          {
            type: "password",
            value: memberPassword,
            onChange: (e) => setMemberPassword(e.target.value),
            placeholder: "كلمة المرور",
            className: "bg-secondary border-accent text-white placeholder:text-muted-foreground",
            onKeyPress: (e) => e.key === "Enter" && handleMemberLogin()
          },
          void 0,
          false,
          {
            fileName: "/var/www/abd/client/src/components/chat/WelcomeScreen.tsx",
            lineNumber: 570,
            columnNumber: 13
          },
          this
        ),
        /* @__PURE__ */ jsxDEV(
          Button,
          {
            onClick: handleMemberLogin,
            disabled: loading,
            className: "btn-primary w-full text-white px-6 py-3 rounded-xl font-semibold",
            children: [
              /* @__PURE__ */ jsxDEV("span", { className: "ml-2", children: "🔑" }, void 0, false, {
                fileName: "/var/www/abd/client/src/components/chat/WelcomeScreen.tsx",
                lineNumber: 583,
                columnNumber: 15
              }, this),
              loading ? "جاري الدخول..." : "دخول"
            ]
          },
          void 0,
          true,
          {
            fileName: "/var/www/abd/client/src/components/chat/WelcomeScreen.tsx",
            lineNumber: 578,
            columnNumber: 13
          },
          this
        )
      ] }, void 0, true, {
        fileName: "/var/www/abd/client/src/components/chat/WelcomeScreen.tsx",
        lineNumber: 563,
        columnNumber: 11
      }, this)
    ] }, void 0, true, {
      fileName: "/var/www/abd/client/src/components/chat/WelcomeScreen.tsx",
      lineNumber: 556,
      columnNumber: 9
    }, this) }, void 0, false, {
      fileName: "/var/www/abd/client/src/components/chat/WelcomeScreen.tsx",
      lineNumber: 555,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Dialog, { open: showRegisterModal, onOpenChange: setShowRegisterModal, children: /* @__PURE__ */ jsxDEV(DialogContent, { className: "glass-effect border border-border animate-fade-in", children: [
      /* @__PURE__ */ jsxDEV(DialogHeader, { children: /* @__PURE__ */ jsxDEV(DialogTitle, { className: "text-center text-2xl font-bold text-white flex items-center justify-center gap-2", children: [
        /* @__PURE__ */ jsxDEV("span", { children: "📝" }, void 0, false, {
          fileName: "/var/www/abd/client/src/components/chat/WelcomeScreen.tsx",
          lineNumber: 595,
          columnNumber: 15
        }, this),
        "تسجيل عضوية جديدة"
      ] }, void 0, true, {
        fileName: "/var/www/abd/client/src/components/chat/WelcomeScreen.tsx",
        lineNumber: 594,
        columnNumber: 13
      }, this) }, void 0, false, {
        fileName: "/var/www/abd/client/src/components/chat/WelcomeScreen.tsx",
        lineNumber: 593,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "space-y-4", children: [
        /* @__PURE__ */ jsxDEV(
          Input,
          {
            value: registerName,
            onChange: (e) => setRegisterName(e.target.value.slice(0, 14)),
            placeholder: "اسم المستخدم الجديد",
            className: "bg-secondary border-accent text-white placeholder:text-muted-foreground",
            maxLength: 14
          },
          void 0,
          false,
          {
            fileName: "/var/www/abd/client/src/components/chat/WelcomeScreen.tsx",
            lineNumber: 600,
            columnNumber: 13
          },
          this
        ),
        /* @__PURE__ */ jsxDEV(
          Input,
          {
            type: "password",
            value: registerPassword,
            onChange: (e) => setRegisterPassword(e.target.value),
            placeholder: "كلمة المرور (6 أحرف على الأقل)",
            className: "bg-secondary border-accent text-white placeholder:text-muted-foreground"
          },
          void 0,
          false,
          {
            fileName: "/var/www/abd/client/src/components/chat/WelcomeScreen.tsx",
            lineNumber: 607,
            columnNumber: 13
          },
          this
        ),
        /* @__PURE__ */ jsxDEV(
          Input,
          {
            type: "password",
            value: confirmPassword,
            onChange: (e) => setConfirmPassword(e.target.value),
            placeholder: "تأكيد كلمة المرور",
            className: "bg-secondary border-accent text-white placeholder:text-muted-foreground",
            onKeyPress: (e) => e.key === "Enter" && handleRegister()
          },
          void 0,
          false,
          {
            fileName: "/var/www/abd/client/src/components/chat/WelcomeScreen.tsx",
            lineNumber: 614,
            columnNumber: 13
          },
          this
        ),
        /* @__PURE__ */ jsxDEV("div", { className: "space-y-2", children: [
          /* @__PURE__ */ jsxDEV("label", { className: "text-white text-sm font-medium", children: "الجنس:" }, void 0, false, {
            fileName: "/var/www/abd/client/src/components/chat/WelcomeScreen.tsx",
            lineNumber: 623,
            columnNumber: 15
          }, this),
          /* @__PURE__ */ jsxDEV("div", { className: "flex gap-4", children: [
            /* @__PURE__ */ jsxDEV("label", { className: "flex items-center gap-2 text-white cursor-pointer", children: [
              /* @__PURE__ */ jsxDEV(
                "input",
                {
                  type: "radio",
                  name: "registerGender",
                  value: "male",
                  checked: registerGender === "male",
                  onChange: (e) => setRegisterGender(e.target.value),
                  className: "text-blue-500"
                },
                void 0,
                false,
                {
                  fileName: "/var/www/abd/client/src/components/chat/WelcomeScreen.tsx",
                  lineNumber: 626,
                  columnNumber: 19
                },
                this
              ),
              "🧑 ذكر"
            ] }, void 0, true, {
              fileName: "/var/www/abd/client/src/components/chat/WelcomeScreen.tsx",
              lineNumber: 625,
              columnNumber: 17
            }, this),
            /* @__PURE__ */ jsxDEV("label", { className: "flex items-center gap-2 text-white cursor-pointer", children: [
              /* @__PURE__ */ jsxDEV(
                "input",
                {
                  type: "radio",
                  name: "registerGender",
                  value: "female",
                  checked: registerGender === "female",
                  onChange: (e) => setRegisterGender(e.target.value),
                  className: "text-pink-500"
                },
                void 0,
                false,
                {
                  fileName: "/var/www/abd/client/src/components/chat/WelcomeScreen.tsx",
                  lineNumber: 637,
                  columnNumber: 19
                },
                this
              ),
              "👩 أنثى"
            ] }, void 0, true, {
              fileName: "/var/www/abd/client/src/components/chat/WelcomeScreen.tsx",
              lineNumber: 636,
              columnNumber: 17
            }, this)
          ] }, void 0, true, {
            fileName: "/var/www/abd/client/src/components/chat/WelcomeScreen.tsx",
            lineNumber: 624,
            columnNumber: 15
          }, this)
        ] }, void 0, true, {
          fileName: "/var/www/abd/client/src/components/chat/WelcomeScreen.tsx",
          lineNumber: 622,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV(
          Input,
          {
            type: "number",
            value: registerAge,
            onChange: (e) => setRegisterAge(e.target.value),
            placeholder: "العمر (اختياري)",
            min: "18",
            max: "100",
            className: "bg-secondary border-accent text-white placeholder:text-muted-foreground"
          },
          void 0,
          false,
          {
            fileName: "/var/www/abd/client/src/components/chat/WelcomeScreen.tsx",
            lineNumber: 650,
            columnNumber: 13
          },
          this
        ),
        /* @__PURE__ */ jsxDEV(
          Input,
          {
            value: registerCountry,
            onChange: (e) => setRegisterCountry(e.target.value),
            placeholder: "البلد (اختياري)",
            className: "bg-secondary border-accent text-white placeholder:text-muted-foreground"
          },
          void 0,
          false,
          {
            fileName: "/var/www/abd/client/src/components/chat/WelcomeScreen.tsx",
            lineNumber: 660,
            columnNumber: 13
          },
          this
        ),
        /* @__PURE__ */ jsxDEV(
          Input,
          {
            value: registerStatus,
            onChange: (e) => setRegisterStatus(e.target.value),
            placeholder: "الحالة الاجتماعية (اختياري)",
            className: "bg-secondary border-accent text-white placeholder:text-muted-foreground"
          },
          void 0,
          false,
          {
            fileName: "/var/www/abd/client/src/components/chat/WelcomeScreen.tsx",
            lineNumber: 667,
            columnNumber: 13
          },
          this
        ),
        /* @__PURE__ */ jsxDEV(
          Input,
          {
            value: registerRelation,
            onChange: (e) => setRegisterRelation(e.target.value),
            placeholder: "البحث عن (اختياري)",
            className: "bg-secondary border-accent text-white placeholder:text-muted-foreground"
          },
          void 0,
          false,
          {
            fileName: "/var/www/abd/client/src/components/chat/WelcomeScreen.tsx",
            lineNumber: 674,
            columnNumber: 13
          },
          this
        ),
        /* @__PURE__ */ jsxDEV(
          Button,
          {
            onClick: handleRegister,
            disabled: loading,
            className: "bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 w-full text-white px-6 py-3 rounded-xl font-semibold transition-all duration-300",
            children: [
              /* @__PURE__ */ jsxDEV("span", { className: "ml-2", children: "🎉" }, void 0, false, {
                fileName: "/var/www/abd/client/src/components/chat/WelcomeScreen.tsx",
                lineNumber: 685,
                columnNumber: 15
              }, this),
              loading ? "جاري التسجيل..." : "إنشاء الحساب"
            ]
          },
          void 0,
          true,
          {
            fileName: "/var/www/abd/client/src/components/chat/WelcomeScreen.tsx",
            lineNumber: 680,
            columnNumber: 13
          },
          this
        )
      ] }, void 0, true, {
        fileName: "/var/www/abd/client/src/components/chat/WelcomeScreen.tsx",
        lineNumber: 599,
        columnNumber: 11
      }, this)
    ] }, void 0, true, {
      fileName: "/var/www/abd/client/src/components/chat/WelcomeScreen.tsx",
      lineNumber: 592,
      columnNumber: 9
    }, this) }, void 0, false, {
      fileName: "/var/www/abd/client/src/components/chat/WelcomeScreen.tsx",
      lineNumber: 591,
      columnNumber: 7
    }, this)
  ] }, void 0, true, {
    fileName: "/var/www/abd/client/src/components/chat/WelcomeScreen.tsx",
    lineNumber: 198,
    columnNumber: 5
  }, this);
}
_s(WelcomeScreen, "LOVggqsWZsivWYiJCaL+hoz/eUI=", false, function() {
  return [useToast, useIsMobile];
});
_c = WelcomeScreen;
var _c;
$RefreshReg$(_c, "WelcomeScreen");
if (import.meta.hot && !inWebWorker) {
  window.$RefreshReg$ = prevRefreshReg;
  window.$RefreshSig$ = prevRefreshSig;
}
if (import.meta.hot && !inWebWorker) {
  RefreshRuntime.__hmr_import(import.meta.url).then((currentExports) => {
    RefreshRuntime.registerExportsForReactRefresh("/var/www/abd/client/src/components/chat/WelcomeScreen.tsx", currentExports);
    import.meta.hot.accept((nextExports) => {
      if (!nextExports) return;
      const invalidateMessage = RefreshRuntime.validateRefreshBoundaryAndEnqueueUpdate("/var/www/abd/client/src/components/chat/WelcomeScreen.tsx", currentExports, nextExports);
      if (invalidateMessage) import.meta.hot.invalidate(invalidateMessage);
    });
  });
}

//# sourceMappingURL=data:application/json;base64,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QUFBLFlBQ2pELGFBQVk7QUFBQSxZQUNaLFdBQVU7QUFBQTtBQUFBLFVBSlo7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLFFBSXFGO0FBQUEsUUFHckY7QUFBQSxVQUFDO0FBQUE7QUFBQSxZQUNDLE9BQU9wQztBQUFBQSxZQUNQLFVBQVUsQ0FBQ2tDLE1BQU1qQyxvQkFBb0JpQyxFQUFFQyxPQUFPQyxLQUFLO0FBQUEsWUFDbkQsYUFBWTtBQUFBLFlBQ1osV0FBVTtBQUFBO0FBQUEsVUFKWjtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsUUFJcUY7QUFBQSxRQUVyRjtBQUFBLFVBQUM7QUFBQTtBQUFBLFlBQ0MsU0FBU2Q7QUFBQUEsWUFDVCxVQUFVcEI7QUFBQUEsWUFDVixXQUFVO0FBQUEsWUFFVjtBQUFBLHFDQUFDLFVBQUssV0FBVSxRQUFPLGtCQUF2QjtBQUFBO0FBQUE7QUFBQTtBQUFBLHFCQUF5QjtBQUFBLGNBQ3hCQSxVQUFVLG9CQUFvQjtBQUFBO0FBQUE7QUFBQSxVQU5qQztBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsUUFPQTtBQUFBLFdBeEZGO0FBQUE7QUFBQTtBQUFBO0FBQUEsYUF5RkE7QUFBQSxTQWhHRjtBQUFBO0FBQUE7QUFBQTtBQUFBLFdBaUdBLEtBbEdGO0FBQUE7QUFBQTtBQUFBO0FBQUEsV0FtR0E7QUFBQSxPQTVlRjtBQUFBO0FBQUE7QUFBQTtBQUFBLFNBNmVBO0FBRUo7QUFBQy9CLEdBaHBCdUJGLGVBQWE7QUFBQSxVQWlCakJGLFVBQ0RELFdBQVc7QUFBQTtBQUFBeUUsS0FsQk50RTtBQUFhLElBQUFzRTtBQUFBQyxhQUFBRCxJQUFBIiwibmFtZXMiOlsiTWVzc2FnZUNpcmNsZSIsInVzZVN0YXRlIiwiQnV0dG9uIiwiRGlhbG9nIiwiRGlhbG9nQ29udGVudCIsIkRpYWxvZ0hlYWRlciIsIkRpYWxvZ1RpdGxlIiwiSW5wdXQiLCJ1c2VJc01vYmlsZSIsInVzZVRvYXN0IiwiYXBpUmVxdWVzdCIsIldlbGNvbWVTY3JlZW4iLCJvblVzZXJMb2dpbiIsIl9zIiwic2hvd0d1ZXN0TW9kYWwiLCJzZXRTaG93R3Vlc3RNb2RhbCIsInNob3dNZW1iZXJNb2RhbCIsInNldFNob3dNZW1iZXJNb2RhbCIsInNob3dSZWdpc3Rlck1vZGFsIiwic2V0U2hvd1JlZ2lzdGVyTW9kYWwiLCJndWVzdE5hbWUiLCJzZXRHdWVzdE5hbWUiLCJndWVzdEdlbmRlciIsInNldEd1ZXN0R2VuZGVyIiwibWVtYmVyTmFtZSIsInNldE1lbWJlck5hbWUiLCJtZW1iZXJQYXNzd29yZCIsInNldE1lbWJlclBhc3N3b3JkIiwicmVnaXN0ZXJOYW1lIiwic2V0UmVnaXN0ZXJOYW1lIiwicmVnaXN0ZXJQYXNzd29yZCIsInNldFJlZ2lzdGVyUGFzc3dvcmQiLCJjb25maXJtUGFzc3dvcmQiLCJzZXRDb25maXJtUGFzc3dvcmQiLCJyZWdpc3RlckdlbmRlciIsInNldFJlZ2lzdGVyR2VuZGVyIiwicmVnaXN0ZXJBZ2UiLCJzZXRSZWdpc3RlckFnZSIsInJlZ2lzdGVyQ291bnRyeSIsInNldFJlZ2lzdGVyQ291bnRyeSIsInJlZ2lzdGVyU3RhdHVzIiwic2V0UmVnaXN0ZXJTdGF0dXMiLCJyZWdpc3RlclJlbGF0aW9uIiwic2V0UmVnaXN0ZXJSZWxhdGlvbiIsImxvYWRpbmciLCJzZXRMb2FkaW5nIiwidG9hc3QiLCJpc01vYmlsZSIsImhhbmRsZUd1ZXN0TG9naW4iLCJ0cmltIiwidGl0bGUiLCJkZXNjcmlwdGlvbiIsInZhcmlhbnQiLCJkYXRhIiwibWV0aG9kIiwiYm9keSIsInVzZXJuYW1lIiwiZ2VuZGVyIiwidXNlciIsImVycm9yIiwibWVzc2FnZSIsImhhbmRsZU1lbWJlckxvZ2luIiwiaWRlbnRpZmllciIsInBhc3N3b3JkIiwiaGFuZGxlUmVnaXN0ZXIiLCJsZW5ndGgiLCJwYXJzZUludCIsImFnZSIsInVuZGVmaW5lZCIsImNvdW50cnkiLCJzdGF0dXMiLCJyZWxhdGlvbiIsImhhbmRsZUdvb2dsZUxvZ2luIiwiY29sb3IiLCJtaW5IZWlnaHQiLCJhbmltYXRpb25EZWxheSIsImUiLCJ0YXJnZXQiLCJ2YWx1ZSIsInNsaWNlIiwia2V5IiwiX2MiLCIkUmVmcmVzaFJlZyQiXSwiaWdub3JlTGlzdCI6W10sInNvdXJjZXMiOlsiV2VsY29tZVNjcmVlbi50c3giXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgVXNlclBsdXMsIE1lc3NhZ2VDaXJjbGUgfSBmcm9tICdsdWNpZGUtcmVhY3QnO1xuaW1wb3J0IHsgdXNlU3RhdGUgfSBmcm9tICdyZWFjdCc7XG5cbmltcG9ydCBVc2VyUmVnaXN0cmF0aW9uIGZyb20gJy4vVXNlclJlZ2lzdHJhdGlvbic7XG5cbmltcG9ydCB7IEJ1dHRvbiB9IGZyb20gJ0AvY29tcG9uZW50cy91aS9idXR0b24nO1xuaW1wb3J0IHsgRGlhbG9nLCBEaWFsb2dDb250ZW50LCBEaWFsb2dIZWFkZXIsIERpYWxvZ1RpdGxlIH0gZnJvbSAnQC9jb21wb25lbnRzL3VpL2RpYWxvZyc7XG5pbXBvcnQgeyBJbnB1dCB9IGZyb20gJ0AvY29tcG9uZW50cy91aS9pbnB1dCc7XG5pbXBvcnQgeyB1c2VJc01vYmlsZSB9IGZyb20gJ0AvaG9va3MvdXNlLW1vYmlsZSc7XG5pbXBvcnQgeyB1c2VUb2FzdCB9IGZyb20gJ0AvaG9va3MvdXNlLXRvYXN0JztcbmltcG9ydCB7IGFwaVJlcXVlc3QgfSBmcm9tICdAL2xpYi9xdWVyeUNsaWVudCc7XG5pbXBvcnQgdHlwZSB7IENoYXRVc2VyIH0gZnJvbSAnQC90eXBlcy9jaGF0JztcblxuaW50ZXJmYWNlIFdlbGNvbWVTY3JlZW5Qcm9wcyB7XG4gIG9uVXNlckxvZ2luOiAodXNlcjogQ2hhdFVzZXIpID0+IHZvaWQ7XG59XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIFdlbGNvbWVTY3JlZW4oeyBvblVzZXJMb2dpbiB9OiBXZWxjb21lU2NyZWVuUHJvcHMpIHtcbiAgY29uc3QgW3Nob3dHdWVzdE1vZGFsLCBzZXRTaG93R3Vlc3RNb2RhbF0gPSB1c2VTdGF0ZShmYWxzZSk7XG4gIGNvbnN0IFtzaG93TWVtYmVyTW9kYWwsIHNldFNob3dNZW1iZXJNb2RhbF0gPSB1c2VTdGF0ZShmYWxzZSk7XG4gIGNvbnN0IFtzaG93UmVnaXN0ZXJNb2RhbCwgc2V0U2hvd1JlZ2lzdGVyTW9kYWxdID0gdXNlU3RhdGUoZmFsc2UpO1xuICBjb25zdCBbZ3Vlc3ROYW1lLCBzZXRHdWVzdE5hbWVdID0gdXNlU3RhdGUoJycpO1xuICBjb25zdCBbZ3Vlc3RHZW5kZXIsIHNldEd1ZXN0R2VuZGVyXSA9IHVzZVN0YXRlKCdtYWxlJyk7XG4gIGNvbnN0IFttZW1iZXJOYW1lLCBzZXRNZW1iZXJOYW1lXSA9IHVzZVN0YXRlKCcnKTtcbiAgY29uc3QgW21lbWJlclBhc3N3b3JkLCBzZXRNZW1iZXJQYXNzd29yZF0gPSB1c2VTdGF0ZSgnJyk7XG4gIGNvbnN0IFtyZWdpc3Rlck5hbWUsIHNldFJlZ2lzdGVyTmFtZV0gPSB1c2VTdGF0ZSgnJyk7XG4gIGNvbnN0IFtyZWdpc3RlclBhc3N3b3JkLCBzZXRSZWdpc3RlclBhc3N3b3JkXSA9IHVzZVN0YXRlKCcnKTtcbiAgY29uc3QgW2NvbmZpcm1QYXNzd29yZCwgc2V0Q29uZmlybVBhc3N3b3JkXSA9IHVzZVN0YXRlKCcnKTtcbiAgY29uc3QgW3JlZ2lzdGVyR2VuZGVyLCBzZXRSZWdpc3RlckdlbmRlcl0gPSB1c2VTdGF0ZSgnbWFsZScpO1xuICBjb25zdCBbcmVnaXN0ZXJBZ2UsIHNldFJlZ2lzdGVyQWdlXSA9IHVzZVN0YXRlKCcnKTtcbiAgY29uc3QgW3JlZ2lzdGVyQ291bnRyeSwgc2V0UmVnaXN0ZXJDb3VudHJ5XSA9IHVzZVN0YXRlKCcnKTtcbiAgY29uc3QgW3JlZ2lzdGVyU3RhdHVzLCBzZXRSZWdpc3RlclN0YXR1c10gPSB1c2VTdGF0ZSgnJyk7XG4gIGNvbnN0IFtyZWdpc3RlclJlbGF0aW9uLCBzZXRSZWdpc3RlclJlbGF0aW9uXSA9IHVzZVN0YXRlKCcnKTtcbiAgY29uc3QgW2xvYWRpbmcsIHNldExvYWRpbmddID0gdXNlU3RhdGUoZmFsc2UpO1xuICBjb25zdCB7IHRvYXN0IH0gPSB1c2VUb2FzdCgpO1xuICBjb25zdCBpc01vYmlsZSA9IHVzZUlzTW9iaWxlKCk7XG5cbiAgY29uc3QgaGFuZGxlR3Vlc3RMb2dpbiA9IGFzeW5jICgpID0+IHtcbiAgICBpZiAoIWd1ZXN0TmFtZS50cmltKCkpIHtcbiAgICAgIHRvYXN0KHtcbiAgICAgICAgdGl0bGU6ICfYrti32KMnLFxuICAgICAgICBkZXNjcmlwdGlvbjogJ9mK2LHYrNmJINil2K/Yrtin2YQg2KfYs9mFINin2YTYstin2KbYsScsXG4gICAgICAgIHZhcmlhbnQ6ICdkZXN0cnVjdGl2ZScsXG4gICAgICB9KTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBzZXRMb2FkaW5nKHRydWUpO1xuICAgIHRyeSB7XG4gICAgICBjb25zdCBkYXRhID0gYXdhaXQgYXBpUmVxdWVzdCgnL2FwaS9hdXRoL2d1ZXN0Jywge1xuICAgICAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICAgICAgYm9keToge1xuICAgICAgICAgIHVzZXJuYW1lOiBndWVzdE5hbWUudHJpbSgpLFxuICAgICAgICAgIGdlbmRlcjogZ3Vlc3RHZW5kZXIsXG4gICAgICAgIH0sXG4gICAgICB9KTtcbiAgICAgIG9uVXNlckxvZ2luKGRhdGEudXNlcik7XG4gICAgICBzZXRTaG93R3Vlc3RNb2RhbChmYWxzZSk7XG4gICAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xuICAgICAgdG9hc3Qoe1xuICAgICAgICB0aXRsZTogJ9iu2LfYoycsXG4gICAgICAgIGRlc2NyaXB0aW9uOiBlcnJvci5tZXNzYWdlIHx8ICfYrdiv2Ksg2K7Yt9ijINmB2Yog2KrYs9is2YrZhCDYp9mE2K/YrtmI2YQnLFxuICAgICAgICB2YXJpYW50OiAnZGVzdHJ1Y3RpdmUnLFxuICAgICAgfSk7XG4gICAgfSBmaW5hbGx5IHtcbiAgICAgIHNldExvYWRpbmcoZmFsc2UpO1xuICAgIH1cbiAgfTtcblxuICBjb25zdCBoYW5kbGVNZW1iZXJMb2dpbiA9IGFzeW5jICgpID0+IHtcbiAgICBpZiAoIW1lbWJlck5hbWUudHJpbSgpIHx8ICFtZW1iZXJQYXNzd29yZC50cmltKCkpIHtcbiAgICAgIHRvYXN0KHtcbiAgICAgICAgdGl0bGU6ICfYrti32KMnLFxuICAgICAgICBkZXNjcmlwdGlvbjogJ9mK2LHYrNmJINil2K/Yrtin2YQg2KfYs9mFINin2YTZhdiz2KrYrtiv2YUv2KfZhNio2LHZitivINmI2YPZhNmF2Kkg2KfZhNmF2LHZiNixJyxcbiAgICAgICAgdmFyaWFudDogJ2Rlc3RydWN0aXZlJyxcbiAgICAgIH0pO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHNldExvYWRpbmcodHJ1ZSk7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IGRhdGEgPSBhd2FpdCBhcGlSZXF1ZXN0KCcvYXBpL2F1dGgvbWVtYmVyJywge1xuICAgICAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICAgICAgYm9keToge1xuICAgICAgICAgIGlkZW50aWZpZXI6IG1lbWJlck5hbWUudHJpbSgpLFxuICAgICAgICAgIHBhc3N3b3JkOiBtZW1iZXJQYXNzd29yZC50cmltKCksXG4gICAgICAgIH0sXG4gICAgICB9KTtcbiAgICAgIG9uVXNlckxvZ2luKGRhdGEudXNlcik7XG4gICAgICBzZXRTaG93TWVtYmVyTW9kYWwoZmFsc2UpO1xuICAgIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcbiAgICAgIHRvYXN0KHtcbiAgICAgICAgdGl0bGU6ICfYrti32KMnLFxuICAgICAgICBkZXNjcmlwdGlvbjogZXJyb3IubWVzc2FnZSB8fCAn2K3Yr9irINiu2LfYoyDZgdmKINiq2LPYrNmK2YQg2KfZhNiv2K7ZiNmEJyxcbiAgICAgICAgdmFyaWFudDogJ2Rlc3RydWN0aXZlJyxcbiAgICAgIH0pO1xuICAgIH0gZmluYWxseSB7XG4gICAgICBzZXRMb2FkaW5nKGZhbHNlKTtcbiAgICB9XG4gIH07XG5cbiAgY29uc3QgaGFuZGxlUmVnaXN0ZXIgPSBhc3luYyAoKSA9PiB7XG4gICAgaWYgKCFyZWdpc3Rlck5hbWUudHJpbSgpIHx8ICFyZWdpc3RlclBhc3N3b3JkLnRyaW0oKSB8fCAhY29uZmlybVBhc3N3b3JkLnRyaW0oKSkge1xuICAgICAgdG9hc3Qoe1xuICAgICAgICB0aXRsZTogJ9iu2LfYoycsXG4gICAgICAgIGRlc2NyaXB0aW9uOiAn2YrYsdis2Ykg2YXZhNihINis2YXZiti5INin2YTYrdmC2YjZhCDYp9mE2YXYt9mE2YjYqNipJyxcbiAgICAgICAgdmFyaWFudDogJ2Rlc3RydWN0aXZlJyxcbiAgICAgIH0pO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGlmIChyZWdpc3RlclBhc3N3b3JkICE9PSBjb25maXJtUGFzc3dvcmQpIHtcbiAgICAgIHRvYXN0KHtcbiAgICAgICAgdGl0bGU6ICfYrti32KMnLFxuICAgICAgICBkZXNjcmlwdGlvbjogJ9mD2YTZhdin2Kog2KfZhNmF2LHZiNixINi62YrYsSDZhdiq2LfYp9io2YLYqScsXG4gICAgICAgIHZhcmlhbnQ6ICdkZXN0cnVjdGl2ZScsXG4gICAgICB9KTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBpZiAocmVnaXN0ZXJQYXNzd29yZC5sZW5ndGggPCA2KSB7XG4gICAgICB0b2FzdCh7XG4gICAgICAgIHRpdGxlOiAn2K7Yt9ijJyxcbiAgICAgICAgZGVzY3JpcHRpb246ICfZg9mE2YXYqSDYp9mE2YXYsdmI2LEg2YrYrNioINij2YYg2KrZg9mI2YYgNiDYo9it2LHZgSDYudmE2Ykg2KfZhNij2YLZhCcsXG4gICAgICAgIHZhcmlhbnQ6ICdkZXN0cnVjdGl2ZScsXG4gICAgICB9KTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBpZiAocmVnaXN0ZXJBZ2UgJiYgKHBhcnNlSW50KHJlZ2lzdGVyQWdlKSA8IDE4IHx8IHBhcnNlSW50KHJlZ2lzdGVyQWdlKSA+IDEwMCkpIHtcbiAgICAgIHRvYXN0KHtcbiAgICAgICAgdGl0bGU6ICfYrti32KMnLFxuICAgICAgICBkZXNjcmlwdGlvbjogJ9in2YTYudmF2LEg2YrYrNioINij2YYg2YrZg9mI2YYg2KjZitmGIDE4INmIIDEwMCDYs9mG2KknLFxuICAgICAgICB2YXJpYW50OiAnZGVzdHJ1Y3RpdmUnLFxuICAgICAgfSk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgc2V0TG9hZGluZyh0cnVlKTtcbiAgICB0cnkge1xuICAgICAgY29uc3QgZGF0YSA9IGF3YWl0IGFwaVJlcXVlc3QoJy9hcGkvYXV0aC9yZWdpc3RlcicsIHtcbiAgICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICAgIGJvZHk6IHtcbiAgICAgICAgICB1c2VybmFtZTogcmVnaXN0ZXJOYW1lLnRyaW0oKSxcbiAgICAgICAgICBwYXNzd29yZDogcmVnaXN0ZXJQYXNzd29yZC50cmltKCksXG4gICAgICAgICAgY29uZmlybVBhc3N3b3JkOiBjb25maXJtUGFzc3dvcmQudHJpbSgpLFxuICAgICAgICAgIGdlbmRlcjogcmVnaXN0ZXJHZW5kZXIsXG4gICAgICAgICAgYWdlOiByZWdpc3RlckFnZSA/IHBhcnNlSW50KHJlZ2lzdGVyQWdlKSA6IHVuZGVmaW5lZCxcbiAgICAgICAgICBjb3VudHJ5OiByZWdpc3RlckNvdW50cnkudHJpbSgpIHx8IHVuZGVmaW5lZCxcbiAgICAgICAgICBzdGF0dXM6IHJlZ2lzdGVyU3RhdHVzLnRyaW0oKSB8fCB1bmRlZmluZWQsXG4gICAgICAgICAgcmVsYXRpb246IHJlZ2lzdGVyUmVsYXRpb24udHJpbSgpIHx8IHVuZGVmaW5lZCxcbiAgICAgICAgfSxcbiAgICAgIH0pO1xuICAgICAgdG9hc3Qoe1xuICAgICAgICB0aXRsZTogJ9mG2KzYrSDYp9mE2KrYs9is2YrZhCcsXG4gICAgICAgIGRlc2NyaXB0aW9uOiBkYXRhLm1lc3NhZ2UsXG4gICAgICB9KTtcbiAgICAgIG9uVXNlckxvZ2luKGRhdGEudXNlcik7XG4gICAgICBzZXRTaG93UmVnaXN0ZXJNb2RhbChmYWxzZSk7XG4gICAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xuICAgICAgdG9hc3Qoe1xuICAgICAgICB0aXRsZTogJ9iu2LfYoycsXG4gICAgICAgIGRlc2NyaXB0aW9uOiBlcnJvci5tZXNzYWdlIHx8ICfYrdiv2Ksg2K7Yt9ijINmB2Yog2KfZhNiq2LPYrNmK2YQnLFxuICAgICAgICB2YXJpYW50OiAnZGVzdHJ1Y3RpdmUnLFxuICAgICAgfSk7XG4gICAgfSBmaW5hbGx5IHtcbiAgICAgIHNldExvYWRpbmcoZmFsc2UpO1xuICAgIH1cbiAgfTtcblxuICBjb25zdCBoYW5kbGVHb29nbGVMb2dpbiA9ICgpID0+IHtcbiAgICB0b2FzdCh7XG4gICAgICB0aXRsZTogJ9mC2LHZitio2KfZiycsXG4gICAgICBkZXNjcmlwdGlvbjogJ/CflIQg2KzYp9ix2Yog2KrYt9mI2YrYsSDYrtiv2YXYqSDYqtiz2KzZitmEINin2YTYr9iu2YjZhCDYqNmAIEdvb2dsZScsXG4gICAgfSk7XG4gIH07XG5cbiAgcmV0dXJuIChcbiAgICA8ZGl2IGNsYXNzTmFtZT1cIm1pbi1oLXNjcmVlblwiPlxuICAgICAgey8qINi02LHZiti3INin2YTYudmG2YjYp9mGICovfVxuICAgICAgPGRpdiBjbGFzc05hbWU9XCJiZy1ncmF5LTkwMCB0ZXh0LXdoaXRlIHB5LTMgcHgtNFwiPlxuICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cIm1heC13LTZ4bCBteC1hdXRvIGZsZXgganVzdGlmeS1iZXR3ZWVuIGl0ZW1zLWNlbnRlclwiPlxuICAgICAgICAgIHsvKiDYsdmI2KfYqNi3INin2YTYtNix2YrYtyDYp9mE2LnZhNmI2Yo6INiz2YrYp9iz2Kkg2KfZhNiu2LXZiNi12YrYqSB8INi02LHZiNi3INin2YTYp9iz2KrYrtiv2KfZhSAo2KrZiNi22Lkg2YrZhdmK2YbYp9mLINmB2YogUlRMKSAqL31cbiAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggaXRlbXMtY2VudGVyIGdhcC0zIHRleHQtc21cIj5cbiAgICAgICAgICAgIDxhIGhyZWY9XCIvcHJpdmFjeVwiIGNsYXNzTmFtZT1cInRleHQtYmx1ZS00MDAgaG92ZXI6dGV4dC1ibHVlLTMwMCB0cmFuc2l0aW9uLWNvbG9ycyB1bmRlcmxpbmVcIj5cbiAgICAgICAgICAgICAg2LPZitin2LPYqSDYp9mE2K7YtdmI2LXZitipXG4gICAgICAgICAgICA8L2E+XG4gICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJ0ZXh0LWdyYXktNDAwXCI+fDwvc3Bhbj5cbiAgICAgICAgICAgIDxhIGhyZWY9XCIvdGVybXNcIiBjbGFzc05hbWU9XCJ0ZXh0LWJsdWUtNDAwIGhvdmVyOnRleHQtYmx1ZS0zMDAgdHJhbnNpdGlvbi1jb2xvcnMgdW5kZXJsaW5lXCI+XG4gICAgICAgICAgICAgINi02LHZiNi3INin2YTYp9iz2KrYrtiv2KfZhVxuICAgICAgICAgICAgPC9hPlxuICAgICAgICAgIDwvZGl2PlxuXG4gICAgICAgICAgey8qINin2YTYtNi52KfYsSDYp9mE2YXYq9io2Kog2YrYs9in2LHYp9mLOiDYo9io2YrYtiDZiNij2LLYsdmCICovfVxuICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTIgY3Vyc29yLWRlZmF1bHQgc2VsZWN0LW5vbmVcIj5cbiAgICAgICAgICAgIDxNZXNzYWdlQ2lyY2xlIGNsYXNzTmFtZT1cInctNSBoLTVcIiBzdHlsZT17eyBjb2xvcjogJyM2NjdlZWEnIH19IC8+XG4gICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInRleHQteGwgZm9udC1ib2xkIHdoaXRlc3BhY2Utbm93cmFwXCIgc3R5bGU9e3sgY29sb3I6ICcjZmZmZmZmJyB9fT5cbiAgICAgICAgICAgICAgQXJhYmljPHNwYW4gc3R5bGU9e3sgY29sb3I6ICcjNjY3ZWVhJyB9fT5DaGF0PC9zcGFuPlxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgPC9kaXY+XG4gICAgICAgIDwvZGl2PlxuICAgICAgPC9kaXY+XG5cbiAgICAgIDxkaXZcbiAgICAgICAgY2xhc3NOYW1lPXtgbWluLWgtW2NhbGMoMTAwZHZoLTYwcHgpXSBmbGV4IGZsZXgtY29sIGp1c3RpZnktY2VudGVyIGl0ZW1zLWNlbnRlciB3ZWxjb21lLWdyYWRpZW50IHJlbGF0aXZlIG92ZXJmbG93LWhpZGRlbiAke2lzTW9iaWxlID8gJ3B4LTQnIDogJyd9YH1cbiAgICAgICAgc3R5bGU9e3sgbWluSGVpZ2h0OiAnY2FsYygxMDBkdmggLSA2MHB4KScgfX1cbiAgICAgID5cbiAgICAgICAgey8qIE1vZGVybiBCYWNrZ3JvdW5kIEVmZmVjdHMgKi99XG4gICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiYWJzb2x1dGUgaW5zZXQtMCBvdmVyZmxvdy1oaWRkZW4gcG9pbnRlci1ldmVudHMtbm9uZVwiPlxuICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiYWJzb2x1dGUgLXRvcC0xLzIgLWxlZnQtMS8yIHctWzE1MCVdIGgtWzE1MCVdIGJnLWdyYWRpZW50LXJhZGlhbCBmcm9tLWJsdWUtNTAwLzIwIHRvLXRyYW5zcGFyZW50IHJvdW5kZWQtZnVsbCBibHVyLTN4bCBhbmltYXRlLXB1bHNlXCI+PC9kaXY+XG4gICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJhYnNvbHV0ZSAtYm90dG9tLTEvMiAtcmlnaHQtMS8yIHctWzE1MCVdIGgtWzE1MCVdIGJnLWdyYWRpZW50LXJhZGlhbCBmcm9tLXB1cnBsZS01MDAvMjAgdG8tdHJhbnNwYXJlbnQgcm91bmRlZC1mdWxsIGJsdXItM3hsIGFuaW1hdGUtcHVsc2VcIiBzdHlsZT17eyBhbmltYXRpb25EZWxheTogJzJzJyB9fT48L2Rpdj5cbiAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImFic29sdXRlIHRvcC0xLzIgbGVmdC0xLzIgLXRyYW5zbGF0ZS14LTEvMiAtdHJhbnNsYXRlLXktMS8yIHctWzEyMCVdIGgtWzEyMCVdIGJnLWdyYWRpZW50LXJhZGlhbCBmcm9tLWN5YW4tNTAwLzEwIHRvLXRyYW5zcGFyZW50IHJvdW5kZWQtZnVsbCBibHVyLTN4bCBhbmltYXRlLXB1bHNlXCIgc3R5bGU9e3sgYW5pbWF0aW9uRGVsYXk6ICc0cycgfX0+PC9kaXY+XG4gICAgICAgIDwvZGl2PlxuICAgICAgICBcbiAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJ0ZXh0LWNlbnRlciBhbmltYXRlLXNsaWRlLXVwIHJlbGF0aXZlIHotMTBcIj5cbiAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cIm1iLTEwXCI+XG4gICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInRleHQtNnhsIHNtOnRleHQtN3hsIG1iLTYgYW5pbWF0ZS1wdWxzZS1zbG93IG1vZGVybi1mbG9hdFwiPvCfkqw8L2Rpdj5cbiAgICAgICAgICAgIDxoMSBjbGFzc05hbWU9XCJ0ZXh0LTJ4bCBzbTp0ZXh0LTN4bCBmb250LWJvbGQgbWItNiB0ZXh0LWJsdWUtNjAwXCI+XG4gICAgICAgICAgICAgINiv2LHYr9i02Kkg2LnYsdio2YrYqSB8INi02KfYqiDYudix2KjZiiB8INiq2LnYp9ix2YEg2KjYr9mI2YYg2KrYs9is2YrZhCDYo9mIINin2LTYqtix2KfZgyDZhdis2KfZhtmL2KdcbiAgICAgICAgICAgIDwvaDE+XG4gICAgICAgICAgICA8cCBjbGFzc05hbWU9XCJ0ZXh0LTJ4bCB0ZXh0LW11dGVkLWZvcmVncm91bmQgbWItMTAgZm9udC1saWdodFwiPtmF2YbYtdipINin2YTYqtmI2KfYtdmEINin2YTYudix2KjZitipINin2YTYo9mI2YTZiTwvcD5cbiAgICAgICAgICA8L2Rpdj5cblxuICAgICAgICA8ZGl2XG4gICAgICAgICAgY2xhc3NOYW1lPXtgZmxleCAke2lzTW9iaWxlID8gJ3dlbGNvbWUtbG9naW4tYnV0dG9ucycgOiAnZmxleC1jb2wgc206ZmxleC1yb3cnfSBnYXAtMyBzbTpnYXAtNCBqdXN0aWZ5LWNlbnRlciBpdGVtcy1jZW50ZXIgcHgtM2B9XG4gICAgICAgID5cbiAgICAgICAgICA8QnV0dG9uXG4gICAgICAgICAgICBjbGFzc05hbWU9e2Btb2Rlcm4tYnV0dG9uIGJ0bi1zdWNjZXNzIHRleHQtd2hpdGUgZm9udC1zZW1pYm9sZCBweS00IHB4LTEwIHJvdW5kZWQtMnhsIHNoYWRvdy14bCBmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMyBtb2JpbGUtdG91Y2gtYnV0dG9uIGhvdmVyLWdsb3cgJHtpc01vYmlsZSA/ICd3LWZ1bGwganVzdGlmeS1jZW50ZXInIDogJyd9YH1cbiAgICAgICAgICAgIG9uQ2xpY2s9eygpID0+IHNldFNob3dHdWVzdE1vZGFsKHRydWUpfVxuICAgICAgICAgID5cbiAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cInRleHQtMnhsXCI+8J+RpDwvc3Bhbj5cbiAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cInRleHQtbGdcIj7Yr9iu2YjZhCDZg9iy2KfYptixPC9zcGFuPlxuICAgICAgICAgIDwvQnV0dG9uPlxuXG4gICAgICAgICAgPEJ1dHRvblxuICAgICAgICAgICAgY2xhc3NOYW1lPXtgbW9kZXJuLWJ1dHRvbiBidG4tcHJpbWFyeSB0ZXh0LXdoaXRlIGZvbnQtc2VtaWJvbGQgcHktNCBweC0xMCByb3VuZGVkLTJ4bCBzaGFkb3cteGwgZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTMgbW9iaWxlLXRvdWNoLWJ1dHRvbiBob3Zlci1nbG93ICR7aXNNb2JpbGUgPyAndy1mdWxsIGp1c3RpZnktY2VudGVyJyA6ICcnfWB9XG4gICAgICAgICAgICBvbkNsaWNrPXsoKSA9PiBzZXRTaG93TWVtYmVyTW9kYWwodHJ1ZSl9XG4gICAgICAgICAgPlxuICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwidGV4dC0yeGxcIj7inIU8L3NwYW4+XG4gICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJ0ZXh0LWxnXCI+2K/YrtmI2YQg2YPYudi22Yg8L3NwYW4+XG4gICAgICAgICAgPC9CdXR0b24+XG5cbiAgICAgICAgICA8QnV0dG9uXG4gICAgICAgICAgICBjbGFzc05hbWU9e2Btb2Rlcm4tYnV0dG9uIGJnLWdyYWRpZW50LXRvLXIgZnJvbS1wdXJwbGUtNjAwIHRvLXBpbmstNjAwIGhvdmVyOmZyb20tcHVycGxlLTcwMCBob3Zlcjp0by1waW5rLTcwMCB0ZXh0LXdoaXRlIGZvbnQtc2VtaWJvbGQgcHktNCBweC0xMCByb3VuZGVkLTJ4bCBzaGFkb3cteGwgZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTMgdHJhbnNpdGlvbi1hbGwgZHVyYXRpb24tMzAwIG1vYmlsZS10b3VjaC1idXR0b24gaG92ZXItZ2xvdyAke2lzTW9iaWxlID8gJ3ctZnVsbCBqdXN0aWZ5LWNlbnRlcicgOiAnJ31gfVxuICAgICAgICAgICAgb25DbGljaz17KCkgPT4gc2V0U2hvd1JlZ2lzdGVyTW9kYWwodHJ1ZSl9XG4gICAgICAgICAgPlxuICAgICAgICAgICAgPHNwYW4+8J+TnTwvc3Bhbj5cbiAgICAgICAgICAgINiq2LPYrNmK2YQg2LnYttmI2YrYqSDYrNiv2YrYr9ipXG4gICAgICAgICAgPC9CdXR0b24+XG5cbiAgICAgICAgICA8QnV0dG9uXG4gICAgICAgICAgICBjbGFzc05hbWU9e2BidG4tZGFuZ2VyIHRleHQtd2hpdGUgZm9udC1zZW1pYm9sZCBweS0zIHB4LTggcm91bmRlZC14bCBzaGFkb3ctbGcgZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTMgbW9iaWxlLXRvdWNoLWJ1dHRvbiAke2lzTW9iaWxlID8gJ3ctZnVsbCBqdXN0aWZ5LWNlbnRlcicgOiAnJ31gfVxuICAgICAgICAgICAgb25DbGljaz17aGFuZGxlR29vZ2xlTG9naW59XG4gICAgICAgICAgPlxuICAgICAgICAgICAgPHNwYW4+8J+UkDwvc3Bhbj5cbiAgICAgICAgICAgINiv2K7ZiNmEINio2YAgR29vZ2xlXG4gICAgICAgICAgPC9CdXR0b24+XG4gICAgICAgIDwvZGl2PlxuXG5cbiAgICAgIDwvZGl2PlxuICAgICAgPC9kaXY+XG5cbiAgICAgIHsvKiBHdWVzdCBOYW1lIE1vZGFsICovfVxuICAgICAgPERpYWxvZyBvcGVuPXtzaG93R3Vlc3RNb2RhbH0gb25PcGVuQ2hhbmdlPXtzZXRTaG93R3Vlc3RNb2RhbH0+XG4gICAgICAgIDxEaWFsb2dDb250ZW50IGNsYXNzTmFtZT1cImdsYXNzLWVmZmVjdCBib3JkZXIgYm9yZGVyLWJvcmRlciBhbmltYXRlLWZhZGUtaW4gc2hhZG93LTJ4bFwiPlxuICAgICAgICAgIDxEaWFsb2dIZWFkZXI+XG4gICAgICAgICAgICA8RGlhbG9nVGl0bGUgY2xhc3NOYW1lPVwidGV4dC1jZW50ZXIgdGV4dC0zeGwgZm9udC1ib2xkIGdyYWRpZW50LXRleHQgZmxleCBpdGVtcy1jZW50ZXIganVzdGlmeS1jZW50ZXIgZ2FwLTMgbWItMlwiPlxuICAgICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJ0ZXh0LTR4bFwiPvCfk508L3NwYW4+XG4gICAgICAgICAgICAgINij2K/YrtmEINin2LPZhSDYp9mE2LLYp9im2LFcbiAgICAgICAgICAgIDwvRGlhbG9nVGl0bGU+XG4gICAgICAgICAgPC9EaWFsb2dIZWFkZXI+XG4gICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJzcGFjZS15LTRcIj5cbiAgICAgICAgICAgIDxJbnB1dFxuICAgICAgICAgICAgICB2YWx1ZT17Z3Vlc3ROYW1lfVxuICAgICAgICAgICAgICBvbkNoYW5nZT17KGUpID0+IHNldEd1ZXN0TmFtZShlLnRhcmdldC52YWx1ZS5zbGljZSgwLCAxNCkpfVxuICAgICAgICAgICAgICBwbGFjZWhvbGRlcj1cItmF2KvYp9mEOiDYstin2KbYsV8yMDI1XCJcbiAgICAgICAgICAgICAgY2xhc3NOYW1lPVwibW9kZXJuLWlucHV0IHRleHQtd2hpdGVcIlxuICAgICAgICAgICAgICBtYXhMZW5ndGg9ezE0fVxuICAgICAgICAgICAgICBvbktleVByZXNzPXsoZSkgPT4gZS5rZXkgPT09ICdFbnRlcicgJiYgaGFuZGxlR3Vlc3RMb2dpbigpfVxuICAgICAgICAgICAgLz5cbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwic3BhY2UteS0yXCI+XG4gICAgICAgICAgICAgIDxsYWJlbCBjbGFzc05hbWU9XCJ0ZXh0LXdoaXRlIHRleHQtc20gZm9udC1tZWRpdW1cIj7Yp9mE2KzZhtizOjwvbGFiZWw+XG4gICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBnYXAtNFwiPlxuICAgICAgICAgICAgICAgIDxsYWJlbCBjbGFzc05hbWU9XCJmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMiB0ZXh0LXdoaXRlIGN1cnNvci1wb2ludGVyXCI+XG4gICAgICAgICAgICAgICAgICA8aW5wdXRcbiAgICAgICAgICAgICAgICAgICAgdHlwZT1cInJhZGlvXCJcbiAgICAgICAgICAgICAgICAgICAgbmFtZT1cImd1ZXN0R2VuZGVyXCJcbiAgICAgICAgICAgICAgICAgICAgdmFsdWU9XCJtYWxlXCJcbiAgICAgICAgICAgICAgICAgICAgY2hlY2tlZD17Z3Vlc3RHZW5kZXIgPT09ICdtYWxlJ31cbiAgICAgICAgICAgICAgICAgICAgb25DaGFuZ2U9eyhlKSA9PiBzZXRHdWVzdEdlbmRlcihlLnRhcmdldC52YWx1ZSl9XG4gICAgICAgICAgICAgICAgICAgIGNsYXNzTmFtZT1cInRleHQtYmx1ZS01MDBcIlxuICAgICAgICAgICAgICAgICAgLz5cbiAgICAgICAgICAgICAgICAgIPCfp5Eg2LDZg9ixXG4gICAgICAgICAgICAgICAgPC9sYWJlbD5cbiAgICAgICAgICAgICAgICA8bGFiZWwgY2xhc3NOYW1lPVwiZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTIgdGV4dC13aGl0ZSBjdXJzb3ItcG9pbnRlclwiPlxuICAgICAgICAgICAgICAgICAgPGlucHV0XG4gICAgICAgICAgICAgICAgICAgIHR5cGU9XCJyYWRpb1wiXG4gICAgICAgICAgICAgICAgICAgIG5hbWU9XCJndWVzdEdlbmRlclwiXG4gICAgICAgICAgICAgICAgICAgIHZhbHVlPVwiZmVtYWxlXCJcbiAgICAgICAgICAgICAgICAgICAgY2hlY2tlZD17Z3Vlc3RHZW5kZXIgPT09ICdmZW1hbGUnfVxuICAgICAgICAgICAgICAgICAgICBvbkNoYW5nZT17KGUpID0+IHNldEd1ZXN0R2VuZGVyKGUudGFyZ2V0LnZhbHVlKX1cbiAgICAgICAgICAgICAgICAgICAgY2xhc3NOYW1lPVwidGV4dC1waW5rLTUwMFwiXG4gICAgICAgICAgICAgICAgICAvPlxuICAgICAgICAgICAgICAgICAg8J+RqSDYo9mG2KvZiVxuICAgICAgICAgICAgICAgIDwvbGFiZWw+XG4gICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICA8QnV0dG9uXG4gICAgICAgICAgICAgIG9uQ2xpY2s9e2hhbmRsZUd1ZXN0TG9naW59XG4gICAgICAgICAgICAgIGRpc2FibGVkPXtsb2FkaW5nfVxuICAgICAgICAgICAgICBjbGFzc05hbWU9XCJidG4tc3VjY2VzcyB3LWZ1bGwgdGV4dC13aGl0ZSBweC02IHB5LTMgcm91bmRlZC14bCBmb250LXNlbWlib2xkXCJcbiAgICAgICAgICAgID5cbiAgICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwibWwtMlwiPvCfmoA8L3NwYW4+XG4gICAgICAgICAgICAgIHtsb2FkaW5nID8gJ9is2KfYsdmKINin2YTYr9iu2YjZhC4uLicgOiAn2K/YrtmI2YQg2KfZhNii2YYnfVxuICAgICAgICAgICAgPC9CdXR0b24+XG4gICAgICAgICAgPC9kaXY+XG4gICAgICAgIDwvRGlhbG9nQ29udGVudD5cbiAgICAgIDwvRGlhbG9nPlxuXG4gICAgICB7Lyog2KfZhNij2YLYs9in2YUg2KfZhNil2LbYp9mB2YrYqSDYqtit2Kog2LXZgdit2Kkg2KrYs9is2YrZhCDYp9mE2K/YrtmI2YQgKi99XG4gICAgICA8ZGl2IGNsYXNzTmFtZT1cInctZnVsbCBzcGFjZS15LTBcIj5cbiAgICAgICAgey8qINin2YTZgtiz2YUg2KfZhNij2YjZhCAtINin2YTYo9iz2KbZhNipINin2YTYtNin2KbYudipICovfVxuICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImJnLXBpbmstNTAwIHRleHQtd2hpdGUgcC04IHRleHQtY2VudGVyXCI+XG4gICAgICAgICAgPGgyIGNsYXNzTmFtZT1cInRleHQtM3hsIGZvbnQtYm9sZCBtYi00XCI+2KPZh9mE2KfZiyDYqNmDINmB2Yog2LTYp9iqINmD2YQg2KfZhNi52LHYqDwvaDI+XG4gICAgICAgICAgPHAgY2xhc3NOYW1lPVwidGV4dC1sZyBsZWFkaW5nLXJlbGF4ZWQgbWF4LXctNHhsIG14LWF1dG9cIj5cbiAgICAgICAgICAgINin2YbYttmFINin2YTYotmGINil2YTZiSDYp9mB2LbZhCDZhdis2KrZhdi5INiv2LHYr9i02Kkg2LnYsdio2YrYqSDZhdis2KfZhtmK2KkuINiq2YjYp9i12YQg2YXYuSDYtNio2KfYqCDZiNi12KjYp9mK2Kcg2YXZhiDZhdiu2KrZhNmBINin2YTYr9mI2YTYjCDZiNin2KjYr9ijINiq2YPZiNmK2YYg2LXYr9in2YLYp9iqINit2YLZitmC2YrYqSDZgdmKINij2KzZiNin2KEg2YXZhdiq2LnYqSDZiNii2YXZhtipLlxuICAgICAgICAgIDwvcD5cbiAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgey8qINin2YTZgtiz2YUg2KfZhNir2KfZhtmKIC0g2YXYpyDYp9mE2LDZiiDYs9iq2K3YtdmEINi52YTZitmHICovfVxuICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImJnLWJsdWUtNjAwIHRleHQtd2hpdGUgcC04XCI+XG4gICAgICAgICAgPGgyIGNsYXNzTmFtZT1cInRleHQtM3hsIGZvbnQtYm9sZCBtYi02IHRleHQtY2VudGVyXCI+8J+OgSDZhdinINin2YTYsNmKINiz2KrYrdi12YQg2LnZhNmK2Ycg2YHYudmE2KfZi9ifPC9oMj5cbiAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImdyaWQgbWQ6Z3JpZC1jb2xzLTIgZ2FwLTQgbWF4LXctNHhsIG14LWF1dG8gdGV4dC1yaWdodFwiPlxuICAgICAgICAgICAgPHVsIGNsYXNzTmFtZT1cInNwYWNlLXktM1wiPlxuICAgICAgICAgICAgICA8bGkgY2xhc3NOYW1lPVwiZmxleCBpdGVtcy1zdGFydCBnYXAtMlwiPlxuICAgICAgICAgICAgICAgIDxzcGFuPuKAojwvc3Bhbj5cbiAgICAgICAgICAgICAgICA8c3Bhbj7Yqti62YrZitixINmG2YjYuSDYp9mE2K7YtyDZiNin2YTZhNmI2YYg2Ygg2KfZhNit2KzZhTwvc3Bhbj5cbiAgICAgICAgICAgICAgPC9saT5cbiAgICAgICAgICAgICAgPGxpIGNsYXNzTmFtZT1cImZsZXggaXRlbXMtc3RhcnQgZ2FwLTJcIj5cbiAgICAgICAgICAgICAgICA8c3Bhbj7igKI8L3NwYW4+XG4gICAgICAgICAgICAgICAgPHNwYW4+2KXYsdiz2KfZhCDYsdiz2KfYptmEINmD2KrYp9io2YrYqSDYrtin2LXYqSDZiCDYudin2YXYqSDYutmK2LEg2YXYrdiv2YjYr9ipPC9zcGFuPlxuICAgICAgICAgICAgICA8L2xpPlxuICAgICAgICAgICAgICA8bGkgY2xhc3NOYW1lPVwiZmxleCBpdGVtcy1zdGFydCBnYXAtMlwiPlxuICAgICAgICAgICAgICAgIDxzcGFuPuKAojwvc3Bhbj5cbiAgICAgICAgICAgICAgICA8c3Bhbj7Ypdix2LPYp9mEINi12YjYsSDZhdmGINin2YTZhdi52LHYtiDYo9mIINmF2YYg2YPYp9mF2YrYsdinINin2YTYqti12YjZitixINmB2Yog2KfZhNmF2K3Yp9iv2KvYp9iqINin2YTYudin2YXYqSDYp9mE2K7Yp9i12Kk8L3NwYW4+XG4gICAgICAgICAgICAgIDwvbGk+XG4gICAgICAgICAgICAgIDxsaSBjbGFzc05hbWU9XCJmbGV4IGl0ZW1zLXN0YXJ0IGdhcC0yXCI+XG4gICAgICAgICAgICAgICAgPHNwYW4+4oCiPC9zcGFuPlxuICAgICAgICAgICAgICAgIDxzcGFuPtil2LHYs9in2YQg2LHZhdmI2LIg2LPZhdin2YrZhNmKINmB2Yog2KfZhNi62LHZgSDYp9mE2LnYp9mF2Kkg2YjYp9mE2YXYrdin2K/Yq9in2Kog2KfZhNiu2KfYtdipPC9zcGFuPlxuICAgICAgICAgICAgICA8L2xpPlxuICAgICAgICAgICAgICA8bGkgY2xhc3NOYW1lPVwiZmxleCBpdGVtcy1zdGFydCBnYXAtMlwiPlxuICAgICAgICAgICAgICAgIDxzcGFuPuKAojwvc3Bhbj5cbiAgICAgICAgICAgICAgICA8c3Bhbj7Yqti62YrZitixINij2YrZgtmI2YbYqSDYo9mIINi12YjYsdipINin2YTZhdiq2K3Yr9irINin2YTYtNiu2LXZitipINmB2Yog2KfZhNiv2LHYr9i02Kk8L3NwYW4+XG4gICAgICAgICAgICAgIDwvbGk+XG4gICAgICAgICAgICA8L3VsPlxuICAgICAgICAgICAgPHVsIGNsYXNzTmFtZT1cInNwYWNlLXktM1wiPlxuICAgICAgICAgICAgICA8bGkgY2xhc3NOYW1lPVwiZmxleCBpdGVtcy1zdGFydCBnYXAtMlwiPlxuICAgICAgICAgICAgICAgIDxzcGFuPuKAojwvc3Bhbj5cbiAgICAgICAgICAgICAgICA8c3Bhbj7ZitmF2YPZhiDYqtis2KfZh9mEINin2YTYsdiz2KfYptmEINin2YTYrtin2LXYqSDZiCDYp9mE2LnYp9mF2Kkg2YXZhiDYtNiu2LUg2YXYudmK2YY8L3NwYW4+XG4gICAgICAgICAgICAgIDwvbGk+XG4gICAgICAgICAgICAgIDxsaSBjbGFzc05hbWU9XCJmbGV4IGl0ZW1zLXN0YXJ0IGdhcC0yXCI+XG4gICAgICAgICAgICAgICAgPHNwYW4+4oCiPC9zcGFuPlxuICAgICAgICAgICAgICAgIDxzcGFuPtmF2YbYuSDYp9iz2KrZgtio2KfZhCDYsdiz2KfYptmEINiu2KfYtdipINmF2YYg2KfZhNij2LTYrtin2LU8L3NwYW4+XG4gICAgICAgICAgICAgIDwvbGk+XG4gICAgICAgICAgICAgIDxsaSBjbGFzc05hbWU9XCJmbGV4IGl0ZW1zLXN0YXJ0IGdhcC0yXCI+XG4gICAgICAgICAgICAgICAgPHNwYW4+4oCiPC9zcGFuPlxuICAgICAgICAgICAgICAgIDxzcGFuPtin2YTYqNit2Ksg2LnZhiDYp9iz2YUg2K3ZitmBINij2Ygg2YXYs9iq2K7Yr9mFINmB2Yog2YLYp9im2YXYqSDYp9mE2YXYqtmI2KfYrNiv2YrZhiDZgdmKINin2YTYutix2YHYqTwvc3Bhbj5cbiAgICAgICAgICAgICAgPC9saT5cbiAgICAgICAgICAgICAgPGxpIGNsYXNzTmFtZT1cImZsZXggaXRlbXMtc3RhcnQgZ2FwLTJcIj5cbiAgICAgICAgICAgICAgICA8c3Bhbj7igKI8L3NwYW4+XG4gICAgICAgICAgICAgICAgPHNwYW4+2KrYutmK2YrYsSDZhNmI2YYg2KfZhNin2LPZhSDZgdmKINmC2KfYptmF2Kkg2KfZhNmF2LPYqtiu2K/ZhdmK2YYg2KXZhNmJINmF2Kcg2YrZhtin2LPYqNmDPC9zcGFuPlxuICAgICAgICAgICAgICA8L2xpPlxuICAgICAgICAgICAgICA8bGkgY2xhc3NOYW1lPVwiZmxleCBpdGVtcy1zdGFydCBnYXAtMlwiPlxuICAgICAgICAgICAgICAgIDxzcGFuPuKAojwvc3Bhbj5cbiAgICAgICAgICAgICAgICA8c3Bhbj7Yqti62YrZitixINmE2YjZhiDYrtmE2YHZitipINin2YTYsdiz2KfYptmEINin2YTZhti12YrYqSDYp9mE2YXYsdiz2YTYqSDZgdmKINin2YTYutix2YEg2YjYp9mE2YXYrdin2K/Yq9ipINin2YTYrtin2LXYqTwvc3Bhbj5cbiAgICAgICAgICAgICAgPC9saT5cbiAgICAgICAgICAgICAgPGxpIGNsYXNzTmFtZT1cImZsZXggaXRlbXMtc3RhcnQgZ2FwLTJcIj5cbiAgICAgICAgICAgICAgICA8c3Bhbj7igKI8L3NwYW4+XG4gICAgICAgICAgICAgICAgPHNwYW4+2LnYttmI2YrYqSDYo9i02LHYp9mBINiq2KrYttmF2YYg2YXYsdiq2KjYqSDYp9mE2LLZiNin2LEg2YXZhiDYt9ix2K8g2Ygg2YPYqtmFINi52KfZhSDZiCDZitit2LXZhCDYtdin2K3YqCDYp9mE2LnYttmI2YrYqSDYudmE2Ykg2YTZiNmGINmF2YXZitiyPC9zcGFuPlxuICAgICAgICAgICAgICA8L2xpPlxuICAgICAgICAgICAgPC91bD5cbiAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgey8qINin2YTZgtiz2YUg2KfZhNir2KfZhNirIC0g2YPZitmB2YrYqSDYqtis2KfZh9mEINin2YTYo9i02K7Yp9i1INin2YTZhdiy2LnYrNmK2YYgKi99XG4gICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiYmctcmVkLTYwMCB0ZXh0LXdoaXRlIHAtOCB0ZXh0LWNlbnRlclwiPlxuICAgICAgICAgIDxoMiBjbGFzc05hbWU9XCJ0ZXh0LTN4bCBmb250LWJvbGQgbWItNFwiPvCfmqsg2YPZitmB2YrYqSDYqtis2KfZh9mEINin2YTYo9i02K7Yp9i1INin2YTZhdiy2LnYrNmK2YbYnzwvaDI+XG4gICAgICAgICAgPHAgY2xhc3NOYW1lPVwidGV4dC1sZyBsZWFkaW5nLXJlbGF4ZWQgbWF4LXctNHhsIG14LWF1dG9cIj5cbiAgICAgICAgICAgINmK2YXZg9mGINiq2KzYp9mH2YQg2KfZhNix2LPYp9im2YQg2KfZhNiu2KfYtdipINmI2KfZhNi52KfZhdipINmF2YYg2LTYrti1INmF2LnZitmGINi52YYg2LfYsdmK2YIg2YHYqtitINin2YTZhdmE2YEg2KfZhNi02K7YtdmKINin2YTYrtin2LUg2KjYp9mE2LnYttmIINin2YTZhdiy2LnYrCDZiNin2YTYtti62Lcg2LnZhNin2YXYqSDinYwgXCLYqtis2KfZh9mEXCIg2YjZh9mD2LDYpyDYp9mE2KPZhdixINmK2K3ZiNmEINin2YTYr9ix2K/YtNipINmF2KrZhtmB2YLYqVxuICAgICAgICAgIDwvcD5cbiAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgey8qINin2YTZgtiz2YUg2KfZhNix2KfYqNi5IC0g2YXYp9iw2Kcg2LnZhNmJINij2YYg2KPZgdi52YQg2YTYqtis2YbYqCDYp9mE2LjYsdmKINmF2YYg2KfZhNi02KfYqiAqL31cbiAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJiZy1ncmVlbi01MDAgdGV4dC13aGl0ZSBwLTggdGV4dC1jZW50ZXJcIj5cbiAgICAgICAgICA8aDIgY2xhc3NOYW1lPVwidGV4dC0zeGwgZm9udC1ib2xkIG1iLTRcIj7inIUg2YXYp9iw2Kcg2LnZhNmJINij2YYg2KPZgdi52YQg2YTYqtis2YbYqCDYp9mE2LfYsdivINmF2YYg2KfZhNi02KfYqtifPC9oMj5cbiAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cIm1heC13LTR4bCBteC1hdXRvIHNwYWNlLXktMiB0ZXh0LWxnXCI+XG4gICAgICAgICAgICA8cD7Zitis2Kgg2LnZhNmK2YMg2KrYrNmG2Kgg2KfZhNiv2K7ZiNmEINio2KPYs9mF2KfYoSDYutmK2LEg2YTYp9im2YLYqTwvcD5cbiAgICAgICAgICAgIDxwPtin2K3Yqtix2KfZhSDZgtmI2KfZhtmK2YYgXCLYtNin2Kog2LnYsdio2YpcIiDZiNin2YTYo9i02K7Yp9i1INiv2KfYrtmEINin2YTYr9ix2K/YtNipPC9wPlxuICAgICAgICAgICAgPHA+2LnYr9mFINin2YTYpdiz2KfYodipINmE2KPYrdivINin2YTYo9i02K7Yp9i1INij2Ygg2YTYo9mKINmF2LDZh9ioINiv2YrZhtmKPC9wPlxuICAgICAgICAgIDwvZGl2PlxuICAgICAgICA8L2Rpdj5cblxuICAgICAgICB7Lyog2KfZhNmC2LPZhSDYp9mE2K7Yp9mF2LMgLSDYp9mE2YXZhNmBINin2YTYtNiu2LXZiiAqL31cbiAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJiZy1jeWFuLTYwMCB0ZXh0LXdoaXRlIHAtOCB0ZXh0LWNlbnRlclwiPlxuICAgICAgICAgIDxoMiBjbGFzc05hbWU9XCJ0ZXh0LTN4bCBmb250LWJvbGQgbWItNFwiPvCfkaQg2KfZhNmF2YTZgSDYp9mE2LTYrti12Yo8L2gyPlxuICAgICAgICAgIDxwIGNsYXNzTmFtZT1cInRleHQtbGcgbGVhZGluZy1yZWxheGVkIG1heC13LTR4bCBteC1hdXRvXCI+XG4gICAgICAgICAgICDZitmF2YPZhtmDINiq2LnYr9mK2YQg2KfZhNmF2YTZgSDYp9mE2LTYrti12Yog2KfZhNiu2KfYtSDYqNmDINmF2YYg2KPZitmC2YjZhtipIPCfkaQg2KrYudiv2YrZhCDYp9mE2KzZhtizINin2YTYudmF2LEg2KfZhNit2KfZhNipINmI2KfZhNio2YTYryDZiNmD2YTZhdipINin2YTZhdix2YjYsSDZiNiq2YHYp9i12YrZhCDYp9mE2K3Ys9in2Kgg2YjYutmK2LEg2LDZhNmDINin2YTZg9ir2YrYsVxuICAgICAgICAgIDwvcD5cbiAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgey8qINin2YTZgtiz2YUg2KfZhNiz2KfYr9izIC0g2YLYqNmI2YQgLyDYpdi22KfZgdipINij2LXYr9mC2KfYoSAqL31cbiAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJiZy1wdXJwbGUtNjAwIHRleHQtd2hpdGUgcC04IHRleHQtY2VudGVyXCI+XG4gICAgICAgICAgPGgyIGNsYXNzTmFtZT1cInRleHQtM3hsIGZvbnQtYm9sZCBtYi00XCI+8J+OiSDZgtio2YjZhCAvINil2LbYp9mB2Kkg2KPYtdiv2YLYp9ihPC9oMj5cbiAgICAgICAgICA8cCBjbGFzc05hbWU9XCJ0ZXh0LWxnIGxlYWRpbmctcmVsYXhlZCBtYXgtdy00eGwgbXgtYXV0b1wiPlxuICAgICAgICAgICAg2YrZhdmD2YbZgyDYpdi22KfZgdipINij2LXYr9mC2KfYptmDINin2YTZhdmB2LbZhNipINin2YTYrdin2YTZitipINmK2YXZg9mG2YMg2KXYttin2YHYqSDYo9i12K/Zgtin2KEg2YXZhiDYp9mE2YXZhNmBINin2YTYtNiu2LXZiiDZhNmE2KPYudi22KfYoSDYudmGINi32LHZitmCINin2YTZhtmC2LEg2LnZhNmJINiy2LEgXCLYpdi22KfZgdipINi12K/ZitmCXCIg2YHZiiDYo9i52YTZiSDYp9mE2YXZhNmBINin2YTYtNiu2LXZii4g2YrZhdmD2YbZgyDYudix2LYg2YLYp9im2YXYqSDZhNij2LXYr9mC2KfYptmDINin2YTYrdin2YTZitmK2YYg2LnZhiDYt9ix2YrZgiDYp9mE2YbZgtixIPCfkaUg2LnZhNmJINin2YTYsdmF2LIg2YHZiiDYo9iz2YHZhCDYp9mE2LXZgdit2KkuXG4gICAgICAgICAgPC9wPlxuICAgICAgICA8L2Rpdj5cblxuICAgICAgICB7Lyog2KfZhNmC2LPZhSDYp9mE2LPYp9io2LkgLSDYp9mE2LHYs9in2KbZhCDYp9mE2K7Yp9i12KkgKi99XG4gICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiYmctdGVhbC01MDAgdGV4dC13aGl0ZSBwLTggdGV4dC1jZW50ZXJcIj5cbiAgICAgICAgICA8aDIgY2xhc3NOYW1lPVwidGV4dC0zeGwgZm9udC1ib2xkIG1iLTRcIj7wn5KsINin2YTYsdiz2KfYptmEINin2YTYrtin2LXYqTwvaDI+XG4gICAgICAgICAgPHAgY2xhc3NOYW1lPVwidGV4dC1sZyBsZWFkaW5nLXJlbGF4ZWQgbWF4LXctNHhsIG14LWF1dG9cIj5cbiAgICAgICAgICAgINmK2YXZg9mG2YMg2KjYr9ihINmF2K3Yp9iv2KvYqSDYrtin2LXYqSDYo9mIINmF2K3Yp9iv2KvYqSDYrNmF2KfYudmK2Kkg2YXYuSDYp9mE2KPYtNiu2KfYtS5cbiAgICAgICAgICA8L3A+XG4gICAgICAgICAgPHAgY2xhc3NOYW1lPVwidGV4dC1sZyBtdC00IGxlYWRpbmctcmVsYXhlZCBtYXgtdy00eGwgbXgtYXV0b1wiPlxuICAgICAgICAgICAg2YHZiiDYp9mE2YLYp9im2YXYqSDYp9mE2LnZhNmI2YrYqSDZhdmGINij2YrZgtmI2YbYqSDwn5KsINmK2YXZg9mG2YMg2LnYsdi2INin2YTZgtin2KbZhdipINin2YTYrtin2LXYqSDZhNmE2YbYtNi32Kkg2KfZhNit2KfZhNmK2Kkg2YjYpdmG2LTYp9ihINiu2KfYtSDYrNiv2YrYryDZiNi62YrYsdmH2KfYjNmK2YXZg9mG2YMg2YHYqtitINmF2K3Yp9iv2KvYqSDYrtin2LXYqSDZhdi5INmF2LPYqtiu2K/ZhSDYudmGINi32LHZitmCINin2YTZhtmC2LEg2LnZhNmJINin2YTYtdmI2LHYqSDYp9mE2LHZhdiy2YrYqSDZhNmE2LnYttmIINin2YTZhdix2LrZiNioINmB2Yog2KfZhNiv2LHYr9i02Kkg2KPZiCDYqNin2YLYsSDYudmE2Ykg2KfYs9mFINin2YTZhdiz2KrYrtiv2YUg2KfZhNiu2KfYtSDYqNmHINmB2Yog2YLYp9im2YXYqSDYp9mE2YXYs9iq2K7Yr9mF2YrZhlxuICAgICAgICAgIDwvcD5cbiAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgey8qINin2YTZgtiz2YUg2KfZhNir2KfZhdmGIC0g2KXYtNi52KfYsdin2Kog2KfZhNiv2LHYr9i02KkgKi99XG4gICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiYmctZ3JheS02MDAgdGV4dC13aGl0ZSBwLTggdGV4dC1jZW50ZXJcIj5cbiAgICAgICAgICA8aDIgY2xhc3NOYW1lPVwidGV4dC0zeGwgZm9udC1ib2xkIG1iLTRcIj7wn5SUINil2LTYudin2LHYp9iqINin2YTYr9ix2K/YtNipPC9oMj5cbiAgICAgICAgICA8cCBjbGFzc05hbWU9XCJ0ZXh0LWxnIGxlYWRpbmctcmVsYXhlZCBtYXgtdy00eGwgbXgtYXV0b1wiPlxuICAgICAgICAgICAg2YrZhdmD2YbZgyDYudix2LYg2KfZhNil2LTYudin2LEg2KfZhNit2KfZhNmKINiu2YjYp9ixINmF2Kcg2YrYrdiv2Ksg2LnZhNmJINit2LPYp9io2YMg2YrZiNis2K8g2KXYrti32KfYsSDYutmK2LEg2YXZgtix2YjYoSDZgdmKINin2YTYo9i52YTZiSDZiNmE2YjZhtmHINmF2K7YqtmE2YFcbiAgICAgICAgICA8L3A+XG4gICAgICAgIDwvZGl2PlxuXG4gICAgICAgIHsvKiDYp9mE2YLYs9mFINin2YTYqtin2LPYuSAtINmF2LTYp9ix2YPYqSDYp9mE2YHZitiv2YrZiNmH2KfYqiAqL31cbiAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJiZy1yZWQtNzAwIHRleHQtd2hpdGUgcC04IHRleHQtY2VudGVyXCI+XG4gICAgICAgICAgPGgyIGNsYXNzTmFtZT1cInRleHQtM3hsIGZvbnQtYm9sZCBtYi00XCI+8J+TuiDZhdi02KfYsdmD2Kkg2YHZitiv2YrZiNmH2KfYqiDYp9mE2YrZiNiq2YrZiNioPC9oMj5cbiAgICAgICAgICA8cCBjbGFzc05hbWU9XCJ0ZXh0LWxnIGxlYWRpbmctcmVsYXhlZCBtYXgtdy00eGwgbXgtYXV0b1wiPlxuICAgICAgICAgICAg2KfZhNii2YYg2YrZhdmD2YbZgyDZhdi02KfYsdmD2Kkg2YHZitiv2YrZiNmH2KfYqiDYp9mE2YrZiNiq2YrZiNioINio2LPZh9mI2YTYqSDZhdi5INij2LXYr9mC2KfYptmDINmI2KfZhNis2YXZiti5INiv2KfYrtmEINin2YTYtNin2KouINmD2YQg2YXYpyDYudmE2YrZgyDZh9mIINil2LHYs9in2YQg2LHYp9io2Lcg2KfZhNmB2YrYr9mK2Ygg2YTZiti42YfYsSDZhdio2KfYtNix2Kkg2YTZhNis2YXZiti5INmI2YrYtNin2LHZg9mI2Ycg2YXYudmDINmB2Yog2YbZgdizINin2YTZhNit2LjYqS5cbiAgICAgICAgICA8L3A+XG4gICAgICAgIDwvZGl2PlxuXG4gICAgICAgIHsvKiDYp9mE2YLYs9mFINin2YTYudin2LTYsSAtINin2YTYtdmI2KrZitin2KogKi99XG4gICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiYmctaW5kaWdvLTcwMCB0ZXh0LXdoaXRlIHAtOCB0ZXh0LWNlbnRlclwiPlxuICAgICAgICAgIDxoMiBjbGFzc05hbWU9XCJ0ZXh0LTN4bCBmb250LWJvbGQgbWItNFwiPvCfjqcg2KfYs9mF2Lkg2LXZiNiq2YrYp9iqINij2LXYr9mC2KfYptmDINmF2KjYp9i02LHYqSDZhdmGINio2LHZiNmB2KfZitmE2YfZhSE8L2gyPlxuICAgICAgICAgIDxwIGNsYXNzTmFtZT1cInRleHQtbGcgbGVhZGluZy1yZWxheGVkIG1heC13LTR4bCBteC1hdXRvXCI+XG4gICAgICAgICAgICDwn5SKINi02LrZkdmEINin2YTZhdmC2KfYt9i5INin2YTYtdmI2KrZitipINmF2YYg2KfZhNmF2YTZgSDYp9mE2LTYrti12Yog2KjYtti62LfYqSDZiNit2K/YqS5cbiAgICAgICAgICA8L3A+XG4gICAgICAgICAgPHAgY2xhc3NOYW1lPVwidGV4dC1sZyBtdC0yIGxlYWRpbmctcmVsYXhlZCBtYXgtdy00eGwgbXgtYXV0b1wiPlxuICAgICAgICAgICAg8J+OtSDZhdmE2YHZgyDYp9mE2LTYrti12Yog2LXYp9ixINij2YXYqti54oCmINij2LbZgSDZiNi02KfYsdmDINi12YjYqtmK2KfYqtmDINmF2Lkg2KfZhNis2YXZiti5LlxuICAgICAgICAgIDwvcD5cbiAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgey8qINin2YTZgtiz2YUg2KfZhNit2KfYr9mKINi52LTYsSAtINmF2LTYp9ix2YPYqSDYp9mE2LXZiNixICovfVxuICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImJnLXBpbmstNjAwIHRleHQtd2hpdGUgcC04IHRleHQtY2VudGVyXCI+XG4gICAgICAgICAgPGgyIGNsYXNzTmFtZT1cInRleHQtM3hsIGZvbnQtYm9sZCBtYi00XCI+8J+TuCDZhdi02KfYsdmD2Kkg2KfZhNi12YjYsTwvaDI+XG4gICAgICAgICAgPHAgY2xhc3NOYW1lPVwidGV4dC1sZyBsZWFkaW5nLXJlbGF4ZWQgbWF4LXctNHhsIG14LWF1dG9cIj5cbiAgICAgICAgICAgINmK2YXZg9mG2YMg2YXYtNin2LHZg9ipINi12YjYsSDZhdmGINin2YTYpdmG2KrYsdmG2Kog2KPZiCDZhdmGINis2YfYp9iy2YMg2KfZhNi02K7YtdmKINmF2Lkg2KzZhdmK2Lkg2KfZhNij2LTYrtin2LVcbiAgICAgICAgICA8L3A+XG4gICAgICAgIDwvZGl2PlxuXG4gICAgICAgIHsvKiDYp9mE2YLYs9mFINin2YTYq9in2YbZiiDYudi02LEgLSDYrdin2KbYtyDYp9mE2YrZiNmF2YrYp9iqICovfVxuICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImJnLWJsdWUtNzAwIHRleHQtd2hpdGUgcC04IHRleHQtY2VudGVyXCI+XG4gICAgICAgICAgPGgyIGNsYXNzTmFtZT1cInRleHQtM3hsIGZvbnQtYm9sZCBtYi00XCI+8J+TtyDYrdin2KbYtyDYp9mE2YrZiNmF2YrYp9iqPC9oMj5cbiAgICAgICAgICA8cCBjbGFzc05hbWU9XCJ0ZXh0LWxnIGxlYWRpbmctcmVsYXhlZCBtYXgtdy00eGwgbXgtYXV0b1wiPlxuICAgICAgICAgICAg2KrYs9iq2LfZiti5INmG2LTYsSDZitmI2YXZitin2KrZgyDYudmE2Ykg2K3Yp9im2LfZgyDYp9mE2K7Yp9i1INio2YMg2YjZhdi02KfYsdmD2KrZh9inINmF2Lkg2KPYtdiv2YLYp9im2YNcbiAgICAgICAgICA8L3A+XG4gICAgICAgIDwvZGl2PlxuXG4gICAgICAgIHsvKiDYp9mE2YLYs9mFINin2YTYq9in2YTYqyDYudi02LEgLSDYp9mE2KPZhdin2YYg2YjYp9mE2K7YtdmI2LXZitipICovfVxuICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImJnLXJlZC04MDAgdGV4dC13aGl0ZSBwLTggdGV4dC1jZW50ZXJcIj5cbiAgICAgICAgICA8aDIgY2xhc3NOYW1lPVwidGV4dC0zeGwgZm9udC1ib2xkIG1iLTRcIj7wn5SSINin2YTYo9mF2KfZhiDZiNin2YTYrti12YjYtdmK2Kk8L2gyPlxuICAgICAgICAgIDxwIGNsYXNzTmFtZT1cInRleHQtbGcgbGVhZGluZy1yZWxheGVkIG1heC13LTR4bCBteC1hdXRvXCI+XG4gICAgICAgICAgICDZgdmKINi02KfYqiDYp9mE2LnYsdioINmG2YfYqtmFINio2K3Zhdin2YrYqtmDINij2YjZhNin2YsuINis2YXZiti5INio2YrYp9mG2KfYqtmDINmI2YXYudmE2YjZhdin2KrZgyDZitiq2YUg2KrYtNmB2YrYsdmH2Kcg2YjZhNinINmG2LTYp9ix2YPZh9inINmF2Lkg2KPZiiDYt9ix2YEg2KvYp9mE2KsuINin2YTZhdi52YTZiNmF2KfYqiDYp9mE2YjYrdmK2K/YqSDYp9mE2KrZiiDZgtivINmK2LHYp9mH2Kcg2KfZhNii2K7YsdmI2YYg2YfZiiDZhdinINiq2K7Yqtin2LHZhyDYo9mG2Kog2KjZhtmB2LPZgyDZiNiq2LbZitmB2Ycg2KXZhNmJINmF2YTZgdmDINin2YTYtNiu2LXZii5cbiAgICAgICAgICA8L3A+XG4gICAgICAgICAgPHAgY2xhc3NOYW1lPVwidGV4dC1sZyBtdC0yIGxlYWRpbmctcmVsYXhlZCBtYXgtdy00eGwgbXgtYXV0b1wiPlxuICAgICAgICAgICAg2KPZhdinINij2Yog2LHYs9in2KbZhNiMINmG2LXZiNi1INij2Ygg2YjYs9in2KbYtyDYqtmC2YjZhSDYqNmF2LTYp9ix2YPYqtmH2Kcg2YXYuSDYp9mE2KLYrtix2YrZhiDZgdmH2Yog2KrYqNmC2Ykg2KrYrdiqINmF2LPYpNmI2YTZitiq2YMg2KfZhNi02K7YtdmK2KkuINmH2K/ZgdmG2Kcg2KPZhiDZhtmI2YHYsSDZhNmDINio2YrYptipINii2YXZhtip2Iwg2YjYp9mE2KfYrtiq2YrYp9ixINiv2KfYptmF2YvYpyDYqNmK2YYg2YrYr9mK2YMuXG4gICAgICAgICAgPC9wPlxuICAgICAgICA8L2Rpdj5cblxuICAgICAgICB7Lyog2KfZhNmC2LPZhSDYp9mE2KPYrtmK2LEgLSDYutix2YEg2KfZhNiv2LHYr9i02KkgKi99XG4gICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiYmctYmx1ZS02MDAgdGV4dC13aGl0ZSBwLTggdGV4dC1jZW50ZXJcIj5cbiAgICAgICAgICA8aDIgY2xhc3NOYW1lPVwidGV4dC0zeGwgZm9udC1ib2xkIG1iLTZcIj7Yr9ix2K/YtNipINi52LHYqNmK2Kkg2YTZhNiq2YLZiiDYqNij2LXYr9mC2KfYoSDYudix2Kgg2KzYr9ivINmF2YYg2YXYrtiq2YTZgSDYo9mG2K3Yp9ihINin2YTYudin2YTZhSDZiNin2LPYqtmF2KrYuSDYqNin2YTYr9ix2K/YtNipINin2YTYrNmF2KfYudmK2Kkg2KPZiCDYqNiv2KEg2YXYrdin2K/Yq9ipINiu2KfYtdipINmB2Yog2YXZiNmC2Lkg2LTYp9iqINi52LHYqNmKINiq2LnYp9ix2YEg2KjYr9mI2YYg2KrYs9is2YrZhCDYo9mIINin2LTYqtix2KfZgyDZhdis2KfZhtmL2Kc8L2gyPlxuICAgICAgICAgIDxoMyBjbGFzc05hbWU9XCJ0ZXh0LTJ4bCBmb250LXNlbWlib2xkIG1iLTRcIj7Yutix2YEg2KfZhNiv2LHYr9i02Kk8L2gzPlxuICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZ3JpZCBncmlkLWNvbHMtMiBtZDpncmlkLWNvbHMtNCBnYXAtNCBtYXgtdy00eGwgbXgtYXV0byBtdC02XCI+XG4gICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInNwYWNlLXktMlwiPlxuICAgICAgICAgICAgICA8YSBocmVmPVwiL3dhdGFuXCIgY2xhc3NOYW1lPVwiYmxvY2sgdGV4dC15ZWxsb3ctMzAwIGhvdmVyOnRleHQteWVsbG93LTIwMCB0cmFuc2l0aW9uLWNvbG9yc1wiPtiv2LHYr9i02Ycg2KfZhNmI2LfZhjwvYT5cbiAgICAgICAgICAgICAgPGEgaHJlZj1cIi9hbGdlcmlhXCIgY2xhc3NOYW1lPVwiYmxvY2sgdGV4dC15ZWxsb3ctMzAwIGhvdmVyOnRleHQteWVsbG93LTIwMCB0cmFuc2l0aW9uLWNvbG9yc1wiPti02KfYqiDYp9mE2KzYstin2KbYsTwvYT5cbiAgICAgICAgICAgICAgPGEgaHJlZj1cIi9iYWhyYWluXCIgY2xhc3NOYW1lPVwiYmxvY2sgdGV4dC15ZWxsb3ctMzAwIGhvdmVyOnRleHQteWVsbG93LTIwMCB0cmFuc2l0aW9uLWNvbG9yc1wiPti02KfYqiDYp9mE2KjYrdix2YrZhjwvYT5cbiAgICAgICAgICAgICAgPGEgaHJlZj1cIi91YWVcIiBjbGFzc05hbWU9XCJibG9jayB0ZXh0LXllbGxvdy0zMDAgaG92ZXI6dGV4dC15ZWxsb3ctMjAwIHRyYW5zaXRpb24tY29sb3JzXCI+2LTYp9iqINin2YTYpdmF2KfYsdin2Ko8L2E+XG4gICAgICAgICAgICAgIDxhIGhyZWY9XCIvam9yZGFuXCIgY2xhc3NOYW1lPVwiYmxvY2sgdGV4dC15ZWxsb3ctMzAwIGhvdmVyOnRleHQteWVsbG93LTIwMCB0cmFuc2l0aW9uLWNvbG9yc1wiPti02KfYqiDYp9mE2KPYsdiv2YY8L2E+XG4gICAgICAgICAgICAgIDxhIGhyZWY9XCIva3V3YWl0XCIgY2xhc3NOYW1lPVwiYmxvY2sgdGV4dC15ZWxsb3ctMzAwIGhvdmVyOnRleHQteWVsbG93LTIwMCB0cmFuc2l0aW9uLWNvbG9yc1wiPti02KfYqiDYp9mE2YPZiNmK2Ko8L2E+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwic3BhY2UteS0yXCI+XG4gICAgICAgICAgICAgIDxhIGhyZWY9XCIvbGlieWFcIiBjbGFzc05hbWU9XCJibG9jayB0ZXh0LXllbGxvdy0zMDAgaG92ZXI6dGV4dC15ZWxsb3ctMjAwIHRyYW5zaXRpb24tY29sb3JzXCI+2LTYp9iqINmE2YrYqNmK2Kc8L2E+XG4gICAgICAgICAgICAgIDxhIGhyZWY9XCIvdHVuaXNpYVwiIGNsYXNzTmFtZT1cImJsb2NrIHRleHQteWVsbG93LTMwMCBob3Zlcjp0ZXh0LXllbGxvdy0yMDAgdHJhbnNpdGlvbi1jb2xvcnNcIj7YtNin2Kog2KrZiNmG2LM8L2E+XG4gICAgICAgICAgICAgIDxhIGhyZWY9XCIvbW9yb2Njb1wiIGNsYXNzTmFtZT1cImJsb2NrIHRleHQteWVsbG93LTMwMCBob3Zlcjp0ZXh0LXllbGxvdy0yMDAgdHJhbnNpdGlvbi1jb2xvcnNcIj7YtNin2Kog2KfZhNmF2LrYsdioPC9hPlxuICAgICAgICAgICAgICA8YSBocmVmPVwiL29tYW5cIiBjbGFzc05hbWU9XCJibG9jayB0ZXh0LXllbGxvdy0zMDAgaG92ZXI6dGV4dC15ZWxsb3ctMjAwIHRyYW5zaXRpb24tY29sb3JzXCI+2LTYp9iqINi52YXYp9mGPC9hPlxuICAgICAgICAgICAgICA8YSBocmVmPVwiL3N1ZGFuXCIgY2xhc3NOYW1lPVwiYmxvY2sgdGV4dC15ZWxsb3ctMzAwIGhvdmVyOnRleHQteWVsbG93LTIwMCB0cmFuc2l0aW9uLWNvbG9yc1wiPti02KfYqiDYp9mE2LPZiNiv2KfZhjwvYT5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJzcGFjZS15LTJcIj5cbiAgICAgICAgICAgICAgPGEgaHJlZj1cIi9wYWxlc3RpbmVcIiBjbGFzc05hbWU9XCJibG9jayB0ZXh0LXllbGxvdy0zMDAgaG92ZXI6dGV4dC15ZWxsb3ctMjAwIHRyYW5zaXRpb24tY29sb3JzXCI+2LTYp9iqINmB2YTYs9i32YrZhjwvYT5cbiAgICAgICAgICAgICAgPGEgaHJlZj1cIi9xYXRhclwiIGNsYXNzTmFtZT1cImJsb2NrIHRleHQteWVsbG93LTMwMCBob3Zlcjp0ZXh0LXllbGxvdy0yMDAgdHJhbnNpdGlvbi1jb2xvcnNcIj7YtNin2Kog2YLYt9ixPC9hPlxuICAgICAgICAgICAgICA8YSBocmVmPVwiL2NvbW9yb3NcIiBjbGFzc05hbWU9XCJibG9jayB0ZXh0LXllbGxvdy0zMDAgaG92ZXI6dGV4dC15ZWxsb3ctMjAwIHRyYW5zaXRpb24tY29sb3JzXCI+2LTYp9iqINis2LLYsSDYp9mE2YLZhdixPC9hPlxuICAgICAgICAgICAgICA8YSBocmVmPVwiL3llbWVuXCIgY2xhc3NOYW1lPVwiYmxvY2sgdGV4dC15ZWxsb3ctMzAwIGhvdmVyOnRleHQteWVsbG93LTIwMCB0cmFuc2l0aW9uLWNvbG9yc1wiPti02KfYqiDYp9mE2YrZhdmGPC9hPlxuICAgICAgICAgICAgICA8YSBocmVmPVwiL2RqaWJvdXRpXCIgY2xhc3NOYW1lPVwiYmxvY2sgdGV4dC15ZWxsb3ctMzAwIGhvdmVyOnRleHQteWVsbG93LTIwMCB0cmFuc2l0aW9uLWNvbG9yc1wiPti02KfYqiDYrNmK2KjZiNiq2Yo8L2E+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwic3BhY2UteS0yXCI+XG4gICAgICAgICAgICAgIDxhIGhyZWY9XCIvZWd5cHRcIiBjbGFzc05hbWU9XCJibG9jayB0ZXh0LXllbGxvdy0zMDAgaG92ZXI6dGV4dC15ZWxsb3ctMjAwIHRyYW5zaXRpb24tY29sb3JzXCI+2LTYp9iqINmF2LXYsTwvYT5cbiAgICAgICAgICAgICAgPGEgaHJlZj1cIi9zYXVkaVwiIGNsYXNzTmFtZT1cImJsb2NrIHRleHQteWVsbG93LTMwMCBob3Zlcjp0ZXh0LXllbGxvdy0yMDAgdHJhbnNpdGlvbi1jb2xvcnNcIj7YtNin2Kog2KfZhNiz2LnZiNiv2YrYqTwvYT5cbiAgICAgICAgICAgICAgPGEgaHJlZj1cIi9sZWJhbm9uXCIgY2xhc3NOYW1lPVwiYmxvY2sgdGV4dC15ZWxsb3ctMzAwIGhvdmVyOnRleHQteWVsbG93LTIwMCB0cmFuc2l0aW9uLWNvbG9yc1wiPti02KfYqiDZhNio2YbYp9mGPC9hPlxuICAgICAgICAgICAgICA8YSBocmVmPVwiL3N5cmlhXCIgY2xhc3NOYW1lPVwiYmxvY2sgdGV4dC15ZWxsb3ctMzAwIGhvdmVyOnRleHQteWVsbG93LTIwMCB0cmFuc2l0aW9uLWNvbG9yc1wiPti02KfYqiDYs9mI2LHZitinPC9hPlxuICAgICAgICAgICAgICA8YSBocmVmPVwiL2lyYXFcIiBjbGFzc05hbWU9XCJibG9jayB0ZXh0LXllbGxvdy0zMDAgaG92ZXI6dGV4dC15ZWxsb3ctMjAwIHRyYW5zaXRpb24tY29sb3JzXCI+2LTYp9iqINin2YTYudix2KfZgjwvYT5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwibXQtOCBzcGFjZS15LTJcIj5cbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBqdXN0aWZ5LWNlbnRlciBpdGVtcy1jZW50ZXIgZ2FwLTQgdGV4dC1zbVwiPlxuICAgICAgICAgICAgICA8YSBocmVmPVwiL3ByaXZhY3lcIiBjbGFzc05hbWU9XCJ0ZXh0LWJsdWUtNDAwIGhvdmVyOnRleHQtYmx1ZS0zMDAgdHJhbnNpdGlvbi1jb2xvcnMgdW5kZXJsaW5lXCI+XG4gICAgICAgICAgICAgICAg2LPZitin2LPYqSDYp9mE2K7YtdmI2LXZitipXG4gICAgICAgICAgICAgIDwvYT5cbiAgICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwidGV4dC1ncmF5LTQwMFwiPnw8L3NwYW4+XG4gICAgICAgICAgICAgIDxhIGhyZWY9XCIvdGVybXNcIiBjbGFzc05hbWU9XCJ0ZXh0LWJsdWUtNDAwIGhvdmVyOnRleHQtYmx1ZS0zMDAgdHJhbnNpdGlvbi1jb2xvcnMgdW5kZXJsaW5lXCI+XG4gICAgICAgICAgICAgICAg2LTYsdmI2Lcg2KfZhNin2LPYqtiu2K/Yp9mFXG4gICAgICAgICAgICAgIDwvYT5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgPHAgY2xhc3NOYW1lPVwidGV4dC1zbSB0ZXh0LWJsdWUtMzAwXCI+8J+SrCDYp9mG2LbZhSDYpdmE2Ykg2LTYp9iqINi52LHYqNmKINmI2KrYudix2YEg2LnZhNmJINin2YTYrNmF2YrYuSDYqNiz2YfZiNmE2Kkg2YjZhdmGINij2Yog2YXZg9in2YYg2KjYp9mE2LnYp9mE2YXigKYg2KjYr9mI2YYg2KPZiiDYqtiz2KzZitmELjwvcD5cbiAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgPC9kaXY+XG4gICAgICA8L2Rpdj5cblxuICAgICAgey8qIE1lbWJlciBMb2dpbiBNb2RhbCAqL31cbiAgICAgIDxEaWFsb2cgb3Blbj17c2hvd01lbWJlck1vZGFsfSBvbk9wZW5DaGFuZ2U9e3NldFNob3dNZW1iZXJNb2RhbH0+XG4gICAgICAgIDxEaWFsb2dDb250ZW50IGNsYXNzTmFtZT1cImdsYXNzLWVmZmVjdCBib3JkZXIgYm9yZGVyLWJvcmRlciBhbmltYXRlLWZhZGUtaW5cIj5cbiAgICAgICAgICA8RGlhbG9nSGVhZGVyPlxuICAgICAgICAgICAgPERpYWxvZ1RpdGxlIGNsYXNzTmFtZT1cInRleHQtY2VudGVyIHRleHQtMnhsIGZvbnQtYm9sZCB0ZXh0LXdoaXRlIGZsZXggaXRlbXMtY2VudGVyIGp1c3RpZnktY2VudGVyIGdhcC0yXCI+XG4gICAgICAgICAgICAgIDxzcGFuPvCflJA8L3NwYW4+XG4gICAgICAgICAgICAgINiq2LPYrNmK2YQg2K/YrtmI2YQg2KfZhNij2LnYttin2KFcbiAgICAgICAgICAgIDwvRGlhbG9nVGl0bGU+XG4gICAgICAgICAgPC9EaWFsb2dIZWFkZXI+XG4gICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJzcGFjZS15LTRcIj5cbiAgICAgICAgICAgIDxJbnB1dFxuICAgICAgICAgICAgICB2YWx1ZT17bWVtYmVyTmFtZX1cbiAgICAgICAgICAgICAgb25DaGFuZ2U9eyhlKSA9PiBzZXRNZW1iZXJOYW1lKGUudGFyZ2V0LnZhbHVlKX1cbiAgICAgICAgICAgICAgcGxhY2Vob2xkZXI9XCLYp9iz2YUg2KfZhNmF2LPYqtiu2K/ZhVwiXG4gICAgICAgICAgICAgIGNsYXNzTmFtZT1cImJnLXNlY29uZGFyeSBib3JkZXItYWNjZW50IHRleHQtd2hpdGUgcGxhY2Vob2xkZXI6dGV4dC1tdXRlZC1mb3JlZ3JvdW5kXCJcbiAgICAgICAgICAgIC8+XG4gICAgICAgICAgICA8SW5wdXRcbiAgICAgICAgICAgICAgdHlwZT1cInBhc3N3b3JkXCJcbiAgICAgICAgICAgICAgdmFsdWU9e21lbWJlclBhc3N3b3JkfVxuICAgICAgICAgICAgICBvbkNoYW5nZT17KGUpID0+IHNldE1lbWJlclBhc3N3b3JkKGUudGFyZ2V0LnZhbHVlKX1cbiAgICAgICAgICAgICAgcGxhY2Vob2xkZXI9XCLZg9mE2YXYqSDYp9mE2YXYsdmI2LFcIlxuICAgICAgICAgICAgICBjbGFzc05hbWU9XCJiZy1zZWNvbmRhcnkgYm9yZGVyLWFjY2VudCB0ZXh0LXdoaXRlIHBsYWNlaG9sZGVyOnRleHQtbXV0ZWQtZm9yZWdyb3VuZFwiXG4gICAgICAgICAgICAgIG9uS2V5UHJlc3M9eyhlKSA9PiBlLmtleSA9PT0gJ0VudGVyJyAmJiBoYW5kbGVNZW1iZXJMb2dpbigpfVxuICAgICAgICAgICAgLz5cbiAgICAgICAgICAgIDxCdXR0b25cbiAgICAgICAgICAgICAgb25DbGljaz17aGFuZGxlTWVtYmVyTG9naW59XG4gICAgICAgICAgICAgIGRpc2FibGVkPXtsb2FkaW5nfVxuICAgICAgICAgICAgICBjbGFzc05hbWU9XCJidG4tcHJpbWFyeSB3LWZ1bGwgdGV4dC13aGl0ZSBweC02IHB5LTMgcm91bmRlZC14bCBmb250LXNlbWlib2xkXCJcbiAgICAgICAgICAgID5cbiAgICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwibWwtMlwiPvCflJE8L3NwYW4+XG4gICAgICAgICAgICAgIHtsb2FkaW5nID8gJ9is2KfYsdmKINin2YTYr9iu2YjZhC4uLicgOiAn2K/YrtmI2YQnfVxuICAgICAgICAgICAgPC9CdXR0b24+XG4gICAgICAgICAgPC9kaXY+XG4gICAgICAgIDwvRGlhbG9nQ29udGVudD5cbiAgICAgIDwvRGlhbG9nPlxuXG4gICAgICB7LyogUmVnaXN0cmF0aW9uIE1vZGFsICovfVxuICAgICAgPERpYWxvZyBvcGVuPXtzaG93UmVnaXN0ZXJNb2RhbH0gb25PcGVuQ2hhbmdlPXtzZXRTaG93UmVnaXN0ZXJNb2RhbH0+XG4gICAgICAgIDxEaWFsb2dDb250ZW50IGNsYXNzTmFtZT1cImdsYXNzLWVmZmVjdCBib3JkZXIgYm9yZGVyLWJvcmRlciBhbmltYXRlLWZhZGUtaW5cIj5cbiAgICAgICAgICA8RGlhbG9nSGVhZGVyPlxuICAgICAgICAgICAgPERpYWxvZ1RpdGxlIGNsYXNzTmFtZT1cInRleHQtY2VudGVyIHRleHQtMnhsIGZvbnQtYm9sZCB0ZXh0LXdoaXRlIGZsZXggaXRlbXMtY2VudGVyIGp1c3RpZnktY2VudGVyIGdhcC0yXCI+XG4gICAgICAgICAgICAgIDxzcGFuPvCfk508L3NwYW4+XG4gICAgICAgICAgICAgINiq2LPYrNmK2YQg2LnYttmI2YrYqSDYrNiv2YrYr9ipXG4gICAgICAgICAgICA8L0RpYWxvZ1RpdGxlPlxuICAgICAgICAgIDwvRGlhbG9nSGVhZGVyPlxuICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwic3BhY2UteS00XCI+XG4gICAgICAgICAgICA8SW5wdXRcbiAgICAgICAgICAgICAgdmFsdWU9e3JlZ2lzdGVyTmFtZX1cbiAgICAgICAgICAgICAgb25DaGFuZ2U9eyhlKSA9PiBzZXRSZWdpc3Rlck5hbWUoZS50YXJnZXQudmFsdWUuc2xpY2UoMCwgMTQpKX1cbiAgICAgICAgICAgICAgcGxhY2Vob2xkZXI9XCLYp9iz2YUg2KfZhNmF2LPYqtiu2K/ZhSDYp9mE2KzYr9mK2K9cIlxuICAgICAgICAgICAgICBjbGFzc05hbWU9XCJiZy1zZWNvbmRhcnkgYm9yZGVyLWFjY2VudCB0ZXh0LXdoaXRlIHBsYWNlaG9sZGVyOnRleHQtbXV0ZWQtZm9yZWdyb3VuZFwiXG4gICAgICAgICAgICAgIG1heExlbmd0aD17MTR9XG4gICAgICAgICAgICAvPlxuICAgICAgICAgICAgPElucHV0XG4gICAgICAgICAgICAgIHR5cGU9XCJwYXNzd29yZFwiXG4gICAgICAgICAgICAgIHZhbHVlPXtyZWdpc3RlclBhc3N3b3JkfVxuICAgICAgICAgICAgICBvbkNoYW5nZT17KGUpID0+IHNldFJlZ2lzdGVyUGFzc3dvcmQoZS50YXJnZXQudmFsdWUpfVxuICAgICAgICAgICAgICBwbGFjZWhvbGRlcj1cItmD2YTZhdipINin2YTZhdix2YjYsSAoNiDYo9it2LHZgSDYudmE2Ykg2KfZhNij2YLZhClcIlxuICAgICAgICAgICAgICBjbGFzc05hbWU9XCJiZy1zZWNvbmRhcnkgYm9yZGVyLWFjY2VudCB0ZXh0LXdoaXRlIHBsYWNlaG9sZGVyOnRleHQtbXV0ZWQtZm9yZWdyb3VuZFwiXG4gICAgICAgICAgICAvPlxuICAgICAgICAgICAgPElucHV0XG4gICAgICAgICAgICAgIHR5cGU9XCJwYXNzd29yZFwiXG4gICAgICAgICAgICAgIHZhbHVlPXtjb25maXJtUGFzc3dvcmR9XG4gICAgICAgICAgICAgIG9uQ2hhbmdlPXsoZSkgPT4gc2V0Q29uZmlybVBhc3N3b3JkKGUudGFyZ2V0LnZhbHVlKX1cbiAgICAgICAgICAgICAgcGxhY2Vob2xkZXI9XCLYqtij2YPZitivINmD2YTZhdipINin2YTZhdix2YjYsVwiXG4gICAgICAgICAgICAgIGNsYXNzTmFtZT1cImJnLXNlY29uZGFyeSBib3JkZXItYWNjZW50IHRleHQtd2hpdGUgcGxhY2Vob2xkZXI6dGV4dC1tdXRlZC1mb3JlZ3JvdW5kXCJcbiAgICAgICAgICAgICAgb25LZXlQcmVzcz17KGUpID0+IGUua2V5ID09PSAnRW50ZXInICYmIGhhbmRsZVJlZ2lzdGVyKCl9XG4gICAgICAgICAgICAvPlxuICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJzcGFjZS15LTJcIj5cbiAgICAgICAgICAgICAgPGxhYmVsIGNsYXNzTmFtZT1cInRleHQtd2hpdGUgdGV4dC1zbSBmb250LW1lZGl1bVwiPtin2YTYrNmG2LM6PC9sYWJlbD5cbiAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGdhcC00XCI+XG4gICAgICAgICAgICAgICAgPGxhYmVsIGNsYXNzTmFtZT1cImZsZXggaXRlbXMtY2VudGVyIGdhcC0yIHRleHQtd2hpdGUgY3Vyc29yLXBvaW50ZXJcIj5cbiAgICAgICAgICAgICAgICAgIDxpbnB1dFxuICAgICAgICAgICAgICAgICAgICB0eXBlPVwicmFkaW9cIlxuICAgICAgICAgICAgICAgICAgICBuYW1lPVwicmVnaXN0ZXJHZW5kZXJcIlxuICAgICAgICAgICAgICAgICAgICB2YWx1ZT1cIm1hbGVcIlxuICAgICAgICAgICAgICAgICAgICBjaGVja2VkPXtyZWdpc3RlckdlbmRlciA9PT0gJ21hbGUnfVxuICAgICAgICAgICAgICAgICAgICBvbkNoYW5nZT17KGUpID0+IHNldFJlZ2lzdGVyR2VuZGVyKGUudGFyZ2V0LnZhbHVlKX1cbiAgICAgICAgICAgICAgICAgICAgY2xhc3NOYW1lPVwidGV4dC1ibHVlLTUwMFwiXG4gICAgICAgICAgICAgICAgICAvPlxuICAgICAgICAgICAgICAgICAg8J+nkSDYsNmD2LFcbiAgICAgICAgICAgICAgICA8L2xhYmVsPlxuICAgICAgICAgICAgICAgIDxsYWJlbCBjbGFzc05hbWU9XCJmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMiB0ZXh0LXdoaXRlIGN1cnNvci1wb2ludGVyXCI+XG4gICAgICAgICAgICAgICAgICA8aW5wdXRcbiAgICAgICAgICAgICAgICAgICAgdHlwZT1cInJhZGlvXCJcbiAgICAgICAgICAgICAgICAgICAgbmFtZT1cInJlZ2lzdGVyR2VuZGVyXCJcbiAgICAgICAgICAgICAgICAgICAgdmFsdWU9XCJmZW1hbGVcIlxuICAgICAgICAgICAgICAgICAgICBjaGVja2VkPXtyZWdpc3RlckdlbmRlciA9PT0gJ2ZlbWFsZSd9XG4gICAgICAgICAgICAgICAgICAgIG9uQ2hhbmdlPXsoZSkgPT4gc2V0UmVnaXN0ZXJHZW5kZXIoZS50YXJnZXQudmFsdWUpfVxuICAgICAgICAgICAgICAgICAgICBjbGFzc05hbWU9XCJ0ZXh0LXBpbmstNTAwXCJcbiAgICAgICAgICAgICAgICAgIC8+XG4gICAgICAgICAgICAgICAgICDwn5GpINij2YbYq9mJXG4gICAgICAgICAgICAgICAgPC9sYWJlbD5cbiAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICA8L2Rpdj5cblxuICAgICAgICAgICAgPElucHV0XG4gICAgICAgICAgICAgIHR5cGU9XCJudW1iZXJcIlxuICAgICAgICAgICAgICB2YWx1ZT17cmVnaXN0ZXJBZ2V9XG4gICAgICAgICAgICAgIG9uQ2hhbmdlPXsoZSkgPT4gc2V0UmVnaXN0ZXJBZ2UoZS50YXJnZXQudmFsdWUpfVxuICAgICAgICAgICAgICBwbGFjZWhvbGRlcj1cItin2YTYudmF2LEgKNin2K7YqtmK2KfYsdmKKVwiXG4gICAgICAgICAgICAgIG1pbj1cIjE4XCJcbiAgICAgICAgICAgICAgbWF4PVwiMTAwXCJcbiAgICAgICAgICAgICAgY2xhc3NOYW1lPVwiYmctc2Vjb25kYXJ5IGJvcmRlci1hY2NlbnQgdGV4dC13aGl0ZSBwbGFjZWhvbGRlcjp0ZXh0LW11dGVkLWZvcmVncm91bmRcIlxuICAgICAgICAgICAgLz5cblxuICAgICAgICAgICAgPElucHV0XG4gICAgICAgICAgICAgIHZhbHVlPXtyZWdpc3RlckNvdW50cnl9XG4gICAgICAgICAgICAgIG9uQ2hhbmdlPXsoZSkgPT4gc2V0UmVnaXN0ZXJDb3VudHJ5KGUudGFyZ2V0LnZhbHVlKX1cbiAgICAgICAgICAgICAgcGxhY2Vob2xkZXI9XCLYp9mE2KjZhNivICjYp9iu2KrZitin2LHZiilcIlxuICAgICAgICAgICAgICBjbGFzc05hbWU9XCJiZy1zZWNvbmRhcnkgYm9yZGVyLWFjY2VudCB0ZXh0LXdoaXRlIHBsYWNlaG9sZGVyOnRleHQtbXV0ZWQtZm9yZWdyb3VuZFwiXG4gICAgICAgICAgICAvPlxuXG4gICAgICAgICAgICA8SW5wdXRcbiAgICAgICAgICAgICAgdmFsdWU9e3JlZ2lzdGVyU3RhdHVzfVxuICAgICAgICAgICAgICBvbkNoYW5nZT17KGUpID0+IHNldFJlZ2lzdGVyU3RhdHVzKGUudGFyZ2V0LnZhbHVlKX1cbiAgICAgICAgICAgICAgcGxhY2Vob2xkZXI9XCLYp9mE2K3Yp9mE2Kkg2KfZhNin2KzYqtmF2KfYudmK2KkgKNin2K7YqtmK2KfYsdmKKVwiXG4gICAgICAgICAgICAgIGNsYXNzTmFtZT1cImJnLXNlY29uZGFyeSBib3JkZXItYWNjZW50IHRleHQtd2hpdGUgcGxhY2Vob2xkZXI6dGV4dC1tdXRlZC1mb3JlZ3JvdW5kXCJcbiAgICAgICAgICAgIC8+XG5cbiAgICAgICAgICAgIDxJbnB1dFxuICAgICAgICAgICAgICB2YWx1ZT17cmVnaXN0ZXJSZWxhdGlvbn1cbiAgICAgICAgICAgICAgb25DaGFuZ2U9eyhlKSA9PiBzZXRSZWdpc3RlclJlbGF0aW9uKGUudGFyZ2V0LnZhbHVlKX1cbiAgICAgICAgICAgICAgcGxhY2Vob2xkZXI9XCLYp9mE2KjYrdirINi52YYgKNin2K7YqtmK2KfYsdmKKVwiXG4gICAgICAgICAgICAgIGNsYXNzTmFtZT1cImJnLXNlY29uZGFyeSBib3JkZXItYWNjZW50IHRleHQtd2hpdGUgcGxhY2Vob2xkZXI6dGV4dC1tdXRlZC1mb3JlZ3JvdW5kXCJcbiAgICAgICAgICAgIC8+XG4gICAgICAgICAgICA8QnV0dG9uXG4gICAgICAgICAgICAgIG9uQ2xpY2s9e2hhbmRsZVJlZ2lzdGVyfVxuICAgICAgICAgICAgICBkaXNhYmxlZD17bG9hZGluZ31cbiAgICAgICAgICAgICAgY2xhc3NOYW1lPVwiYmctZ3JhZGllbnQtdG8tciBmcm9tLXB1cnBsZS02MDAgdG8tcHVycGxlLTcwMCBob3Zlcjpmcm9tLXB1cnBsZS03MDAgaG92ZXI6dG8tcHVycGxlLTgwMCB3LWZ1bGwgdGV4dC13aGl0ZSBweC02IHB5LTMgcm91bmRlZC14bCBmb250LXNlbWlib2xkIHRyYW5zaXRpb24tYWxsIGR1cmF0aW9uLTMwMFwiXG4gICAgICAgICAgICA+XG4gICAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cIm1sLTJcIj7wn46JPC9zcGFuPlxuICAgICAgICAgICAgICB7bG9hZGluZyA/ICfYrNin2LHZiiDYp9mE2KrYs9is2YrZhC4uLicgOiAn2KXZhti02KfYoSDYp9mE2K3Ys9in2KgnfVxuICAgICAgICAgICAgPC9CdXR0b24+XG4gICAgICAgICAgPC9kaXY+XG4gICAgICAgIDwvRGlhbG9nQ29udGVudD5cbiAgICAgIDwvRGlhbG9nPlxuICAgIDwvZGl2PlxuICApO1xufVxuIl0sImZpbGUiOiIvdmFyL3d3dy9hYmQvY2xpZW50L3NyYy9jb21wb25lbnRzL2NoYXQvV2VsY29tZVNjcmVlbi50c3gifQ==
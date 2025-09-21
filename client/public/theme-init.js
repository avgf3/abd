(function () {
  try {
    var t = localStorage.getItem('selectedTheme');
    if (!t) {
      t = (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches)
        ? 'dark'
        : 'default';
    }
    var themes = {
      default: {
        '--primary': '#667eea',
        '--primary-foreground': '#ffffff',
        '--background': '#ffffff',
        '--foreground': '#1a202c'
      },
      dark: {
        '--primary': '#2c3e50',
        '--primary-foreground': '#ffffff',
        '--background': '#1a202c',
        '--foreground': '#ffffff'
      }
    };
    var cssVars = themes[t] || themes.default;
    var root = document.documentElement;
    for (var k in cssVars) root.style.setProperty(k, cssVars[k]);
  } catch (e) {}
})();


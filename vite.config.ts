import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import runtimeErrorOverlay from '@replit/vite-plugin-runtime-error-modal';

export default defineConfig({
	plugins: [
		react(),
		runtimeErrorOverlay(),
		...(process.env.NODE_ENV !== 'production' && process.env.REPL_ID !== undefined
			? [await import('@replit/vite-plugin-cartographer').then((m) => m.cartographer())]
			: []),
	],
	resolve: {
		alias: {
			'@': path.resolve(import.meta.dirname, 'client', 'src'),
			'@shared': path.resolve(import.meta.dirname, 'shared'),
			'@assets': path.resolve(import.meta.dirname, 'attached_assets'),
		},
	},
	root: path.resolve(import.meta.dirname, 'client'),
	build: {
		outDir: path.resolve(import.meta.dirname, 'dist/public'),
		emptyOutDir: true,
		// Security and performance optimizations
		minify: 'terser',
		terserOptions: {
			compress: {
				drop_console: process.env.NODE_ENV === 'production',
				drop_debugger: true,
			},
		},
		rollupOptions: {
			output: {
				manualChunks: {
					vendor: ['react', 'react-dom'],
					utils: ['@tanstack/react-query'],
					charts: ['recharts'],
					socket: ['socket.io-client'],
					motion: ['framer-motion'],
					virtuoso: ['react-virtuoso'],
					carousel: ['embla-carousel-react'],
					emoji: ['emoji-regex'],
					icons: ['lucide-react'],
					radix: [
						'@radix-ui/react-accordion',
						'@radix-ui/react-alert-dialog',
						'@radix-ui/react-aspect-ratio',
						'@radix-ui/react-avatar',
						'@radix-ui/react-checkbox',
						'@radix-ui/react-collapsible',
						'@radix-ui/react-context-menu',
						'@radix-ui/react-dialog',
						'@radix-ui/react-dropdown-menu',
						'@radix-ui/react-hover-card',
						'@radix-ui/react-label',
						'@radix-ui/react-menubar',
						'@radix-ui/react-navigation-menu',
						'@radix-ui/react-popover',
						'@radix-ui/react-progress',
						'@radix-ui/react-radio-group',
						'@radix-ui/react-scroll-area',
						'@radix-ui/react-select',
						'@radix-ui/react-separator',
						'@radix-ui/react-slider',
						'@radix-ui/react-slot',
						'@radix-ui/react-switch',
						'@radix-ui/react-tabs',
						'@radix-ui/react-toast',
						'@radix-ui/react-toggle',
						'@radix-ui/react-toggle-group',
						'@radix-ui/react-tooltip'
					]
				},
			},
		},
		// Source maps for debugging in development
		sourcemap: process.env.NODE_ENV !== 'production',
		target: 'es2018',
		cssTarget: 'chrome61',
	},
	server: {
		port: 5173,
		strictPort: true,
		host: process.env.NODE_ENV === 'production' ? '0.0.0.0' : 'localhost',
		fs: {
			strict: true,
			deny: ['**/.*', '**/node_modules/**'],
		},
		// Security headers
		headers:
			process.env.NODE_ENV === 'production'
				? {
					'X-Content-Type-Options': 'nosniff',
					'X-Frame-Options': 'DENY',
					'X-XSS-Protection': '1; mode=block',
					'Referrer-Policy': 'strict-origin-when-cross-origin',
				}
				: {},
	},
	preview: {
		port: 4173,
		strictPort: true,
		host: '0.0.0.0',
	},
	// Environment variables configuration
	envPrefix: ['VITE_', 'PUBLIC_'],
	// Security optimizations
	define: {
		__DEV__: process.env.NODE_ENV !== 'production',
	},
});

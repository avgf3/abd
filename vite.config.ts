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
				manualChunks: (id) => {
					// Split large emoji libraries into separate chunks
					if (id.includes('@emoji-mart') || id.includes('emoji-mart')) {
						return 'emoji-mart';
					}
					if (id.includes('@lottiefiles') || id.includes('lottie')) {
						return 'lottie';
					}
					
					// Split vendor libraries
					if (id.includes('node_modules')) {
						if (id.includes('react') || id.includes('react-dom')) {
							return 'react-vendor';
						}
						if (id.includes('@radix-ui')) {
							return 'radix-ui';
						}
						if (id.includes('socket.io')) {
							return 'socket';
						}
						if (id.includes('framer-motion')) {
							return 'motion';
						}
						if (id.includes('react-virtuoso')) {
							return 'virtuoso';
						}
						if (id.includes('embla-carousel')) {
							return 'carousel';
						}
						if (id.includes('recharts')) {
							return 'charts';
						}
						if (id.includes('@tanstack/react-query')) {
							return 'query';
						}
						if (id.includes('lucide-react')) {
							return 'icons';
						}
						if (id.includes('date-fns')) {
							return 'date-utils';
						}
						if (id.includes('zod')) {
							return 'validation';
						}
						if (id.includes('bcrypt') || id.includes('passport')) {
							return 'auth';
						}
						// Group smaller libraries together
						return 'vendor';
					}
				},
				// Optimize chunk size limits
				chunkFileNames: (chunkInfo) => {
					const facadeModuleId = chunkInfo.facadeModuleId ? chunkInfo.facadeModuleId.split('/').pop() : 'chunk';
					return `assets/[name]-[hash].js`;
				},
				entryFileNames: 'assets/[name]-[hash].js',
				assetFileNames: 'assets/[name]-[hash].[ext]',
			},
		},
		// Increase chunk size warning limit
		chunkSizeWarningLimit: 1000,
		// Source maps for debugging in development
		sourcemap: process.env.NODE_ENV !== 'production',
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

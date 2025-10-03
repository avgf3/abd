import path from 'path';

import type { Express } from 'express';

export function setupDownloadRoute(app: Express) {
	// Legacy path redirect to API path
	app.get('/download-project', (req, res) => {
		res.redirect(308, '/api/download/project');
	});

	// Serve the compressed project file under unified /api path
	app.get('/api/download/project', (req, res) => {
		const filePath = path.join(process.cwd(), 'client/public/arabic-chat-project.tar.gz');
		res.download(filePath, 'arabic-chat-project.tar.gz', (err) => {
			if (err) {
				console.error('Download error:', err);
				res.status(404).json({ error: 'File not found' });
			}
		});
	});
}

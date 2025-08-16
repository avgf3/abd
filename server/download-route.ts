import path from 'path';

import type { Express } from 'express';

export function setupDownloadRoute(app: Express) {
  // Serve the compressed project file
  app.get('/download-project', (req, res) => {
    const filePath = path.join(process.cwd(), 'client/public/arabic-chat-project.tar.gz');
    res.download(filePath, 'arabic-chat-project.tar.gz', (err) => {
      if (err) {
        console.error('Download error:', err);
        res.status(404).json({ error: 'File not found' });
      }
    });
  });
}
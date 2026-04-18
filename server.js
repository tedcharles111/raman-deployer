import express from 'express';
import dotenv from 'dotenv';
import fs from 'fs';
import { deployToNetlifyFromFolder } from './deploy.js';

dotenv.config();
const app = express();
const port = process.env.PORT || 3000;
const host = '0.0.0.0';

app.use(express.json());

app.get('/health', (req, res) => res.status(200).send('OK'));

app.post('/deploy', async (req, res) => {
  try {
    const { siteName, buildFolder } = req.body;
    if (!siteName || !buildFolder) {
      return res.status(400).json({ error: 'siteName and buildFolder are required' });
    }
    if (!fs.existsSync(buildFolder)) {
      return res.status(400).json({ error: `Build folder does not exist: ${buildFolder}` });
    }
    const result = await deployToNetlifyFromFolder(siteName, buildFolder);
    res.json(result);
  } catch (error) {
    console.error('Deployment error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Debug endpoint to check test-site folder
app.get('/debug/ls', (req, res) => {
  const folder = '/opt/render/project/src/test-site';
  let files = [];
  try {
    if (fs.existsSync(folder)) files = fs.readdirSync(folder);
    res.json({ exists: fs.existsSync(folder), files, path: folder });
  } catch(e) {
    res.json({ error: e.message });
  }
});

app.get('/', (req, res) => res.send('Netlify Deploy Service (fixed)'));
app.listen(port, host, () => console.log(`🚀 Running on ${host}:${port}`));

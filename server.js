import express from 'express';
import multer from 'multer';
import AdmZip from 'adm-zip';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { deployToNetlifyFromFolder } from './deploy.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;
const host = '0.0.0.0';

const upload = multer({ storage: multer.memoryStorage() });

app.use(express.json());

app.get('/health', (req, res) => res.status(200).send('OK'));

app.post('/deploy', upload.single('file'), async (req, res) => {
  try {
    const { siteName } = req.body;
    const file = req.file;

    if (!siteName) {
      return res.status(400).json({ error: 'siteName is required' });
    }
    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Create temp folder and extract zip
    const tempDir = path.join('/tmp', `netlify-${Date.now()}`);
    fs.mkdirSync(tempDir, { recursive: true });
    const zipPath = path.join(tempDir, 'site.zip');
    fs.writeFileSync(zipPath, file.buffer);

    // Extract using adm-zip
    const zip = new AdmZip(zipPath);
    zip.extractAllTo(tempDir, true);

    // Deploy the extracted folder
    const result = await deployToNetlifyFromFolder(siteName, tempDir);

    // Cleanup
    fs.rmSync(tempDir, { recursive: true, force: true });

    res.json(result);
  } catch (error) {
    console.error('Deployment error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/', (req, res) => {
  res.send(`
    <h1>Netlify Deploy Service</h1>
    <p>Upload a zip via POST /deploy with multipart/form-data.</p>
    <pre>curl -X POST https://raman-deployer.onrender.com/deploy -F "siteName=my-site" -F "file=@site.zip"</pre>
  `);
});

const server = app.listen(port, host, () => {
  console.log(`🚀 Running on ${host}:${port}`);
});
server.keepAliveTimeout = 120000;
server.headersTimeout = 120000;

import express from 'express';
import dotenv from 'dotenv';
import fs from 'fs';
import { deployToNetlifyFromFolder } from './deploy.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;
const host = '0.0.0.0';

app.use(express.json());

// Health check for Render
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

/**
 * POST /deploy
 * Body: { "siteName": "my-unique-name", "buildFolder": "/absolute/path/to/site" }
 */
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

app.get('/', (req, res) => {
  res.send(`
    <h1>Netlify Deployment Service</h1>
    <p>Send a POST request to <code>/deploy</code> with JSON:</p>
    <pre>{
  "siteName": "my-unique-site-name",
  "buildFolder": "/absolute/path/to/your/static/site"
}</pre>
  `);
});

const server = app.listen(port, host, () => {
  console.log(`🚀 Server running on http://${host}:${port}`);
});

server.keepAliveTimeout = 120000;
server.headersTimeout = 120000;

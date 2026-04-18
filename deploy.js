import fetch from 'node-fetch';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';
import { createReadStream } from 'fs';
import archiver from 'archiver';
import dotenv from 'dotenv';

dotenv.config();

const { NETLIFY_API_KEY } = process.env;
if (!NETLIFY_API_KEY) throw new Error('Missing NETLIFY_API_KEY');

async function zipFolder(folderPath) {
  return new Promise((resolve, reject) => {
    // Verify folder exists and is not empty
    if (!fs.existsSync(folderPath)) {
      return reject(new Error(`Folder does not exist: ${folderPath}`));
    }
    const files = fs.readdirSync(folderPath);
    if (files.length === 0) {
      return reject(new Error(`Folder is empty: ${folderPath}`));
    }
    console.log(`📁 Zipping ${files.length} files from ${folderPath}`);

    const chunks = [];
    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.on('error', reject);
    archive.on('data', (chunk) => chunks.push(chunk));
    archive.on('end', () => resolve(Buffer.concat(chunks)));
    archive.directory(folderPath, false);
    archive.finalize();
  });
}

async function createNetlifySite(siteName) {
  const url = 'https://api.netlify.com/api/v1/sites';
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${NETLIFY_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name: siteName }),
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to create site: ${response.status} ${errorText}`);
  }
  return await response.json();
}

async function deployToNetlify(siteId, zipBuffer) {
  const form = new FormData();
  form.append('file', zipBuffer, { filename: 'site.zip', contentType: 'application/zip' });
  const url = `https://api.netlify.com/api/v1/sites/${siteId}/deploys`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${NETLIFY_API_KEY}`,
      ...form.getHeaders(),
    },
    body: form,
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Deploy failed: ${response.status} ${errorText}`);
  }
  return await response.json();
}

export async function deployToNetlifyFromFolder(siteName, buildFolder) {
  console.log(`🚀 Deploying ${siteName} from ${buildFolder}`);
  const zipBuffer = await zipFolder(buildFolder);
  console.log(`📦 Zip size: ${zipBuffer.length} bytes`);
  const site = await createNetlifySite(siteName);
  console.log(`✅ Site created: ${site.id}`);
  const deploy = await deployToNetlify(site.id, zipBuffer);
  console.log(`✅ Deployed: ${deploy.id}`);
  return {
    url: site.ssl_url || site.url,
    siteId: site.id,
    deployId: deploy.id,
  };
}

import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import archiver from 'archiver';
import dotenv from 'dotenv';

dotenv.config();

const { NETLIFY_API_KEY } = process.env;
if (!NETLIFY_API_KEY) throw new Error('Missing NETLIFY_API_KEY');

async function zipFolder(folderPath) {
  return new Promise((resolve, reject) => {
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

async function createAndDeploySite(siteName, zipBuffer) {
  // Create site with the zip file attached directly (raw binary)
  const createUrl = 'https://api.netlify.com/api/v1/sites';
  const createResponse = await fetch(createUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${NETLIFY_API_KEY}`,
      'Content-Type': 'application/zip',  // Critical: raw zip, not multipart
    },
    body: zipBuffer,
  });
  if (!createResponse.ok) {
    const errorText = await createResponse.text();
    throw new Error(`Failed to create site: ${createResponse.status} ${errorText}`);
  }
  const site = await createResponse.json();
  console.log(`✅ Site created: ${site.id}, URL: ${site.url}`);
  return {
    url: site.ssl_url || site.url,
    siteId: site.id,
    deployId: site.deploy_id || 'created',
  };
}

export async function deployToNetlifyFromFolder(siteName, buildFolder) {
  console.log(`🚀 Deploying ${siteName} from ${buildFolder}`);
  const zipBuffer = await zipFolder(buildFolder);
  console.log(`📦 Zip size: ${zipBuffer.length} bytes`);
  const result = await createAndDeploySite(siteName, zipBuffer);
  return result;
}

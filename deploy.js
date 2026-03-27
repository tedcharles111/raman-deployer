import fetch from 'node-fetch';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';
import archiver from 'archiver';

const { NETLIFY_API_KEY } = process.env;

if (!NETLIFY_API_KEY) {
  throw new Error('Missing NETLIFY_API_KEY environment variable');
}

/**
 * Zip a folder into a buffer
 */
async function zipFolder(folderPath) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.on('error', reject);
    archive.on('data', (chunk) => chunks.push(chunk));
    archive.on('end', () => resolve(Buffer.concat(chunks)));
    archive.directory(folderPath, false);
    archive.finalize();
  });
}

/**
 * Create a new Netlify site
 */
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
  const site = await response.json();
  return site;
}

/**
 * Deploy a zip file to an existing Netlify site
 */
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
  const deploy = await response.json();
  return deploy;
}

/**
 * Main function: deploy a folder to Netlify.
 * @param {string} siteName - Desired site name (must be globally unique)
 * @param {string} buildFolder - Absolute path to built static site
 * @returns {Promise<{url: string, siteId: string, deployId: string}>}
 */
export async function deployToNetlifyFromFolder(siteName, buildFolder) {
  // 1. Zip the folder
  console.log('📦 Zipping build folder...');
  const zipBuffer = await zipFolder(buildFolder);

  // 2. Create a new site
  console.log('🌐 Creating Netlify site...');
  const site = await createNetlifySite(siteName);
  const siteId = site.id;
  const siteUrl = site.ssl_url || site.url;

  // 3. Deploy the zip
  console.log('🚀 Deploying to Netlify...');
  const deploy = await deployToNetlify(siteId, zipBuffer);

  return {
    url: siteUrl,
    siteId,
    deployId: deploy.id,
  };
}

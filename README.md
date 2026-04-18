# Netlify Deployment Service

Deploy static sites to Netlify via a simple REST API.

## Setup

1. Clone this repository.
2. Copy `.env.example` to `.env` and add your Netlify API key.
3. Run `npm install`.
4. Start the server: `npm start` (or `npm run dev` for auto‑reload).

## Environment Variables

- `NETLIFY_API_KEY` – Your Netlify personal access token.
- `PORT` – Optional, defaults to 3000.

## Usage

Send a `POST` request to `/deploy` with JSON:

```json
{
  "siteName": "my-unique-site-name",
  "buildFolder": "/absolute/path/to/built/site"
}
# dummy

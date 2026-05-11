const TRIPO_KEY = 'tsk_dOQ0QuJ3q9b4Ryb7MyASxFs5b7TbMNJvgBzBh1U8B2x';
const BASE = 'https://api.tripo3d.ai/v2/openapi';

exports.handler = async function(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  const params = event.queryStringParameters || {};

  // Proxy mode: fetch any external URL (for GLB preview)
  if (params.proxy) {
    try {
      const proxyUrl = decodeURIComponent(params.proxy);
      const resp = await fetch(proxyUrl);
      if (!resp.ok) return { statusCode: resp.status, headers, body: 'proxy error' };
      const buf = await resp.arrayBuffer();
      const b64 = Buffer.from(buf).toString('base64');
      return {
        statusCode: 200,
        headers: {
          ...headers,
          'Content-Type': resp.headers.get('content-type') || 'application/octet-stream'
        },
        body: b64,
        isBase64Encoded: true
      };
    } catch(e) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
    }
  }

  // Tripo API proxy
  try {
    const path = params.path || '';
    const url = BASE + '/' + path;

    let fetchOpts = {
      method: event.httpMethod,
      headers: { 'Authorization': 'Bearer ' + TRIPO_KEY }
    };

    if (event.httpMethod === 'POST') {
      const contentType = (event.headers['content-type'] || event.headers['Content-Type'] || '');
      if (contentType.includes('multipart')) {
        const buf = Buffer.from(event.body, event.isBase64Encoded ? 'base64' : 'utf8');
        fetchOpts.body = buf;
        fetchOpts.headers['Content-Type'] = contentType;
      } else {
        fetchOpts.body = event.body;
        fetchOpts.headers['Content-Type'] = 'application/json';
      }
    }

    const resp = await fetch(url, fetchOpts);
    const text = await resp.text();

    return {
      statusCode: resp.status,
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: text
    };
  } catch(e) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ code: -1, message: e.message })
    };
  }
};

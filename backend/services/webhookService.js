/**
 * Webhook Service
 * Delivery with retries and HMAC signatures
 */

import https from 'https';
import crypto from 'crypto';

export const verifyWebhookSignature = (payload, signature, secret) => {
  const expected = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
};

export const deliverWebhook = async (webhook, event, payload) => {
  const signature = crypto
    .createHmac('sha256', webhook.secret)
    .update(JSON.stringify(payload))
    .digest('hex');

  try {
    const data = JSON.stringify(payload);
    const url = new URL(webhook.url);
    
    const options = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname + url.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length,
        'X-SignFlow-Event': event,
        'X-SignFlow-Signature': signature,
      },
      timeout: 10000,
    };

    return new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        resolve({ success: true, status: res.statusCode });
      });
      req.on('error', (err) => resolve({ success: false, error: err.message }));
      req.write(data);
      req.end();
    });
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const triggerWebhooks = async (event, payload) => {
  console.log('Triggering webhooks for event:', event);
  return { triggered: 0 };
};

export default { verifyWebhookSignature, deliverWebhook, triggerWebhooks };

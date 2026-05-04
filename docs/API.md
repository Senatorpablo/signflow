# SignFlow API Documentation

## Authentication

### Register
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword",
  "name": "John Doe"
}
```

### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "USER"
  }
}
```

## Documents

### Create Document
```http
POST /api/documents
Content-Type: multipart/form-data
Authorization: Bearer {token}

file: [PDF File]
title: "Contract Agreement"
```

### List Documents
```http
GET /api/documents?page=1&limit=20&status=SENT
Authorization: Bearer {token}
```

### Get Document
```http
GET /api/documents/{id}
Authorization: Bearer {token}
```

### Update Fields
```http
PATCH /api/documents/{id}/fields
Content-Type: application/json
Authorization: Bearer {token}

{
  "fields": [
    {
      "type": "SIGNATURE",
      "page": 1,
      "x": 100,
      "y": 200,
      "width": 200,
      "height": 50,
      "required": true
    }
  ]
}
```

### Send for Signing
```http
POST /api/documents/{id}/send
Content-Type: application/json
Authorization: Bearer {token}

{
  "signers": [
    {
      "email": "signer@example.com",
      "name": "Jane Smith",
      "order": 1
    }
  ],
  "message": "Please sign this document"
}
```

## Signatures

### Sign Document
```http
POST /api/signatures/sign/{token}
Content-Type: application/json

{
  "fieldId": "field-uuid",
  "signatureData": "data:image/png;base64,...",
  "type": "DRAWN"
}
```

### Complete Signing
```http
POST /api/signatures/complete/{token}
```

## Webhooks

### Create Webhook
```http
POST /api/webhooks
Content-Type: application/json
Authorization: Bearer {token}

{
  "name": "Document Completed",
  "url": "https://your-app.com/webhooks/signflow",
  "events": ["DOCUMENT_COMPLETED", "DOCUMENT_SIGNED"],
  "secret": "webhook-secret-key"
}
```

### Webhook Payload
```json
{
  "event": "DOCUMENT_COMPLETED",
  "timestamp": "2026-01-01T00:00:00Z",
  "data": {
    "documentId": "uuid",
    "title": "Contract Agreement",
    "completedAt": "2026-01-01T00:00:00Z"
  }
}
```

## Rate Limits

- Free tier: 100 requests/minute
- Professional: 1000 requests/minute
- Enterprise: 10000 requests/minute

## Error Codes

| Code | Description |
|------|-------------|
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 429 | Rate Limited |
| 500 | Server Error |

## SDKs

- [JavaScript SDK](https://github.com/signflowco/js-sdk)
- [Python SDK](https://github.com/signflowco/python-sdk)
- [PHP SDK](https://github.com/signflowco/php-sdk)

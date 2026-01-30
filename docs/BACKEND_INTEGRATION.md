# Backend Integration Guide

This guide details the integration between the React Frontend and the Backend API Gateway (`api.audicarefono.com.br`).

## Overview

The frontend no longer communicates directly with UAZAPI. All requests are proxied through the backend to ensure security (hiding API tokens) and consistency.

### Authentication
All requests MUST include the Supabase Session Token in the Authorization header:
`Authorization: Bearer <SUPABASE_ACCESS_TOKEN>`

### Configuration
Configuration is located in `src/config/apiConfig.js`.
Base URL: `https://api.audicarefono.com.br/api`

## Endpoints

### WhatsApp (`/wa`)

#### 1. Get Contacts
- **GET** `/wa/contacts`
- **Query Params:** `page`, `limit`
- **Response:** Array of contact objects.

#### 2. Get Chat History
- **GET** `/wa/chat-history/:phone`
- **Params:** `phone` (digits only preferred)
- **Response:** Array of message objects sorted by date.

#### 3. Send Text
- **POST** `/wa/send-text`
- **Body:** `{ "to": "5511999999999", "text": "Hello" }`

#### 4. Send Media
- **POST** `/wa/send-media`
- **Body:** `FormData`
  - `to`: Phone number
  - `file`: File Blob
  - `type`: 'image' | 'video' | 'audio' | 'document'

#### 5. Health Check
- **GET** `/wa/health-check`
- **Response:** `{ "status": "connected", ... }`

## Service Layer

The `src/services/whatsappService.js` acts as the single source of truth for API calls. It implements:
- **Authentication Injection:** Automatically adds headers.
- **Retry Logic:** Exponential backoff for 5xx errors.
- **Logging:** Integrated with `debugService` for the Debug Panel.
- **Error Handling:** Standardized error throwing for UI consumption.

## UI Components

- **ConversationList:** Consumes `getContacts` via `useWhatsApp` hook.
- **ChatWindow:** Consumes `getMessages` via `useWhatsApp` hook.
- **Sync:** `useWhatsApp` implements polling (5s active, 30s background).

## Troubleshooting

If messages are not sending:
1. Check the **Debug Panel** in the Inbox.
2. Verify `Bearer` token presence in headers.
3. Ensure the backend proxy is reachable (`/health-check`).
4. Check if the WhatsApp instance is connected via the QR Code.
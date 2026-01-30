# Security & API Documentation

## API Configuration

All API requests are routed through a secure, centralized domain.

- **Base URL**: `https://api.audicarefono.com.br/api`
- **Protocol**: HTTPS (TLS 1.2+)
- **CORS**: Strictly configured to allow requests only from `https://sistema.audicarefono.com.br`

## Endpoints

### WhatsApp Integration (`/wa`)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/wa/health-check` | Verify connection status |
| `GET` | `/wa/contacts` | Retrieve sync contact list |
| `GET` | `/wa/chat-history/:phone` | Get messages for specific number |
| `POST` | `/wa/send-text` | Send plain text message |
| `POST` | `/wa/send-media` | Send image/video/document |
| `POST` | `/wa/send-audio` | Send voice note |

### Authentication (`/auth`)

Authentication is primarily handled via Supabase Auth, but legacy or specific system endpoints may exist under `/auth`.

- **Provider**: Supabase (JWT)
- **Token Storage**: Secure LocalStorage / Cookies

## Security Standards

1.  **HTTPS Only**: All traffic must be encrypted.
2.  **No Mixed Content**: Ensure no `http://` resources are loaded.
3.  **Input Validation**: All form inputs are sanitized before sending.
4.  **Error Handling**: Generic error messages shown to users; detailed logs sent to console/monitoring only.

## Testing

To verify API connectivity:

1.  Open Browser DevTools.
2.  Run `import('./src/utils/apiTest.js').then(m => m.runApiTests())` in the console (if accessible) or use the provided utility in the Settings > Diagnostics panel.
3.  Check the Network tab to ensure all requests go to `api.audicarefono.com.br`.
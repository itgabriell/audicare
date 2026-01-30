# Deployment Verification Checklist

Before deploying the latest version to production, verify all items below to ensure security and stability with the new API domain.

## 1. Environment Configuration

- [ ] **API_BASE_URL**: Ensure `src/config/apiConfig.js` has `https://api.audicarefono.com.br/api` as the production URL.
- [ ] **Env Variables**: Check `.env.production` (if used) does **not** contain references to `72.61.44.153`.
- [ ] **Supabase Keys**: Verify Supabase URL and Anon Key are correct for production.

## 2. Security & SSL

- [ ] **SSL Verification**: Verify the API domain has a valid SSL certificate (Green lock).
- [ ] **HTTPS Enforcement**: Ensure the frontend automatically redirects HTTP to HTTPS.
- [ ] **Mixed Content**: detailed scan of the codebase for hardcoded `http://` strings (images, scripts, styles).
- [ ] **HSTS**: Verify Strict-Transport-Security headers are enabled on the backend (if manageable).

## 3. Network & CORS

- [ ] **CORS Policy**: Verify the backend allows requests strictly from `https://sistema.audicarefono.com.br`.
- [ ] **Firewall**: Ensure the backend server accepts traffic on port 443 (HTTPS) and 80 (HTTP -> redirected).
- [ ] **WebSocket/Realtime**: If using WebSockets, ensure `wss://` is used instead of `ws://`.

## 4. Application Integrity

- [ ] **WhatsApp Integration**: Test sending a message to a real number.
- [ ] **File Uploads**: Test sending an image/audio file (verifies Multipart/FormData over HTTPS).
- [ ] **Data Loading**: Verify conversation lists load without timeouts.
- [ ] **Polling**: Verify the 3-second polling interval is active but not causing 429 (Too Many Requests) errors.

## 5. Error Handling & Logging

- [ ] **User Feedback**: Disconnect the network and verify the UI shows a "Disconnected" status or toast error.
- [ ] **Console Logs**: Ensure no sensitive data (tokens, PII) is logged to the browser console in production.
- [ ] **Fallback**: If the API is down, ensure the app doesn't crash (white screen of death).

## 6. Final Clean-up

- [ ] **Remove Test Code**: Remove any `console.log` used for debugging API calls.
- [ ] **Documentation**: Ensure `SECURITY.md` and `API_TESTING_GUIDE.md` are committed.
- [ ] **Build**: Run `npm run build` locally to ensure no compilation errors occur.
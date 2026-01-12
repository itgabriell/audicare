// n8n Integration Configuration
// This file documents the endpoints for n8n to interact with the AudiCare system.

// As this is a frontend file, we cannot use process.env.
// The URLs should be constructed manually in n8n or your backend service
// using your Supabase project URL.

const VITE_SUPABASE_URL = "YOUR_SUPABASE_URL"; // Replace with your actual Supabase URL

const n8nConfig = {
  // Webhook to receive messages from n8n (e.g., from WhatsApp)
  // METHOD: POST
  // BODY: {
  //   "clinic_id": "uuid-of-the-clinic",
  //   "contact_phone": "5511999998888",
  //   "contact_name": "John Doe",
  //   "message_content": "Hello, this is a test message!",
  //   "media_url": "optional-url-to-media"
  // }
  webhookUrl: `${VITE_SUPABASE_URL}/functions/v1/n8n-webhook`,

  // API Gateway for various actions
  gatewayUrl: `${VITE_SUPABASE_URL}/functions/v1/n8n-gateway`,
  
  // Endpoints available through the gateway
  endpoints: {
    // --- Conversations ---
    // List all conversations for a clinic
    // METHOD: GET
    // BODY: { "clinic_id": "..." }
    listConversations: `${VITE_SUPABASE_URL}/functions/v1/n8n-gateway/conversations`,

    // Update a conversation (e.g., change status)
    // METHOD: PUT
    // URL: /n8n-gateway/conversations/:id
    // BODY: { "clinic_id": "...", "status": "resolved" }
    updateConversation: (conversationId) => `${VITE_SUPABASE_URL}/functions/v1/n8n-gateway/conversations/${conversationId}`,

    // --- Messages ---
    // Send a new message from a user (clinic staff)
    // METHOD: POST
    // BODY: {
    //   "clinic_id": "...",
    //   "conversation_id": "...",
    //   "contact_id": "...",
    //   "content": "Reply from the clinic"
    // }
    sendMessage: `${VITE_SUPABASE_URL}/functions/v1/n8n-gateway/messages`,
  }
};

// To use these URLs in n8n, you will need to configure an HTTP Request node.
// Ensure you also pass the required headers:
// - Authorization: Bearer <SUPABASE_ANON_KEY>
// - x-user-id: <USER_UUID> (for authenticated actions)

export default n8nConfig;
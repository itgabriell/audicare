import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    // 0. CORS - Handle OPTIONS preflight immediately
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // 1. Verify Authentication
        // Ensure Authorization header is present
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            throw new Error('Authorization header missing');
        }

        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: authHeader } } }
        )

        const {
            data: { user },
            error: authError
        } = await supabaseClient.auth.getUser()

        if (authError || !user) {
            console.error('Auth Error:', authError);
            return new Response(JSON.stringify({ error: 'Unauthorized', details: authError }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 401,
            })
        }

        // 2. Parse Request
        const { endpoint, method = 'GET', body } = await req.json()

        if (!endpoint) {
            throw new Error('Endpoint is required')
        }

        // 3. Construct Chatwoot URL
        const CHATWOOT_BASE_URL = Deno.env.get('CHATWOOT_BASE_URL') || 'https://chat.audicarefono.com.br'
        // Forcing account ID 2 based on previous logs (404 on account 2 limits) - assuming 2 is correct or enviroment needs check
        const ACCOUNT_ID = Deno.env.get('CHATWOOT_ACCOUNT_ID') || '1'
        const API_TOKEN = Deno.env.get('CHATWOOT_API_TOKEN')

        if (!API_TOKEN) {
            console.error('Server misconfiguration: CHATWOOT_API_TOKEN missing');
            throw new Error('Server misconfiguration')
        }

        const url = `${CHATWOOT_BASE_URL}/api/v1/accounts/${ACCOUNT_ID}${endpoint}`

        console.log(`Proxying to: ${method} ${url}`)

        // 4. Forward Request
        const response = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'api_access_token': API_TOKEN
            },
            body: body ? JSON.stringify(body) : undefined
        })

        // Check if response is JSON
        const contentType = response.headers.get("content-type");
        let data;
        if (contentType && contentType.includes("application/json")) {
            data = await response.json();
        } else {
            data = await response.text();
        }

        if (!response.ok) {
            console.error('Chatwoot Upstream Error:', response.status, data);
            // Return the upstream error details to help debugging
            return new Response(JSON.stringify({ error: 'Upstream Error', details: data }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: response.status, // Pass through status
            })
        }

        // 5. Return Response
        return new Response(JSON.stringify(data), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })

    } catch (error) {
        console.error('Proxy Fatal Error:', error)
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500, // Internal Server Error
        })
    }
})

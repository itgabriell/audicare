import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    // Handle CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // 1. Verify Authentication
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
        )

        const {
            data: { user },
        } = await supabaseClient.auth.getUser()

        if (!user) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), {
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
        const ACCOUNT_ID = Deno.env.get('CHATWOOT_ACCOUNT_ID') || '1'
        const API_TOKEN = Deno.env.get('CHATWOOT_API_TOKEN')

        if (!API_TOKEN) {
            throw new Error('Server misconfiguration: CHATWOOT_API_TOKEN missing')
        }

        const url = `${CHATWOOT_BASE_URL}/api/v1/accounts/${ACCOUNT_ID}${endpoint}`

        console.log(`Proxying to Chatwoot: ${method} ${url}`)

        // 4. Forward Request
        const response = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'api_access_token': API_TOKEN
            },
            body: body ? JSON.stringify(body) : undefined
        })

        const data = await response.json()

        // 5. Return Response
        return new Response(JSON.stringify(data), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: response.status,
        })

    } catch (error) {
        console.error('Proxy Error:', error)
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})

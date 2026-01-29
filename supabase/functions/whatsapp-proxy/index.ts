import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
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

        const { endpoint, method = 'POST', body, isFormData } = await req.json()

        // Assuming WA logic runs on the VPS bridge mentioned in architecture
        const WA_BASE_URL = Deno.env.get('WA_BASE_URL') || 'https://api.audicarefono.com.br/api/wa'

        // Internal API Key for the VPS
        const INTERNAL_API_KEY = Deno.env.get('INTERNAL_API_KEY')

        const url = `${WA_BASE_URL}${endpoint}`

        // If forwarding FormData (for media), we might need more complex handling. 
        // For now, let's assume JSON for text.
        // NOTE: Sending files via Edge Function proxy is tricky due to body formatting.
        // Ideally, client uploads to Storage, and we send the URL to backend.

        const response = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                ...(INTERNAL_API_KEY ? { 'x-api-key': INTERNAL_API_KEY } : {})
            },
            body: body ? JSON.stringify(body) : undefined
        })

        const data = await response.json()

        return new Response(JSON.stringify(data), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: response.status,
        })

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})

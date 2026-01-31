import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        // 1. Create Supabase Client to verify the caller
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
        );

        // 2. Verify Caller
        const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
        if (authError || !user) {
            throw new Error('Unauthorized');
        }

        // 3. Initialize Admin Client (Service Role)
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        const { action, userId, email, password, full_name, role, clinic_id, phone } = await req.json();

        let data;

        // 4. Handle Actions
        switch (action) {
            case 'create':
                if (!email || !password) throw new Error('Email and password required');

                const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
                    email,
                    password,
                    email_confirm: true,
                    user_metadata: { full_name, role, clinic_id, phone }
                });
                if (createError) throw createError;

                data = newUser;
                break;

            case 'update':
                if (!userId) throw new Error('User ID required');

                const updates: any = { user_metadata: { full_name, role, phone } };
                if (password) updates.password = password;
                if (email) updates.email = email;

                const { data: updatedUser, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
                    userId,
                    updates
                );
                if (updateError) throw updateError;

                // Also update profiles table explicitly to ensure sync
                await supabaseAdmin
                    .from('profiles')
                    .update({ full_name, role, phone })
                    .eq('id', userId);

                data = updatedUser;
                break;

            case 'delete':
                if (!userId) throw new Error('User ID required');

                const { data: deletedUser, error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(
                    userId
                );
                if (deleteError) throw deleteError;
                data = deletedUser;
                break;

            default:
                throw new Error('Invalid action');
        }

        return new Response(JSON.stringify(data), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        });

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        });
    }
});

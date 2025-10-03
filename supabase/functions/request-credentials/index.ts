interface CredentialRequest {
  thread_id: string;
  platform: string;
  requested_credentials: string[];
  credential_name?: string;
  user_id?: string;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

Deno.serve(async (req: Request) => {
  try {
    // Handle CORS preflight requests
    if (req.method === "OPTIONS") {
      return new Response(null, {
        status: 200,
        headers: corsHeaders,
      });
    }

    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "Method not allowed. Use POST request." 
        }),
        {
          status: 405,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const body: CredentialRequest = await req.json();
    
    // Validate required fields
    if (!body.thread_id || !body.platform || !body.requested_credentials || !Array.isArray(body.requested_credentials)) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Missing required fields: thread_id, platform, requested_credentials (array)'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const { createClient } = await import('npm:@supabase/supabase-js@2');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // If user_id is not provided, fetch it from the thread
    let userId = body.user_id;
    if (!userId) {
      const { data: threadData, error: threadError } = await supabase
        .from('automation_threads')
        .select('user_id')
        .eq('id', body.thread_id)
        .single();

      if (threadError || !threadData) {
        return new Response(
          JSON.stringify({
            success: false,
            message: `Thread not found: ${body.thread_id}`
          }),
          {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      
      userId = threadData.user_id;
    }

    // Store the credential request in chat messages as a special type
    const { data, error } = await supabase
      .from('chat_messages')
      .insert([
        {
          thread_id: body.thread_id,
          user_id: userId,
          content: JSON.stringify({
            type: 'credential_request',
            platform: body.platform,
            requested_credentials: body.requested_credentials,
            credential_name: body.credential_name || body.platform.toLowerCase()
          }),
          sender_type: 'agent1',
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Failed to create credential request',
          error: error.message
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Credential request created successfully - user will see form in chat',
        credential_id: data.id,
        thread_id: body.thread_id,
        platform: body.platform,
        requested_credentials: body.requested_credentials,
        user_id: userId,
        timestamp: new Date().toISOString()
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error) {
    console.error('Error in credential request endpoint:', error);
    return new Response(
      JSON.stringify({
        success: false,
        message: 'Internal server error',
        error: error.message
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
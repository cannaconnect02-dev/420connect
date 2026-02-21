import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1"
const supabaseAdmin = createClient("https://mock.supabase.co", "mock_key", {
  global: {
    fetch: async (url, options) => {
      console.log("FETCH URL:", url.toString());
      return new Response(JSON.stringify([{ code: '058' }]), { status: 200, headers: { 'Content-Type': 'application/json' }});
    }
  }
});
await supabaseAdmin.from('banks').select('code').eq('id', 'bank_1').single();

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://cyyzjbjtjqdrbqkutcof.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN5eXpqYmp0anFkcmJxa3V0Y29mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkzNzc3MjAsImV4cCI6MjA4NDk1MzcyMH0.tpegaiuDyqfL6pxnAdWXW30ILQ3ImOGVA44QLmgBaQg';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testAccess() {
    console.log("0a. Testing Plain Table...");
    const { data: plain, error: plainError } = await supabase.from('test_plain').select('*');
    if (plainError) console.log("Plain table error:", plainError.message);
    else console.log("Plain table success:", plain);

    console.log("0. Testing Anon Access...");
    const { error: anonError } = await supabase.from('profiles').select('count').limit(1);
    if (anonError) console.log("Anon access error:", anonError.message);
    else console.log("Anon access success");

    console.log("1a. Testing Wrong Password...");
    const { error: wrongPassError } = await supabase.auth.signInWithPassword({
        email: 'merchant_test@test.com',
        password: 'wrongpassword'
    });
    console.log("Wrong pass result:", wrongPassError ? wrongPassError.message : "Success (unexpected)");

    console.log("1b. Testing SignUp...");
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: `new_user_${Date.now()}@test.com`,
        password: 'password123'
    });
    if (signUpError) console.log("SignUp error:", signUpError.message);
    else console.log("SignUp success, ID:", signUpData.user?.id);

    console.log("1. Signing in (Correct)...");
    const { data: { session }, error: loginError } = await supabase.auth.signInWithPassword({
        email: 'merchant_test@test.com',
        password: 'password123'
    });

    if (loginError) {
        console.error("Login failed:", loginError.message);
        return;
    }
    console.log("Login successful. User ID:", session.user.id);

    console.log("\n2. Fetching user_roles...");
    const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', session.user.id);

    if (rolesError) {
        console.error("Fetch roles failed:", rolesError);
    } else {
        console.log("Roles fetched:", roles);
    }

    console.log("\n3. Fetching profile (*)...");
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', session.user.id) // Note: schema says 'id', app says 'user_id'. This might be the bug!
        .maybeSingle();

    if (profileError) {
        console.error("Fetch profile (*) failed:", profileError);
    } else {
        console.log("Profile fetched:", profile);
    }

    console.log("\n4. Fetching profile (id)...");
    const { data: profileId, error: profileIdError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', session.user.id)
        .maybeSingle();

    if (profileIdError) {
        console.error("Fetch profile (id) failed:", profileIdError);
    } else {
        console.log("Profile ID fetched:", profileId);
    }
}

testAccess();

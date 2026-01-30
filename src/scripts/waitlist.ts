// Waitlist form handler - submits to Supabase
const SUPABASE_URL = 'https://xihukvdujmapptnuwkgr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhpaHVrdmR1am1hcHB0bnV3a2dyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk4NjY3MTcsImV4cCI6MjA1NTQ0MjcxN30.VkNJUE7s8Pf11ckgT_4cJhwvvpPsJhJdWcFpGpP8Fzw';

export async function submitWaitlist(email: string): Promise<{ success: boolean; message: string }> {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/waitlist`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        email,
        source: 'moes-website',
        referrer: document.referrer || null
      })
    });

    if (response.ok) {
      return { success: true, message: "You're on the list! We'll be in touch soon." };
    }

    if (response.status === 409) {
      return { success: true, message: "You're already on the list!" };
    }

    const error = await response.json();
    console.error('Waitlist error:', error);
    return { success: false, message: 'Something went wrong. Please try again.' };
  } catch (err) {
    console.error('Waitlist error:', err);
    return { success: false, message: 'Something went wrong. Please try again.' };
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.querySelector('.auth-form');
  if (!loginForm) return;

  const redirectSignedInUser = async () => {
    if (window.supabaseClient) {
      const { data: { session } } = await window.supabaseClient.auth.getSession();
      if (session?.user) {
        localStorage.setItem('levelingUpUserId', session.user.id);
        window.location.href = 'dashboard.html';
        return;
      }
    }

    if (!window.supabaseConfig?.isConfigured && localStorage.getItem('levelingUpUserName')) {
      window.location.href = 'dashboard.html';
    }
  };

  redirectSignedInUser();

  loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    if (!window.supabaseClient) {
      alert('Supabase is not configured yet.');
      return;
    }

    const emailInput = loginForm.querySelector('input[type="email"]');
    const passwordInput = loginForm.querySelector('input[type="password"]');
    const email = emailInput?.value.trim();
    const password = passwordInput?.value;

    const { data, error } = await window.supabaseClient.auth.signInWithPassword({ email, password });

    if (error) {
      alert(error.message);
      return;
    }

    const { data: profileData } = await window.supabaseClient
      .from('profiles')
      .select('full_name')
      .eq('user_id', data.user.id)
      .single();

    const savedName = profileData?.full_name || email.split('@')[0].replace(/[._-]/g, ' ');
    localStorage.setItem('levelingUpUserName', savedName);
    localStorage.setItem('levelingUpUserId', data.user.id);
    window.location.href = 'dashboard.html';
  });
});

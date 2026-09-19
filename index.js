document.addEventListener('DOMContentLoaded', async () => {
  if (window.supabaseClient) {
    const { data: { session } } = await window.supabaseClient.auth.getSession();
    if (session?.user) {
      localStorage.setItem('levelingUpUserId', session.user.id);
      window.location.href = 'dashboard.html';
      return;
    }
  }

  if (localStorage.getItem('levelingUpUserName')) {
    window.location.href = 'dashboard.html';
  }
});

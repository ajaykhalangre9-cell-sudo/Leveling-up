/* Authentication helpers shared by the login and signup pages. */
document.addEventListener('DOMContentLoaded', () => {
  const buttons = document.querySelectorAll('.google-btn');
  if (!buttons.length) return;

  const getRedirectUrl = () => new URL('dashboard.html', window.location.href).href;

  const startGoogleSignIn = async () => {
    if (!window.supabaseClient) {
      alert('Sign-in is unavailable because the secure connection is not configured.');
      return;
    }

    buttons.forEach((button) => { button.disabled = true; });
    const { error } = await window.supabaseClient.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: getRedirectUrl() }
    });

    if (error) {
      alert(`Google sign-in could not start: ${error.message}`);
      buttons.forEach((button) => { button.disabled = false; });
    }
  };

  buttons.forEach((button) => button.addEventListener('click', startGoogleSignIn));
});

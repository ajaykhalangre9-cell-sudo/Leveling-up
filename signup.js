document.addEventListener('DOMContentLoaded', async () => {
  const signupForm = document.getElementById('signupForm');
  const signupName = document.getElementById('signupName');
  const nameInput = document.getElementById('signupName');
  const emailInput = signupForm?.querySelector('input[type="email"]');
  const passwordInput = signupForm?.querySelector('input[type="password"]');
  const confirmPasswordInput = signupForm?.querySelectorAll('input[type="password"]')[1];
  const submitButton = signupForm?.querySelector('button[type="submit"]');
  let isSubmitting = false;

  if (!signupForm || !signupName || !emailInput || !passwordInput || !confirmPasswordInput) return;

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

  signupForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    if (isSubmitting) return;

    if (passwordInput.value !== confirmPasswordInput.value) {
      alert('Passwords do not match.');
      return;
    }

    if (!window.supabaseClient) {
      alert('Supabase is not configured yet.');
      return;
    }

    const name = nameInput.value.trim() || 'User';
    const email = emailInput.value.trim();
    const password = passwordInput.value;

    isSubmitting = true;
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = 'Creating your account...';
    }

    const { data, error } = await window.supabaseClient.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name },
        emailRedirectTo: `${window.location.origin}${window.location.pathname.replace(/[^/]*$/, '')}login.html`
      }
    });

    if (error) {
      alert(error.message);
      isSubmitting = false;
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = 'Start My Journey';
      }
      return;
    }

    if (data?.session?.user?.id) {
      localStorage.setItem('levelingUpUserName', name);
      localStorage.setItem('levelingUpUserId', data.session.user.id);
      window.location.href = 'dashboard.html';
      return;
    }

    localStorage.removeItem('levelingUpUserName');
    localStorage.removeItem('levelingUpUserId');
    alert('Your account was created. Please verify your email, then log in to save your information securely.');
    window.location.href = 'login.html';
  });
});

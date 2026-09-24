document.addEventListener('DOMContentLoaded', () => {
  const nameButton = document.getElementById('changeNameBtn');
  const passwordButton = document.getElementById('changePasswordBtn');
  const modal = document.getElementById('accountModal');
  const closeButton = document.getElementById('accountModalClose');
  const title = document.getElementById('accountModalTitle');
  const eyebrow = document.getElementById('accountModalEyebrow');
  const copy = document.getElementById('accountModalCopy');
  const nameForm = document.getElementById('changeNameForm');
  const passwordForm = document.getElementById('changePasswordForm');
  const nameInput = document.getElementById('accountNewName');
  const currentPassword = document.getElementById('accountCurrentPassword');
  const newPassword = document.getElementById('accountNewPassword');
  const confirmPassword = document.getElementById('accountConfirmPassword');
  const passwordSubmit = document.getElementById('changePasswordSubmit');
  const status = document.getElementById('accountFormStatus');
  const setStatus = (message, isError = false) => {
    status.textContent = message;
    status.classList.toggle('is-error', isError);
    status.classList.toggle('is-success', Boolean(message) && !isError);
  };

  const closeModal = () => {
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    nameForm.reset();
    passwordForm.reset();
    setStatus('');
  };

  const openModal = (formName) => {
    nameForm.hidden = formName !== 'name';
    passwordForm.hidden = formName !== 'password';
    setStatus('');
    if (formName === 'name') {
      eyebrow.textContent = 'Profile';
      title.textContent = 'Change your name';
      copy.textContent = 'Update the name shown across your Leveling Up profile.';
      nameInput.value = localStorage.getItem('levelingUpUserName') || '';
    } else {
      eyebrow.textContent = 'Security';
      title.textContent = 'Change password';
      copy.textContent = 'Confirm your current password before choosing a new one.';
    }
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    window.setTimeout(() => (formName === 'name' ? nameInput : currentPassword).focus(), 0);
  };

  const getAuthenticatedUser = async () => {
    const client = window.supabaseClient;
    if (!client) return { client: null, user: null };
    const { data, error } = await client.auth.getUser();
    return { client, user: error ? null : data?.user || null };
  };

  const updateVisibleName = (name) => {
    localStorage.setItem('levelingUpUserName', name);
    const userName = document.getElementById('userName');
    const welcome = document.getElementById('welcomeMessage');
    const initial = document.getElementById('profilePhotoInitial');
    if (userName) userName.textContent = name;
    if (welcome) welcome.textContent = `Welcome back, ${name}`;
    if (initial) initial.textContent = name.charAt(0).toUpperCase() || 'U';
  };

  const isStrongPassword = (value) => value.length >= 8
    && /[a-z]/.test(value)
    && /[A-Z]/.test(value)
    && /\d/.test(value);

  nameButton?.addEventListener('click', () => openModal('name'));
  passwordButton?.addEventListener('click', () => openModal('password'));
  closeButton?.addEventListener('click', closeModal);
  modal?.addEventListener('click', (event) => {
    if (event.target === modal) closeModal();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && modal?.classList.contains('open')) closeModal();
  });

  nameForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const fullName = nameInput.value.trim().replace(/\s+/g, ' ');
    if (fullName.length < 2) {
      setStatus('Please enter a name with at least 2 characters.', true);
      return;
    }

    const submit = nameForm.querySelector('button[type="submit"]');
    submit.disabled = true;
    nameForm.setAttribute('aria-busy', 'true');
    submit.textContent = 'Saving…';
    setStatus('');
    try {
      const { client, user } = await getAuthenticatedUser();
      if (!client || !user) throw new Error('auth');
      const { data, error } = await client
        .from('profiles')
        .update({ full_name: fullName, updated_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .select('full_name')
        .maybeSingle();
      if (error || !data) throw new Error('profile');
      updateVisibleName(data.full_name);
      setStatus('Name changed successfully.');
    } catch (error) {
      setStatus('Unable to change your name right now. Please sign in again and retry.', true);
    } finally {
      submit.disabled = false;
      nameForm.removeAttribute('aria-busy');
      submit.textContent = 'Save name';
    }
  });

  passwordForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const current = currentPassword.value;
    const next = newPassword.value;
    const confirmation = confirmPassword.value;
    if (!current || !next || !confirmation) {
      setStatus('Please complete every password field.', true);
      return;
    }
    if (next !== confirmation) {
      setStatus('New passwords do not match.', true);
      return;
    }
    if (!isStrongPassword(next)) {
      setStatus('Please choose a stronger password.', true);
      return;
    }

    passwordSubmit.disabled = true;
    passwordForm.setAttribute('aria-busy', 'true');
    passwordSubmit.textContent = 'Changing password…';
    setStatus('');
    try {
      const { client, user } = await getAuthenticatedUser();
      if (!client || !user?.email) throw new Error('auth');
      const providers = user.app_metadata?.providers || [];
      if (providers.length && !providers.includes('email')) throw new Error('provider');

      // Supabase verifies the current password by establishing a fresh session
      // for the authenticated account. Password values never leave this call.
      const { error: reauthenticationError } = await client.auth.signInWithPassword({
        email: user.email,
        password: current
      });
      if (reauthenticationError) throw new Error('current-password');

      const { error: updateError } = await client.auth.updateUser({ password: next });
      if (updateError) throw new Error('update');

      passwordForm.reset();
      setStatus('Password changed successfully.');
    } catch (error) {
      const message = error.message === 'current-password'
        ? 'Current password is incorrect.'
        : error.message === 'provider'
          ? 'This account uses a sign-in provider. Use that provider to manage your password.'
          : 'Unable to change your password. Please sign in again and retry.';
      setStatus(message, true);
    } finally {
      passwordSubmit.disabled = false;
      passwordForm.removeAttribute('aria-busy');
      passwordSubmit.textContent = 'Change password';
    }
  });
});

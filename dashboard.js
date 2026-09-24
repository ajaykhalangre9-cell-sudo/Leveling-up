document.addEventListener('DOMContentLoaded', async () => {
  // Do not block the dashboard setup on a network/database task. In particular,
  // the settings buttons must remain usable if habit synchronization is slow or
  // unavailable on a mobile connection.
  window.levelingUpHabitScheduler?.syncDailyHabits().catch((error) => {
    console.warn('Daily habit synchronization failed:', error);
  });

  const settingsBtn = document.getElementById('settingsBtn');
  const settingsPanel = document.getElementById('settingsPanel');
  const logoutBtn = document.getElementById('logoutBtn');
  const changeNameBtn = document.getElementById('changeNameBtn');
  const changePasswordBtn = document.getElementById('changePasswordBtn');
  const contactBtn = document.getElementById('contactBtn');
  const contactPanel = document.getElementById('contactPanel');
  const dailyQuote = document.getElementById('dailyQuote');
  const userNameElement = document.getElementById('userName');
  const welcomeMessage = document.getElementById('welcomeMessage');
  const profilePhotoBtn = document.getElementById('profilePhotoBtn');
  const profilePhotoChangeBtn = document.getElementById('profilePhotoChangeBtn');
  const profilePhotoInput = document.getElementById('profilePhotoInput');
  const profilePhotoPreview = document.getElementById('profilePhotoPreview');
  const profilePhotoInitial = document.getElementById('profilePhotoInitial');
  const ajayOpenBtn = document.getElementById('ajayOpenBtn');
  const ajayPanel = document.getElementById('ajayPanel');
  const ajayCloseBtn = document.getElementById('ajayCloseBtn');
  const ajayMessages = document.getElementById('ajayMessages');
  const ajayForm = document.getElementById('ajayForm');
  const ajayInput = document.getElementById('ajayInput');
  const ajayVoiceBtn = document.getElementById('ajayVoiceBtn');
  const ajaySendBtn = ajayForm?.querySelector('.ajay-send');
  const ongoingTotal = document.getElementById('ongoingTotal');
  const ongoingGoals = document.getElementById('ongoingGoals');
  const ongoingTasks = document.getElementById('ongoingTasks');
  const ongoingSkills = document.getElementById('ongoingSkills');
  const ongoingHabits = document.getElementById('ongoingHabits');
  const streakCount = document.getElementById('streakCount');
  const userLevel = document.getElementById('userLevel');
  const userRank = document.getElementById('userRank');
  const rankDescription = document.getElementById('rankDescription');
  const currentXp = document.getElementById('currentXp');
  const xpFill = document.getElementById('xpFill');
  const xpTrack = document.querySelector('.xp-track');
  const leaderboardPosition = document.getElementById('leaderboardPosition');
  const leaderboardOpenBtn = document.getElementById('leaderboardOpenBtn');
  const leaderboardModal = document.getElementById('leaderboardModal');
  const leaderboardCloseBtn = document.getElementById('leaderboardCloseBtn');
  const leaderboardList = document.getElementById('leaderboardList');
  const leaderboardMyRank = document.getElementById('leaderboardMyRank');

  const quotes = [
    '“Small steps every day create a powerful life.”',
    '“Consistency turns dreams into reality.”',
    '“Your future begins with the choices you make today.”'
  ];

  const savedName = localStorage.getItem('levelingUpUserName') || 'User';
  const savedUserId = localStorage.getItem('levelingUpUserId') || savedName.toLowerCase().replace(/\s+/g, '-');
  const savedProfilePhoto = localStorage.getItem('levelingUpProfilePhoto');
  const profilePhotoBucket = 'profile-photos';

  userNameElement.textContent = savedName;
  welcomeMessage.textContent = `Welcome back, ${savedName}`;

  const renderProgress = (progress) => {
    if (!progress) return;
    userLevel.textContent = String(progress.level);
    userRank.textContent = `${progress.code} Rank`;
    userRank.title = progress.title;
    rankDescription.textContent = progress.title;
    currentXp.textContent = String(progress.currentXp);
    xpFill.style.width = `${(progress.currentXp / 1000) * 100}%`;
    xpTrack?.setAttribute('aria-valuenow', String(progress.currentXp));
  };

  const loadUserProgress = async () => {
    let userId = savedUserId;
    if (window.supabaseClient) {
      const { data } = await window.supabaseClient.auth.getUser();
      userId = data?.user?.id || userId;
    }
    renderProgress(await window.levelingUpProgress?.loadProgress(userId));
  };

  loadUserProgress();

  const getLocalDate = (date = new Date()) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getDaysBetween = (from, to) => {
    const fromDate = new Date(`${from}T00:00:00`);
    const toDate = new Date(`${to}T00:00:00`);
    return Math.round((toDate - fromDate) / 86400000);
  };

  const updateLocalDailyStreak = () => {
    const streakKey = `levelingUpStreak:${savedUserId}`;
    const today = getLocalDate();
    let streak = { count: 1, lastVisit: today };

    try {
      const stored = JSON.parse(localStorage.getItem(streakKey) || 'null');
      if (stored?.lastVisit === today) {
        streak = stored;
      } else if (stored?.lastVisit && getDaysBetween(stored.lastVisit, today) === 1) {
        streak = { count: Number(stored.count || 0) + 1, lastVisit: today };
      }
    } catch (error) {
      // A corrupt saved value is safely replaced with a fresh Day 1 streak.
    }

    localStorage.setItem(streakKey, JSON.stringify(streak));
    if (streakCount) streakCount.textContent = String(streak.count);
  };

  const updateDailyStreak = async () => {
    if (!window.supabaseClient) {
      updateLocalDailyStreak();
      return;
    }

    const { data: userData, error: userError } = await window.supabaseClient.auth.getUser();
    const user = userData?.user || null;
    if (userError || !user) {
      updateLocalDailyStreak();
      return;
    }

    const today = getLocalDate();
    const { data: savedStreak, error: loadError } = await window.supabaseClient
      .from('user_streaks')
      .select('current_streak, last_visit')
      .eq('user_id', user.id)
      .maybeSingle();

    if (loadError) {
      console.error('Could not load the Supabase streak:', loadError);
      updateLocalDailyStreak();
      return;
    }

    let count = 1;
    if (savedStreak?.last_visit === today) {
      count = Number(savedStreak.current_streak || 1);
    } else if (savedStreak?.last_visit && getDaysBetween(savedStreak.last_visit, today) === 1) {
      count = Number(savedStreak.current_streak || 0) + 1;
    }

    const { error: saveError } = await window.supabaseClient
      .from('user_streaks')
      .upsert({
        user_id: user.id,
        current_streak: count,
        last_visit: today,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' });

    if (saveError) {
      console.error('Could not save the Supabase streak:', saveError);
      updateLocalDailyStreak();
      return;
    }

    if (streakCount) streakCount.textContent = String(count);
  };

  const escapeHtml = (value = '') => String(value).replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[character]));
  const publicAvatarUrl = (value) => {
    try {
      const url = new URL(value || '');
      const prefix = `${window.supabaseConfig?.url || ''}/storage/v1/object/public/profile-photos/`;
      return prefix && url.href.startsWith(prefix) ? url.href : '';
    } catch (error) {
      return '';
    }
  };

  const loadLeaderboard = async () => {
    if (!window.supabaseClient) {
      leaderboardPosition.textContent = 'Sign in to see your position';
      leaderboardList.innerHTML = '<p class="leaderboard-status">The leaderboard is available when the platform is connected.</p>';
      return;
    }

    const { data, error } = await window.supabaseClient.rpc('get_leaderboard');
    if (error) {
      console.error('Could not load leaderboard:', error);
      leaderboardPosition.textContent = 'Leaderboard unavailable';
      leaderboardList.innerHTML = '<p class="leaderboard-status">Leaderboard setup is required before standings can be shown.</p>';
      leaderboardMyRank.hidden = true;
      return;
    }

    const entries = data || [];
    const currentUser = entries.find((entry) => entry.is_current);
    leaderboardPosition.textContent = currentUser ? `Your position: #${currentUser.position}` : 'Your position: —';
    leaderboardMyRank.hidden = !currentUser;
    if (currentUser) {
      const nextStep = currentUser.xp_to_overtake
        ? `<p>Next: ${escapeHtml(currentUser.above_full_name || 'the player above')} — earn <strong>${currentUser.xp_to_overtake} XP</strong> to overtake.</p>`
        : '<p>You are currently at the top.</p>';
      leaderboardMyRank.innerHTML = `
        <div class="leaderboard-my-rank-head"><span>My Rank</span><strong>#${currentUser.position}</strong></div>
        <p><strong>${escapeHtml(currentUser.full_name)}</strong> · Level ${currentUser.level} · ${Number(currentUser.total_xp).toLocaleString()} XP · ${escapeHtml(currentUser.rank_code)} Rank</p>
        ${nextStep}`;
    }

    const topFifty = entries.filter((entry) => Number(entry.position) <= 50);
    leaderboardList.innerHTML = topFifty.length
      ? topFifty.map((entry) => {
        const avatarUrl = publicAvatarUrl(entry.avatar_url);
        return `
          <div class="leaderboard-row leaderboard-row-${Math.min(Number(entry.position), 3)}${entry.is_current ? ' is-current' : ''}">
            <span class="leaderboard-place">#${entry.position}</span>
            <span class="leaderboard-player"><span class="leaderboard-avatar">${avatarUrl ? `<img src="${escapeHtml(avatarUrl)}" alt="" />` : escapeHtml((entry.full_name || 'L').trim().charAt(0).toUpperCase())}</span><span>${escapeHtml(entry.full_name || 'Leveling Up member')}</span></span>
            <span class="leaderboard-tier">${escapeHtml(entry.rank_code)} Rank</span>
            <span class="leaderboard-stat">Level ${entry.level}</span>
            <span class="leaderboard-stat">${Number(entry.total_xp).toLocaleString()} XP</span>
          </div>`;
      }).join('')
      : '<p class="leaderboard-status">No players have joined the leaderboard yet.</p>';
  };

  const closeLeaderboard = () => {
    leaderboardModal?.classList.remove('open');
    leaderboardModal?.setAttribute('aria-hidden', 'true');
  };

  leaderboardOpenBtn?.addEventListener('click', async () => {
    leaderboardModal?.classList.add('open');
    leaderboardModal?.setAttribute('aria-hidden', 'false');
    await loadLeaderboard();
  });
  leaderboardCloseBtn?.addEventListener('click', closeLeaderboard);
  leaderboardModal?.addEventListener('click', (event) => {
    if (event.target === leaderboardModal) closeLeaderboard();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeLeaderboard();
  });

  updateDailyStreak().finally(loadLeaderboard);

  // Listen only to the signed-in user's progress row. This avoids exposing
  // everyone else's progress over Realtime while refreshing the caller's rank
  // as soon as a trusted XP award commits.
  let leaderboardRefreshTimer = null;
  const scheduleLeaderboardRefresh = () => {
    window.clearTimeout(leaderboardRefreshTimer);
    leaderboardRefreshTimer = window.setTimeout(loadLeaderboard, 250);
  };
  if (window.supabaseClient) {
    window.supabaseClient.auth.getUser().then(({ data }) => {
      const user = data?.user;
      if (!user) return;
      window.supabaseClient
        .channel(`leaderboard-progress-${user.id}`)
        .on('postgres_changes', {
          event: '*', schema: 'public', table: 'user_progress', filter: `user_id=eq.${user.id}`
        }, scheduleLeaderboardRefresh)
        .subscribe();
    });
  }

  const updateDisplayedName = (name) => {
    localStorage.setItem('levelingUpUserName', name);
    userNameElement.textContent = name;
    welcomeMessage.textContent = `Welcome back, ${name}`;
    profilePhotoInitial.textContent = name.trim().charAt(0).toUpperCase() || 'U';
  };

  const renderProfilePhoto = (photoDataUrl) => {
    if (photoDataUrl) {
      profilePhotoPreview.src = photoDataUrl;
      profilePhotoPreview.hidden = false;
      profilePhotoInitial.hidden = true;
      profilePhotoChangeBtn.textContent = 'Change photo';
      return;
    }

    profilePhotoPreview.removeAttribute('src');
    profilePhotoPreview.hidden = true;
    profilePhotoInitial.hidden = false;
    profilePhotoChangeBtn.textContent = 'Add photo';
  };

  profilePhotoInitial.textContent = savedName.trim().charAt(0).toUpperCase() || 'U';
  renderProfilePhoto(savedProfilePhoto);

  let quoteIndex = 0;
  setInterval(() => {
    quoteIndex = (quoteIndex + 1) % quotes.length;
    dailyQuote.textContent = quotes[quoteIndex];
  }, 8000);

  const readStoredItems = (key) => {
    try {
      return JSON.parse(localStorage.getItem(key) || '[]');
    } catch (error) {
      return [];
    }
  };

  const countRows = async (table, applyFilters = (query) => query) => {
    const { count, error } = await applyFilters(
      window.supabaseClient.from(table).select('id', { count: 'exact', head: true })
    );

    if (error) throw error;
    return count || 0;
  };

  const getLocalOngoingCounts = () => ({
    goals: readStoredItems('levelingUpGoals').length,
    tasks: readStoredItems('levelingUpTasks').filter((task) => task.is_done !== true).length,
    skills: readStoredItems('levelingUpSkills').filter((skill) => skill.is_completed !== true).length,
    habits: readStoredItems('levelingUpHabits').filter((habit) => habit.is_active !== false).length
  });

  const renderOngoingCounts = ({ goals, tasks, skills, habits }) => {
    const total = goals + tasks + skills + habits;

    ongoingGoals.textContent = goals;
    ongoingTasks.textContent = tasks;
    ongoingSkills.textContent = skills;
    ongoingHabits.textContent = habits;
    ongoingTotal.textContent = `${total} total`;
  };

  const loadOngoingCounts = async () => {
    if (!window.supabaseClient) {
      renderOngoingCounts(getLocalOngoingCounts());
      return;
    }

    const { data, error } = await window.supabaseClient.auth.getUser();
    const user = data?.user || null;

    if (error || !user) {
      renderOngoingCounts(getLocalOngoingCounts());
      return;
    }

    try {
      const [goals, tasks, skills, habits] = await Promise.all([
        countRows('goals'),
        countRows('tasks', (query) => query.eq('is_done', false)),
        countRows('skills', (query) => query.eq('is_completed', false)),
        countRows('habits', (query) => query.eq('is_active', true))
      ]);

      renderOngoingCounts({ goals, tasks, skills, habits });
    } catch (countError) {
      console.error(countError);
      renderOngoingCounts(getLocalOngoingCounts());
    }
  };

  settingsBtn?.addEventListener('click', () => {
    settingsPanel.classList.toggle('open');
    settingsBtn.setAttribute('aria-expanded', String(settingsPanel.classList.contains('open')));
  });

  let ajayVoiceEnabled = false;

  const setAjayVoiceState = (enabled) => {
    ajayVoiceEnabled = enabled;
    localStorage.setItem('levelingUpAjayVoice', enabled ? 'on' : 'off');
    ajayVoiceBtn.textContent = enabled ? 'Voice on' : 'Voice off';
    ajayVoiceBtn.setAttribute('aria-pressed', String(enabled));

    if (!enabled && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  };

  const getAjayVoice = () => {
    const voices = window.speechSynthesis?.getVoices?.() || [];
    return voices.find((voice) => /male|david|mark|daniel|ravi|aarav|google uk english male/i.test(voice.name))
      || voices.find((voice) => voice.lang?.startsWith('en'))
      || voices[0]
      || null;
  };

  let speakAjayReply = (text) => {
    if (!ajayVoiceEnabled || !window.speechSynthesis || !text) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const voice = getAjayVoice();

    if (voice) utterance.voice = voice;
    utterance.pitch = 0.82;
    utterance.rate = 0.95;
    window.speechSynthesis.speak(utterance);
  };

  const addAjayMessage = (text, sender) => {
    const message = document.createElement('div');

    message.className = `ajay-message ajay-message-${sender}`;
    message.textContent = text;
    ajayMessages.appendChild(message);
    ajayMessages.scrollTop = ajayMessages.scrollHeight;
    return message;
  };

  const openAjayPanel = () => {
    ajayPanel.classList.add('open');
    ajayPanel.setAttribute('aria-hidden', 'false');
    window.setTimeout(() => ajayInput?.focus(), 80);
  };

  const closeAjayPanel = () => {
    ajayPanel.classList.remove('open');
    ajayPanel.setAttribute('aria-hidden', 'true');
    window.speechSynthesis?.cancel();
    if (recognitionActive) recognition?.abort();
  };

  setAjayVoiceState(ajayVoiceEnabled);
  window.speechSynthesis?.addEventListener?.('voiceschanged', getAjayVoice);

  ajayOpenBtn?.addEventListener('click', openAjayPanel);
  ajayCloseBtn?.addEventListener('click', closeAjayPanel);
  ajayVoiceBtn?.addEventListener('click', () => setAjayVoiceState(!ajayVoiceEnabled));

  // Browser-native speech and deterministic AJAY command wiring. No network model is used.
  const ajayStatus = document.getElementById('ajayStatus');
  const helpTitle = document.getElementById('ajayTitle');
  if (helpTitle) helpTitle.textContent = 'Leveling Up Help';
  const initialHelpMessage = ajayMessages?.querySelector('.ajay-message-agent');
  if (initialHelpMessage) {
    initialHelpMessage.textContent = 'Hi! I can explain how Leveling Up works. Ask about levels, tasks, points, blogs, budgets, goals, habits, skills, notes, or the leaderboard.';
  }
  if (ajayStatus) ajayStatus.textContent = 'Ask a question about the website.';
  const ajayMicBtn = document.getElementById('ajayMicBtn');
  const ajayStopSpeechBtn = document.getElementById('ajayStopSpeechBtn');
  const ajayRecognitionLanguage = document.getElementById('ajayRecognitionLanguage');
  const ajayVoiceSelect = document.getElementById('ajayVoiceSelect');
  const ajayRate = document.getElementById('ajayRate');
  const ajayPitch = document.getElementById('ajayPitch');
  const ajayRateValue = document.getElementById('ajayRateValue');
  const ajayPitchValue = document.getElementById('ajayPitchValue');
  const ajayHistoryList = document.getElementById('ajayHistoryList');
  let ajayPending = null;
  let recognition = null;
  let recognitionActive = false;

  const recognitionLanguages = [
    ['en-IN', 'English (India)'],
    ['en-US', 'English (US)'],
    ['hi-IN', 'Hindi'],
    ['mr-IN', 'Marathi'],
    ['bn-IN', 'Bengali'],
    ['gu-IN', 'Gujarati'],
    ['kn-IN', 'Kannada'],
    ['ml-IN', 'Malayalam'],
    ['pa-IN', 'Punjabi'],
    ['ta-IN', 'Tamil'],
    ['te-IN', 'Telugu'],
    ['ur-IN', 'Urdu']
  ];

  const getRecognitionLanguage = () => ajayRecognitionLanguage?.value || 'en-IN';

  const populateRecognitionLanguages = () => {
    if (!ajayRecognitionLanguage) return;
    const saved = localStorage.getItem('levelingUpAjayRecognitionLanguage');
    const browserLanguage = (navigator.languages || [navigator.language || 'en-IN'])
      .find((language) => recognitionLanguages.some(([value]) => value.toLowerCase() === language.toLowerCase()));
    const selected = recognitionLanguages.some(([value]) => value === saved)
      ? saved
      : browserLanguage || 'en-IN';

    ajayRecognitionLanguage.replaceChildren(...recognitionLanguages.map(([value, label]) => {
      const option = new Option(label, value);
      option.selected = value === selected;
      return option;
    }));
  };

  populateRecognitionLanguages();
  const oldSpeakAjayReply = speakAjayReply;
  speakAjayReply = (text) => {
    if (!ajayVoiceEnabled || !window.speechSynthesis || !text) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const preferredLanguage = getRecognitionLanguage().split('-')[0];
    const voice = (window.speechSynthesis.getVoices() || []).find((item) => item.name === ajayVoiceSelect?.value)
      || (window.speechSynthesis.getVoices() || []).find((item) => item.lang?.toLowerCase().startsWith(preferredLanguage.toLowerCase()))
      || getAjayVoice();
    if (voice) utterance.voice = voice;
    utterance.lang = voice?.lang || getRecognitionLanguage();
    utterance.rate = Number(ajayRate?.value || 1); utterance.pitch = Number(ajayPitch?.value || 1);
    window.speechSynthesis.speak(utterance);
  };
  const populateVoices = () => {
    if (!ajayVoiceSelect) return;
    const selected = localStorage.getItem('levelingUpAjayVoiceName');
    ajayVoiceSelect.replaceChildren(...window.speechSynthesis.getVoices().map((voice) => {
      const option = new Option(`${voice.name} (${voice.lang})`, voice.name); option.selected = voice.name === selected; return option;
    }));
  };
  populateVoices(); window.speechSynthesis?.addEventListener?.('voiceschanged', populateVoices);
  ajayVoiceSelect?.addEventListener('change', () => localStorage.setItem('levelingUpAjayVoiceName', ajayVoiceSelect.value));
  ajayRecognitionLanguage?.addEventListener('change', () => {
    localStorage.setItem('levelingUpAjayRecognitionLanguage', getRecognitionLanguage());
    if (recognitionActive) recognition.abort();
    ajayStatus.textContent = `Listening language set to ${ajayRecognitionLanguage.selectedOptions[0]?.text || 'the selected language'}.`;
  });
  ajayRate?.addEventListener('input', () => { ajayRateValue.value = `${Number(ajayRate.value).toFixed(1)}x`; });
  ajayPitch?.addEventListener('input', () => { ajayPitchValue.value = Number(ajayPitch.value).toFixed(1); });
  ajayStopSpeechBtn?.addEventListener('click', () => window.speechSynthesis?.cancel());
  const renderAjayHistory = () => {
    const history = readStoredItems('levelingUpAjayHistory');
    ajayHistoryList?.replaceChildren(...history.map((entry) => { const item = document.createElement('li'); item.textContent = `✓ ${entry.text}`; return item; }));
  };
  document.addEventListener('ajayhistory', renderAjayHistory); renderAjayHistory();
  const runAjayCommand = async (message) => {
    addAjayMessage(message, 'user'); ajayStatus.textContent = 'Processing your command…';
    try {
      const result = window.WebsiteHelpChat.answer(message);
      ajayPending = result.pending || (result.clearPending ? null : ajayPending);
      addAjayMessage(result.reply, 'agent'); speakAjayReply(result.reply);
      ajayStatus.textContent = result.pending ? 'Waiting for confirmation.' : result.clarify ? 'Waiting for details.' : 'Ready to help.';
      ajayStatus.textContent = 'Ask another question whenever you need help.';
    } catch (error) {
      console.error('AJAY command failed:', error); const reply = 'I could not complete that action. Please check your sign-in and try again.';
      addAjayMessage(reply, 'agent'); speakAjayReply(reply); ajayStatus.textContent = 'Action failed.';
    }
  };
  document.querySelectorAll('[data-ajay-command]').forEach((button) => {
    button.addEventListener('click', () => runAjayCommand(button.dataset.ajayCommand));
  });
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) { if (ajayMicBtn) ajayMicBtn.disabled = true; ajayStatus.textContent = 'Voice input is not supported in this browser. You can still type a command.'; }
  else {
    recognition = new SpeechRecognition();
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;
    recognition.onstart = () => {
      recognitionActive = true;
      ajayMicBtn.textContent = 'Stop listening';
      ajayMicBtn.setAttribute('aria-pressed', 'true');
      ajayStatus.textContent = `Listening in ${ajayRecognitionLanguage?.selectedOptions[0]?.text || getRecognitionLanguage()}...`;
    };
    recognition.onresult = (event) => {
      let transcript = '';
      let isFinal = false;
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        transcript += event.results[index][0].transcript;
        isFinal = isFinal || event.results[index].isFinal;
      }
      ajayInput.value = transcript.trim();
      if (isFinal && transcript.trim()) {
        ajayInput.value = '';
        runAjayCommand(transcript.trim());
      }
    };
    recognition.onerror = (event) => {
      const messages = {
        'not-allowed': 'Microphone permission was denied. Allow microphone access in your browser settings, then try again.',
        'service-not-allowed': 'Speech recognition is blocked by this browser. Try Chrome or Edge and allow microphone access.',
        'audio-capture': 'No microphone was found. Connect or enable a microphone, then try again.',
        'network': 'Speech recognition needs an internet connection. Check your connection and try again.',
        'no-speech': 'No speech was heard. Try speaking closer to the microphone.',
        'language-not-supported': 'This listening language is not supported by your browser. Choose another language and try again.',
        'aborted': 'Listening stopped.'
      };
      ajayStatus.textContent = messages[event.error] || 'Speech recognition could not start. Please try again or type your command.';
    };
    recognition.onend = () => {
      recognitionActive = false;
      ajayMicBtn.textContent = 'Speak';
      ajayMicBtn.setAttribute('aria-pressed', 'false');
    };
    ajayMicBtn?.addEventListener('click', () => {
      if (recognitionActive) {
        recognition.abort();
        return;
      }
      try {
        recognition.lang = getRecognitionLanguage();
        recognition.start();
      } catch (error) {
        console.error('Could not start speech recognition:', error);
        recognitionActive = false;
        ajayStatus.textContent = 'Speech recognition is already starting. Please try again in a moment.';
      }
    });
  }

  ajayForm?.addEventListener('submit', async (event) => {
    event.preventDefault();

    const message = ajayInput.value.trim();
    if (!message) return;

    ajayInput.value = '';
    await runAjayCommand(message);
    return;

    addAjayMessage(message, 'user');
    ajayInput.disabled = true;
    if (ajaySendBtn) {
      ajaySendBtn.disabled = true;
      ajaySendBtn.textContent = 'Thinking…';
    }

    const thinkingMessage = addAjayMessage('Ajay is thinking…', 'agent');

    try {
      const response = { ok: false, status: 410, json: async () => ({}) };
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        console.error('Ajay function request failed:', {
          endpoint: 'disabled-local-only',
          status: response.status,
          code: data.code || 'unknown_error'
        });
      }
      const reply = response.ok && data.reply ? data.reply : ajayContactFallback;

      thinkingMessage.textContent = reply;
      speakAjayReply(reply);
    } catch (error) {
      console.error('Ajay request failed:', error);
      thinkingMessage.textContent = ajayContactFallback;
      speakAjayReply(ajayContactFallback);
    } finally {
      ajayInput.disabled = false;
      if (ajaySendBtn) {
        ajaySendBtn.disabled = false;
        ajaySendBtn.textContent = 'Send';
      }
      ajayInput.focus();
    }
  });

  logoutBtn?.addEventListener('click', async () => {
    if (window.supabaseClient) {
      await window.supabaseClient.auth.signOut();
    }
    localStorage.removeItem('levelingUpUserName');
    localStorage.removeItem('levelingUpUserId');
    window.location.href = 'index.html';
  });

  const openProfilePhotoPicker = () => {
    profilePhotoInput?.click();
  };

  const resizeProfilePhoto = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.addEventListener('error', reject);
    reader.addEventListener('load', () => {
      const image = new Image();

      image.addEventListener('error', reject);
      image.addEventListener('load', () => {
        const maxSize = 512;
        const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');

        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.86));
      });

      image.src = reader.result;
    });

    reader.readAsDataURL(file);
  });

  const dataUrlToBlob = async (dataUrl) => {
    const response = await fetch(dataUrl);
    return response.blob();
  };

  const uploadProfilePhoto = async (photoDataUrl) => {
    if (!window.supabaseClient) return photoDataUrl;

    const { data: { user }, error: userError } = await window.supabaseClient.auth.getUser();

    if (userError || !user) return photoDataUrl;

    const photoBlob = await dataUrlToBlob(photoDataUrl);
    const photoPath = `${user.id}/avatar.jpg`;
    const { error: uploadError } = await window.supabaseClient.storage
      .from(profilePhotoBucket)
      .upload(photoPath, photoBlob, {
        contentType: 'image/jpeg',
        upsert: true
      });

    if (uploadError) throw uploadError;

    const { data: publicUrlData } = window.supabaseClient.storage
      .from(profilePhotoBucket)
      .getPublicUrl(photoPath);

    const avatarUrl = `${publicUrlData.publicUrl}?v=${Date.now()}`;
    const { error: profileError } = await window.supabaseClient.from('profiles').upsert({
      user_id: user.id,
      avatar_url: avatarUrl
    }, { onConflict: 'user_id' });

    if (profileError) throw profileError;

    return avatarUrl;
  };

  profilePhotoBtn?.addEventListener('click', openProfilePhotoPicker);
  profilePhotoChangeBtn?.addEventListener('click', openProfilePhotoPicker);

  profilePhotoInput?.addEventListener('change', async () => {
    const file = profilePhotoInput.files?.[0];

    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file.');
      profilePhotoInput.value = '';
      return;
    }

    try {
      const photoDataUrl = await resizeProfilePhoto(file);
      renderProfilePhoto(photoDataUrl);
      const savedPhotoUrl = await uploadProfilePhoto(photoDataUrl);

      localStorage.setItem('levelingUpProfilePhoto', savedPhotoUrl);
      renderProfilePhoto(savedPhotoUrl);
    } catch (error) {
      alert(error.message || 'Unable to load this photo. Please choose another image.');
    } finally {
      profilePhotoInput.value = '';
    }
  });

  contactBtn?.addEventListener('click', () => {
    contactPanel?.classList.toggle('open');
  });

  const libraryToggle = document.getElementById('libraryToggle');
  const libraryBookList = document.getElementById('libraryBookList');

  libraryToggle?.addEventListener('click', () => {
    const isExpanded = libraryToggle.getAttribute('aria-expanded') === 'true';
    libraryToggle.setAttribute('aria-expanded', String(!isExpanded));
    libraryBookList.hidden = isExpanded;
    libraryToggle.textContent = isExpanded ? 'View all 52 books' : 'Hide book list';
  });

  window.addEventListener('storage', (event) => {
    if (event.key?.startsWith('levelingUp')) {
      loadOngoingCounts();
    }
  });

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      loadOngoingCounts();
    }
  });

  if (window.supabaseClient) {
    const { data: { user } } = await window.supabaseClient.auth.getUser();
    if (user) {
      const { data: profileData } = await window.supabaseClient
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('user_id', user.id)
        .single();

      if (profileData?.full_name) {
        updateDisplayedName(profileData.full_name);
      }

      if (profileData?.avatar_url) {
        localStorage.setItem('levelingUpProfilePhoto', profileData.avatar_url);
        renderProfilePhoto(profileData.avatar_url);
      }
    }
  }

  await loadOngoingCounts();
  setInterval(loadOngoingCounts, 30000);
});

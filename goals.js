document.addEventListener('DOMContentLoaded', async () => {
  const goalsForm = document.getElementById('goalsForm');
  const goalTitle = document.getElementById('goalTitle');
  const goalDescription = document.getElementById('goalDescription');
  const goalType = document.getElementById('goalType');
  const goalTargetDate = document.getElementById('goalTargetDate');
  const goalsList = document.getElementById('goalsList');
  const goalsStatus = document.getElementById('goalsStatus');

  let goals = [];
  let currentUser = null;

  const escapeHtml = (value) => {
    const div = document.createElement('div');
    div.textContent = value;
    return div.innerHTML;
  };

  const showStatus = (message, isError = false) => {
    goalsStatus.textContent = message;
    goalsStatus.classList.toggle('error-message', isError);
    setTimeout(() => {
      goalsStatus.textContent = '';
      goalsStatus.classList.remove('error-message');
    }, 2800);
  };

  const loadLocalGoals = () => {
    goals = JSON.parse(localStorage.getItem('levelingUpGoals') || '[]');
  };

  const saveLocalGoals = () => {
    localStorage.setItem('levelingUpGoals', JSON.stringify(goals));
  };

  const renderGoals = () => {
    if (!goals.length) {
      goalsList.innerHTML = '<p class="empty-state">No goals yet. Add your first one above.</p>';
      return;
    }

    goalsList.innerHTML = goals
      .map((goal, index) => `
        <article class="task-item">
          <div>
            <h3>${escapeHtml(goal.title)}</h3>
            <p>${escapeHtml(goal.description || 'No description added.')}</p>
            <small>${escapeHtml(goal.goal_type || goal.type)}${goal.target_date || goal.targetDate ? ` - Target: ${escapeHtml(goal.target_date || goal.targetDate)}` : ''}</small>
          </div>
          <button class="task-done goal-complete" data-index="${index}">Mark Complete</button>
        </article>
      `)
      .join('');
  };

  const loadSupabaseGoals = async () => {
    const { data, error } = await window.supabaseClient
      .from('goals')
      .select('id, title, description, goal_type, target_date, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      showStatus(error.message, true);
      return;
    }

    goals = data || [];
  };

  const setupGoals = async () => {
    if (!window.supabaseClient) {
      loadLocalGoals();
      renderGoals();
      return;
    }

    const { data, error } = await window.supabaseClient.auth.getUser();
    currentUser = data?.user || null;

    if (error || !currentUser) {
      loadLocalGoals();
      renderGoals();
      return;
    }

    await loadSupabaseGoals();
    renderGoals();
  };

  goalsForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const title = goalTitle.value.trim();
    if (!title) return;

    const goal = {
      title,
      description: goalDescription.value.trim(),
      goal_type: goalType.value,
      target_date: goalTargetDate.value || null
    };

    if (window.supabaseClient && currentUser) {
      const { data, error } = await window.supabaseClient
        .from('goals')
        .insert({ ...goal, user_id: currentUser.id })
        .select('id, title, description, goal_type, target_date, created_at')
        .single();

      if (error) {
        showStatus(error.message, true);
        return;
      }

      goals.unshift(data);
    } else {
      goals.unshift({
        ...goal,
        id: crypto.randomUUID(),
        type: goal.goal_type,
        targetDate: goal.target_date
      });
      saveLocalGoals();
    }

    goalsForm.reset();
    renderGoals();
    showStatus('Goal added successfully.');
  });

  goalsList.addEventListener('click', async (event) => {
    const completeButton = event.target.closest('.goal-complete');
    if (!completeButton) return;

    const index = Number(completeButton.dataset.index);
    const goal = goals[index];

    if (window.supabaseClient && currentUser && goal?.id) {
      const { error } = await window.supabaseClient.from('goals').delete().eq('id', goal.id);
      if (error) {
        showStatus(error.message, true);
        return;
      }
    }

    goals.splice(index, 1);
    if (!currentUser) saveLocalGoals();
    renderGoals();
    showStatus('Goal completed and removed.');
  });

  await setupGoals();
});

document.addEventListener('DOMContentLoaded', async () => {
  const habitsForm = document.getElementById('habitsForm');
  const habitTitle = document.getElementById('habitTitle');
  const habitDescription = document.getElementById('habitDescription');
  const habitsList = document.getElementById('habitsList');
  const habitsStatus = document.getElementById('habitsStatus');

  let habits = [];
  let currentUser = null;
  let todayHabitTasks = {};

  const today = () => new Date().toISOString().slice(0, 10);

  const escapeHtml = (value) => {
    const div = document.createElement('div');
    div.textContent = value || '';
    return div.innerHTML;
  };

  const showStatus = (message, isError = false) => {
    habitsStatus.textContent = message;
    habitsStatus.classList.toggle('error-message', isError);
    setTimeout(() => {
      habitsStatus.textContent = '';
      habitsStatus.classList.remove('error-message');
    }, 2800);
  };

  const loadLocalHabits = () => {
    habits = JSON.parse(localStorage.getItem('levelingUpHabits') || '[]')
      .filter((habit) => habit.is_active !== false);
  };

  const saveLocalHabits = () => {
    localStorage.setItem('levelingUpHabits', JSON.stringify(habits));
  };

  const renderHabits = () => {
    if (!habits.length) {
      habitsList.innerHTML = '<p class="empty-state">No habits yet. Add your first one above.</p>';
      return;
    }

    habitsList.innerHTML = habits
      .map((habit, index) => `
        <article class="task-item">
          <div>
            <h3>${escapeHtml(habit.title)}</h3>
            <p>${escapeHtml(habit.description || 'No description added.')}</p>
            <small>${habit.completedToday ? 'Completed today — great work!' : 'Complete today to keep your routine going.'}</small>
          </div>
          <div class="habit-actions">
            <button class="task-done habit-complete" data-index="${index}" ${habit.completedToday ? 'disabled' : ''}>${habit.completedToday ? '✓ Done today' : '✓ Complete today'}</button>
            <button class="danger-button habit-delete" data-index="${index}">Delete</button>
          </div>
        </article>
      `)
      .join('');
  };

  const loadSupabaseHabits = async () => {
    const { data, error } = await window.supabaseClient
      .from('habits')
      .select('id, title, description, is_active, last_task_date, created_at')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      showStatus(error.message, true);
      return;
    }

    habits = data || [];

    const { data: dailyTasks } = await window.supabaseClient
      .from('tasks')
      .select('id, habit_id, is_done')
      .eq('start_date', today());
    todayHabitTasks = (dailyTasks || []).reduce((map, task) => { if (task.habit_id) map[task.habit_id] = task; return map; }, {});
    habits.forEach((habit) => { habit.completedToday = Boolean(todayHabitTasks[habit.id]?.is_done); });
  };

  const setupHabits = async () => {
    await window.levelingUpHabitScheduler?.syncDailyHabits();

    if (!window.supabaseClient) {
      loadLocalHabits();
      const tasks = JSON.parse(localStorage.getItem('levelingUpTasks') || '[]');
      const history = JSON.parse(localStorage.getItem('levelingUpTaskHistory') || '[]');
      habits.forEach((habit) => { habit.completedToday = [...tasks, ...history].some((task) => task.habit_id === habit.id && (task.start_date || task.startDate) === today() && task.is_done); });
      renderHabits();
      return;
    }

    const { data, error } = await window.supabaseClient.auth.getUser();
    currentUser = data?.user || null;

    if (error || !currentUser) {
      loadLocalHabits();
      renderHabits();
      return;
    }

    await loadSupabaseHabits();
    renderHabits();
  };

  habitsForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const habit = {
      title: habitTitle.value.trim(),
      description: habitDescription.value.trim(),
      is_active: true,
      last_task_date: today()
    };

    if (!habit.title) return;

    if (window.supabaseClient && currentUser) {
      const { data, error } = await window.supabaseClient
        .from('habits')
        .insert({ ...habit, user_id: currentUser.id })
        .select('id, title, description, is_active, last_task_date, created_at')
        .single();

      if (error) {
        showStatus(error.message, true);
        return;
      }

      habits.unshift(data);
    } else {
      habits.unshift({ ...habit, id: crypto.randomUUID(), created_at: new Date().toISOString() });
      saveLocalHabits();
    }

    habitsForm.reset();
    renderHabits();
    showStatus('Habit added successfully. It will appear in tasks every day after midnight.');
  });

  habitsList.addEventListener('click', async (event) => {
    const completeButton = event.target.closest('.habit-complete');
    if (completeButton) {
      const index = Number(completeButton.dataset.index);
      const habit = habits[index];
      if (!habit || habit.completedToday) return;
      completeButton.disabled = true;
      let error = null;

      if (window.supabaseClient && currentUser) {
        const existing = todayHabitTasks[habit.id];
        if (existing?.id) {
          try {
            await window.levelingUpProgress?.completeTask(existing.id, currentUser.id);
          } catch (completionError) {
            error = completionError;
          }
        } else {
          const result = await window.supabaseClient.from('tasks').insert({ user_id: currentUser.id, title: habit.title, description: habit.description || 'Daily habit', start_date: today(), start_time: '00:00', finish_date: today(), finish_time: '23:59', habit_id: habit.id }).select('id, habit_id, is_done').single();
          error = result.error;
          if (result.data && !error) {
            todayHabitTasks[habit.id] = result.data;
            try {
              await window.levelingUpProgress?.completeTask(result.data.id, currentUser.id);
            } catch (completionError) {
              error = completionError;
            }
          }
        }
      } else {
        const tasks = JSON.parse(localStorage.getItem('levelingUpTasks') || '[]');
        const history = JSON.parse(localStorage.getItem('levelingUpTaskHistory') || '[]');
        let task = tasks.find((item) => item.habit_id === habit.id && (item.start_date || item.startDate) === today());
        if (task) tasks.splice(tasks.indexOf(task), 1); else task = { id: crypto.randomUUID(), title: habit.title, description: habit.description || 'Daily habit', start_date: today(), start_time: '00:00', finish_date: today(), finish_time: '23:59', habit_id: habit.id };
        task.is_done = true; task.completed_at = new Date().toISOString();
        history.push(task);
        localStorage.setItem('levelingUpTasks', JSON.stringify(tasks));
        localStorage.setItem('levelingUpTaskHistory', JSON.stringify(history));
      }

      if (error) { completeButton.disabled = false; showStatus(error.message, true); return; }
      habit.completedToday = true;
      const localName = localStorage.getItem('levelingUpUserName') || 'User';
      const localId = localStorage.getItem('levelingUpUserId') || localName.toLowerCase().replace(/\s+/g, '-') || 'guest';
      if (!currentUser) await window.levelingUpProgress?.awardTaskXp(localId);
      renderHabits();
      showStatus('Habit completed for today. It will remain here for tomorrow.');
      return;
    }

    const deleteButton = event.target.closest('.habit-delete');
    if (!deleteButton) return;

    const index = Number(deleteButton.dataset.index);
    const habit = habits[index];

    if (window.supabaseClient && currentUser && habit?.id) {
      const { error } = await window.supabaseClient
        .from('habits')
        .update({ is_active: false })
        .eq('id', habit.id);

      if (error) {
        showStatus(error.message, true);
        return;
      }
    }

    habits.splice(index, 1);
    if (!currentUser) saveLocalHabits();
    renderHabits();
    showStatus('Habit removed.');
  });

  await setupHabits();
});

document.addEventListener('DOMContentLoaded', async () => {
  const taskForm = document.getElementById('taskForm');
  const taskTitle = document.getElementById('taskTitle');
  const taskDescription = document.getElementById('taskDescription');
  const startDate = document.getElementById('startDate');
  const startTime = document.getElementById('startTime');
  const finishDate = document.getElementById('finishDate');
  const finishTime = document.getElementById('finishTime');
  const taskList = document.getElementById('taskList');
  const successMessage = document.getElementById('successMessage');

  let tasks = [];
  let currentUser = null;

  const escapeHtml = (value) => {
    const div = document.createElement('div');
    div.textContent = value || '';
    return div.innerHTML;
  };

  const showStatus = (message, isError = false) => {
    successMessage.textContent = message;
    successMessage.classList.toggle('error-message', isError);
    setTimeout(() => {
      successMessage.textContent = '';
      successMessage.classList.remove('error-message');
    }, 2800);
  };

  const loadLocalTasks = () => {
    tasks = JSON.parse(localStorage.getItem('levelingUpTasks') || '[]');
  };

  const saveLocalTasks = () => {
    localStorage.setItem('levelingUpTasks', JSON.stringify(tasks));
  };

  const renderTasks = () => {
    if (!tasks.length) {
      taskList.innerHTML = '<p class="empty-state">No tasks yet. Add your first one above.</p>';
      return;
    }

    taskList.innerHTML = tasks
      .map((task, index) => {
        const taskStartDate = task.start_date || task.startDate || '';
        const taskStartTime = task.start_time || task.startTime || '';
        const taskFinishDate = task.finish_date || task.finishDate || '';
        const taskFinishTime = task.finish_time || task.finishTime || '';

        return `
          <article class="task-item">
            <div>
              <h3>${escapeHtml(task.title)}</h3>
              <p>${escapeHtml(task.description || 'No description added.')}</p>
              <small>${escapeHtml(taskStartDate)} ${escapeHtml(taskStartTime)} -> ${escapeHtml(taskFinishDate)} ${escapeHtml(taskFinishTime)}</small>
            </div>
            <button class="task-done task-complete" data-index="${index}">Mark Done</button>
          </article>
        `;
      })
      .join('');
  };

  const loadSupabaseTasks = async () => {
    const { data, error } = await window.supabaseClient
      .from('tasks')
      .select('id, title, description, start_date, start_time, finish_date, finish_time, is_done, created_at, completed_at')
      .eq('is_done', false)
      .order('created_at', { ascending: false });

    if (error) {
      showStatus(error.message, true);
      return;
    }

    tasks = data || [];
  };

  const setupTasks = async () => {
    await window.levelingUpHabitScheduler?.syncDailyHabits();

    if (!window.supabaseClient) {
      loadLocalTasks();
      renderTasks();
      return;
    }

    const { data, error } = await window.supabaseClient.auth.getUser();
    currentUser = data?.user || null;

    if (error || !currentUser) {
      loadLocalTasks();
      renderTasks();
      return;
    }

    await loadSupabaseTasks();
    renderTasks();
  };

  taskForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const task = {
      title: taskTitle.value.trim(),
      description: taskDescription.value.trim(),
      start_date: startDate.value,
      start_time: startTime.value,
      finish_date: finishDate.value,
      finish_time: finishTime.value
    };

    if (!task.title || !task.start_date || !task.start_time || !task.finish_date || !task.finish_time) return;

    if (window.supabaseClient && currentUser) {
      const { data, error } = await window.supabaseClient
        .from('tasks')
        .insert({ ...task, user_id: currentUser.id })
        .select('id, title, description, start_date, start_time, finish_date, finish_time, is_done, created_at, completed_at')
        .single();

      if (error) {
        showStatus(error.message, true);
        return;
      }

      tasks.unshift(data);
    } else {
      tasks.unshift({
        ...task,
        id: crypto.randomUUID(),
        startDate: task.start_date,
        startTime: task.start_time,
        finishDate: task.finish_date,
        finishTime: task.finish_time,
        is_done: false
      });
      saveLocalTasks();
    }

    taskForm.reset();
    renderTasks();
    showStatus('Task added successfully.');
  });

  taskList.addEventListener('click', async (event) => {
    const doneButton = event.target.closest('.task-complete');
    if (!doneButton) return;

    const index = Number(doneButton.dataset.index);
    const task = tasks[index];

    if (window.supabaseClient && currentUser && task?.id) {
      doneButton.disabled = true;
      try {
        const progress = await window.levelingUpProgress?.completeTask(task.id, currentUser.id);
        tasks.splice(index, 1);
        renderTasks();
        showStatus(`Congratulations! You completed a task and earned +${window.levelingUpProgress?.XP_PER_TASK || 10} XP${progress ? ` (Level ${progress.level})` : ''}.`);
      } catch (error) {
        doneButton.disabled = false;
        showStatus(error.message, true);
      }
      return;
    }

    if (!currentUser && task) {
      task.is_done = true;
      task.completed_at = new Date().toISOString();
      const history = JSON.parse(localStorage.getItem('levelingUpTaskHistory') || '[]');
      history.push(task);
      localStorage.setItem('levelingUpTaskHistory', JSON.stringify(history));
    }
    tasks.splice(index, 1);
    if (!currentUser) saveLocalTasks();
    const localUserName = localStorage.getItem('levelingUpUserName') || 'User';
    const localUserId = localStorage.getItem('levelingUpUserId') || localUserName.toLowerCase().replace(/\s+/g, '-') || 'guest';
    const progress = await window.levelingUpProgress?.awardTaskXp(currentUser?.id || localUserId);
    renderTasks();
    showStatus(`Congratulations! You completed a task and earned +${window.levelingUpProgress?.XP_PER_TASK || 10} XP${progress ? ` (Level ${progress.level})` : ''}.`);
  });

  await setupTasks();
});

window.levelingUpHabitScheduler = (() => {
  const today = () => new Date().toISOString().slice(0, 10);

  const readLocalHabits = () => JSON.parse(localStorage.getItem('levelingUpHabits') || '[]');
  const writeLocalHabits = (habits) => {
    localStorage.setItem('levelingUpHabits', JSON.stringify(habits));
  };

  const addLocalHabitTasks = () => {
    const currentDate = today();
    const habits = readLocalHabits();
    const tasks = JSON.parse(localStorage.getItem('levelingUpTasks') || '[]');
    let changed = false;

    habits.forEach((habit) => {
      if (!habit.is_active || habit.last_task_date === currentDate) return;

      tasks.unshift({
        id: crypto.randomUUID(),
        title: habit.title,
        description: habit.description || 'Daily habit',
        start_date: currentDate,
        start_time: '00:00',
        finish_date: currentDate,
        finish_time: '23:59',
        startDate: currentDate,
        startTime: '00:00',
        finishDate: currentDate,
        finishTime: '23:59',
        is_done: false,
        habit_id: habit.id
      });

      habit.last_task_date = currentDate;
      changed = true;
    });

    if (changed) {
      localStorage.setItem('levelingUpTasks', JSON.stringify(tasks));
      writeLocalHabits(habits);
    }
  };

  const addSupabaseHabitTasks = async (user) => {
    const currentDate = today();
    const { data: habits, error } = await window.supabaseClient
      .from('habits')
      .select('id, title, description, last_task_date')
      .eq('is_active', true)
      .or(`last_task_date.is.null,last_task_date.lt.${currentDate}`);

    if (error || !habits?.length) return;

    for (const habit of habits) {
      const { error: taskError } = await window.supabaseClient.from('tasks').insert({
        user_id: user.id,
        title: habit.title,
        description: habit.description || 'Daily habit',
        start_date: currentDate,
        start_time: '00:00',
        finish_date: currentDate,
        finish_time: '23:59',
        habit_id: habit.id
      });

      if (taskError) continue;

      await window.supabaseClient
        .from('habits')
        .update({ last_task_date: currentDate })
        .eq('id', habit.id);
    }
  };

  const syncDailyHabits = async () => {
    if (!window.supabaseClient) {
      addLocalHabitTasks();
      return;
    }

    const { data, error } = await window.supabaseClient.auth.getUser();
    const user = data?.user || null;

    if (error || !user) {
      addLocalHabitTasks();
      return;
    }

    await addSupabaseHabitTasks(user);
  };

  return { syncDailyHabits };
})();

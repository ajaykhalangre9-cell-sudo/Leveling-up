(function () {
  const XP_PER_LEVEL = 1000;
  const XP_PER_TASK = 10;

  const getRank = (level) => {
    if (level <= 5) return { code: 'E', title: 'Needs improvement' };
    if (level <= 10) return { code: 'D', title: 'Beginner' };
    if (level <= 15) return { code: 'C', title: 'Intermediate' };
    if (level <= 20) return { code: 'B', title: 'Advanced' };
    if (level <= 30) return { code: 'A', title: 'Elite' };
    return { code: 'S', title: 'Supreme' };
  };

  const getProgress = (totalXp = 0) => {
    const xp = Math.max(0, Number(totalXp) || 0);
    const level = Math.floor(xp / XP_PER_LEVEL) + 1;
    return { totalXp: xp, level, currentXp: xp % XP_PER_LEVEL, ...getRank(level) };
  };

  const localKey = (userId) => `levelingUpProgress:${userId || 'guest'}`;
  const localEventKey = (userId) => `levelingUpXpEvents:${userId || 'guest'}`;

  const readLocalProgress = (userId) => {
    try {
      return getProgress(JSON.parse(localStorage.getItem(localKey(userId)) || '{}').totalXp);
    } catch (error) {
      return getProgress();
    }
  };

  const saveLocalProgress = (userId, totalXp) => {
    localStorage.setItem(localKey(userId), JSON.stringify({ totalXp }));
    return getProgress(totalXp);
  };

  const loadProgress = async (userId) => {
    if (!window.supabaseClient || !userId) return readLocalProgress(userId);

    const { data, error } = await window.supabaseClient
      .from('user_progress')
      .select('total_xp')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) return readLocalProgress(userId);
    return getProgress(data?.total_xp || 0);
  };

  const awardTaskXp = async (userId) => {
    if (!window.supabaseClient || !userId) {
      const saved = readLocalProgress(userId);
      const event = { amount: XP_PER_TASK, source: 'task', earned_at: new Date().toISOString() };
      const events = JSON.parse(localStorage.getItem(localEventKey(userId)) || '[]');
      events.push(event);
      localStorage.setItem(localEventKey(userId), JSON.stringify(events));
      return saveLocalProgress(userId, saved.totalXp + XP_PER_TASK);
    }

    // Connected accounts must earn XP through a server-side action such as
    // complete_task_and_award_xp(). Never make browser writes to XP tables.
    throw new Error('XP can only be awarded when a task is completed.');
  };

  const completeTask = async (taskId, userId) => {
    if (!window.supabaseClient || !taskId || !userId) return awardTaskXp(userId);

    // Backfill a profile for accounts created before the signup trigger was installed.
    const fullName = localStorage.getItem('levelingUpUserName')?.trim();
    if (fullName) {
      const { error: profileError } = await window.supabaseClient
        .from('profiles')
        .upsert({ user_id: userId, full_name: fullName }, { onConflict: 'user_id' });
      if (profileError) console.warn('Could not sync the leaderboard name:', profileError);
    }

    const { data: totalXp, error } = await window.supabaseClient
      .rpc('complete_task_and_award_xp', { p_task_id: taskId });

    if (error) throw error;
    return getProgress(totalXp);
  };

  window.levelingUpProgress = { XP_PER_LEVEL, XP_PER_TASK, getProgress, loadProgress, awardTaskXp, completeTask };
})();

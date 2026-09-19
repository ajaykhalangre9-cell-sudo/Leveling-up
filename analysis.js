document.addEventListener('DOMContentLoaded', async () => {
  const status = document.getElementById('analysisStatus');
  const dayMs = 86400000;
  const escapeHtml = (value) => { const el = document.createElement('span'); el.textContent = value || ''; return el.innerHTML; };
  const durationHours = (item) => {
    const start = new Date(`${item.start_date || item.startDate}T${item.start_time || item.startTime}`);
    const finish = new Date(`${item.finish_date || item.finishDate}T${item.finish_time || item.finishTime}`);
    const hours = (finish - start) / 3600000;
    return Number.isFinite(hours) && hours >= 0 ? hours : 0;
  };
  const durationDays = (start, end) => Math.max(0, Math.ceil((new Date(end) - new Date(start)) / dayMs));
  const dateText = (value) => new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

  function renderDailyLineChart(id, events, unit, color, emptyText) {
    const root = document.getElementById(id);
    if (!events.length) { root.innerHTML = `<p class="empty-state">${emptyText}</p>`; return; }
    const grouped = events.reduce((map, event) => { const day = (event.date || event.earned_at || event.completed_at || event.created_at || '').slice(0, 10); if (day) map[day] = (map[day] || 0) + Number(event.amount ?? event.value ?? 1); return map; }, {});
    const data = Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).slice(-14);
    if (!data.length) { root.innerHTML = `<p class="empty-state">${emptyText}</p>`; return; }
    const max = Math.max(...data.map(([, value]) => value), 10);
    const points = data.map(([day, value], index) => `${data.length === 1 ? 50 : 5 + index * 90 / (data.length - 1)},${88 - value / max * 70}`).join(' ');
    root.innerHTML = `<div class="line-chart"><svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-label="Daily ${escapeHtml(unit)} chart"><line x1="5" y1="88" x2="95" y2="88" class="chart-axis" /><polyline points="${points}" style="stroke:${color}" class="xp-line" vector-effect="non-scaling-stroke" />${data.map(([day, value], index) => { const x = data.length === 1 ? 50 : 5 + index * 90 / (data.length - 1); const y = 88 - value / max * 70; return `<circle cx="${x}" cy="${y}" r="1.8" style="fill:${color}" class="xp-dot"><title>${dateText(day)}: ${value} ${unit}</title></circle>`; }).join('')}</svg><div class="line-labels"><span>${dateText(data[0][0])}</span><span>${dateText(data[data.length - 1][0])}</span></div><p class="chart-total" style="color:${color} !important">${data.reduce((sum, [, value]) => sum + value, 0)} ${unit} in this period</p></div>`;
  }

  function renderItemLineChart(id, items, unit, color, emptyText) {
    const root = document.getElementById(id);
    if (!items.length) { root.innerHTML = `<p class="empty-state">${emptyText}</p>`; return; }
    const data = items.slice(0, 10);
    const max = Math.max(...data.map((item) => item.value), 1);
    const points = data.map((item, index) => `${data.length === 1 ? 50 : 5 + index * 90 / (data.length - 1)},${88 - item.value / max * 70}`).join(' ');
    root.innerHTML = `<div class="line-chart"><svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-label="${escapeHtml(unit)} by item"><line x1="5" y1="88" x2="95" y2="88" class="chart-axis" /><polyline points="${points}" style="stroke:${color}" class="xp-line" vector-effect="non-scaling-stroke" />${data.map((item, index) => { const x = data.length === 1 ? 50 : 5 + index * 90 / (data.length - 1); const y = 88 - item.value / max * 70; return `<circle cx="${x}" cy="${y}" r="1.8" style="fill:${color}" class="xp-dot"><title>${escapeHtml(item.label)}: ${item.value} ${unit}</title></circle>`; }).join('')}</svg><div class="duration-labels">${data.map((item) => `<span title="${escapeHtml(item.label)}">${escapeHtml(item.shortLabel || item.label)}</span>`).join('')}</div><p class="chart-total" style="color:${color} !important">Average: ${(data.reduce((sum, item) => sum + item.value, 0) / data.length).toFixed(1)} ${unit}</p></div>`;
  }

  let tasks = [], skills = [], habits = [], events = [];
  let user = null;
  if (window.supabaseClient) {
    const { data } = await window.supabaseClient.auth.getUser(); user = data?.user;
  }
  if (user) {
    const [taskResult, skillResult, habitResult, eventResult] = await Promise.all([
      window.supabaseClient.from('tasks').select('title,start_date,start_time,finish_date,finish_time,habit_id,is_done,created_at,completed_at').order('created_at', { ascending: true }),
      window.supabaseClient.from('skills').select('title,created_at,completed_at,is_completed').eq('is_completed', true).order('completed_at', { ascending: false }),
      window.supabaseClient.from('habits').select('id,title,created_at,updated_at,is_active').order('created_at', { ascending: false }),
      window.supabaseClient.from('xp_events').select('amount,earned_at').order('earned_at', { ascending: true })
    ]);
    tasks = taskResult.data || []; skills = skillResult.data || []; habits = habitResult.data || []; events = eventResult.data || [];
    if (taskResult.error || skillResult.error || habitResult.error || eventResult.error) status.textContent = 'Some history could not be loaded yet. Run the latest database setup script, then refresh.';
  } else {
    tasks = [...JSON.parse(localStorage.getItem('levelingUpTaskHistory') || '[]'), ...JSON.parse(localStorage.getItem('levelingUpTasks') || '[]')];
    skills = JSON.parse(localStorage.getItem('levelingUpSkillHistory') || '[]');
    habits = JSON.parse(localStorage.getItem('levelingUpHabits') || '[]');
    const name = localStorage.getItem('levelingUpUserName') || 'User'; const id = localStorage.getItem('levelingUpUserId') || name.toLowerCase().replace(/\s+/g, '-') || 'guest';
    events = JSON.parse(localStorage.getItem(`levelingUpXpEvents:${id}`) || '[]');
  }
  renderItemLineChart('taskChart', tasks.map((task, index) => ({ label: task.title || `Task ${index + 1}`, shortLabel: `Task ${index + 1}`, value: durationHours(task) })), 'hours', '#8b5cf6', 'Add a task to see it on your graph.');
  renderItemLineChart('skillChart', skills.filter((skill) => skill.completed_at).map((skill) => ({ label: skill.title, value: durationDays(skill.created_at || skill.completed_at, skill.completed_at) })), 'days', '#22c55e', 'Complete a skill to see how many days it took.');
  renderItemLineChart('habitChart', habits.map((habit) => {
    const firstCompletion = tasks.filter((task) => task.habit_id === habit.id && task.completed_at).sort((a, b) => new Date(a.completed_at) - new Date(b.completed_at))[0];
    return firstCompletion ? { label: habit.title, value: durationDays(habit.created_at || firstCompletion.completed_at, firstCompletion.completed_at) } : null;
  }).filter(Boolean), 'days', '#f59e0b', 'Complete a habit at least once to see how many days it took.');
  renderDailyLineChart('xpChart', events, 'XP earned', '#38bdf8', 'Complete a task to start tracking daily XP.');
});

/* A local, read-only guide for the Leveling Up website. */
(() => {
  const topics = [
    [['level up', 'level', 'rank', 'xp'], 'You level up by earning XP. Complete tasks to earn +10 XP each. Your dashboard shows your current XP, level, rank, and progress toward the next 1,000 XP.'],
    [['point', 'points', 'xp'], 'The points system uses XP. Every completed task earns +10 XP, which contributes to your level and leaderboard position.'],
    [['add task', 'create task', 'new task', 'task'], 'Open Tasks from the sidebar, add a task, enter its title and schedule, then save it. Mark it complete when finished to earn +10 XP.'],
    [['goal', 'goals'], 'Open Goals from the sidebar to create and track personal goals. Give each goal a clear title and target date, then update it as you progress.'],
    [['habit', 'habits'], 'Use Habits to build repeatable daily routines. Add a habit, keep it active, and check in consistently to support your streak.'],
    [['budget', 'expense', 'income', 'money'], 'Open Budget to record income and expenses, review categories, and understand where your money is going. Add entries regularly for the clearest picture.'],
    [['blog', 'blogs', 'post'], 'Open Blog from the sidebar to read and share posts from the Leveling Up community.'],
    [['leaderboard', 'position', 'top'], 'The leaderboard ranks the top 50 players by total XP earned from completed tasks. Select View leaderboard on the dashboard to see your position.'],
    [['skill', 'skills'], 'Use Skills to list abilities you want to develop and track your learning progress.'],
    [['note', 'notes'], 'Open Notes to capture ideas, plans, and reflections for your growth journey.'],
    [['bucket', 'wish'], 'Use Bucket List to save experiences and long-term dreams you want to complete.'],
    [['streak'], 'Your streak reflects consecutive days of activity. Keep completing your planned work consistently to protect it.'],
    [['chess'], 'Open Chess from the sidebar to use the chess feature inside Leveling Up.']
  ];

  const answer = (question) => {
    const text = String(question || '').toLowerCase();
    const match = topics.find(([words]) => words.some((word) => text.includes(word)));
    return { reply: match?.[1] || 'I can help you use Leveling Up. Try asking: How do I level up? How do I add a task? How do points work? What is the blog? Or how do I use Budget?' };
  };

  window.WebsiteHelpChat = { answer };
})();

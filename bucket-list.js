document.addEventListener('DOMContentLoaded', async () => {
  const storageKey = 'levelingUpBucketList';
  const form = document.getElementById('bucketForm');
  const title = document.getElementById('bucketTitle');
  const description = document.getElementById('bucketDescription');
  const category = document.getElementById('bucketCategory');
  const targetDate = document.getElementById('bucketTargetDate');
  const list = document.getElementById('bucketList');
  const status = document.getElementById('bucketStatus');
  const openForm = document.getElementById('openBucketForm');
  const closeForm = document.getElementById('closeBucketForm');
  let items = [];
  let currentUser = null;

  const escapeHtml = (value) => { const element = document.createElement('div'); element.textContent = value || ''; return element.innerHTML; };
  const saveLocalItems = () => localStorage.setItem(storageKey, JSON.stringify(items));
  const loadLocalItems = () => { try { items = JSON.parse(localStorage.getItem(storageKey) || '[]'); if (!Array.isArray(items)) items = []; } catch { items = []; } };
  const showStatus = (message, isError = false) => { status.textContent = message; status.classList.toggle('error-message', isError); window.setTimeout(() => { status.textContent = ''; status.classList.remove('error-message'); }, 2800); };
  const formatDate = (date) => date ? new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(`${date}T00:00:00`)) : '';
  const isCompleted = (item) => Boolean(item.is_completed ?? item.completed);

  const render = () => {
    const completed = items.filter(isCompleted).length;
    document.getElementById('totalItems').textContent = items.length;
    document.getElementById('completedItems').textContent = completed;
    document.getElementById('remainingItems').textContent = items.length - completed;
    if (!items.length) { list.innerHTML = '<p class="empty-state">Your next great experience starts with one idea. Add it above.</p>'; return; }
    list.innerHTML = items.map((item) => {
      const completedItem = isCompleted(item);
      const itemTargetDate = item.target_date || item.targetDate;
      return `<article class="task-item bucket-item ${completedItem ? 'is-complete' : ''}">
        <button class="bucket-check" type="button" data-action="toggle" data-id="${item.id}" aria-label="${completedItem ? 'Mark incomplete' : 'Mark complete'}">${completedItem ? '&#10003;' : ''}</button>
        <div><h3>${escapeHtml(item.title)}</h3>${item.description ? `<p class="bucket-item-description">${escapeHtml(item.description)}</p>` : ''}<p><span class="category-tag">${escapeHtml(item.category || 'Uncategorized')}</span>${itemTargetDate ? `<span class="target-date">Target: ${escapeHtml(formatDate(itemTargetDate))}</span>` : ''}</p></div>
        ${completedItem ? `<button class="text-button danger-button" type="button" data-action="remove" data-id="${item.id}">Remove</button>` : ''}
      </article>`;
    }).join('');
  };

  const loadSupabaseItems = async () => {
    const { data, error } = await window.supabaseClient.from('bucket_list_items').select('id, title, description, category, target_date, is_completed, created_at').order('created_at', { ascending: false });
    if (error) { showStatus(error.message, true); return false; }
    items = data || [];
    return true;
  };

  const setup = async () => {
    if (!window.supabaseClient) { loadLocalItems(); render(); return; }
    const { data, error } = await window.supabaseClient.auth.getUser();
    currentUser = data?.user || null;
    if (error || !currentUser) { loadLocalItems(); render(); return; }
    if (await loadSupabaseItems()) render();
  };

  openForm.addEventListener('click', () => { form.hidden = false; openForm.hidden = true; title.focus(); });
  closeForm.addEventListener('click', () => { form.reset(); form.hidden = true; openForm.hidden = false; });
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const newItem = { title: title.value.trim(), description: description.value.trim() || null, category: category.value, target_date: targetDate.value || null };
    if (!newItem.title || !newItem.category) return;
    if (window.supabaseClient && currentUser) {
      const { data, error } = await window.supabaseClient.from('bucket_list_items').insert({ ...newItem, user_id: currentUser.id }).select('id, title, description, category, target_date, is_completed, created_at').single();
      if (error) { showStatus(error.message, true); return; }
      items.unshift(data);
    } else {
      items.unshift({ ...newItem, id: crypto.randomUUID(), targetDate: newItem.target_date, completed: false });
      saveLocalItems();
    }
    form.reset(); form.hidden = true; openForm.hidden = false; render(); showStatus('Added to your bucket list.');
  });

  list.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-action]');
    if (!button) return;
    const index = items.findIndex((item) => item.id === button.dataset.id);
    if (index < 0) return;
    const item = items[index];
    if (button.dataset.action === 'toggle') {
      const nextCompleted = !isCompleted(item);
      if (window.supabaseClient && currentUser) {
        const { error } = await window.supabaseClient.from('bucket_list_items').update({ is_completed: nextCompleted }).eq('id', item.id);
        if (error) { showStatus(error.message, true); return; }
        item.is_completed = nextCompleted;
      } else { item.completed = nextCompleted; saveLocalItems(); }
      showStatus(nextCompleted ? 'Marked as completed!' : 'Moved back to your list.');
    } else {
      if (window.supabaseClient && currentUser) {
        const { error } = await window.supabaseClient.from('bucket_list_items').delete().eq('id', item.id);
        if (error) { showStatus(error.message, true); return; }
      }
      items.splice(index, 1);
      if (!currentUser) saveLocalItems();
      showStatus('Completed item removed.');
    }
    render();
  });

  await setup();
});

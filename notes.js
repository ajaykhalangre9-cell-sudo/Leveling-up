document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('noteForm');
  const nameInput = document.getElementById('noteName');
  const titleInput = document.getElementById('noteTitle');
  const contentInput = document.getElementById('noteContent');
  const customColorInput = document.getElementById('noteCustomColor');
  const notesList = document.getElementById('notesList');
  const status = document.getElementById('notesStatus');
  const storageKey = 'levelingUpNotes';
  let selectedColor = 'yellow';
  let activeInput = contentInput;
  let notes = [];
  let currentUser = null;

  const colorValues = {
    yellow: '#fef08a', pink: '#fbcfe8', purple: '#ddd6fe', blue: '#bfdbfe',
    green: '#bbf7d0', orange: '#fed7aa', red: '#fecaca', teal: '#99f6e4',
    indigo: '#c7d2fe', peach: '#ffedd5', gray: '#e2e8f0'
  };

  const updateEditorColor = () => {
    const color = colorValues[selectedColor] || selectedColor;
    form.style.setProperty('--note-editor-color', color);
  };

  const escapeHtml = (value) => {
    const element = document.createElement('div');
    element.textContent = value || '';
    return element.innerHTML;
  };

  const saveNotes = () => localStorage.setItem(storageKey, JSON.stringify(notes));

  const showStatus = (message) => {
    status.textContent = message;
    window.setTimeout(() => { status.textContent = ''; }, 2400);
  };

  const renderNotes = () => {
    if (!notes.length) {
      notesList.innerHTML = '<p class="empty-state">No notes yet. Your first idea can start here.</p>';
      return;
    }

    notesList.innerHTML = notes.map((note) => {
      const color = colorValues[note.color] || (/^#[0-9a-f]{6}$/i.test(note.color || '') ? note.color : colorValues.yellow);
      const customColor = ` style="background: ${color}"`;
      return `
      <article class="note-item note-${escapeHtml(note.color)}"${customColor}>
        <div class="note-item-head">
          <p>${escapeHtml(note.name)}</p>
          <button type="button" class="note-delete" data-id="${escapeHtml(note.id)}" aria-label="Delete ${escapeHtml(note.title)}">Delete</button>
        </div>
        <h2>${escapeHtml(note.title)}</h2>
        <p class="note-content">${escapeHtml(note.content).replace(/\n/g, '<br>')}</p>
      </article>`;
    }).join('');
  };

  const loadLocalNotes = () => {
    try { notes = JSON.parse(localStorage.getItem(storageKey) || '[]'); } catch { notes = []; }
  };

  const loadNotes = async () => {
    if (!window.supabaseClient) {
      loadLocalNotes();
      renderNotes();
      return;
    }

    const { data } = await window.supabaseClient.auth.getUser();
    currentUser = data?.user || null;
    if (!currentUser) {
      loadLocalNotes();
      renderNotes();
      return;
    }

    const { data: savedNotes, error } = await window.supabaseClient
      .from('notes')
      .select('id, name, title, content, color, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      showStatus(`Could not load notes: ${error.message}`);
      loadLocalNotes();
    } else {
      notes = savedNotes || [];
    }
    renderNotes();
  };

  document.querySelectorAll('.color-choice').forEach((button) => {
    button.addEventListener('click', () => {
      selectedColor = button.dataset.color;
      document.querySelectorAll('.color-choice').forEach((choice) => choice.classList.toggle('selected', choice === button));
      updateEditorColor();
    });
  });

  customColorInput.addEventListener('input', () => {
    selectedColor = customColorInput.value;
    document.querySelectorAll('.color-choice').forEach((choice) => choice.classList.remove('selected'));
    updateEditorColor();
  });

  updateEditorColor();

  [nameInput, titleInput, contentInput].forEach((input) => {
    input.addEventListener('focus', () => { activeInput = input; });
  });

  document.querySelectorAll('[data-emoji]').forEach((button) => {
    button.addEventListener('click', () => {
      const input = activeInput || contentInput;
      const start = input.selectionStart;
      const end = input.selectionEnd;
      input.setRangeText(button.dataset.emoji, start, end, 'end');
      input.focus();
    });
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const name = nameInput.value.trim();
    const title = titleInput.value.trim();
    const content = contentInput.value.trim();
    if (!name || !title || !content) return;

    const newNote = { id: crypto.randomUUID(), name, title, content, color: selectedColor };

    if (window.supabaseClient && currentUser) {
      const { data, error } = await window.supabaseClient
        .from('notes')
        .insert({ name, title, content, color: selectedColor, user_id: currentUser.id })
        .select('id, name, title, content, color, created_at')
        .single();
      if (error) {
        showStatus(`Could not save note: ${error.message}`);
        return;
      }
      notes.unshift(data);
    } else {
      notes.unshift(newNote);
      saveNotes();
    }
    form.reset();
    selectedColor = 'yellow';
    customColorInput.value = '#fef08a';
    document.querySelectorAll('.color-choice').forEach((choice) => choice.classList.toggle('selected', choice.dataset.color === selectedColor));
    updateEditorColor();
    renderNotes();
    showStatus('Note saved.');
  });

  notesList.addEventListener('click', async (event) => {
    const button = event.target.closest('.note-delete');
    if (!button) return;
    const id = button.dataset.id;
    if (window.supabaseClient && currentUser) {
      const { error } = await window.supabaseClient.from('notes').delete().eq('id', id);
      if (error) {
        showStatus(`Could not delete note: ${error.message}`);
        return;
      }
    }
    notes = notes.filter((note) => note.id !== id);
    if (!currentUser) saveNotes();
    renderNotes();
    showStatus('Note deleted.');
  });

  loadNotes();
});

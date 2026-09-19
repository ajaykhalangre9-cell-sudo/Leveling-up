document.addEventListener('DOMContentLoaded', async () => {
  const skillsForm = document.getElementById('skillsForm');
  const skillsTitle = document.getElementById('skillsTitle');
  const skillsDescription = document.getElementById('skillsDescription');
  const skillsDeadline = document.getElementById('skillsDeadline');
  const skillsList = document.getElementById('skillsList');
  const skillsStatus = document.getElementById('skillsStatus');

  let skills = [];
  let currentUser = null;

  const escapeHtml = (value) => {
    const div = document.createElement('div');
    div.textContent = value || '';
    return div.innerHTML;
  };

  const showStatus = (message, isError = false) => {
    skillsStatus.textContent = message;
    skillsStatus.classList.toggle('error-message', isError);
    setTimeout(() => {
      skillsStatus.textContent = '';
      skillsStatus.classList.remove('error-message');
    }, 2800);
  };

  const loadLocalSkills = () => {
    skills = JSON.parse(localStorage.getItem('levelingUpSkills') || '[]');
  };

  const saveLocalSkills = () => {
    localStorage.setItem('levelingUpSkills', JSON.stringify(skills));
  };

  const renderSkills = () => {
    if (!skills.length) {
      skillsList.innerHTML = '<p class="empty-state">No skills yet. Add your first one above.</p>';
      return;
    }

    skillsList.innerHTML = skills
      .map((skill, index) => `
        <article class="task-item">
          <div>
            <h3>${escapeHtml(skill.title)}</h3>
            <p>${escapeHtml(skill.description || 'No description added.')}</p>
            <small>Deadline: ${escapeHtml(skill.deadline || 'Not set')}</small>
          </div>
          <button class="task-done skill-complete" data-index="${index}">Complete</button>
        </article>
      `)
      .join('');
  };

  const loadSupabaseSkills = async () => {
    const { data, error } = await window.supabaseClient
      .from('skills')
      .select('id, title, description, deadline, is_completed, created_at, completed_at')
      .eq('is_completed', false)
      .order('created_at', { ascending: false });

    if (error) {
      showStatus(error.message, true);
      return;
    }

    skills = data || [];
  };

  const setupSkills = async () => {
    if (!window.supabaseClient) {
      loadLocalSkills();
      renderSkills();
      return;
    }

    const { data, error } = await window.supabaseClient.auth.getUser();
    currentUser = data?.user || null;

    if (error || !currentUser) {
      loadLocalSkills();
      renderSkills();
      return;
    }

    await loadSupabaseSkills();
    renderSkills();
  };

  skillsForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const skill = {
      title: skillsTitle.value.trim(),
      description: skillsDescription.value.trim(),
      deadline: skillsDeadline.value || null
    };

    if (!skill.title) return;

    if (window.supabaseClient && currentUser) {
      const { data, error } = await window.supabaseClient
        .from('skills')
        .insert({ ...skill, user_id: currentUser.id })
        .select('id, title, description, deadline, is_completed, created_at, completed_at')
        .single();

      if (error) {
        showStatus(error.message, true);
        return;
      }

      skills.unshift(data);
    } else {
      skills.unshift({ ...skill, id: crypto.randomUUID(), is_completed: false, created_at: new Date().toISOString() });
      saveLocalSkills();
    }

    skillsForm.reset();
    renderSkills();
    showStatus('Skill added successfully.');
  });

  skillsList.addEventListener('click', async (event) => {
    const completeButton = event.target.closest('.skill-complete');
    if (!completeButton) return;

    const index = Number(completeButton.dataset.index);
    const skill = skills[index];

    if (window.supabaseClient && currentUser && skill?.id) {
      const { error } = await window.supabaseClient
        .from('skills')
        .update({ is_completed: true, completed_at: new Date().toISOString() })
        .eq('id', skill.id);

      if (error) {
        showStatus(error.message, true);
        return;
      }
    }

    if (!currentUser && skill) {
      skill.is_completed = true;
      skill.completed_at = new Date().toISOString();
      const history = JSON.parse(localStorage.getItem('levelingUpSkillHistory') || '[]');
      history.push(skill);
      localStorage.setItem('levelingUpSkillHistory', JSON.stringify(history));
    }
    skills.splice(index, 1);
    if (!currentUser) saveLocalSkills();
    renderSkills();
    showStatus('Skill completed and removed.');
  });

  await setupSkills();
});

document.addEventListener('DOMContentLoaded', async () => {
  const blogForm = document.getElementById('blogForm');
  const blogTitle = document.getElementById('blogTitle');
  const blogDescription = document.getElementById('blogDescription');
  const blogList = document.getElementById('blogList');
  const blogStatus = document.getElementById('blogStatus');
  const BLOG_TABLE = 'blogs';

  let blogPosts = [];
  let currentUser = null;
  let currentUserName = localStorage.getItem('levelingUpUserName') || 'Anonymous';

  const escapeHtml = (value) => {
    const div = document.createElement('div');
    div.textContent = value || '';
    return div.innerHTML;
  };

  const showStatus = (message, isError = false) => {
    blogStatus.textContent = message;
    blogStatus.classList.toggle('error-message', isError);
    setTimeout(() => {
      blogStatus.textContent = '';
      blogStatus.classList.remove('error-message');
    }, 2800);
  };

  const loadLocalBlogs = () => {
    blogPosts = JSON.parse(localStorage.getItem('levelingUpBlogs') || '[]');
  };

  const saveLocalBlogs = () => {
    localStorage.setItem('levelingUpBlogs', JSON.stringify(blogPosts));
  };

  const getAuthorName = (post) => post.author_name || post.author || 'Anonymous';
  const getAuthorId = (post) => post.author_id || post.authorId || post.author;
  const canDeletePost = (post) => {
    if (!post) return false;
    if (currentUser) return getAuthorId(post) === currentUser.id;
    return getAuthorId(post) === currentUserName;
  };

  const renderBlogs = () => {
    if (!blogPosts.length) {
      blogList.innerHTML = '<p class="empty-state">No blog posts yet. Be the first to share.</p>';
      return;
    }

    blogList.innerHTML = blogPosts
      .map((post, index) => {
        const deleteButton = canDeletePost(post)
          ? `<button class="task-done blog-delete" data-index="${index}">Delete</button>`
          : '';

        return `
          <article class="task-item blog-item">
            <div>
              <h3>${escapeHtml(post.title)}</h3>
              <p>${escapeHtml(post.description || post.content)}</p>
              <small>Written by ${escapeHtml(getAuthorName(post))}</small>
            </div>
            <div class="blog-actions">
              <button class="task-done blog-like" data-index="${index}">Like ${post.likes || 0}</button>
              ${deleteButton}
            </div>
          </article>
        `;
      })
      .join('');
  };

  const loadSupabaseBlogs = async () => {
    const { data, error } = await window.supabaseClient
      .from(BLOG_TABLE)
      .select('id, title, description, author_id, author_name, likes, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      showStatus(error.message, true);
      return;
    }

    blogPosts = data || [];
  };

  const setupBlogs = async () => {
    if (!window.supabaseClient) {
      loadLocalBlogs();
      renderBlogs();
      return;
    }

    const { data, error } = await window.supabaseClient.auth.getUser();
    currentUser = data?.user || null;

    if (error || !currentUser) {
      loadLocalBlogs();
      renderBlogs();
      return;
    }

    localStorage.setItem('levelingUpUserId', currentUser.id);

    const { data: profileData } = await window.supabaseClient
      .from('profiles')
      .select('full_name')
      .eq('user_id', currentUser.id)
      .single();

    if (profileData?.full_name) {
      currentUserName = profileData.full_name;
      localStorage.setItem('levelingUpUserName', profileData.full_name);
    }

    await loadSupabaseBlogs();
    renderBlogs();
  };

  blogForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const title = blogTitle.value.trim();
    const description = blogDescription.value.trim();

    if (!title || !description) return;

    const blog = {
      title,
      description,
      author_name: currentUserName,
      likes: 0
    };

    if (window.supabaseClient && currentUser) {
      const { data, error } = await window.supabaseClient
        .from(BLOG_TABLE)
        .insert({ ...blog, author_id: currentUser.id })
        .select('id, title, description, author_id, author_name, likes, created_at')
        .single();

      if (error) {
        showStatus(error.message, true);
        return;
      }

      blogPosts.unshift(data);
    } else {
      blogPosts.unshift({
        ...blog,
        id: crypto.randomUUID(),
        author: currentUserName,
        authorId: currentUserName
      });
      saveLocalBlogs();
    }

    blogForm.reset();
    renderBlogs();
    showStatus('Blog published successfully.');
  });

  blogList.addEventListener('click', async (event) => {
    const likeButton = event.target.closest('.blog-like');
    if (likeButton) {
      const index = Number(likeButton.dataset.index);
      const post = blogPosts[index];
      const nextLikes = (post.likes || 0) + 1;

      if (window.supabaseClient && currentUser && post?.id) {
        const { data, error } = await window.supabaseClient
          .from(BLOG_TABLE)
          .update({ likes: nextLikes })
          .eq('id', post.id)
          .select('id, title, description, author_id, author_name, likes, created_at')
          .single();

        if (error) {
          showStatus(error.message, true);
          return;
        }

        blogPosts[index] = data;
      } else {
        post.likes = nextLikes;
        saveLocalBlogs();
      }

      renderBlogs();
      return;
    }

    const deleteButton = event.target.closest('.blog-delete');
    if (!deleteButton) return;

    const index = Number(deleteButton.dataset.index);
    const post = blogPosts[index];

    if (!canDeletePost(post)) {
      showStatus('Only the writer can delete this blog.', true);
      return;
    }

    if (window.supabaseClient && currentUser && post?.id) {
      const { error } = await window.supabaseClient
        .from(BLOG_TABLE)
        .delete()
        .eq('id', post.id);

      if (error) {
        showStatus(error.message, true);
        return;
      }
    }

    blogPosts.splice(index, 1);
    if (!currentUser) saveLocalBlogs();
    renderBlogs();
    showStatus('Blog deleted.');
  });

  await setupBlogs();
});

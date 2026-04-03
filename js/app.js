// TODO: Replace with your Supabase project URL and anon key
const SUPABASE_URL = 'https://nmkmjoditihvazjmwvdy.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_q8NVxPXw9hC3wOGrZuyBgQ_qG9HStnd';

const PAGE_SIZE = 20;

let currentOffset = 0;
let client;

const feedEl = document.getElementById('feed');
const loadingEl = document.getElementById('loading');
const errorEl = document.getElementById('error');
const emptyEl = document.getElementById('empty');
const loadMoreEl = document.getElementById('load-more');

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function parseBulletPoints(summary) {
  return summary.split('\n').map(line => line.trim()).filter(line => line.length > 0);
}

function formatDate(dateStr) {
  return new Intl.DateTimeFormat('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }).format(new Date(dateStr));
}

function renderEntries(entries) {
  for (const entry of entries) {
    const bullets = parseBulletPoints(entry.summary);
    const bulletHtml = bullets.map(b => `<li>${escapeHtml(b)}</li>`).join('');

    const article = document.createElement('article');
    article.className = 'entry';
    article.innerHTML = `
      <div class="entry-meta">
        <span class="entry-source">${escapeHtml(entry.feed_source)}</span>
        <time class="entry-date" datetime="${escapeHtml(entry.published_at)}">${formatDate(entry.published_at)}</time>
      </div>
      <h2><a href="${escapeHtml(entry.source_url)}" target="_blank" rel="noopener">${escapeHtml(entry.title)}</a></h2>
      <ul class="entry-summary">${bulletHtml}</ul>
    `;
    feedEl.appendChild(article);
  }
}

async function loadEntries() {
  try {
    loadMoreEl.disabled = true;

    const { data, error } = await client
      .from('feed_entries')
      .select('title, summary, source_url, published_at, feed_source')
      .order('published_at', { ascending: false })
      .range(currentOffset, currentOffset + PAGE_SIZE - 1);

    if (error) throw error;

    loadingEl.hidden = true;

    if (currentOffset === 0 && data.length === 0) {
      emptyEl.hidden = false;
      return;
    }

    renderEntries(data);
    currentOffset += data.length;

    if (data.length >= PAGE_SIZE) {
      loadMoreEl.hidden = false;
    } else {
      loadMoreEl.hidden = true;
    }
  } catch (err) {
    loadingEl.hidden = true;
    errorEl.textContent = 'Failed to load entries. Please try again later.';
    errorEl.hidden = false;
    console.error('Supabase query error:', err);
  } finally {
    loadMoreEl.disabled = false;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  loadEntries();

  loadMoreEl.addEventListener('click', loadEntries);
});

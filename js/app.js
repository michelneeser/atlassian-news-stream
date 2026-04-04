// TODO: Replace with your Supabase project URL and anon key
const SUPABASE_URL = 'https://nmkmjoditihvazjmwvdy.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_q8NVxPXw9hC3wOGrZuyBgQ_qG9HStnd';

const PAGE_SIZE = 10;

let currentOffset = 0;
let currentFilter = 'all';
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
  return new Intl.DateTimeFormat('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }).format(new Date(dateStr));
}

function getYouTubeVideoId(url) {
  try {
    const parsed = new URL(url);
    let videoId = null;
    if (parsed.hostname === 'youtu.be') {
      videoId = parsed.pathname.slice(1);
    } else if (parsed.hostname.includes('youtube.com')) {
      const shortsMatch = parsed.pathname.match(/^\/shorts\/([a-zA-Z0-9_-]+)/);
      if (shortsMatch) {
        videoId = shortsMatch[1];
      } else {
        videoId = parsed.searchParams.get('v');
      }
    }
    return videoId || null;
  } catch {
    return null;
  }
}

function renderEntries(entries) {
  for (const entry of entries) {
    let contentHtml;
    const videoId = entry.video_url ? getYouTubeVideoId(entry.video_url) : null;

    if (videoId) {
      contentHtml = `<a class="entry-video" href="${escapeHtml(entry.video_url)}" target="_blank" rel="noopener"><img src="https://img.youtube.com/vi/${escapeHtml(videoId)}/maxresdefault.jpg" alt="${escapeHtml(entry.title)}"><span class="play-btn"></span></a>`;
    } else {
      const bullets = parseBulletPoints(entry.summary);
      contentHtml = `<ul class="entry-summary">${bullets.map(b => `<li>${escapeHtml(b)}</li>`).join('')}</ul>`;
    }

    const article = document.createElement('article');
    article.className = 'entry';
    article.innerHTML = `
      <div class="entry-meta">
        <span class="entry-source">${escapeHtml(entry.feed_source)}</span>
        <time class="entry-date" datetime="${escapeHtml(entry.published_at)}">${formatDate(entry.published_at)}</time>
      </div>
      <h2><a href="${escapeHtml(entry.source_url)}" target="_blank" rel="noopener">${escapeHtml(entry.title)}</a></h2>
      ${contentHtml}
    `;
    feedEl.appendChild(article);
  }
}

async function loadEntries() {
  try {
    loadMoreEl.disabled = true;

    let query = client
      .from('feed_entries')
      .select('title, summary, source_url, published_at, feed_source, video_url, content_type')
      .order('published_at', { ascending: false })
      .range(currentOffset, currentOffset + PAGE_SIZE - 1);

    if (currentFilter !== 'all') {
      query = query.eq('content_type', currentFilter);
    }

    const { data, error } = await query;

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

  if (window.location.hostname.includes('atlasfeed.cc')) {
    client.from('page_views').insert({
      referrer: document.referrer || null
    });
  }

  const initialFilter = new URLSearchParams(window.location.search).get('filter');
  if (initialFilter) {
    const btn = document.querySelector(`.filter-btn[data-filter="${initialFilter}"]`);
    if (btn) {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = initialFilter;
    }
  }

  loadEntries();

  loadMoreEl.addEventListener('click', loadEntries);

  document.querySelector('.filters').addEventListener('click', (e) => {
    const btn = e.target.closest('.filter-btn');
    if (!btn || btn.classList.contains('active')) return;

    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    currentFilter = btn.dataset.filter;
    const params = new URLSearchParams(window.location.search);
    if (currentFilter === 'all') {
      params.delete('filter');
    } else {
      params.set('filter', currentFilter);
    }
    const query = params.toString();
    history.replaceState(null, '', query ? `?${query}` : window.location.pathname);
    currentOffset = 0;
    feedEl.querySelectorAll('.entry').forEach(el => el.remove());
    loadMoreEl.hidden = true;
    emptyEl.hidden = true;
    errorEl.hidden = true;
    loadingEl.hidden = false;

    loadEntries();
  });
});

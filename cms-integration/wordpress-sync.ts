import 'dotenv/config';
import type { WordPressPost } from '../shared/types';

const WP_BASE = process.env.WORDPRESS_BASE_URL;
const WP_USER = process.env.WORDPRESS_USERNAME;
const WP_PASS = process.env.WORDPRESS_APP_PASSWORD;

if (!WP_BASE || !WP_USER || !WP_PASS) {
  console.error('Missing WordPress env vars. Copy .env.example → .env and fill in values.');
  process.exit(1);
}

const authHeader = `Basic ${Buffer.from(`${WP_USER}:${WP_PASS}`).toString('base64')}`;

interface WPRawPost {
  id: number;
  title: { rendered: string };
  excerpt: { rendered: string };
  content: { rendered: string };
  slug: string;
  date: string;
  _embedded?: { 'wp:featuredmedia'?: Array<{ source_url: string }> };
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, '').trim();
}

function mapPost(raw: WPRawPost): WordPressPost {
  return {
    id: raw.id,
    title: stripHtml(raw.title.rendered),
    excerpt: stripHtml(raw.excerpt.rendered),
    content: raw.content.rendered,
    slug: raw.slug,
    date: raw.date,
    featuredImageUrl: raw._embedded?.['wp:featuredmedia']?.[0]?.source_url,
  };
}

async function fetchPosts(perPage = 100): Promise<WordPressPost[]> {
  const url = `${WP_BASE}/wp-json/wp/v2/posts?per_page=${perPage}&_embed=1&status=publish`;
  const res = await fetch(url, { headers: { Authorization: authHeader } });

  if (!res.ok) throw new Error(`WordPress API error: ${res.status} ${await res.text()}`);

  const raw = (await res.json()) as WPRawPost[];
  return raw.map(mapPost);
}

async function fetchPages(): Promise<WordPressPost[]> {
  const url = `${WP_BASE}/wp-json/wp/v2/pages?_embed=1&status=publish`;
  const res = await fetch(url, { headers: { Authorization: authHeader } });

  if (!res.ok) throw new Error(`WordPress API error: ${res.status} ${await res.text()}`);

  const raw = (await res.json()) as WPRawPost[];
  return raw.map(mapPost);
}

async function main(): Promise<void> {
  console.log(`Connecting to WordPress at ${WP_BASE}...`);

  const [posts, pages] = await Promise.all([fetchPosts(), fetchPages()]);

  console.log(`\nFetched ${posts.length} posts:`);
  posts.forEach((p) => console.log(`  [${p.id}] ${p.title} (/${p.slug})`));

  console.log(`\nFetched ${pages.length} pages:`);
  pages.forEach((p) => console.log(`  [${p.id}] ${p.title} (/${p.slug})`));

  // In a full pipeline, pass posts/pages to the backend /integrations/wordpress endpoint
  // or write them to a local JSON cache for the frontend to consume.
  const output = { posts, pages, syncedAt: new Date().toISOString() };
  const { writeFileSync } = await import('fs');
  writeFileSync('./wordpress-content.json', JSON.stringify(output, null, 2));
  console.log('\nContent written to wordpress-content.json');
}

main().catch((err) => {
  console.error('WordPress sync failed:', err);
  process.exit(1);
});

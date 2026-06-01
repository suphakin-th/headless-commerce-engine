import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { WordPressPost } from '../../../shared/types';

interface WPPost {
  id: number;
  title: { rendered: string };
  excerpt: { rendered: string };
  content: { rendered: string };
  slug: string;
  date: string;
  _embedded?: {
    'wp:featuredmedia'?: Array<{ source_url: string }>;
  };
}

@Injectable()
export class WordPressService {
  private readonly logger = new Logger(WordPressService.name);
  private readonly baseUrl: string;
  private readonly authHeader: string;

  constructor(private readonly config: ConfigService) {
    this.baseUrl = config.getOrThrow<string>('WORDPRESS_BASE_URL');
    const username = config.getOrThrow<string>('WORDPRESS_USERNAME');
    const password = config.getOrThrow<string>('WORDPRESS_APP_PASSWORD');
    this.authHeader = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
  }

  async getPosts(perPage = 10): Promise<WordPressPost[]> {
    const url = `${this.baseUrl}/wp-json/wp/v2/posts?per_page=${perPage}&_embed=1`;
    const response = await fetch(url, {
      headers: { Authorization: this.authHeader },
    });

    if (!response.ok) {
      throw new Error(`WordPress API error: ${response.status} ${response.statusText}`);
    }

    const raw = (await response.json()) as WPPost[];
    return raw.map(this.mapPost);
  }

  async getPost(slug: string): Promise<WordPressPost> {
    const url = `${this.baseUrl}/wp-json/wp/v2/posts?slug=${encodeURIComponent(slug)}&_embed=1`;
    const response = await fetch(url, {
      headers: { Authorization: this.authHeader },
    });

    if (!response.ok) {
      throw new Error(`WordPress API error: ${response.status} ${response.statusText}`);
    }

    const raw = (await response.json()) as WPPost[];
    const post = raw[0];
    if (!post) throw new Error(`WordPress post not found: ${slug}`);
    return this.mapPost(post);
  }

  async getPages(): Promise<WordPressPost[]> {
    const url = `${this.baseUrl}/wp-json/wp/v2/pages?_embed=1`;
    const response = await fetch(url, {
      headers: { Authorization: this.authHeader },
    });

    if (!response.ok) {
      throw new Error(`WordPress API error: ${response.status} ${response.statusText}`);
    }

    const raw = (await response.json()) as WPPost[];
    return raw.map(this.mapPost);
  }

  private mapPost(p: WPPost): WordPressPost {
    const stripHtml = (html: string) => html.replace(/<[^>]+>/g, '').trim();
    const featuredMedia = p._embedded?.['wp:featuredmedia'];

    return {
      id: p.id,
      title: stripHtml(p.title.rendered),
      excerpt: stripHtml(p.excerpt.rendered),
      content: p.content.rendered,
      slug: p.slug,
      date: p.date,
      featuredImageUrl: featuredMedia?.[0]?.source_url,
    };
  }
}

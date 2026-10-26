import rss from '@astrojs/rss';
import { getPosts, postUrl } from '../lib/posts';
import { site } from '../config';
import type { APIContext } from 'astro';
export async function GET(context: APIContext) {
  return rss({ title: site.title, description: site.description, site: context.site!, items: (await getPosts()).map((post) => ({ title: post.data.title, description: post.data.description, pubDate: post.data.pubDate, link: postUrl(post) })), customData: '<language>zh-CN</language>' });
}

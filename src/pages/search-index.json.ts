import { getPosts, postUrl, categories, tags } from '../lib/posts';
export async function GET() {
  return Response.json((await getPosts()).map((post) => ({ title: post.data.title, description: post.data.description, text: `${post.body || ''} ${post.data.tags.map((id) => tags[id].label).join(' ')}`, url: postUrl(post), category: categories[post.data.category].label })));
}

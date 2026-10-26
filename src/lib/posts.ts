import { getCollection, type CollectionEntry } from "astro:content";
import metadata from "../../content/meta.json";
import { isPublished, readingMinutes } from "./content-registry.mjs";

export type Post = CollectionEntry<"posts">;
export const categories: Record<
  string,
  { label: string; description: string; order: number }
> = metadata.categories;
export const tags: Record<string, { label: string }> = metadata.tags;
export const categoryEntries = Object.entries(categories).sort(
  (a, b) => a[1].order - b[1].order,
);
export const withBase = (path = "") =>
  `${import.meta.env.BASE_URL.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
export const postUrl = (post: Post) => withBase(`posts/${post.id}/`);
export const formatDate = (date: Date, short = false) =>
  new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: short ? undefined : "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(date)
    .replaceAll("/", ".");
export const readingTime = (post: Post) => readingMinutes(post.body);
export async function getPosts() {
  return (await getCollection("posts"))
    .filter((post) => isPublished(post.data))
    .sort(
      (a, b) =>
        b.data.pubDate.valueOf() - a.data.pubDate.valueOf() ||
        a.id.localeCompare(b.id),
    );
}

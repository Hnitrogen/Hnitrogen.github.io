import { defineCollection } from "astro:content";
import { z } from "astro/zod";
import { glob } from "astro/loaders";
import { validateContent } from "./lib/content-registry.mjs";
import metadata from "../content/meta.json";

validateContent();

const posts = defineCollection({
  loader: glob({
    pattern: "*/index.md",
    base: "./content/posts",
    generateId: ({ entry }) => entry.replace(/\/index\.md$/, ""),
  }),
  schema: z
    .object({
      slug: z.string(),
      title: z.string().min(1),
      description: z.string().min(1),
      pubDate: z.coerce.date(),
      updatedDate: z.coerce.date().optional(),
      draft: z.boolean().default(false),
      example: z.boolean().default(false),
    })
    .transform((data) => ({
      ...data,
      ...(
        metadata.posts as Record<
          string,
          { category: string; tags: string[]; featured?: boolean }
        >
      )[data.slug],
    })),
});

export const collections = { posts };

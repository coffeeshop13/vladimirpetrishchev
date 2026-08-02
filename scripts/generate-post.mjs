import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const projectRoot = resolve(import.meta.dirname, "..");
const postsDirectory = resolve(projectRoot, "content/posts");
const editorialBrief = await readFile(resolve(projectRoot, "content/editorial.md"), "utf8");
const apiKey = process.env.OPENAI_API_KEY;
const model = process.env.OPENAI_MODEL || "gpt-5.6";

if (!apiKey) throw new Error("OPENAI_API_KEY is required.");

const date = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Berlin", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
const existingFiles = await readdir(postsDirectory, { withFileTypes: true }).catch(() => []);
if (existingFiles.some((entry) => entry.isFile() && entry.name.startsWith(`${date}-`) && entry.name.endsWith(".md"))) {
  console.log(`A post for ${date} already exists; nothing to generate.`);
  process.exit(0);
}

const themes = ["production AI systems", "data leadership and team design", "AI product strategy", "evaluation and observability", "RAG, fine-tuning, and simpler alternatives"];
const previousTitles = [];
for (const entry of existingFiles.filter((item) => item.isFile() && item.name.endsWith(".md")).slice(-8)) {
  const source = await readFile(resolve(postsDirectory, entry.name), "utf8");
  const title = source.match(/^title:\s*["']?(.+?)["']?\s*$/m)?.[1];
  if (title) previousTitles.push(title);
}
const theme = process.env.BLOG_TOPIC || themes[existingFiles.length % themes.length];

const schema = {
  type: "object",
  properties: {
    title: { type: "string", description: "A specific, non-clickbait article title." },
    description: { type: "string", description: "A concise one-sentence description, maximum 160 characters." },
    slug: { type: "string", description: "Lowercase URL slug using only letters, numbers, and hyphens." },
    tags: { type: "array", items: { type: "string" }, minItems: 3, maxItems: 5 },
    body: { type: "string", description: "The complete 800–1,200 word article body in Markdown, excluding title and frontmatter." },
  },
  required: ["title", "description", "slug", "tags", "body"],
  additionalProperties: false,
};

const response = await fetch("https://api.openai.com/v1/responses", {
  method: "POST",
  headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
  body: JSON.stringify({
    model,
    store: false,
    max_output_tokens: 5000,
    input: [
      { role: "system", content: `You are the editorial engine for vladimirpetrishchev.com. Produce one finished, publishable blog article. Return only the requested structured object.\n\n${editorialBrief}` },
      { role: "user", content: `Write this week's article about ${theme}. Keep it between 800 and 1,200 words. Make the argument concrete and useful, with a clear opening, 3–5 descriptive Markdown sections, and a practical conclusion. Do not repeat these recent titles: ${previousTitles.join("; ") || "none"}. The publication date is ${date}.` },
    ],
    text: { format: { type: "json_schema", name: "blog_post", schema, strict: true } },
  }),
});

const payload = await response.json();
if (!response.ok) throw new Error(`OpenAI API error ${response.status}: ${JSON.stringify(payload)}`);
if (payload.status === "incomplete") throw new Error(`OpenAI response incomplete: ${payload.incomplete_details?.reason || "unknown reason"}`);

const outputText = payload.output_text || payload.output?.flatMap((item) => item.content || [])
  .filter((item) => item.type === "output_text")
  .map((item) => item.text)
  .join("");
if (!outputText) throw new Error("OpenAI returned no text output.");

const post = JSON.parse(outputText);
const wordCount = post.body.trim().split(/\s+/).filter(Boolean).length;
if (wordCount < 800 || wordCount > 1200) throw new Error(`Generated article has ${wordCount} words; expected 800–1,200.`);
if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(post.slug)) throw new Error(`Invalid slug: ${post.slug}`);
if (!Array.isArray(post.tags) || post.tags.length < 3 || post.tags.length > 5) throw new Error("The generated post needs 3–5 tags.");

const yamlString = (value) => JSON.stringify(String(value));
const tags = JSON.stringify(post.tags.map((tag) => String(tag).trim().toLowerCase()).filter(Boolean));
const output = `---\ntitle: ${yamlString(post.title.trim())}\ndescription: ${yamlString(post.description.trim())}\ndate: ${date}\nslug: ${post.slug}\ntags: ${tags}\nstatus: published\n---\n\n${post.body.trim()}\n`;
await mkdir(postsDirectory, { recursive: true });
const filename = `${date}-${post.slug}.md`;
await writeFile(resolve(postsDirectory, filename), output, { flag: "wx" });
console.log(`Generated ${filename} (${wordCount} words) with ${model}.`);

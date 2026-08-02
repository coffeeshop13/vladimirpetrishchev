import { cp, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const projectRoot = resolve(import.meta.dirname, "..");
const referenceDirectory = resolve(projectRoot, "reference-deployment");
const outputDirectory = resolve(projectRoot, "dist");
const postsDirectory = resolve(projectRoot, "content/posts");

await rm(outputDirectory, { recursive: true, force: true });
await mkdir(outputDirectory, { recursive: true });
await cp(referenceDirectory, outputDirectory, { recursive: true });

const escapeHtml = (value) => String(value)
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#39;");

function parseFrontmatter(source) {
  const match = source.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/);
  if (!match) throw new Error("Post is missing YAML frontmatter.");
  const metadata = {};
  for (const line of match[1].split("\n")) {
    const separator = line.indexOf(":");
    if (separator === -1) continue;
    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim();
    if (value.startsWith("[") && value.endsWith("]")) {
      metadata[key] = value.slice(1, -1).split(",").map((item) => item.trim().replace(/^['"]|['"]$/g, "")).filter(Boolean);
    } else {
      metadata[key] = value.replace(/^"|"$/g, "");
    }
  }
  return { metadata, body: match[2].trim() };
}

function inlineMarkdown(value) {
  return escapeHtml(value)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/__([^_]+)__/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/_([^_]+)_/g, "<em>$1</em>");
}

function markdownToHtml(markdown) {
  const lines = markdown.split("\n");
  const output = [];
  let paragraph = [];
  let list = [];
  let code = null;
  const flushParagraph = () => {
    if (paragraph.length) output.push(`<p>${inlineMarkdown(paragraph.join(" "))}</p>`);
    paragraph = [];
  };
  const flushList = () => {
    if (list.length) output.push(`<ul>${list.map((item) => `<li>${inlineMarkdown(item)}</li>`).join("")}</ul>`);
    list = [];
  };
  for (const line of lines) {
    if (line.startsWith("```") && !code) { flushParagraph(); flushList(); code = []; continue; }
    if (line.startsWith("```") && code) { output.push(`<pre><code>${escapeHtml(code.join("\n"))}</code></pre>`); code = null; continue; }
    if (code) { code.push(line); continue; }
    if (!line.trim()) { flushParagraph(); flushList(); continue; }
    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    if (heading) { flushParagraph(); flushList(); const level = heading[1].length; output.push(`<h${level}>${inlineMarkdown(heading[2])}</h${level}>`); continue; }
    const bullet = line.match(/^[-*]\s+(.+)$/);
    if (bullet) { flushParagraph(); list.push(bullet[1]); continue; }
    flushList(); paragraph.push(line.trim());
  }
  flushParagraph(); flushList();
  if (code) output.push(`<pre><code>${escapeHtml(code.join("\n"))}</code></pre>`);
  return output.join("\n");
}

const styles = `
:root { color-scheme: dark; --bg:#0b0f14; --panel:#111821; --line:#26313d; --muted:#91a0ad; --text:#edf2f5; --accent:#b9e5d2; }
* { box-sizing:border-box; } html { background:var(--bg); } body { margin:0; background:var(--bg); color:var(--text); font-family:Arial, Helvetica, sans-serif; line-height:1.65; } a { color:inherit; }
.site-header { max-width:1120px; margin:0 auto; padding:30px 28px 24px; display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--line); }
.wordmark { font-family:Georgia,serif; font-size:24px; text-decoration:none; letter-spacing:-.08em; } .wordmark span { color:var(--accent); }
.header-links { display:flex; gap:22px; font-size:13px; color:var(--muted); } .header-links a:hover { color:var(--text); }
.blog-shell { max-width:1120px; margin:0 auto; padding:84px 28px 110px; } .eyebrow { color:var(--accent); font:11px/1.2 monospace; letter-spacing:.14em; text-transform:uppercase; }
.blog-hero { max-width:700px; margin-bottom:70px; } .blog-hero h1 { font:400 clamp(48px,8vw,92px)/.95 Georgia,serif; letter-spacing:-.06em; margin:22px 0 26px; } .blog-hero h1 em { color:var(--accent); font-style:italic; } .blog-hero p { color:var(--muted); font-size:18px; max-width:600px; }
.post-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(280px,1fr)); gap:18px; } .post-card { display:flex; flex-direction:column; min-height:260px; background:var(--panel); border:1px solid var(--line); padding:26px; text-decoration:none; transition:border-color .2s,transform .2s; } .post-card:hover { border-color:var(--accent); transform:translateY(-2px); }
.post-card time,.post-meta { color:var(--muted); font:12px monospace; } .post-card h2 { font:400 30px/1.08 Georgia,serif; letter-spacing:-.03em; margin:20px 0 12px; } .post-card p { color:var(--muted); margin:0; } .tags { margin-top:auto; padding-top:28px; color:var(--accent); font:11px monospace; }
.empty-state { border-top:1px solid var(--line); border-bottom:1px solid var(--line); padding:32px 0; color:var(--muted); } .article-shell { max-width:820px; margin:0 auto; padding:70px 28px 110px; } .article-header { border-bottom:1px solid var(--line); padding-bottom:42px; margin-bottom:46px; }
.article-header h1 { font:400 clamp(42px,7vw,76px)/1 Georgia,serif; letter-spacing:-.055em; margin:20px 0; max-width:780px; } .article-header p { color:var(--muted); font-size:19px; max-width:680px; margin:0; } .article-body { max-width:720px; font-size:18px; }
.article-body h2 { font:400 34px/1.15 Georgia,serif; margin:52px 0 18px; letter-spacing:-.03em; } .article-body h3 { font:600 21px/1.3 Arial,sans-serif; margin:38px 0 12px; } .article-body p { margin:0 0 24px; } .article-body ul { margin:0 0 26px; padding-left:24px; } .article-body li { margin:8px 0; } .article-body code { background:#18212b; padding:2px 5px; font:14px monospace; } .article-body pre { background:#05080b; border:1px solid var(--line); padding:18px; overflow:auto; font:14px/1.5 monospace; } .article-body a { color:var(--accent); }
.back-link { display:inline-block; color:var(--muted); font:12px monospace; text-decoration:none; margin-bottom:40px; } .back-link:hover { color:var(--text); } @media (max-width:640px) { .site-header { padding:22px 18px; } .header-links { gap:12px; font-size:12px; } .blog-shell,.article-shell { padding-left:18px; padding-right:18px; } .blog-shell { padding-top:58px; } }
`;

function documentShell(title, description, body) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title><meta name="description" content="${escapeHtml(description)}"><link rel="shortcut icon" href="/favicon.svg"><style>${styles}</style></head><body>${body}</body></html>`;
}

const postFiles = (await readdir(postsDirectory, { withFileTypes: true }).catch(() => []))
  .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
  .map((entry) => entry.name);
const posts = [];
for (const filename of postFiles) {
  const source = await readFile(resolve(postsDirectory, filename), "utf8");
  const { metadata, body } = parseFrontmatter(source);
  if (metadata.status && metadata.status !== "published") continue;
  if (!metadata.title || !metadata.slug || !metadata.date) throw new Error(`Post ${filename} needs title, slug, and date.`);
  posts.push({ metadata, html: markdownToHtml(body) });
}
posts.sort((left, right) => String(right.metadata.date).localeCompare(String(left.metadata.date)));

const homepagePath = resolve(outputDirectory, "index.html");
let homepage = await readFile(homepagePath, "utf8");
homepage = homepage.replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<link rel="modulepreload"[^>]*>/gi, "");
homepage = homepage.replace('<a href="#experience">Experience</a>', '<a href="/blog/">Blog</a><a href="#experience">Experience</a>');
await writeFile(homepagePath, homepage);

const blogIndexBody = `<header class="site-header"><a class="wordmark" href="/" aria-label="Vladimir Petrishchev home">VP<span>·</span></a><nav class="header-links" aria-label="Blog navigation"><a href="/">Home</a><a href="/rss.xml">RSS</a></nav></header><main class="blog-shell"><section class="blog-hero"><div class="eyebrow">Notes on AI, data &amp; leadership</div><h1>Useful ideas,<br><em>shipped regularly.</em></h1><p>A working notebook on building AI systems, data products, and teams that hold up in the real world.</p></section><section aria-label="Blog posts"><div class="post-grid">${posts.length ? posts.map(({ metadata }) => `<a class="post-card" href="/blog/${encodeURIComponent(metadata.slug)}/"><time datetime="${escapeHtml(metadata.date)}">${escapeHtml(metadata.date)}</time><h2>${escapeHtml(metadata.title)}</h2><p>${escapeHtml(metadata.description || "")}</p><div class="tags">${(metadata.tags || []).map(escapeHtml).join(" · ")}</div></a>`).join("") : '<p class="empty-state">The first note is being prepared. New posts will appear here automatically.</p>'}</div></section></main>`;
await mkdir(resolve(outputDirectory, "blog"), { recursive: true });
await writeFile(resolve(outputDirectory, "blog/index.html"), documentShell("Blog — Vladimir Petrishchev", "Notes on AI, data, product, and leadership from Vladimir Petrishchev.", blogIndexBody));

for (const { metadata, html } of posts) {
  const postDirectory = resolve(outputDirectory, "blog", metadata.slug);
  await mkdir(postDirectory, { recursive: true });
  const body = `<header class="site-header"><a class="wordmark" href="/" aria-label="Vladimir Petrishchev home">VP<span>·</span></a><nav class="header-links" aria-label="Blog navigation"><a href="/blog/">All notes</a><a href="/rss.xml">RSS</a></nav></header><main class="article-shell"><a class="back-link" href="/blog/">← All notes</a><article><header class="article-header"><div class="eyebrow">${(metadata.tags || []).map(escapeHtml).join(" · ")}</div><h1>${escapeHtml(metadata.title)}</h1><div class="post-meta"><time datetime="${escapeHtml(metadata.date)}">${escapeHtml(metadata.date)}</time></div><p>${escapeHtml(metadata.description || "")}</p></header><div class="article-body">${html}</div></article></main>`;
  await writeFile(resolve(postDirectory, "index.html"), documentShell(`${metadata.title} — Vladimir Petrishchev`, metadata.description || metadata.title, body));
}

const siteUrl = "https://vladimirpetrishchev.com";
const rssItems = posts.map(({ metadata }) => `<item><title>${escapeHtml(metadata.title)}</title><link>${siteUrl}/blog/${encodeURIComponent(metadata.slug)}/</link><guid>${siteUrl}/blog/${encodeURIComponent(metadata.slug)}/</guid><pubDate>${new Date(`${metadata.date}T08:00:00Z`).toUTCString()}</pubDate><description>${escapeHtml(metadata.description || "")}</description></item>`).join("");
await writeFile(resolve(outputDirectory, "rss.xml"), `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>Vladimir Petrishchev — Notes</title><link>${siteUrl}/blog/</link><description>Notes on AI, data, product, and leadership.</description>${rssItems}</channel></rss>`);
const sitemapUrls = [siteUrl + "/", siteUrl + "/blog/", ...posts.map(({ metadata }) => `${siteUrl}/blog/${encodeURIComponent(metadata.slug)}/`)];
await writeFile(resolve(outputDirectory, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${sitemapUrls.map((url) => `<url><loc>${url}</loc></url>`).join("")}</urlset>`);

console.log(`Prepared ${outputDirectory} with ${posts.length} published blog post(s).`);

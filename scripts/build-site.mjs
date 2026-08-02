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
@import "https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600&family=Fraunces:opsz,wght@9..144,500;9..144,600&display=swap";
:root { --ink:#17212f; --paper:#f7f5ef; --blue:#2259d7; --line:#d9d6ce; }
* { box-sizing:border-box; } html { background:var(--paper); scroll-behavior:smooth; } body { background:var(--paper); color:var(--ink); margin:0; font-family:DM Sans,sans-serif; line-height:1.5; } a { color:inherit; text-decoration:none; }
.site-header { border-bottom:1px solid var(--line); justify-content:space-between; align-items:center; max-width:1320px; height:82px; margin:auto; padding:0 34px; display:flex; }
.wordmark { letter-spacing:-.1em; font-family:DM Mono,monospace; font-size:23px; font-weight:500; } .wordmark span { color:var(--blue); }
.header-links { align-items:center; gap:26px; font-size:14px; display:flex; } .header-links a:not(.header-contact) { border-bottom:1px solid var(--ink); opacity:1; padding-bottom:4px; } .header-links a:hover { border-color:var(--blue); color:var(--blue); }
.blog-shell { max-width:1320px; margin:auto; padding:78px 34px 120px; } .eyebrow { text-transform:uppercase; letter-spacing:.06em; color:#5c636c; font-family:DM Mono,monospace; font-size:11px; }
.blog-hero { border-bottom:1px solid var(--line); grid-template-columns:25% 1fr; gap:36px; padding:0 0 96px; display:grid; } .blog-hero h1 { letter-spacing:-.075em; margin:20px 0 28px; font-family:Fraunces,serif; font-size:clamp(58px,8vw,118px); font-weight:500; line-height:.9; } .blog-hero h1 em { color:var(--blue); font-weight:500; } .blog-hero p { letter-spacing:-.025em; color:#555d66; max-width:520px; margin:32px 0 0; font-size:20px; line-height:1.45; }
.post-grid { border-top:1px solid var(--ink); margin-top:100px; } .post-card { border-bottom:1px solid var(--line); grid-template-columns:15% 32% 25% 28%; gap:20px; min-height:208px; padding:26px 0; display:grid; transition:background .2s; } .post-card:hover { background:#eeece5; } .post-card time,.post-meta { color:#6a7077; padding-top:5px; font-family:DM Mono,monospace; font-size:11px; } .post-card h2 { letter-spacing:-.04em; margin:0 0 8px; font-family:Fraunces,serif; font-size:29px; font-weight:500; line-height:1.12; } .post-card p { color:#515963; max-width:340px; margin:2px 0; font-size:14px; line-height:1.5; } .post-card-media { align-self:stretch; } .post-card-media img { border:1px solid var(--line); display:block; height:100%; min-height:154px; object-fit:cover; object-position:center; width:100%; } .tags { color:var(--blue); font-family:DM Mono,monospace; font-size:11px; padding-top:5px; }
.empty-state { border-bottom:1px solid var(--line); color:#515963; padding:26px 0; } .article-shell { max-width:1320px; margin:auto; padding:78px 34px 120px; } .article-header { border-bottom:1px solid var(--line); grid-template-columns:25% 1fr; gap:36px; padding-bottom:70px; display:grid; } .article-header h1 { letter-spacing:-.075em; margin:18px 0 24px; font-family:Fraunces,serif; font-size:clamp(58px,8vw,118px); font-weight:500; line-height:.9; max-width:900px; } .article-header p { letter-spacing:-.02em; color:#555d66; max-width:650px; margin:28px 0 0; font-size:20px; line-height:1.45; }
.article-body { max-width:760px; margin-left:25%; padding-top:72px; font-size:18px; line-height:1.65; } .article-body h2 { letter-spacing:-.045em; margin:58px 0 18px; font-family:Fraunces,serif; font-size:40px; font-weight:500; line-height:1.05; } .article-body h3 { color:var(--blue); margin:42px 0 12px; font-size:16px; font-weight:600; } .article-body p { margin:0 0 25px; } .article-body ul { margin:0 0 28px; padding-left:24px; } .article-body li { margin:8px 0; } .article-body code { background:#ebe8df; padding:2px 5px; font:14px DM Mono,monospace; } .article-body pre { background:var(--ink); color:var(--paper); padding:20px; overflow:auto; font:14px/1.5 DM Mono,monospace; } .article-body a { color:var(--blue); text-decoration:underline; text-underline-offset:3px; }
.article-hero-image { border:1px solid var(--line); width:100%; height:auto; display:block; margin:48px 0 0; } 
.decision-visual { border-top:1px solid var(--ink); border-bottom:1px solid var(--line); margin:0 0 62px; } .visual-kicker { color:#5c636c; padding:16px 0 0; font:11px DM Mono,monospace; letter-spacing:.06em; text-transform:uppercase; } .visual-steps { grid-template-columns:1fr 34px 1fr 34px 1fr; align-items:stretch; display:grid; } .visual-step { padding:20px 18px 26px 0; } .visual-step:not(:last-child) { border-right:1px solid var(--line); } .visual-step span { color:var(--blue); font:11px DM Mono,monospace; } .visual-step strong { display:block; letter-spacing:-.04em; margin:16px 0 8px; font:500 32px/1 Fraunces,serif; } .visual-step p { color:#555d66; margin:0; font-size:14px; line-height:1.45; } .visual-arrow { color:var(--blue); align-self:center; justify-self:center; font:28px Fraunces,serif; }
.back-link { color:#5c636c; display:inline-block; margin-bottom:52px; font:11px DM Mono,monospace; text-transform:uppercase; letter-spacing:.06em; } .back-link:hover { color:var(--blue); }
footer { background:var(--ink); color:var(--paper); padding:60px max(34px,50vw - 626px); } footer .section-label { color:#a7b1bd; } .email { letter-spacing:-.07em; margin:43px 0 90px; font-family:Fraunces,serif; font-size:clamp(39px,6vw,82px); font-weight:500; line-height:.96; display:inline-block; } .email span { color:#8eafff; } .footer-bottom { color:#a7b1bd; border-top:1px solid #3f4854; justify-content:space-between; padding-top:16px; font-family:DM Mono,monospace; font-size:11px; display:flex; } .footer-links { gap:22px; display:flex; } .footer-bottom a { color:#fff; }
@media (width<=720px) { .site-header { height:67px; padding:0 20px; } .header-links { gap:14px; font-size:12px; } .blog-shell,.article-shell { padding:57px 20px 80px; } .blog-hero,.article-header { grid-template-columns:1fr; gap:28px; padding-bottom:65px; } .blog-hero h1,.article-header h1 { margin:0; font-size:67px; } .blog-hero p,.article-header p { margin:0; font-size:17px; } .post-grid { margin-top:75px; } .post-card { grid-template-columns:1fr; gap:11px; min-height:0; padding:24px 0; } .post-card p { margin:0; } .post-card-media img { height:auto; min-height:0; aspect-ratio:16 / 9; } .article-body { margin-left:0; padding-top:52px; font-size:17px; } .article-body h2 { font-size:36px; } .article-hero-image { margin-top:36px; } .visual-steps { grid-template-columns:1fr; } .visual-step { border-right:0!important; border-bottom:1px solid var(--line); padding:18px 0 22px; } .visual-step:last-child { border-bottom:0; } .visual-arrow { transform:rotate(90deg); padding:8px 0; } .email { margin:35px 0 65px; } .footer-bottom { gap:15px; line-height:1.5; } }
`;

function documentShell(title, description, body) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title><meta name="description" content="${escapeHtml(description)}"><link rel="shortcut icon" href="/favicon.svg"><style>${styles}</style></head><body>${body}</body></html>`;
}

function articleAssetUrl(assetPath) {
  if (/^https?:\/\//i.test(String(assetPath))) return String(assetPath);
  return `../../${String(assetPath).replace(/^\/+/, "")}`;
}

function blogAssetUrl(assetPath) {
  if (/^https?:\/\//i.test(String(assetPath))) return String(assetPath);
  return `../${String(assetPath).replace(/^\/+/, "")}`;
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
homepage = homepage.replace('<a href="#experience">Experience</a>', '<a href="/blog/index.html">Blog</a><a href="#experience">Experience</a>');
await writeFile(homepagePath, homepage);

const footer = `<footer><p class="section-label">Open to thoughtful conversations</p><a class="email" href="mailto:vladimir.petrishchev@gmail.com">vladimir.petrishchev<br>@gmail.com <span>↗</span></a><div class="footer-bottom"><span>© 2026 Vladimir Petrishchev</span><div class="footer-links"><a href="https://www.linkedin.com/in/vladimir-petrishchev/" target="_blank" rel="noreferrer">LinkedIn ↗</a><a href="https://github.com/coffeeshop13" target="_blank" rel="noreferrer">GitHub ↗</a></div></div></footer>`;
const blogIndexBody = `<header class="site-header"><a class="wordmark" href="/" aria-label="Vladimir Petrishchev home">VP<span>·</span></a><nav class="header-links" aria-label="Blog navigation"><a href="/">Home</a><a href="/rss.xml">RSS</a></nav></header><main class="blog-shell"><section class="blog-hero"><div class="eyebrow">Notes on AI, data &amp; leadership</div><div><h1>Useful ideas,<br><em>shipped regularly.</em></h1><p>A working notebook on building AI systems, data products, and teams that hold up in the real world.</p></div></section><section aria-label="Blog posts"><div class="post-grid">${posts.length ? posts.map(({ metadata }) => `<a class="post-card" href="/blog/${encodeURIComponent(metadata.slug)}/index.html"><time datetime="${escapeHtml(metadata.date)}">${escapeHtml(metadata.date)}</time><div><h2>${escapeHtml(metadata.title)}</h2><div class="tags">${(metadata.tags || []).map(escapeHtml).join(" · ")}</div></div><p>${escapeHtml(metadata.description || "")}</p>${metadata.image ? `<div class="post-card-media"><img src="${escapeHtml(blogAssetUrl(metadata.image))}" alt="${escapeHtml(metadata.image_alt || metadata.title)}" loading="lazy" decoding="async"></div>` : ""}</a>`).join("") : '<p class="empty-state">The first note is being prepared. New posts will appear here automatically.</p>'}</div></section></main>${footer}`;
await mkdir(resolve(outputDirectory, "blog"), { recursive: true });
await writeFile(resolve(outputDirectory, "blog/index.html"), documentShell("Blog — Vladimir Petrishchev", "Notes on AI, data, product, and leadership from Vladimir Petrishchev.", blogIndexBody));

for (const { metadata, html } of posts) {
  const postDirectory = resolve(outputDirectory, "blog", metadata.slug);
  await mkdir(postDirectory, { recursive: true });
  const heroImage = metadata.image ? `<img class="article-hero-image" src="${escapeHtml(articleAssetUrl(metadata.image))}" alt="${escapeHtml(metadata.image_alt || metadata.title)}">` : "";
  const visual = metadata.visual === "decision-framework" ? `<aside class="decision-visual" aria-label="AI product decision framework"><div class="visual-kicker">Before you build</div><div class="visual-steps"><div class="visual-step"><span>01 / WORK</span><strong>What changes?</strong><p>Find the decision or workflow that should become meaningfully better.</p></div><div class="visual-arrow" aria-hidden="true">→</div><div class="visual-step"><span>02 / RISK</span><strong>What can fail?</strong><p>Make uncertainty, unacceptable errors, and human review explicit.</p></div><div class="visual-arrow" aria-hidden="true">→</div><div class="visual-step"><span>03 / OUTCOME</span><strong>How do we know?</strong><p>Choose the measurable result that earns the system a place in the work.</p></div></div></aside>` : "";
  const body = `<header class="site-header"><a class="wordmark" href="/" aria-label="Vladimir Petrishchev home">VP<span>·</span></a><nav class="header-links" aria-label="Blog navigation"><a href="/blog/index.html">All notes</a><a href="/rss.xml">RSS</a></nav></header><main class="article-shell"><a class="back-link" href="/blog/index.html">← All notes</a><article><header class="article-header"><div class="eyebrow">${(metadata.tags || []).map(escapeHtml).join(" · ")}</div><div><h1>${escapeHtml(metadata.title)}</h1><div class="post-meta"><time datetime="${escapeHtml(metadata.date)}">${escapeHtml(metadata.date)}</time></div><p>${escapeHtml(metadata.description || "")}</p>${heroImage}</div></header><div class="article-body">${visual}${html}</div></article></main>${footer}`;
  await writeFile(resolve(postDirectory, "index.html"), documentShell(`${metadata.title} — Vladimir Petrishchev`, metadata.description || metadata.title, body));
}

const siteUrl = "https://vladimirpetrishchev.com";
const rssItems = posts.map(({ metadata }) => `<item><title>${escapeHtml(metadata.title)}</title><link>${siteUrl}/blog/${encodeURIComponent(metadata.slug)}/index.html</link><guid>${siteUrl}/blog/${encodeURIComponent(metadata.slug)}/index.html</guid><pubDate>${new Date(`${metadata.date}T08:00:00Z`).toUTCString()}</pubDate><description>${escapeHtml(metadata.description || "")}</description></item>`).join("");
await writeFile(resolve(outputDirectory, "rss.xml"), `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>Vladimir Petrishchev — Notes</title><link>${siteUrl}/blog/index.html</link><description>Notes on AI, data, product, and leadership.</description>${rssItems}</channel></rss>`);
const sitemapUrls = [siteUrl + "/", siteUrl + "/blog/index.html", ...posts.map(({ metadata }) => `${siteUrl}/blog/${encodeURIComponent(metadata.slug)}/index.html`)];
await writeFile(resolve(outputDirectory, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${sitemapUrls.map((url) => `<url><loc>${url}</loc></url>`).join("")}</urlset>`);

console.log(`Prepared ${outputDirectory} with ${posts.length} published blog post(s).`);

import { cp, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const projectRoot = resolve(import.meta.dirname, "..");
const referenceDirectory = resolve(projectRoot, "reference-deployment");
const outputDirectory = resolve(projectRoot, "dist");
const postsDirectory = resolve(projectRoot, "content/posts");
const siteUrl = "https://vladimirpetrishchev.com";
const authorName = "Vladimir Petrishchev";
const authorUrl = `${siteUrl}/`;
const authorLinkedIn = "https://www.linkedin.com/in/vladimir-petrishchev/";

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
  let table = [];
  let code = null;
  const flushParagraph = () => {
    if (paragraph.length) output.push(`<p>${inlineMarkdown(paragraph.join(" "))}</p>`);
    paragraph = [];
  };
  const flushList = () => {
    if (list.length) output.push(`<ul>${list.map((item) => `<li>${inlineMarkdown(item)}</li>`).join("")}</ul>`);
    list = [];
  };
  const flushTable = () => {
    if (!table.length) return;
    const [head, ...rows] = table;
    output.push(`<div class="article-table-wrap"><table><thead><tr>${head.map((cell) => `<th>${inlineMarkdown(cell)}</th>`).join("")}</tr></thead><tbody>${rows.map((row) => `<tr>${row.map((cell) => `<td>${inlineMarkdown(cell)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`);
    table = [];
  };
  for (const line of lines) {
    if (line.startsWith("```") && !code) { flushParagraph(); flushList(); flushTable(); code = []; continue; }
    if (line.startsWith("```") && code) { output.push(`<pre><code>${escapeHtml(code.join("\n"))}</code></pre>`); code = null; continue; }
    if (code) { code.push(line); continue; }
    if (!line.trim()) { flushParagraph(); flushList(); flushTable(); continue; }
    const tableLine = line.trim();
    if (/^\|.*\|$/.test(tableLine)) {
      flushParagraph(); flushList();
      const cells = tableLine.slice(1, -1).split("|").map((cell) => cell.trim());
      if (!cells.every((cell) => /^:?-{3,}:?$/.test(cell))) table.push(cells);
      continue;
    }
    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    if (heading) { flushParagraph(); flushList(); flushTable(); const level = heading[1].length; output.push(`<h${level}>${inlineMarkdown(heading[2])}</h${level}>`); continue; }
    const quote = line.match(/^>\s+(.+)$/);
    if (quote) { flushParagraph(); flushList(); flushTable(); output.push(`<blockquote><p>${inlineMarkdown(quote[1])}</p></blockquote>`); continue; }
    const bullet = line.match(/^[-*]\s+(.+)$/);
    if (bullet) { flushParagraph(); flushTable(); list.push(bullet[1]); continue; }
    flushList(); flushTable(); paragraph.push(line.trim());
  }
  flushParagraph(); flushList(); flushTable();
  if (code) output.push(`<pre><code>${escapeHtml(code.join("\n"))}</code></pre>`);
  return output.join("\n");
}

function countWords(markdown) {
  return markdown
    .replace(/^---[\s\S]*?---/m, "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[#>*_`|\-]/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

const styles = `
@import "https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600&family=Fraunces:opsz,wght@9..144,500;9..144,600&display=swap";
:root { --ink:#17212f; --paper:#f7f5ef; --blue:#2259d7; --line:#d9d6ce; }
* { box-sizing:border-box; } html { background:var(--paper); scroll-behavior:smooth; } body { background:var(--paper); color:var(--ink); margin:0; font-family:DM Sans,sans-serif; line-height:1.5; } a { color:inherit; text-decoration:none; }
.site-header { border-bottom:1px solid var(--line); justify-content:space-between; align-items:center; max-width:1320px; height:82px; margin:auto; padding:0 34px; display:flex; }
.wordmark { letter-spacing:-.1em; font-family:DM Mono,monospace; font-size:23px; font-weight:500; } .wordmark span { color:var(--blue); }
.header-links { align-items:center; gap:26px; font-size:14px; display:flex; } .header-links a:not(.header-contact) { border-bottom:1px solid var(--ink); opacity:1; padding-bottom:4px; } .header-links a:hover { border-color:var(--blue); color:var(--blue); }
.blog-shell { max-width:1320px; margin:auto; padding:78px 34px 120px; } .eyebrow { text-transform:uppercase; letter-spacing:.06em; color:#5c636c; font-family:DM Mono,monospace; font-size:12px; }
.blog-hero { border-bottom:1px solid var(--line); grid-template-columns:25% 1fr; gap:36px; padding:0 0 96px; display:grid; } .blog-hero h1 { letter-spacing:-.075em; margin:20px 0 28px; font-family:Fraunces,serif; font-size:clamp(52px,6.6vw,92px); font-weight:500; line-height:.92; } .blog-hero h1 em { color:var(--blue); font-weight:500; } .blog-hero p { letter-spacing:-.025em; color:#555d66; max-width:520px; margin:32px 0 0; font-size:18px; line-height:1.5; }
.post-grid { border-top:1px solid var(--ink); margin-top:100px; } .post-card { border-bottom:1px solid var(--line); grid-template-columns:13% 1.2fr 1fr 1.05fr; gap:20px; min-height:188px; padding:26px 0; display:grid; transition:background .2s; } .post-card > * { min-width:0; } .post-card:hover { background:#eeece5; } .post-card time,.post-meta { color:#6a7077; padding-top:5px; font-family:DM Mono,monospace; font-size:12px; } .post-card h2 { letter-spacing:-.04em; margin:0 0 8px; font-family:Fraunces,serif; font-size:27px; font-weight:500; line-height:1.12; } .post-card p { color:#515963; max-width:340px; margin:2px 0; font-size:15px; line-height:1.5; } .post-card-media { align-self:stretch; background:#e9edf4; overflow:hidden; } .post-card-media img { border:1px solid var(--line); display:block; height:100%; min-height:136px; object-fit:cover; object-position:60% 50%; transform:scale(1.18); transform-origin:60% 50%; transition:transform .25s ease; width:100%; } .post-card:hover .post-card-media img { transform:scale(1.24); } .tags { color:var(--blue); font-family:DM Mono,monospace; font-size:12px; padding-top:5px; }
.empty-state { border-bottom:1px solid var(--line); color:#515963; padding:26px 0; } .article-shell { max-width:1320px; margin:auto; padding:78px 34px 120px; } .article-header { border-bottom:1px solid var(--line); grid-template-columns:25% 1fr; gap:36px; padding-bottom:70px; display:grid; } .article-header h1 { letter-spacing:-.075em; margin:18px 0 24px; font-family:Fraunces,serif; font-size:clamp(52px,6.6vw,92px); font-weight:500; line-height:.92; max-width:900px; } .article-header p { letter-spacing:-.02em; color:#555d66; max-width:650px; margin:28px 0 0; font-size:18px; line-height:1.5; }
.article-body { max-width:760px; margin-left:25%; padding-top:72px; font-size:17px; line-height:1.65; } .article-body h2 { letter-spacing:-.045em; margin:58px 0 18px; font-family:Fraunces,serif; font-size:35px; font-weight:500; line-height:1.08; } .article-body h3 { color:var(--blue); margin:42px 0 12px; font-size:15px; font-weight:600; } .article-body p { margin:0 0 25px; } .article-body ul { margin:0 0 28px; padding-left:24px; } .article-body li { margin:8px 0; } .article-body code { background:#ebe8df; padding:2px 5px; font:14px DM Mono,monospace; } .article-body pre { background:var(--ink); color:var(--paper); padding:20px; overflow:auto; font:14px/1.5 DM Mono,monospace; } .article-body a { color:var(--blue); text-decoration:underline; text-underline-offset:3px; }
.article-hero-image { border:1px solid var(--line); width:100%; height:auto; display:block; margin:48px 0 0; } 
.decision-visual { border-top:1px solid var(--ink); border-bottom:1px solid var(--line); margin:0 0 62px; } .visual-kicker { color:#5c636c; padding:16px 0 0; font:11px DM Mono,monospace; letter-spacing:.06em; text-transform:uppercase; } .visual-steps { grid-template-columns:1fr 34px 1fr 34px 1fr; align-items:stretch; display:grid; } .visual-step { padding:20px 18px 26px 0; } .visual-step:not(:last-child) { border-right:1px solid var(--line); } .visual-step span { color:var(--blue); font:11px DM Mono,monospace; } .visual-step strong { display:block; letter-spacing:-.04em; margin:16px 0 8px; font:500 32px/1 Fraunces,serif; } .visual-step p { color:#555d66; margin:0; font-size:14px; line-height:1.45; } .visual-arrow { color:var(--blue); align-self:center; justify-self:center; font:28px Fraunces,serif; }
.back-link { color:#5c636c; display:inline-block; margin-bottom:52px; font:12px DM Mono,monospace; text-transform:uppercase; letter-spacing:.06em; } .back-link:hover { color:var(--blue); }
footer { background:var(--ink); color:var(--paper); padding:60px max(34px,50vw - 626px); } footer .section-label { color:#a7b1bd; } .email { letter-spacing:-.07em; margin:43px 0 90px; font-family:Fraunces,serif; font-size:clamp(39px,6vw,82px); font-weight:500; line-height:.96; display:inline-block; } .email span { color:#8eafff; } .footer-bottom { color:#a7b1bd; border-top:1px solid #3f4854; justify-content:space-between; padding-top:16px; font-family:DM Mono,monospace; font-size:11px; display:flex; } .footer-links { gap:22px; display:flex; } .footer-bottom a { color:#fff; }
@media (width<=720px) { .site-header { height:67px; padding:0 20px; } .header-links { gap:14px; font-size:12px; } .blog-shell,.article-shell { padding:57px 20px 80px; } .blog-hero,.article-header { grid-template-columns:1fr; gap:28px; padding-bottom:65px; } .blog-hero h1,.article-header h1 { margin:0; font-size:58px; } .blog-hero p,.article-header p { margin:0; font-size:17px; } .post-grid { margin-top:75px; } .post-card { grid-template-columns:1fr; gap:11px; min-height:0; padding:24px 0; } .post-card p { margin:0; } .post-card-media img { height:auto; min-height:0; aspect-ratio:16 / 9; transform:scale(1.08); } .article-body { margin-left:0; padding-top:52px; font-size:17px; } .article-body h2 { font-size:34px; } .article-hero-image { margin-top:36px; } .visual-steps { grid-template-columns:1fr; } .visual-step { border-right:0!important; border-bottom:1px solid var(--line); padding:18px 0 22px; } .visual-step:last-child { border-bottom:0; } .visual-arrow { transform:rotate(90deg); padding:8px 0; } .email { margin:35px 0 65px; } .footer-bottom { gap:15px; line-height:1.5; } }

/* Bloomberg-inspired newsroom type: a browser-safe substitute for its proprietary web font. */
:root { --news-sans:"Avenir Next","Helvetica Neue",Helvetica,Arial,sans-serif; }
body { font-family:var(--news-sans); font-size:16px; line-height:1.45; }
.site-header { height:68px; }
.wordmark { font-family:var(--news-sans); font-size:20px; font-weight:700; letter-spacing:-.06em; }
.header-links { font-size:15px; font-weight:600; }
.header-links a:not(.header-contact) { border-bottom:0; padding-bottom:0; }
.header-links a:hover { color:var(--blue); }
.eyebrow,.tags,.post-card time,.post-meta,.back-link,.visual-kicker,.visual-step span,.footer-bottom { font-family:var(--news-sans); font-size:13px; font-weight:600; letter-spacing:.02em; }
.post-meta { align-items:center; display:flex; flex-wrap:wrap; gap:8px; }
.post-meta a:hover { color:var(--blue); }
.blog-shell,.article-shell { max-width:1200px; padding-top:52px; }
.blog-hero { grid-template-columns:20% 1fr; gap:28px; padding-bottom:62px; }
.blog-hero h1,.article-header h1 { font-family:var(--news-sans); font-size:clamp(44px,5.3vw,76px); font-weight:700; letter-spacing:-.055em; line-height:.98; }
.blog-hero h1 em { color:var(--ink); font-style:normal; }
.blog-hero p,.article-header p { font-size:19px; font-weight:400; line-height:1.45; }
.post-grid { margin-top:62px; }
.post-card { grid-template-columns:12% 1.15fr 1fr .95fr; gap:18px; min-height:156px; padding:20px 0; }
.post-card h2 { font-family:var(--news-sans); font-size:28px; font-weight:700; letter-spacing:-.035em; line-height:1.08; }
.post-card p { font-size:16px; line-height:1.45; }
.post-card-media img { min-height:116px; transform:scale(1.13); }
.article-header { grid-template-columns:20% 1fr; gap:28px; padding-bottom:52px; }
.article-body { max-width:720px; margin-left:20%; padding-top:52px; font-size:18px; line-height:1.68; }
.article-body h2 { font-family:var(--news-sans); font-size:32px; font-weight:700; letter-spacing:-.035em; line-height:1.15; }
.article-body h3 { font-size:17px; }
.decision-visual { margin-bottom:44px; }
.visual-step strong { font-family:var(--news-sans); font-size:25px; font-weight:700; letter-spacing:-.03em; line-height:1.05; }
.visual-arrow { font-family:var(--news-sans); font-size:24px; font-weight:600; }
.visual-step p { font-size:15px; }
.article-body blockquote { border-left:4px solid var(--blue); margin:34px 0; padding:4px 0 4px 24px; font-size:22px; font-weight:600; letter-spacing:-.025em; line-height:1.35; }
.article-body blockquote p { margin:0; }
.article-table-wrap { border-top:2px solid var(--ink); margin:34px 0 46px; overflow-x:auto; }
.article-body table { border-collapse:collapse; width:100%; font-size:15px; line-height:1.4; }
.article-body th { border-bottom:1px solid var(--ink); padding:13px 14px 12px 0; text-align:left; vertical-align:bottom; font-size:12px; font-weight:700; letter-spacing:.04em; text-transform:uppercase; }
.article-body td { border-bottom:1px solid var(--line); padding:16px 14px 16px 0; vertical-align:top; }
.article-body td:first-child { color:var(--blue); font-weight:700; width:28%; }
.adoption-visual { border-top:2px solid var(--ink); border-bottom:1px solid var(--line); margin:0 0 54px; padding:0 0 22px; }
.adoption-visual .visual-kicker { padding-bottom:18px; }
.adoption-track { display:grid; grid-template-columns:1fr 38px 1fr 38px 1fr; align-items:stretch; }
.adoption-stage { background:#eeece5; min-height:154px; padding:18px; }
.adoption-stage span { color:var(--blue); font-size:12px; font-weight:700; }
.adoption-stage strong { display:block; margin:20px 0 8px; font-size:23px; letter-spacing:-.035em; line-height:1.08; }
.adoption-stage p { color:#555d66; margin:0; font-size:14px; line-height:1.4; }
.adoption-arrow { align-self:center; color:var(--blue); font-size:24px; font-weight:700; justify-self:center; }
.semantic-visual { border-top:2px solid var(--ink); border-bottom:1px solid var(--line); margin:0 0 54px; padding:0 0 22px; }
.semantic-visual .visual-kicker { padding-bottom:18px; }
.semantic-track { align-items:stretch; display:grid; grid-template-columns:1fr 30px 1fr 30px 1fr 30px 1fr; }
.semantic-stage { background:#eeece5; min-height:150px; padding:18px 16px; }
.semantic-stage:nth-of-type(5) { background:#e4e9f5; }
.semantic-stage:nth-of-type(7) { background:var(--blue); color:#fff; }
.semantic-stage span { color:var(--blue); font-size:12px; font-weight:700; }
.semantic-stage:nth-of-type(7) span { color:#dbe5ff; }
.semantic-stage strong { display:block; font-size:20px; letter-spacing:-.035em; line-height:1.08; margin:20px 0 8px; }
.semantic-stage p { color:#555d66; font-size:13px; line-height:1.4; margin:0; }
.semantic-stage:nth-of-type(7) p { color:#eef3ff; }
.semantic-arrow { align-self:center; color:var(--blue); font-size:22px; font-weight:700; justify-self:center; }
.authority-visual { border-top:2px solid var(--ink); border-bottom:1px solid var(--line); margin:0 0 54px; padding:0 0 22px; }
.authority-visual .visual-kicker { padding-bottom:18px; }
.authority-track { align-items:stretch; display:grid; grid-template-columns:1fr 30px 1fr 30px 1fr 30px 1fr; }
.authority-stage { background:#eeece5; min-height:150px; padding:18px 16px; }
.authority-stage:nth-of-type(5) { background:#e4e9f5; }
.authority-stage:nth-of-type(7) { background:var(--blue); color:#fff; }
.authority-stage span { color:var(--blue); font-size:12px; font-weight:700; }
.authority-stage:nth-of-type(7) span { color:#dbe5ff; }
.authority-stage strong { display:block; font-size:20px; letter-spacing:-.035em; line-height:1.08; margin:20px 0 8px; }
.authority-stage p { color:#555d66; font-size:13px; line-height:1.4; margin:0; }
.authority-stage:nth-of-type(7) p { color:#eef3ff; }
.authority-arrow { align-self:center; color:var(--blue); font-size:22px; font-weight:700; justify-self:center; }
.evaluation-visual { border-top:2px solid var(--ink); border-bottom:1px solid var(--line); margin:0 0 54px; padding:0 0 22px; }
.evaluation-visual .visual-kicker { padding-bottom:18px; }
.evaluation-track { align-items:stretch; display:grid; grid-template-columns:1fr 30px 1fr 30px 1fr 30px 1fr; }
.evaluation-stage { background:#eeece5; min-height:150px; padding:18px 16px; }
.evaluation-stage:nth-of-type(3) { background:#e4e9f5; }
.evaluation-stage:nth-of-type(5) { background:var(--blue); color:#fff; }
.evaluation-stage:nth-of-type(7) { border:2px solid #d86b20; background:transparent; }
.evaluation-stage span { color:var(--blue); font-size:12px; font-weight:700; }
.evaluation-stage:nth-of-type(5) span { color:#dbe5ff; }
.evaluation-stage:nth-of-type(7) span { color:#b34e0a; }
.evaluation-stage strong { display:block; font-size:20px; letter-spacing:-.035em; line-height:1.08; margin:20px 0 8px; }
.evaluation-stage p { color:#555d66; font-size:13px; line-height:1.4; margin:0; }
.evaluation-stage:nth-of-type(5) p { color:#eef3ff; }
.evaluation-arrow { align-self:center; color:var(--blue); font-size:22px; font-weight:700; justify-self:center; }
.handoff-visual { border-top:2px solid var(--ink); border-bottom:1px solid var(--line); margin:0 0 54px; padding:0 0 22px; }
.handoff-visual .visual-kicker { padding-bottom:18px; }
.handoff-track { align-items:stretch; display:grid; grid-template-columns:1fr 24px 1fr 24px 1fr 24px 1fr; }
.handoff-stage { background:#eeece5; min-height:150px; padding:18px 16px; }
.handoff-stage:nth-of-type(3) { border:2px solid #d86b20; background:transparent; }
.handoff-stage:nth-of-type(5) { background:#e4e9f5; }
.handoff-stage:nth-of-type(7) { background:var(--blue); color:#fff; }
.handoff-stage span { color:var(--blue); font-size:12px; font-weight:700; }
.handoff-stage:nth-of-type(3) span { color:#b34e0a; }
.handoff-stage:nth-of-type(7) span { color:#dbe5ff; }
.handoff-stage strong { display:block; font-size:20px; letter-spacing:-.035em; line-height:1.08; margin:20px 0 8px; }
.handoff-stage p { color:#555d66; font-size:13px; line-height:1.4; margin:0; }
.handoff-stage:nth-of-type(7) p { color:#eef3ff; }
.handoff-arrow { align-self:center; color:var(--blue); font-size:22px; font-weight:700; justify-self:center; }
.monitoring-visual { border-top:2px solid var(--ink); border-bottom:1px solid var(--line); margin:0 0 54px; padding:0 0 22px; }
.monitoring-visual .visual-kicker { padding-bottom:18px; }
.monitoring-track { align-items:stretch; display:grid; grid-template-columns:1fr 20px 1fr 20px 1fr 20px 1fr 20px 1fr; }
.monitoring-stage { background:#eeece5; min-height:150px; padding:18px 14px; }
.monitoring-stage:nth-of-type(3) { background:#e4e9f5; }
.monitoring-stage:nth-of-type(5) { background:var(--blue); color:#fff; }
.monitoring-stage:nth-of-type(7) { border:2px solid #d86b20; background:transparent; }
.monitoring-stage:nth-of-type(9) { background:var(--ink); color:#fff; }
.monitoring-stage span { color:var(--blue); font-size:11px; font-weight:700; }
.monitoring-stage:nth-of-type(5) span,.monitoring-stage:nth-of-type(9) span { color:#dbe5ff; }
.monitoring-stage:nth-of-type(7) span { color:#b34e0a; }
.monitoring-stage strong { display:block; font-size:18px; letter-spacing:-.035em; line-height:1.08; margin:20px 0 8px; }
.monitoring-stage p { color:#555d66; font-size:12px; line-height:1.4; margin:0; }
.monitoring-stage:nth-of-type(5) p,.monitoring-stage:nth-of-type(9) p { color:#eef3ff; }
.monitoring-arrow { align-self:center; color:var(--blue); font-size:20px; font-weight:700; justify-self:center; }
.registry-visual { border-top:2px solid var(--ink); border-bottom:1px solid var(--line); margin:0 0 54px; padding:0 0 22px; }
.registry-visual .visual-kicker { padding-bottom:18px; }
.registry-track { align-items:stretch; display:grid; grid-template-columns:1fr 20px 1fr 20px 1fr 20px 1fr 20px 1fr; }
.registry-stage { background:#eeece5; min-height:150px; padding:18px 14px; }
.registry-stage:nth-of-type(3) { background:#e4e9f5; }
.registry-stage:nth-of-type(5) { background:var(--blue); color:#fff; }
.registry-stage:nth-of-type(7) { border:2px solid #d86b20; background:transparent; }
.registry-stage:nth-of-type(9) { background:var(--ink); color:#fff; }
.registry-stage span { color:var(--blue); font-size:11px; font-weight:700; }
.registry-stage:nth-of-type(5) span,.registry-stage:nth-of-type(9) span { color:#dbe5ff; }
.registry-stage:nth-of-type(7) span { color:#b34e0a; }
.registry-stage strong { display:block; font-size:18px; letter-spacing:-.035em; line-height:1.08; margin:20px 0 8px; }
.registry-stage p { color:#555d66; font-size:12px; line-height:1.4; margin:0; }
.registry-stage:nth-of-type(5) p,.registry-stage:nth-of-type(9) p { color:#eef3ff; }
.registry-arrow { align-self:center; color:var(--blue); font-size:20px; font-weight:700; justify-self:center; }
.audit-visual { border-top:2px solid var(--ink); border-bottom:1px solid var(--line); margin:0 0 54px; padding:0 0 22px; }
.audit-visual .visual-kicker { padding-bottom:18px; }
.audit-track { align-items:stretch; display:grid; grid-template-columns:1fr 20px 1fr 20px 1fr 20px 1fr 20px 1fr; }
.audit-stage { background:#eeece5; min-height:150px; padding:18px 14px; }
.audit-stage:nth-of-type(3) { background:#e4e9f5; }
.audit-stage:nth-of-type(5) { background:var(--blue); color:#fff; }
.audit-stage:nth-of-type(9) { background:var(--ink); color:#fff; }
.audit-stage span { color:var(--blue); font:10px DM Mono,monospace; letter-spacing:.04em; }
.audit-stage:nth-of-type(5) span,.audit-stage:nth-of-type(9) span { color:#9db8ff; }
.audit-stage strong { display:block; font:600 17px/1.1 DM Sans,sans-serif; letter-spacing:-.025em; margin:12px 0 8px; }
.audit-stage p { color:#555d66; font-size:12px; line-height:1.4; margin:0; }
.audit-stage:nth-of-type(5) p,.audit-stage:nth-of-type(9) p { color:#eef3ff; }
.audit-arrow { align-self:center; color:var(--blue); font-size:20px; font-weight:700; justify-self:center; }
.review-visual { border-top:2px solid var(--ink); border-bottom:1px solid var(--line); margin:0 0 54px; padding:0 0 22px; }
.review-visual .visual-kicker { padding-bottom:18px; }
.review-track { align-items:stretch; display:grid; grid-template-columns:1fr 20px 1fr 20px 1fr 20px 1fr 20px 1fr; }
.review-stage { background:#eeece5; min-height:150px; padding:18px 14px; }
.review-stage:nth-of-type(3) { background:#e4e9f5; }
.review-stage:nth-of-type(5) { border:2px solid #d86b20; background:transparent; }
.review-stage:nth-of-type(7) { background:var(--blue); color:#fff; }
.review-stage:nth-of-type(9) { background:var(--ink); color:#fff; }
.review-stage span { color:var(--blue); font:10px DM Mono,monospace; letter-spacing:.04em; }
.review-stage:nth-of-type(5) span { color:#b34e0a; }
.review-stage:nth-of-type(7) span,.review-stage:nth-of-type(9) span { color:#9db8ff; }
.review-stage strong { display:block; font:600 17px/1.1 DM Sans,sans-serif; letter-spacing:-.025em; margin:12px 0 8px; }
.review-stage p { color:#555d66; font-size:12px; line-height:1.4; margin:0; }
.review-stage:nth-of-type(7) p,.review-stage:nth-of-type(9) p { color:#eef3ff; }
.review-arrow { align-self:center; color:var(--blue); font-size:20px; font-weight:700; justify-self:center; }
.portability-visual { border-top:2px solid var(--ink); border-bottom:1px solid var(--line); margin:0 0 54px; padding:0 0 22px; }
.portability-visual .visual-kicker { padding-bottom:18px; }
.portability-track { align-items:stretch; display:grid; grid-template-columns:1fr 20px 1fr 20px 1fr 20px 1fr 20px 1fr; }
.portability-stage { background:#eeece5; min-height:150px; padding:18px 14px; }
.portability-stage:nth-of-type(3) { background:#e4e9f5; }
.portability-stage:nth-of-type(5) { background:var(--blue); color:#fff; }
.portability-stage:nth-of-type(7) { border:2px solid #d86b20; background:transparent; }
.portability-stage:nth-of-type(9) { background:var(--ink); color:#fff; }
.portability-stage span { color:var(--blue); font:10px DM Mono,monospace; letter-spacing:.04em; }
.portability-stage:nth-of-type(5) span,.portability-stage:nth-of-type(9) span { color:#9db8ff; }
.portability-stage:nth-of-type(7) span { color:#b34e0a; }
.portability-stage strong { display:block; font:600 17px/1.1 DM Sans,sans-serif; letter-spacing:-.025em; margin:12px 0 8px; }
.portability-stage p { color:#555d66; font-size:12px; line-height:1.4; margin:0; }
.portability-stage:nth-of-type(5) p,.portability-stage:nth-of-type(9) p { color:#eef3ff; }
.portability-arrow { align-self:center; color:var(--blue); font-size:20px; font-weight:700; justify-self:center; }
.investigation-visual { border-top:2px solid var(--ink); border-bottom:1px solid var(--line); margin:0 0 54px; padding:0 0 22px; }
.investigation-visual .visual-kicker { padding-bottom:18px; }
.investigation-track { align-items:stretch; display:grid; grid-template-columns:1fr 24px 1fr 24px 1fr 24px 1fr; }
.investigation-stage { background:#eeece5; min-height:150px; padding:18px 16px; }
.investigation-stage:nth-of-type(3) { background:#e4e9f5; }
.investigation-stage:nth-of-type(5) { border:2px solid #d86b20; background:transparent; }
.investigation-stage:nth-of-type(7) { background:var(--ink); color:#fff; }
.investigation-stage span { color:var(--blue); font:10px DM Mono,monospace; letter-spacing:.04em; }
.investigation-stage:nth-of-type(5) span { color:#b34e0a; }
.investigation-stage:nth-of-type(7) span { color:#9db8ff; }
.investigation-stage strong { display:block; font:600 18px/1.1 DM Sans,sans-serif; letter-spacing:-.025em; margin:12px 0 8px; }
.investigation-stage p { color:#555d66; font-size:12px; line-height:1.4; margin:0; }
.investigation-stage:nth-of-type(7) p { color:#eef3ff; }
.investigation-arrow { align-self:center; color:var(--blue); font-size:20px; font-weight:700; justify-self:center; }
.breadcrumb { align-items:center; color:#5c636c; display:flex; flex-wrap:wrap; font-size:13px; font-weight:600; gap:8px; margin-bottom:46px; } .breadcrumb a:hover { color:var(--blue); } .breadcrumb span { color:#9aa0a8; }
.related-notes { border-top:2px solid var(--ink); margin-top:72px; padding-top:16px; } .related-notes h2 { font-size:14px; letter-spacing:.04em; margin:0 0 18px; text-transform:uppercase; } .related-note { border-top:1px solid var(--line); display:grid; gap:16px; grid-template-columns:1fr 132px; padding:18px 0; } .related-note h3 { color:var(--ink); font-size:21px; letter-spacing:-.03em; line-height:1.15; margin:0 0 8px; } .related-note p { color:#555d66; font-size:14px; line-height:1.45; margin:0; } .related-note img { aspect-ratio:16 / 10; border:1px solid var(--line); height:100%; object-fit:cover; width:100%; } .related-note:hover h3 { color:var(--blue); }
@media (width<=720px) { .site-header { height:60px; } .blog-shell,.article-shell { padding-top:40px; } .blog-hero,.article-header { grid-template-columns:minmax(0,1fr); gap:24px; } .blog-hero h1,.article-header h1 { font-size:clamp(40px,12vw,46px); } .blog-hero p,.article-header p { font-size:18px; } .article-header .eyebrow { max-width:100%; } .post-meta > span[aria-hidden="true"] { display:none; } .article-hero-image { margin-top:30px; } .post-card { grid-template-columns:minmax(0,1fr); gap:11px; min-height:0; padding:24px 0; } .post-card h2 { font-size:26px; } .post-card-media img { min-height:0; transform:scale(1.08); } .article-body { font-size:18px; margin-left:0; max-width:none; padding-top:42px; } .article-body blockquote { font-size:20px; margin:28px 0; padding-left:18px; } .article-body table { min-width:650px; } .adoption-track,.semantic-track,.authority-track,.evaluation-track,.handoff-track,.monitoring-track,.registry-track,.audit-track,.review-track,.portability-track,.investigation-track { grid-template-columns:1fr; } .adoption-arrow,.semantic-arrow,.authority-arrow,.evaluation-arrow,.handoff-arrow,.monitoring-arrow,.registry-arrow,.audit-arrow,.review-arrow,.portability-arrow,.investigation-arrow { padding:8px 0; transform:rotate(90deg); } .adoption-stage,.semantic-stage,.authority-stage,.evaluation-stage,.handoff-stage,.monitoring-stage,.registry-stage,.audit-stage,.review-stage,.portability-stage,.investigation-stage { min-height:0; } .breadcrumb { margin-bottom:34px; } .related-notes { margin-top:54px; } .related-note { grid-template-columns:1fr; } .related-note img { height:auto; } }
`;

function documentShell(title, description, body, seo = {}) {
  const canonicalUrl = seo.canonicalUrl || `${siteUrl}/`;
  const imageUrl = seo.imageUrl || `${siteUrl}/og.png`;
  const imageType = seo.imageType || (/\.png(?:$|\?)/i.test(imageUrl) ? "image/png" : "image/jpeg");
  const pageType = seo.type || "website";
  const tags = Array.isArray(seo.tags) ? seo.tags : [];
  const articleMeta = pageType === "article"
    ? `${seo.published ? `<meta property="article:published_time" content="${escapeHtml(seo.published)}">` : ""}${seo.modified ? `<meta property="article:modified_time" content="${escapeHtml(seo.modified)}">` : ""}<meta property="article:author" content="${authorUrl}">${tags.map((tag) => `<meta property="article:tag" content="${escapeHtml(tag)}">`).join("")}`
    : "";
  const structuredData = seo.structuredData
    ? `<script type="application/ld+json">${JSON.stringify(seo.structuredData).replaceAll("<", "\\u003c")}</script>`
    : "";
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#f7f5ef"><title>${escapeHtml(title)}</title><meta name="description" content="${escapeHtml(description)}"><meta name="author" content="${authorName}"><meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1"><link rel="canonical" href="${escapeHtml(canonicalUrl)}"><link rel="alternate" hreflang="en" href="${escapeHtml(canonicalUrl)}"><link rel="alternate" hreflang="x-default" href="${escapeHtml(canonicalUrl)}"><link rel="author" href="${authorUrl}"><link rel="alternate" type="application/rss+xml" title="Vladimir Petrishchev — Notes" href="${siteUrl}/rss.xml"><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><meta property="og:locale" content="en_US"><meta property="og:site_name" content="Vladimir Petrishchev"><meta property="og:type" content="${pageType}"><meta property="og:title" content="${escapeHtml(title)}"><meta property="og:description" content="${escapeHtml(description)}"><meta property="og:url" content="${escapeHtml(canonicalUrl)}"><meta property="og:image" content="${escapeHtml(imageUrl)}"><meta property="og:image:secure_url" content="${escapeHtml(imageUrl)}"><meta property="og:image:type" content="${imageType}">${seo.imageWidth ? `<meta property="og:image:width" content="${escapeHtml(seo.imageWidth)}">` : ""}${seo.imageHeight ? `<meta property="og:image:height" content="${escapeHtml(seo.imageHeight)}">` : ""}<meta property="og:image:alt" content="${escapeHtml(seo.imageAlt || description)}">${articleMeta}<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${escapeHtml(title)}"><meta name="twitter:description" content="${escapeHtml(description)}"><meta name="twitter:image" content="${escapeHtml(imageUrl)}"><meta name="twitter:image:alt" content="${escapeHtml(seo.imageAlt || description)}"><link rel="shortcut icon" href="/favicon.svg"><link rel="icon" href="/favicon.svg">${seo.preloadImage ? `<link rel="preload" as="image" href="${escapeHtml(seo.preloadImage)}" fetchpriority="high">` : ""}${structuredData}<style>${styles}</style></head><body>${body}</body></html>`;
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
  if (metadata.status && metadata.status !== "published" && process.env.INCLUDE_DRAFTS !== "true") continue;
  if (!metadata.title || !metadata.slug || !metadata.date) throw new Error(`Post ${filename} needs title, slug, and date.`);
  posts.push({ metadata, html: markdownToHtml(body), body, wordCount:countWords(body) });
}
posts.sort((left, right) => String(right.metadata.date).localeCompare(String(left.metadata.date)));
const latestPostDate = posts.reduce((latest, { metadata }) => String(metadata.updated || metadata.date) > latest ? String(metadata.updated || metadata.date) : latest, "2026-08-05");

const homepagePath = resolve(outputDirectory, "index.html");
let homepage = await readFile(homepagePath, "utf8");
homepage = homepage.replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<link rel="modulepreload"[^>]*>/gi, "");
homepage = homepage.replace('content="/og.png"', `content="${siteUrl}/og.png"`).replace('content="/og.png"', `content="${siteUrl}/og.png"`);
homepage = homepage.replaceAll("Vladimir Petrishchev — Data Science Director", "Vladimir Petrishchev — AI &amp; Data Science Director");
homepage = homepage.replace('content="Vladimir Petrishchev leads teams that turn AI ideas into dependable products."', 'content="AI and data science leader building dependable AI products, data platforms, and high-performing teams."');
homepage = homepage.replaceAll('content="Building useful intelligence."', 'content="AI and data science leadership focused on dependable products, data platforms, and teams."');
const personSchema = { "@type":"Person", "@id":`${authorUrl}#person`, name:authorName, url:authorUrl, sameAs:[authorLinkedIn,"https://github.com/coffeeshop13"], jobTitle:"Data Science Director", knowsAbout:["Artificial intelligence","AI agents","Data science","AI product strategy","MLOps","Data products","Data leadership"] };
const homepageSchema = { "@context":"https://schema.org", "@graph":[personSchema,{ "@type":"WebSite", "@id":`${siteUrl}/#website`, url:authorUrl, name:authorName, alternateName:"VP", inLanguage:"en", publisher:{ "@id":`${authorUrl}#person` } },{ "@type":"ProfilePage", "@id":`${authorUrl}#profile`, url:authorUrl, name:`${authorName} — AI & Data Science Director`, description:"AI and data science leadership focused on dependable products, data platforms, and teams.", mainEntity:{ "@id":`${authorUrl}#person` }, isPartOf:{ "@id":`${siteUrl}/#website` } },{ "@type":"WebPage", "@id":`${authorUrl}#webpage`, url:authorUrl, name:`${authorName} — AI & Data Science Director`, isPartOf:{ "@id":`${siteUrl}/#website` }, about:{ "@id":`${authorUrl}#person` }, mainEntity:{ "@id":`${authorUrl}#person` } }] };
const homepageLatest = `<section class="section latest-notes" aria-labelledby="latest-notes-title"><div class="section-label">04 / Latest notes</div><div class="latest-notes-list"><h2 id="latest-notes-title">Writing on AI, data &amp; leadership</h2>${posts.slice(0,3).map(({ metadata }) => `<a class="latest-note-link" href="/blog/${encodeURIComponent(metadata.slug)}/"><time datetime="${escapeHtml(metadata.date)}">${escapeHtml(metadata.date)}</time><strong>${escapeHtml(metadata.title)}</strong><span aria-hidden="true">→</span></a>`).join("")}<a class="all-notes-link" href="/blog/">View all notes →</a></div></section>`;
const homepageSeo = `<link rel="canonical" href="${authorUrl}"><link rel="alternate" hreflang="en" href="${authorUrl}"><link rel="alternate" hreflang="x-default" href="${authorUrl}"><link rel="alternate" type="application/rss+xml" title="Vladimir Petrishchev — Notes" href="${siteUrl}/rss.xml"><meta name="author" content="${authorName}"><meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1"><meta name="theme-color" content="#f7f5ef"><meta property="og:type" content="profile"><meta property="og:url" content="${authorUrl}"><meta property="og:site_name" content="Vladimir Petrishchev"><meta property="og:image:secure_url" content="${siteUrl}/og.png"><script type="application/ld+json">${JSON.stringify(homepageSchema).replaceAll("<", "\\u003c")}</script><style>.proof span{font-size:14px}.latest-notes-list{border-top:1px solid #17212f}.latest-notes-list h2{font-size:clamp(30px,4vw,54px);letter-spacing:-.05em;line-height:1.05;margin:24px 0 34px;max-width:680px}.latest-note-link{align-items:center;border-top:1px solid #d9d6ce;display:grid;gap:24px;grid-template-columns:120px 1fr 30px;padding:20px 0;text-decoration:none}.latest-note-link time{color:#6a7077;font-size:13px}.latest-note-link strong{font-size:21px;letter-spacing:-.025em}.latest-note-link span{color:#2259d7;font-size:22px}.latest-note-link:hover strong,.all-notes-link{color:#2259d7}.all-notes-link{display:inline-block;font-weight:600;margin-top:24px}@media(max-width:720px){.latest-note-link{gap:8px;grid-template-columns:1fr 24px}.latest-note-link time{grid-column:1/-1}.latest-note-link strong{font-size:18px}}</style>`;
homepage = homepage.replace("</head>", `${homepageSeo}</head>`);
homepage = homepage.replace('<a href="#experience">Experience</a>', '<a href="/blog/">Blog</a><a href="#experience">Experience</a>');
homepage = homepage.replace('<footer id="contact">', `${homepageLatest}<footer id="contact">`);
await writeFile(homepagePath, homepage);

const footer = `<footer><p class="section-label">Open to thoughtful conversations</p><a class="email" href="mailto:vladimir.petrishchev@gmail.com">vladimir.petrishchev<br>@gmail.com <span>↗</span></a><div class="footer-bottom"><span>© 2026 Vladimir Petrishchev</span><div class="footer-links"><a href="https://www.linkedin.com/in/vladimir-petrishchev/" target="_blank" rel="noreferrer">LinkedIn ↗</a><a href="https://github.com/coffeeshop13" target="_blank" rel="noreferrer">GitHub ↗</a></div></div></footer>`;
const blogIndexBody = `<header class="site-header"><a class="wordmark" href="/" aria-label="Vladimir Petrishchev home">VP<span>·</span></a><nav class="header-links" aria-label="Blog navigation"><a href="/">Home</a><a href="/rss.xml">RSS</a></nav></header><main class="blog-shell"><nav class="breadcrumb" aria-label="Breadcrumb"><a href="/">Home</a><span aria-hidden="true">/</span><span aria-current="page">Notes</span></nav><section class="blog-hero"><div class="eyebrow">Notes on AI, data &amp; leadership</div><div><h1>Useful ideas,<br><em>shipped regularly.</em></h1><p>A working notebook on building AI systems, data products, and teams that hold up in the real world.</p></div></section><section aria-label="Blog posts"><div class="post-grid">${posts.length ? posts.map(({ metadata }) => `<a class="post-card" href="/blog/${encodeURIComponent(metadata.slug)}/"><time datetime="${escapeHtml(metadata.date)}">${escapeHtml(metadata.date)}</time><div><h2>${escapeHtml(metadata.title)}</h2><div class="tags">${(metadata.tags || []).map(escapeHtml).join(" · ")}</div></div><p>${escapeHtml(metadata.description || "")}</p>${metadata.image ? `<div class="post-card-media"><img src="${escapeHtml(blogAssetUrl(metadata.image))}" alt="${escapeHtml(metadata.image_alt || metadata.title)}" width="${escapeHtml(metadata.image_width || 1024)}" height="${escapeHtml(metadata.image_height || 682)}" loading="lazy" decoding="async"></div>` : ""}</a>`).join("") : '<p class="empty-state">The first note is being prepared. New posts will appear here automatically.</p>'}</div></section></main>${footer}`;
await mkdir(resolve(outputDirectory, "blog"), { recursive: true });
const blogDescription = "Practical notes on building dependable AI systems, data products, and teams inside real organisations.";
const blogSchema = { "@context":"https://schema.org", "@graph":[{ "@type":"Blog", "@id":`${siteUrl}/blog/#blog`, name:"Vladimir Petrishchev — Notes", description:blogDescription, url:`${siteUrl}/blog/`, inLanguage:"en", author:{ "@id":`${authorUrl}#person` }, blogPost:posts.map(({ metadata }) => ({ "@id":`${siteUrl}/blog/${encodeURIComponent(metadata.slug)}/#article` })) },{ "@type":"WebPage", "@id":`${siteUrl}/blog/#webpage`, url:`${siteUrl}/blog/`, name:"AI Agent & Data Product Notes — Vladimir Petrishchev", isPartOf:{ "@id":`${siteUrl}/#website` }, about:{ "@id":`${authorUrl}#person` }, mainEntity:{ "@id":`${siteUrl}/blog/#blog` } },personSchema,{ "@type":"BreadcrumbList", "@id":`${siteUrl}/blog/#breadcrumb`, itemListElement:[{ "@type":"ListItem", position:1, name:"Home", item:authorUrl },{ "@type":"ListItem", position:2, name:"Notes", item:`${siteUrl}/blog/` }] }] };
await writeFile(resolve(outputDirectory, "blog/index.html"), documentShell("AI Agent & Data Product Notes — Vladimir Petrishchev", blogDescription, blogIndexBody, { canonicalUrl:`${siteUrl}/blog/`, imageUrl:`${siteUrl}/og.png`, imageAlt:"Vladimir Petrishchev — AI, data and product leadership", imageWidth:1200, imageHeight:630, structuredData:blogSchema }));

for (const { metadata, html } of posts) {
  const postDirectory = resolve(outputDirectory, "blog", metadata.slug);
  await mkdir(postDirectory, { recursive: true });
  const heroImage = metadata.image ? `<img class="article-hero-image" src="${escapeHtml(articleAssetUrl(metadata.image))}" alt="${escapeHtml(metadata.image_alt || metadata.title)}" width="${escapeHtml(metadata.image_width || 1024)}" height="${escapeHtml(metadata.image_height || 682)}" fetchpriority="high" decoding="async">` : "";
  const visual = metadata.visual === "decision-framework"
    ? `<aside class="decision-visual" aria-label="AI product decision framework"><div class="visual-kicker">Before you build</div><div class="visual-steps"><div class="visual-step"><span>01 / WORK</span><strong>What changes?</strong><p>Find the decision or workflow that should become meaningfully better.</p></div><div class="visual-arrow" aria-hidden="true">→</div><div class="visual-step"><span>02 / RISK</span><strong>What can fail?</strong><p>Make uncertainty, unacceptable errors, and human review explicit.</p></div><div class="visual-arrow" aria-hidden="true">→</div><div class="visual-step"><span>03 / OUTCOME</span><strong>How do we know?</strong><p>Choose the measurable result that earns the system a place in the work.</p></div></div></aside>`
    : metadata.visual === "adoption-gap"
      ? `<aside class="adoption-visual" aria-label="The path from AI demo to adoption"><div class="visual-kicker">What the pilot must cross</div><div class="adoption-track"><div class="adoption-stage"><span>01 / DEMO</span><strong>Can it answer?</strong><p>Prove the model can produce a useful result.</p></div><div class="adoption-arrow" aria-hidden="true">→</div><div class="adoption-stage"><span>02 / WORKFLOW</span><strong>Can people act?</strong><p>Fit review, evidence, exceptions, and ownership into the work.</p></div><div class="adoption-arrow" aria-hidden="true">→</div><div class="adoption-stage"><span>03 / ADOPTION</span><strong>Does behaviour change?</strong><p>Measure voluntary use and the final business outcome.</p></div></div></aside>`
      : metadata.visual === "semantic-stack"
        ? `<aside class="semantic-visual" aria-label="How enterprise data becomes a safe AI action"><div class="visual-kicker">The missing layer between data and action</div><div class="semantic-track"><div class="semantic-stage"><span>01 / DATA</span><strong>Raw signals</strong><p>Tables, documents, events, and APIs.</p></div><div class="semantic-arrow" aria-hidden="true">→</div><div class="semantic-stage"><span>02 / MEANING</span><strong>Shared definitions</strong><p>Metrics, entities, owners, and rules.</p></div><div class="semantic-arrow" aria-hidden="true">→</div><div class="semantic-stage"><span>03 / CONTEXT</span><strong>Decision boundaries</strong><p>Authority, time, permissions, and risk.</p></div><div class="semantic-arrow" aria-hidden="true">→</div><div class="semantic-stage"><span>04 / ACTION</span><strong>Safe execution</strong><p>A clear answer, tool call, or escalation.</p></div></div></aside>`
        : metadata.visual === "authority-envelope"
          ? `<aside class="authority-visual" aria-label="The authority envelope for a production AI agent"><div class="visual-kicker">A safe path from mission to action</div><div class="authority-track"><div class="authority-stage"><span>01 / MISSION</span><strong>One clear job</strong><p>Define the outcome the agent is responsible for.</p></div><div class="authority-arrow" aria-hidden="true">→</div><div class="authority-stage"><span>02 / IDENTITY</span><strong>Known principal</strong><p>Record who the agent is and whom it represents.</p></div><div class="authority-arrow" aria-hidden="true">→</div><div class="authority-stage"><span>03 / LIMITS</span><strong>Bounded authority</strong><p>Scope tools, data, amounts, time, and risk.</p></div><div class="authority-arrow" aria-hidden="true">→</div><div class="authority-stage"><span>04 / ACTION</span><strong>Act or escalate</strong><p>Execute inside the envelope; ask outside it.</p></div></div></aside>`
          : metadata.visual === "evaluation-safety-case"
            ? `<aside class="evaluation-visual" aria-label="The safety case for an AI agent evaluation"><div class="visual-kicker">An evaluation is a live operating environment</div><div class="evaluation-track"><div class="evaluation-stage"><span>01 / TASK</span><strong>Solvable target</strong><p>Prove the challenge can finish inside its declared scope.</p></div><div class="evaluation-arrow" aria-hidden="true">→</div><div class="evaluation-stage"><span>02 / BOUNDARY</span><strong>Verified isolation</strong><p>Deny unexpected egress and test the boundary before every run.</p></div><div class="evaluation-arrow" aria-hidden="true">→</div><div class="evaluation-stage"><span>03 / TRIPWIRE</span><strong>Stop in real time</strong><p>Watch tools, network traffic, and scope—not only final answers.</p></div><div class="evaluation-arrow" aria-hidden="true">→</div><div class="evaluation-stage"><span>04 / INCIDENT</span><strong>Contain and learn</strong><p>Preserve evidence, assign an owner, and harden the harness.</p></div></div></aside>`
            : metadata.visual === "handoff-transaction"
              ? `<aside class="handoff-visual" aria-label="A reliable transaction for an AI agent handoff"><div class="visual-kicker">Responsibility must move with the task</div><div class="handoff-track"><div class="handoff-stage"><span>01 / REQUEST</span><strong>Bounded work packet</strong><p>Send intent, context, authority, and completion criteria.</p></div><div class="handoff-arrow" aria-hidden="true">→</div><div class="handoff-stage"><span>02 / ACCEPT</span><strong>Named owner</strong><p>Acknowledge scope with a stable task ID and deadline.</p></div><div class="handoff-arrow" aria-hidden="true">→</div><div class="handoff-stage"><span>03 / EXECUTE</span><strong>Observable state</strong><p>Record progress, approvals, retries, and external effects.</p></div><div class="handoff-arrow" aria-hidden="true">→</div><div class="handoff-stage"><span>04 / PROVE</span><strong>Commit or recover</strong><p>Return durable evidence or route a terminal failure.</p></div></div></aside>`
              : metadata.visual === "monitoring-data-contract"
                ? `<aside class="monitoring-visual" aria-label="The governed data path for AI safety monitoring"><div class="visual-kicker">Treat monitoring as a governed data product</div><div class="monitoring-track"><div class="monitoring-stage"><span>01 / CAPTURE</span><strong>Minimum signal</strong><p>Collect only the events and fields the detector needs.</p></div><div class="monitoring-arrow" aria-hidden="true">→</div><div class="monitoring-stage"><span>02 / CUSTODY</span><strong>Controlled storage</strong><p>Keep keys, policy, residency, and access explicit.</p></div><div class="monitoring-arrow" aria-hidden="true">→</div><div class="monitoring-stage"><span>03 / DETECT</span><strong>Known window</strong><p>Version the logic and the activity it may inspect.</p></div><div class="monitoring-arrow" aria-hidden="true">→</div><div class="monitoring-stage"><span>04 / DECIDE</span><strong>Named reviewer</strong><p>Route every flag to an accountable response owner.</p></div><div class="monitoring-arrow" aria-hidden="true">→</div><div class="monitoring-stage"><span>05 / DELETE</span><strong>Proven expiry</strong><p>Verify raw, derived, backup, and exception handling.</p></div></div></aside>`
                : metadata.visual === "registry-lifecycle"
                  ? `<aside class="registry-visual" aria-label="The governed lifecycle of an AI agent registry record"><div class="visual-kicker">Approval is a renewable operating claim</div><div class="registry-track"><div class="registry-stage"><span>01 / REGISTER</span><strong>Describe exactly</strong><p>Name the owner, capability, endpoint, and immutable version.</p></div><div class="registry-arrow" aria-hidden="true">→</div><div class="registry-stage"><span>02 / EVIDENCE</span><strong>Test the claim</strong><p>Attach current evaluation, security, and operating results.</p></div><div class="registry-arrow" aria-hidden="true">→</div><div class="registry-stage"><span>03 / ADMIT</span><strong>Bound discovery</strong><p>Approve one version for named consumers and conditions.</p></div><div class="registry-arrow" aria-hidden="true">→</div><div class="registry-stage"><span>04 / REVIEW</span><strong>Let trust expire</strong><p>Recheck on a date or whenever material dependencies change.</p></div><div class="registry-arrow" aria-hidden="true">→</div><div class="registry-stage"><span>05 / RETIRE</span><strong>Close cleanly</strong><p>Remove discovery and access while preserving the audit trail.</p></div></div></aside>`
                  : metadata.visual === "action-audit-trail"
                    ? `<aside class="audit-visual" aria-label="A verifiable audit trail for an AI agent action"><div class="visual-kicker">Accountability follows the external action</div><div class="audit-track"><div class="audit-stage"><span>01 / REQUEST</span><strong>Known principal</strong><p>Bind the task to the person or service that asked.</p></div><div class="audit-arrow" aria-hidden="true">→</div><div class="audit-stage"><span>02 / PROPOSE</span><strong>Exact operation</strong><p>Record the tool, target, parameters, and intended effect.</p></div><div class="audit-arrow" aria-hidden="true">→</div><div class="audit-stage"><span>03 / DECIDE</span><strong>Policy proof</strong><p>Preserve the rule, attributes, approval, and result.</p></div><div class="audit-arrow" aria-hidden="true">→</div><div class="audit-stage"><span>04 / EXECUTE</span><strong>Durable receipt</strong><p>Capture what the target system actually accepted.</p></div><div class="audit-arrow" aria-hidden="true">→</div><div class="audit-stage"><span>05 / VERIFY</span><strong>Observed outcome</strong><p>Confirm the state change, exception, or recovery.</p></div></div></aside>`
                    : metadata.visual === "research-review-loop"
                      ? `<aside class="review-visual" aria-label="The evidence loop from AI-generated work to an accountable decision"><div class="visual-kicker">Turn agent throughput into trusted decisions</div><div class="review-track"><div class="review-stage"><span>01 / FRAME</span><strong>Name the decision</strong><p>Set the owner, baseline, and acceptance rule first.</p></div><div class="review-arrow" aria-hidden="true">→</div><div class="review-stage"><span>02 / GENERATE</span><strong>Version the work</strong><p>Preserve inputs, code, parameters, and task identity.</p></div><div class="review-arrow" aria-hidden="true">→</div><div class="review-stage"><span>03 / CHALLENGE</span><strong>Try to reject it</strong><p>Run negative tests, comparisons, and reproduction.</p></div><div class="review-arrow" aria-hidden="true">→</div><div class="review-stage"><span>04 / REVIEW</span><strong>Judge the evidence</strong><p>Record confidence, objections, and accountable approval.</p></div><div class="review-arrow" aria-hidden="true">→</div><div class="review-stage"><span>05 / DECIDE</span><strong>Close the loop</strong><p>Accept, reject, pause, or define one next test.</p></div></div></aside>`
                      : metadata.visual === "control-portability"
                        ? `<aside class="portability-visual" aria-label="A portable control contract across AI agent runtimes"><div class="visual-kicker">One policy must survive every runtime</div><div class="portability-track"><div class="portability-stage"><span>01 / DESCRIBE</span><strong>Common facts</strong><p>Normalize identity, task, tool, target, parameters, and data class.</p></div><div class="portability-arrow" aria-hidden="true">→</div><div class="portability-stage"><span>02 / INTERCEPT</span><strong>Before effect</strong><p>Expose a reliable hook before the external action can occur.</p></div><div class="portability-arrow" aria-hidden="true">→</div><div class="portability-stage"><span>03 / DECIDE</span><strong>Central policy</strong><p>Return a versioned allow, deny, modify, or approval requirement.</p></div><div class="portability-arrow" aria-hidden="true">→</div><div class="portability-stage"><span>04 / ENFORCE</span><strong>Exact outcome</strong><p>Stop, transform, or hold the action without framework drift.</p></div><div class="portability-arrow" aria-hidden="true">→</div><div class="portability-stage"><span>05 / PROVE</span><strong>Joined evidence</strong><p>Link proposal, decision, receipt, and result under one task ID.</p></div></div></aside>`
                        : metadata.visual === "investigation-contract"
                          ? `<aside class="investigation-visual" aria-label="An investigation contract for an AI data agent"><div class="visual-kicker">Fast exploration still needs analytical discipline</div><div class="investigation-track"><div class="investigation-stage"><span>01 / FRAME</span><strong>Name the decision</strong><p>State the question, owner, baseline, and plausible alternatives.</p></div><div class="investigation-arrow" aria-hidden="true">→</div><div class="investigation-stage"><span>02 / BOUND</span><strong>Limit the search</strong><p>Approve sources, permissions, freshness, time, and query budget.</p></div><div class="investigation-arrow" aria-hidden="true">→</div><div class="investigation-stage"><span>03 / CHALLENGE</span><strong>Test the answer</strong><p>Run quality checks, seek contradictions, and preserve evidence.</p></div><div class="investigation-arrow" aria-hidden="true">→</div><div class="investigation-stage"><span>04 / CLOSE</span><strong>Stop with a claim</strong><p>Separate facts from inference and route a reproducible review.</p></div></div></aside>`
                          : "";
  const canonicalUrl = `${siteUrl}/blog/${encodeURIComponent(metadata.slug)}/`;
  const imageUrl = metadata.image ? `${siteUrl}/${String(metadata.image).replace(/^\/+/, "")}` : `${siteUrl}/og.png`;
  const published = `${metadata.date}T08:00:00+02:00`;
  const modified = `${metadata.updated || metadata.date}T08:00:00+02:00`;
  const relatedPosts = posts.filter(({ metadata:other }) => other.slug !== metadata.slug).sort((left,right) => { const leftScore=(left.metadata.tags || []).filter((tag) => (metadata.tags || []).includes(tag)).length; const rightScore=(right.metadata.tags || []).filter((tag) => (metadata.tags || []).includes(tag)).length; return rightScore-leftScore || String(right.metadata.date).localeCompare(String(left.metadata.date)); }).slice(0,2);
  const relatedSection = relatedPosts.length ? `<section class="related-notes" aria-labelledby="related-notes-${escapeHtml(metadata.slug)}"><h2 id="related-notes-${escapeHtml(metadata.slug)}">Continue reading</h2>${relatedPosts.map(({ metadata:related }) => `<a class="related-note" href="/blog/${encodeURIComponent(related.slug)}/"><div><h3>${escapeHtml(related.title)}</h3><p>${escapeHtml(related.description || "")}</p></div>${related.image ? `<img src="${escapeHtml(articleAssetUrl(related.image))}" alt="${escapeHtml(related.image_alt || related.title)}" width="${escapeHtml(related.image_width || 1024)}" height="${escapeHtml(related.image_height || 682)}" loading="lazy" decoding="async">` : ""}</a>`).join("")}</section>` : "";
  const body = `<header class="site-header"><a class="wordmark" href="/" aria-label="Vladimir Petrishchev home">VP<span>·</span></a><nav class="header-links" aria-label="Blog navigation"><a href="/blog/">All notes</a><a href="/rss.xml">RSS</a></nav></header><main class="article-shell"><nav class="breadcrumb" aria-label="Breadcrumb"><a href="/">Home</a><span aria-hidden="true">/</span><a href="/blog/">Notes</a><span aria-hidden="true">/</span><span aria-current="page">Article</span></nav><article><header class="article-header"><div class="eyebrow">${(metadata.tags || []).map(escapeHtml).join(" · ")}</div><div><h1>${escapeHtml(metadata.title)}</h1><div class="post-meta"><span>By <a href="/" rel="author">${authorName}</a></span><span aria-hidden="true">·</span><time datetime="${escapeHtml(metadata.date)}">${escapeHtml(metadata.date)}</time><span aria-hidden="true">·</span><span>${Math.max(1,Math.ceil(countWords(metadata.title + " " + metadata.description + " " + posts.find((post) => post.metadata.slug === metadata.slug).body) / 220))} min read</span></div><p>${escapeHtml(metadata.description || "")}</p>${heroImage}</div></header><div class="article-body">${visual}${html}${relatedSection}</div></article></main>${footer}`;
  const articleSchema = { "@context":"https://schema.org", "@graph":[{ "@type":"BlogPosting", "@id":`${canonicalUrl}#article`, url:canonicalUrl, mainEntityOfPage:{ "@type":"WebPage", "@id":canonicalUrl }, headline:metadata.title, description:metadata.description || metadata.title, image:[imageUrl], thumbnailUrl:imageUrl, datePublished:published, dateModified:modified, author:{ "@id":`${authorUrl}#person` }, isPartOf:{ "@type":"Blog", "@id":`${siteUrl}/blog/#blog` }, inLanguage:"en", articleSection:(metadata.tags || [])[0] || "Artificial intelligence", keywords:(metadata.tags || []).join(", "), wordCount:posts.find((post) => post.metadata.slug === metadata.slug).wordCount, timeRequired:`PT${Math.max(1,Math.ceil(posts.find((post) => post.metadata.slug === metadata.slug).wordCount / 220))}M` },personSchema,{ "@type":"BreadcrumbList", "@id":`${canonicalUrl}#breadcrumb`, itemListElement:[{ "@type":"ListItem", position:1, name:"Home", item:authorUrl },{ "@type":"ListItem", position:2, name:"Notes", item:`${siteUrl}/blog/` },{ "@type":"ListItem", position:3, name:metadata.title, item:canonicalUrl }] }] };
  await writeFile(resolve(postDirectory, "index.html"), documentShell(metadata.title, metadata.description || metadata.title, body, { canonicalUrl, imageUrl, imageAlt:metadata.image_alt || metadata.title, imageWidth:metadata.image_width, imageHeight:metadata.image_height, preloadImage:articleAssetUrl(metadata.image), type:"article", published, modified, tags:metadata.tags || [], structuredData:articleSchema }));
}

const rssItems = posts.map(({ metadata }) => { const url = `${siteUrl}/blog/${encodeURIComponent(metadata.slug)}/`; return `<item><title>${escapeHtml(metadata.title)}</title><link>${url}</link><guid isPermaLink="true">${url}</guid><pubDate>${new Date(`${metadata.date}T08:00:00+02:00`).toUTCString()}</pubDate><author>vladimir.petrishchev@gmail.com (${authorName})</author><category>${(metadata.tags || []).map(escapeHtml).join("</category><category>")}</category><description>${escapeHtml(metadata.description || "")}</description></item>`; }).join("");
await writeFile(resolve(outputDirectory, "rss.xml"), `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel><title>Vladimir Petrishchev — Notes</title><link>${siteUrl}/blog/</link><atom:link href="${siteUrl}/rss.xml" rel="self" type="application/rss+xml"/><description>${blogDescription}</description><language>en</language><lastBuildDate>${new Date(`${latestPostDate}T08:00:00Z`).toUTCString()}</lastBuildDate>${rssItems}</channel></rss>`);
const sitemapEntries = [
  { loc:`${siteUrl}/`, lastmod:latestPostDate },
  { loc:`${siteUrl}/blog/`, lastmod:latestPostDate },
  ...posts.map(({ metadata }) => ({ loc:`${siteUrl}/blog/${encodeURIComponent(metadata.slug)}/`, lastmod:metadata.updated || metadata.date, image:metadata.image ? `${siteUrl}/${String(metadata.image).replace(/^\/+/, "")}` : null, imageTitle:metadata.title }))
];
await writeFile(resolve(outputDirectory, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">${sitemapEntries.map((entry) => `<url><loc>${entry.loc}</loc><lastmod>${entry.lastmod}</lastmod>${entry.image ? `<image:image><image:loc>${entry.image}</image:loc><image:title>${escapeHtml(entry.imageTitle)}</image:title></image:image>` : ""}</url>`).join("")}</urlset>`);
await writeFile(resolve(outputDirectory, "robots.txt"), `User-agent: *\nAllow: /\n\nSitemap: ${siteUrl}/sitemap.xml\n`);
const llmsEntries = posts.map(({ metadata }) => `- [${metadata.title}](${siteUrl}/blog/${encodeURIComponent(metadata.slug)}/): ${metadata.description || "A note on AI, data, and leadership."}`).join("\n");
await writeFile(resolve(outputDirectory, "llms.txt"), `# Vladimir Petrishchev\n> AI and data science leadership focused on dependable products, data platforms, and teams.\n\n## Primary pages\n- [Home](${siteUrl}/): Profile, experience, and focus areas.\n- [Notes](${siteUrl}/blog/): Practical writing on AI systems, data products, and teams.\n- [LinkedIn](${authorLinkedIn}): Professional profile and background.\n- [GitHub](https://github.com/coffeeshop13): Public research and software projects.\n\n## Author\n- Name: ${authorName}\n- Focus: AI systems, data products, MLOps, analytics leadership, and responsible delivery.\n\n## Notes\n${llmsEntries}\n`);

console.log(`Prepared ${outputDirectory} with ${posts.length} published blog post(s).`);

// Generates README.md from docs/tutorial.template.md. Run: pnpm docs:readme
//
// Template features:
//   @@include(path)@@      inline a source file as a fenced code block, so code cannot drift
//   ## Step: Title         steps are numbered in order of appearance
//   @@step(Title)@@        resolves to "Step N" so prose can cross-reference steps by title
//   @@contents@@           the numbered table of contents, with GitHub-style anchors
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const LANG = {
  ts: "ts", tsx: "tsx", mts: "ts", mjs: "js", css: "css", graphql: "graphql",
  json: "json", yaml: "yaml", yml: "yaml", example: "sh",
};
const COMMENT = { ts: "//", tsx: "//", mts: "//", mjs: "//", css: "/*", graphql: "#", yaml: "#", yml: "#", example: "#" };

const fail = (message) => {
  console.error(message);
  process.exit(1);
};

/** GitHub's heading anchor: lowercase, drop punctuation, spaces to hyphens. */
const slug = (heading) =>
  heading.toLowerCase().replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-");

let text = readFileSync("docs/tutorial.template.md", "utf8");

// 1. Number the steps.
const titles = [];
text = text.replace(/^## Step: (.+)$/gm, (_, title) => {
  titles.push(title);
  return `## Step ${titles.length}: ${title}`;
});
const numberOf = new Map(titles.map((title, index) => [title, index + 1]));

// 2. Cross-references by title.
text = text.replace(/@@step\((.+?)\)@@/g, (_, title) => {
  const number = numberOf.get(title);
  if (!number) fail(`Unknown step title in @@step()@@: ${title}`);
  return `Step ${number}`;
});

// 3. Table of contents.
const contents = titles
  .map((title, index) => `${index + 1}. [${title}](#${slug(`Step ${index + 1}: ${title}`)})`)
  .concat(text.includes("\n## What you learned") ? [`${titles.length + 1}. [What you learned](#what-you-learned)`] : [])
  .join("\n");
text = text.replace("@@contents@@", contents);

// 4. Source includes.
const missing = [];
text = text.replace(/^@@include\((.+?)\)@@$/gm, (marker, path) => {
  if (!existsSync(path)) {
    missing.push(path);
    return marker;
  }
  const ext = path.split(".").pop();
  const lang = LANG[ext] ?? "";
  const comment = COMMENT[ext];
  const header =
    comment === undefined ? "" : comment === "/*" ? `/* ${path} */\n` : `${comment} ${path}\n`;
  return "```" + lang + "\n" + header + readFileSync(path, "utf8").trimEnd() + "\n```";
});
if (missing.length > 0) fail(`Missing files referenced by the template: ${missing.join(", ")}`);

writeFileSync("README.md", text);
console.log(`README.md written: ${text.split("\n").length} lines, ${titles.length} steps`);

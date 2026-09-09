// Generates README.md from docs/tutorial.template.md, inlining the real source files so the
// tutorial's code blocks cannot drift from the code. Run: pnpm docs:readme
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const LANG = {
  ts: "ts", tsx: "tsx", mts: "ts", mjs: "js", css: "css", graphql: "graphql",
  json: "json", yaml: "yaml", yml: "yaml", example: "sh",
};
const COMMENT = { ts: "//", tsx: "//", mts: "//", mjs: "//", css: "/*", graphql: "#", yaml: "#", yml: "#", example: "#" };

const template = readFileSync("docs/tutorial.template.md", "utf8");
const missing = [];

const readme = template.replace(/^@@include\((.+?)\)@@$/gm, (marker, path) => {
  if (!existsSync(path)) {
    missing.push(path);
    return marker;
  }
  const ext = path.split(".").pop();
  const lang = LANG[ext] ?? "";
  const comment = COMMENT[ext];
  const header =
    comment === undefined ? "" : comment === "/*" ? `/* ${path} */\n` : `${comment} ${path}\n`;
  const body = readFileSync(path, "utf8").trimEnd();
  return "```" + lang + "\n" + header + body + "\n```";
});

if (missing.length > 0) {
  console.error("Missing files referenced by the template:", missing);
  process.exit(1);
}

writeFileSync("README.md", readme);
console.log(`README.md written: ${readme.split("\n").length} lines`);

#!/usr/bin/env node
/**
 * Copia GSAP, Three.js e as fontes de node_modules para pastas locais do projeto
 * (assim o site funciona offline e dentro do app de celular / Steam).
 *
 *   npm install
 *   npm run vendor
 *
 * Gera:
 *   vendor/gsap.min.js
 *   vendor/three.min.js
 *   fonts/*.woff2
 *   css/fonts.css   (@font-face apontando para ../fonts/)
 */
import { copyFileSync, existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const nm = (...p) => join(root, "node_modules", ...p);
const warnings = [];

mkdirSync(join(root, "vendor"), { recursive: true });
mkdirSync(join(root, "fonts"), { recursive: true });

/* ---------- GSAP ---------- */
const gsapSrc = nm("gsap", "dist", "gsap.min.js");
if (existsSync(gsapSrc)) {
  copyFileSync(gsapSrc, join(root, "vendor", "gsap.min.js"));
  console.log("✔ vendor/gsap.min.js");
} else {
  warnings.push("gsap não encontrado em node_modules (rode `npm install`).");
}

/* ---------- Three.js (build UMD: funciona sem módulos, inclusive por file://) ---------- */
const threeSrc = nm("three", "build", "three.min.js");
if (existsSync(threeSrc)) {
  copyFileSync(threeSrc, join(root, "vendor", "three.min.js"));
  console.log("✔ vendor/three.min.js");
} else {
  warnings.push("three não encontrado em node_modules (rode `npm install`).");
}

/* ---------- Fontes ---------- */
// pacote Fontsource -> família CSS -> pesos (e estilos) usados no projeto
const FONTS = [
  { pkg: "playfair-display", family: "Playfair Display", weights: [700, 900] },
  { pkg: "libre-baskerville", family: "Libre Baskerville", weights: [400, 700], italic: [400] },
  { pkg: "old-standard-tt", family: "Old Standard TT", weights: [400, 700], italic: [400] },
  { pkg: "unifrakturcook", family: "UnifrakturCook", weights: [700] }
];

let css = "/* Gerado por scripts/vendor.mjs — não edite à mão. */\n";
for (const f of FONTS) {
  const dir = nm("@fontsource", f.pkg, "files");
  if (!existsSync(dir)) { warnings.push(`@fontsource/${f.pkg} não encontrado (rode \`npm install\`).`); continue; }
  const files = readdirSync(dir);
  const variants = f.weights.map((w) => [w, "normal"]).concat((f.italic || []).map((w) => [w, "italic"]));
  for (const [w, style] of variants) {
    const name = files.find((x) => x === `${f.pkg}-latin-${w}-${style}.woff2`);
    if (!name) { warnings.push(`${f.family} ${w} ${style}: arquivo latin woff2 não encontrado em ${dir}`); continue; }
    copyFileSync(join(dir, name), join(root, "fonts", name));
    css += `@font-face {\n  font-family: "${f.family}";\n  font-style: ${style};\n  font-weight: ${w};\n  font-display: swap;\n  src: url("../fonts/${name}") format("woff2");\n}\n`;
    console.log(`✔ fonts/${name}`);
  }
}
writeFileSync(join(root, "css", "fonts.css"), css);
console.log("✔ css/fonts.css");

if (warnings.length) {
  console.log("\nAvisos:");
  warnings.forEach((w) => console.log("  - " + w));
}

console.log(`
Próximos passos (se ainda não fez):
  1. No index.html, troque os 3 <link> do Google Fonts por:
       <link rel="stylesheet" href="css/fonts.css">
  2. Antes de js/cutscene.js, carregue o GSAP:
       <script src="vendor/gsap.min.js"></script>
  3. Migre as animações (veja CLAUDE.md, seção "Pendências para o notebook").
`);
process.exit(warnings.length ? 1 : 0);

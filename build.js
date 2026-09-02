#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { minify: minifyHtml } = require("html-minifier-terser");
const { minify: minifyJs } = require("terser");
const CleanCSS = require("clean-css");

const ROOT = __dirname;
const DIST = path.join(ROOT, "dist");
const CANONICAL_ORIGIN = "https://ptadigital.com.br";
const SITE_NAME = "Personal Trainer Academy";
const BUILD_ID = String(Date.now());

const HTACCESS = `<IfModule mod_headers.c>
  Header set Cache-Control "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0, s-maxage=0"
  Header set CDN-Cache-Control "no-store"
  Header set Cloudflare-CDN-Cache-Control "no-store"
  Header set Surrogate-Control "no-store"
  Header set Pragma "no-cache"
  Header set Expires "0"
</IfModule>
<IfModule mod_expires.c>
  ExpiresActive On
  ExpiresDefault "access plus 0 seconds"
</IfModule>
`;

const HERO = {
  a: {
    title: "Domine o bodybuilding e a estética corporal em um único domingo.",
    description:
      "Aprenda os protocolos avançados de quem treina atleta de alto nível no Brasil e aplique já na segunda-feira. Ao vivo, com certificado de conclusão. Domingo, 27 de setembro, 8h30 às 18h. Ingresso R$ 19,90.",
  },
  b: {
    title: "Saia do treino comum e prescreva como os maiores treinadores do Brasil.",
    description:
      "Volume, prioridade de grupamento, bulking e cutting. Um domingo direto ao ponto, para você aplicar já na segunda-feira. Domingo, 27 de setembro, 8h30 às 18h. Ingresso R$ 19,90.",
  },
  c: {
    title: "Aprenda com os maiores treinadores de atletas de alto nível no Brasil.",
    description:
      "Um domingo inteiro de protocolos avançados de hipertrofia e estética corporal, ao vivo, com certificado de conclusão. Domingo, 27 de setembro, 8h30 às 18h. Ingresso R$ 19,90.",
  },
  d: {
    title: "Aprenda a preparar um atleta do OFF-SEASON ao PRO CARD.",
    description:
      "Ponto fraco, fases encaixadas no calendário e reta final. Um domingo inteiro sobre preparação de atleta. Domingo, 27 de setembro, 8h30 às 18h. Ingresso R$ 19,90.",
  },
};

const PAGES = [
  { src: "index.html", destDir: "", slug: "", css: null, js: null, hero: null, isHub: true },
  { src: "curta-a/index.html", destDir: "curta-a", slug: "curta-a/", css: "curta", js: "curta", hero: "a" },
  { src: "curta-b/index.html", destDir: "curta-b", slug: "curta-b/", css: "curta", js: "curta", hero: "b" },
  { src: "curta-c/index.html", destDir: "curta-c", slug: "curta-c/", css: "curta", js: "curta", hero: "c" },
  { src: "curta-d/index.html", destDir: "curta-d", slug: "curta-d/", css: "curta", js: "curta", hero: "d" },
  { src: "longa-a/index.html", destDir: "longa-a", slug: "longa-a/", css: "longa", js: "longa", hero: "a" },
  { src: "longa-b/index.html", destDir: "longa-b", slug: "longa-b/", css: "longa", js: "longa", hero: "b" },
  { src: "longa-c/index.html", destDir: "longa-c", slug: "longa-c/", css: "longa", js: "longa", hero: "c" },
  { src: "longa-d/index.html", destDir: "longa-d", slug: "longa-d/", css: "longa", js: "longa", hero: "d" },
  { src: "bb6-obg/index.html", destDir: "bb6-obg", slug: "bb6-obg/", css: "obg", js: "obg", hero: null, isObg: true },
];

const PAGE_ASSETS = [
  "bg-hero.webp",
  "hero-desktop.webp",
  "hero-mobile.webp",
  "logo-certificacao.svg",
  "logoPTA.svg",
  "professores/walter.webp",
  "professores/ray.webp",
  "professores/bruna.webp",
  "professores/thiago.webp",
];

function rmrf(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
}

function mkdirp(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function copyFile(src, dest) {
  mkdirp(path.dirname(dest));
  fs.copyFileSync(src, dest);
}

function extractTag(html, tag) {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
  const m = html.match(re);
  return m ? m[1] : "";
}

function bust(url) {
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}v=${BUILD_ID}`;
}

function writeNoCache(dir) {
  const headersSrc = path.join(ROOT, "_headers");
  if (fs.existsSync(headersSrc)) {
    copyFile(headersSrc, path.join(dir, "_headers"));
  }
  fs.writeFileSync(path.join(dir, ".htaccess"), HTACCESS);
}

const OBG_ASSETS = [
  "hero-desktop.webp",
  "logo-certificacao.svg",
  "logoPTA.svg",
];

function copyPageAssets(outDir, ogPath, assets = PAGE_ASSETS) {
  for (const rel of assets) {
    copyFile(path.join(ROOT, "assets", rel), path.join(outDir, "assets", rel));
  }
  copyFile(path.join(ROOT, "assets", "logo-certificacao.svg"), path.join(outDir, "assets", "favicon.svg"));
  if (ogPath && fs.existsSync(ogPath)) {
    copyFile(ogPath, path.join(outDir, "assets", "og.jpg"));
  }
}

function seoBlock({ canonical, title, description, ogImage, noindex }) {
  return [
    `<title>${escapeHtml(title)}</title>`,
    `<meta name="description" content="${escapeAttr(description)}">`,
    `<meta name="robots" content="${noindex ? "noindex, follow" : "index,follow"}">`,
    `<meta name="theme-color" content="#1d1d1b">`,
    `<meta http-equiv="Cache-Control" content="no-store, no-cache, must-revalidate, max-age=0">`,
    `<meta http-equiv="Pragma" content="no-cache">`,
    `<meta http-equiv="Expires" content="0">`,
    `<link rel="canonical" href="${canonical}">`,
    `<link rel="icon" type="image/svg+xml" href="${bust("assets/favicon.svg")}">`,
    `<meta property="og:type" content="website">`,
    `<meta property="og:locale" content="pt_BR">`,
    `<meta property="og:site_name" content="${SITE_NAME}">`,
    `<meta property="og:title" content="${escapeAttr(title)}">`,
    `<meta property="og:description" content="${escapeAttr(description)}">`,
    `<meta property="og:url" content="${canonical}">`,
    `<meta property="og:image" content="${ogImage}">`,
    `<meta property="og:image:width" content="1200">`,
    `<meta property="og:image:height" content="630">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="twitter:title" content="${escapeAttr(title)}">`,
    `<meta name="twitter:description" content="${escapeAttr(description)}">`,
    `<meta name="twitter:image" content="${ogImage}">`,
  ].join("\n    ");
}

function escapeHtml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function escapeAttr(s) {
  return escapeHtml(s).replace(/"/g, "&quot;");
}

function pageTitle(page) {
  if (page.isHub) {
    return "Certificação em Bodybuilding e Estética Corporal | PTA";
  }
  if (page.isObg) {
    return "Inscrição confirmada — Certificação em Bodybuilding | PTA";
  }
  return `${HERO[page.hero].title} | Certificação PTA`;
}

function pageDescription(page) {
  if (page.isHub) {
    return "8 páginas da Certificação em Bodybuilding e Estética Corporal. 27 de setembro, 8h30 às 18h, ao vivo, certificado e Cupom Ouro PTA. Ingresso R$ 19,90.";
  }
  if (page.isObg) {
    return "Sua inscrição na Certificação em Bodybuilding foi confirmada. Complete os 2 passos finais: entre no grupo oficial e preencha o formulário dos sorteios.";
  }
  return HERO[page.hero].description;
}

function generateOg(dest) {
  mkdirp(path.dirname(dest));
  try {
    execFileSync("python3", ["-c", `
from PIL import Image, ImageDraw, ImageFont, ImageEnhance
im = Image.open("${path.join(ROOT, "assets", "bg-hero.webp")}").convert("RGB")
w, h = im.size
target_w, target_h = 1200, 630
scale = max(target_w / w, target_h / h)
nw, nh = int(w * scale), int(h * scale)
im = im.resize((nw, nh), Image.Resampling.LANCZOS)
left = (nw - target_w) // 2
top = (nh - target_h) // 2
im = im.crop((left, top, left + target_w, top + target_h))
im = ImageEnhance.Brightness(im).enhance(0.35)
draw = ImageDraw.Draw(im)
try:
    font_lg = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 48)
    font_sm = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 22)
except Exception:
    font_lg = font_sm = ImageFont.load_default()
draw.rectangle((0, 0, 8, 630), fill="#c82328")
draw.text((64, 210), "CERTIFICACAO EM BODYBUILDING", font=font_lg, fill="#ffffff")
draw.text((64, 280), "27 de setembro · 8h de conteudo + certificado", font=font_sm, fill="#e9e7e3")
draw.text((64, 330), "R$ 19,90 · Personal Trainer Academy", font=font_sm, fill="#c82328")
im.save("${dest}", "JPEG", quality=82, optimize=True)
print("og.jpg", __import__("pathlib").Path("${dest}").stat().st_size)
`], { stdio: "inherit" });
  } catch (err) {
    const fallback = path.join(ROOT, "assets", "og.jpg");
    if (fs.existsSync(fallback)) {
      copyFile(fallback, dest);
      console.warn("OG image: PIL indisponível, usando assets/og.jpg.");
    } else {
      console.warn("OG image: PIL indisponível e sem fallback.");
    }
  }
}

async function main() {
  rmrf(DIST);
  mkdirp(DIST);

  const staging = path.join(DIST, ".staging");
  mkdirp(path.join(staging, "css"));
  mkdirp(path.join(staging, "js"));
  mkdirp(path.join(staging, "assets"));

  generateOg(path.join(staging, "assets", "og.jpg"));

  console.log("→ Tailwind (purged + minify)");
  execFileSync(
    path.join(ROOT, "node_modules", ".bin", "tailwindcss"),
    [
      "-i",
      path.join(ROOT, "tailwind.input.css"),
      "-o",
      path.join(staging, "css", "tailwind.css"),
      "--minify",
    ],
    { cwd: ROOT, stdio: "inherit" }
  );

  const cssMin = new CleanCSS({ level: 2 });
  const extractedCss = {};
  const extractedJs = {};

  const kindSample = { curta: "curta-a/index.html", longa: "longa-a/index.html", obg: "bb6-obg/index.html" };
  for (const kind of ["curta", "longa", "obg"]) {
    const sample = kindSample[kind];
    const html = fs.readFileSync(path.join(ROOT, sample), "utf8");
    let css = extractTag(html, "style");
    css = css.replace(/url\(['"]?\.\.\/assets\//g, "url('../assets/");
    css = css.replace(/url\('\.\.\/assets\/([^')]+)'\)/g, (_, file) => `url('${bust("../assets/" + file)}')`);
    extractedCss[kind] = cssMin.minify(css).styles;
    fs.writeFileSync(path.join(staging, "css", `${kind}.css`), extractedCss[kind]);

    const scripts = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)]
      .map((m) => m[1].trim())
      .filter((code) => code && !code.includes("tailwind.config") && !code.includes("pulseq"));
    const jsSource = scripts.join("\n;\n");
    const minJs = await minifyJs(jsSource, {
      compress: { drop_console: false, passes: 2 },
      mangle: { reserved: ["abrirPopup", "fecharPopup"] },
      format: { comments: false },
    });
    if (minJs.error) throw minJs.error;
    extractedJs[kind] = minJs.code;
    fs.writeFileSync(path.join(staging, "js", `${kind}.js`), extractedJs[kind]);
  }

  const hubCss = cssMin.minify(`body{background:#1d1d1b;color:#fff;font-family:Inter,sans-serif}`).styles;
  fs.writeFileSync(path.join(staging, "css", "hub.css"), hubCss);

  const ogPath = path.join(staging, "assets", "og.jpg");

  console.log("→ HTML (pacote completo por pasta)");
  for (const page of PAGES) {
    const outDir = page.destDir ? path.join(DIST, page.destDir) : DIST;
    mkdirp(outDir);

    copyFile(path.join(staging, "css", "tailwind.css"), path.join(outDir, "css", "tailwind.css"));
    if (page.isHub) {
      copyFile(path.join(staging, "css", "hub.css"), path.join(outDir, "css", "hub.css"));
      copyFile(path.join(ROOT, "assets", "logo-certificacao.svg"), path.join(outDir, "assets", "favicon.svg"));
    } else {
      copyFile(path.join(staging, "css", `${page.css}.css`), path.join(outDir, "css", `${page.css}.css`));
      copyFile(path.join(staging, "js", `${page.js}.js`), path.join(outDir, "js", `${page.js}.js`));
      copyPageAssets(outDir, ogPath, page.isObg ? OBG_ASSETS : PAGE_ASSETS);
    }

    writeNoCache(outDir);

    let html = fs.readFileSync(path.join(ROOT, page.src), "utf8");
    const canonical = `${CANONICAL_ORIGIN}/${page.slug}`;
    const ogImage = page.isHub
      ? `${CANONICAL_ORIGIN}/assets/og.jpg`
      : `${canonical}assets/og.jpg`;

    html = html.replace(/<link rel="preconnect"[^>]*>\s*/g, "");
    html = html.replace(/<link rel="preload" as="image"[^>]*>\s*/g, "");
    html = html.replace(/<title>[\s\S]*?<\/title>\s*/i, "");
    html = html.replace(/<script src="https:\/\/cdn\.tailwindcss\.com"><\/script>\s*/g, "");
    html = html.replace(/<script>\s*tailwind\.config[\s\S]*?<\/script>\s*/g, "");
    html = html.replace(/<style>[\s\S]*?<\/style>\s*/g, "");
    html = html.replace(/<script(?![^>]*\bsrc=)[^>]*>[\s\S]*?<\/script>\s*/gi, (full) =>
      /pulseq/i.test(full) ? full : ""
    );

    html = html.replace(/\.\.\/assets\//g, "assets/");
    html = html.replace(/href="(curta|longa)-([a-d])\/index\.html"/g, 'href="$1-$2/"');
    html = html.replace(/href="bb6-obg\/index\.html"/g, 'href="bb6-obg/"');
    html = html.replace(
      /(<img class="hero-photo-mobile"[^>]*alt=")("[^>]*>)/g,
      "$1Certificação em Bodybuilding e Estética Corporal$2"
    );
    html = html.replace(/(src|href)="(assets\/[^"?]+)(\?[^"]*)?"/g, (_, attr, file) => `${attr}="${bust(file)}"`);

    const headInject = [
      seoBlock({
        canonical,
        title: pageTitle(page),
        description: pageDescription(page),
        ogImage,
        noindex: page.isObg,
      }),
      `<link rel="preconnect" href="https://fonts.googleapis.com">`,
      `<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>`,
      `<link rel="preconnect" href="https://cdnjs.cloudflare.com" crossorigin>`,
      `<link rel="preconnect" href="https://hub-pta.vercel.app" crossorigin>`,
      page.isHub
        ? `<link rel="stylesheet" href="${bust("css/tailwind.css")}">\n    <link rel="stylesheet" href="${bust("css/hub.css")}">`
        : [
            page.isObg
              ? `<link rel="preload" as="image" href="${bust("assets/hero-desktop.webp")}">`
              : `<link rel="preload" as="image" href="${bust("assets/hero-mobile.webp")}" media="(max-width: 767px)">`,
            page.isObg ? "" : `<link rel="preload" as="image" href="${bust("assets/hero-desktop.webp")}" media="(min-width: 768px)">`,
            `<link rel="preload" as="image" href="${bust("assets/logo-certificacao.svg")}">`,
            `<link rel="stylesheet" href="${bust("css/tailwind.css")}">`,
            `<link rel="stylesheet" href="${bust("css/" + page.css + ".css")}">`,
          ].filter(Boolean).join("\n    "),
    ].join("\n    ");

    html = html.replace(
      /<meta name="viewport"[^>]*>/,
      `<meta name="viewport" content="width=device-width, initial-scale=1.0">\n    ${headInject}`
    );

    if (page.js) {
      html = html.replace(
        "</body>",
        `    <script src="${bust("js/" + page.js + ".js")}"></script>\n</body>`
      );
    }

    const min = await minifyHtml(html, {
      collapseWhitespace: true,
      removeComments: true,
      removeRedundantAttributes: false,
      collapseBooleanAttributes: true,
      minifyCSS: false,
      minifyJS: false,
      sortAttributes: false,
      sortClassName: false,
    });

    fs.writeFileSync(path.join(outDir, "index.html"), min);
  }

  writeNoCache(DIST);
  if (fs.existsSync(ogPath)) {
    copyFile(ogPath, path.join(DIST, "assets", "og.jpg"));
  }

  rmrf(staging);
  console.log("pronto:", DIST, "v=" + BUILD_ID);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

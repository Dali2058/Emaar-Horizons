// api/index.js
// نفس السلوك بتاع server.js الأصلي، لكن الحفظ والرفع بيتوجهوا لـ GitHub
// بدل الكتابة على القرص، لأن Vercel serverless مالوش نظام ملفات دائم.

const express = require("express");
const multer = require("multer");
const path = require("path");
const { getFile, listDir, putFile, deleteFile } = require("../lib/github");

const app = express();

// Vercel Serverless Functions بترفض أي طلب أكبر من ~4.5MB، فحدّينا الرفع على 4MB
// عشان الفيديوهات الكبيرة محتاجة حل تاني (Vercel Blob) لو عايز ترفع فيديو أكبر من كده.
const MAX_UPLOAD_MB = 4;

app.use(express.json({ limit: "4mb" }));
app.use(express.urlencoded({ extended: true, limit: "4mb" }));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_MB * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = /^(image|video)\//.test(file.mimetype);
    cb(ok ? null : new Error("مسموح فقط بملفات صور أو فيديو"), ok);
  },
});

function safePage(name) {
  return /^[a-zA-Z0-9_-]+\.html$/.test(name) ? name : null;
}

function titleFromHtml(html, fallback) {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return (m ? m[1].replace(/\s+/g, " ").trim() : fallback).slice(0, 120);
}

function mimeFromExt(name) {
  const ext = path.extname(name).toLowerCase();
  return (
    {
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".gif": "image/gif",
      ".webp": "image/webp",
      ".svg": "image/svg+xml",
      ".mp4": "video/mp4",
      ".webm": "video/webm",
      ".mov": "video/quicktime",
      ".ogg": "video/ogg",
    }[ext] || "application/octet-stream"
  );
}


// Clean public URLs (no .html)
const CLEAN_ROUTES = {
  "/": "index.html",
  "/nabza": "nabza.html",
  "/electro": "electro.html",
  "/projects": "projects.html",
  "/decorations": "decorations.html",
  "/team": "team.html",
  "/team.work": "team.html",
  "/contact": "contact.html"
};

for (const [route, file] of Object.entries(CLEAN_ROUTES)) {
  if (route === "/") continue;
  app.get(route, (_req, res) =>
    res.sendFile(path.join(process.cwd(), file), (err) =>
      err ? res.status(404).send("Page not found") : undefined
    )
  );
}

// Redirect old .html addresses to the clean URLs.
const OLD_ROUTES = {
  "/index.html": "/",
  "/nabza.html": "/nabza",
  "/electro.html": "/electro",
  "/projects.html": "/projects",
  "/decorations.html": "/decorations",
  "/team.html": "/team",
  "/contact.html": "/contact",
};
for (const [oldRoute, cleanRoute] of Object.entries(OLD_ROUTES)) {
  app.get(oldRoute, (_req, res) => res.redirect(301, cleanRoute));
}

app.get("/:file", (req, res, next) => {
  const file = safePage(req.params.file);
  if (!file) return next();
  res.sendFile(path.join(process.cwd(), file), (err) => err && next());
});

app.get("/", (_req, res) => res.sendFile(path.join(process.cwd(), "index.html")));
app.use(express.static(process.cwd(), { index: false }));

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: err.message || "حدث خطأ في الخادم" });
});

module.exports = app;

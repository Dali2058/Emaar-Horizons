const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

const ROOT = __dirname;
const PAGES = ROOT;
const UPLOADS = path.join(ROOT, "uploads");
fs.mkdirSync(UPLOADS, { recursive: true });

app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ extended: true, limit: "15mb" }));
app.use("/uploads", express.static(UPLOADS));
app.use(express.static(ROOT, { index: false }));

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safe = path.basename(file.originalname, ext)
      .replace(/[^\p{L}\p{N}_-]+/gu, "-")
      .slice(0, 60) || "media";
    cb(null, `${Date.now()}-${safe}${ext}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = /^(image|video)\//.test(file.mimetype);
    cb(ok ? null : new Error("Only image/video files are allowed"), ok);
  }
});

function safePage(name) {
  return /^[a-zA-Z0-9_-]+\.html$/.test(name) ? name : null;
}
app.get("/", (_req, res) => res.sendFile(path.join(PAGES, "index.html")));

app.get("/team", (_req, res) => res.sendFile(path.join(PAGES || process.cwd(), "team.html")));
app.get("/team.work", (_req, res) => res.sendFile(path.join(PAGES || process.cwd(), "team.html")));

app.get("/:file", (req,res,next)=>{
  const file=safePage(req.params.file);
  if(!file) return next();
  const full=path.join(PAGES,file);
  if(!fs.existsSync(full)) return res.status(404).send("Page not found");
  res.sendFile(full);
});

app.get("/page/:file", (req,res)=>{
  const file=safePage(req.params.file);
  if(!file) return res.status(400).send("Bad page");
  const full=path.join(PAGES,file);
  if(!fs.existsSync(full)) return res.status(404).send("Page not found");
  res.sendFile(full);
});

app.use((err,_req,res,_next)=>{
  console.error(err);
  res.status(500).json({error:err.message || "حدث خطأ في الخادم"});
});

app.listen(PORT,()=>console.log(`Emaar Horizons website running on http://localhost:${PORT}`));

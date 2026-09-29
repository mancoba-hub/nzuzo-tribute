require("dotenv").config();
const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const archiver = require("archiver");
const store = require("./store");
const auth = require("./auth");
const r2 = require("./cloudflare");

const PORT = Number(process.env.PORT) || 3001;
const app = express();

if (!process.env.ADMIN_PASSWORD) {
  console.warn(
    "WARNING: ADMIN_PASSWORD is not set - using the default password '" +
      auth.DEFAULT_PASSWORD +
      "'. Copy .env.example to .env and set a strong password before going live!"
  );
}

// ---- photo uploads ----
const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, store.UPLOADS_DIR),
    filename: (_req, file, cb) => {
      const ext = (file.originalname.match(/\.[a-zA-Z0-9]+$/) || [""])[0].toLowerCase().slice(0, 6);
      cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`);
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    const ok = /^image\/(jpeg|png|webp|gif)$/i.test(file.mimetype);
    cb(ok ? null : new Error("ONLY_IMAGES"), ok);
  },
});

app.use(express.json({ limit: "128kb" }));

// Photos: served from Cloudflare R2 when configured, otherwise from local disk.
app.get("/uploads/:name", async (req, res, next) => {
  if (!r2.isConfigured()) return next();
  const name = req.params.name;
  if (!/^[\w.-]+$/.test(name)) return res.status(400).end();
  try {
    const buffer = await r2.getObjectBuffer(`photos/${name}`);
    const ext = path.extname(name).toLowerCase();
    const types = {
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
      ".webp": "image/webp",
      ".gif": "image/gif",
    };
    res.setHeader("Content-Type", types[ext] || "application/octet-stream");
    res.setHeader("Cache-Control", "public, max-age=604800, immutable");
    res.end(buffer);
  } catch {
    next(); // fall back to local static (or 404)
  }
});
app.use("/uploads", express.static(store.UPLOADS_DIR, { maxAge: "7d", immutable: true }));

const clean = (value, max) => (typeof value === "string" ? value.trim().slice(0, max) : "");

function publicTribute(t) {
  return {
    id: t.id,
    name: t.name,
    community: t.community,
    message: t.message,
    photo: t.photo,
    createdAt: t.createdAt,
  };
}

app.get("/api/health", (_req, res) => res.json({ ok: true }));

// ---- public: submit and list tributes ----
app.post("/api/tributes", (req, res) => {
  upload.single("photo")(req, res, async (err) => {
    if (err) {
      const code =
        err.message === "ONLY_IMAGES"
          ? "INVALID_IMAGE"
          : err.code === "LIMIT_FILE_SIZE"
            ? "IMAGE_TOO_LARGE"
            : "UPLOAD_ERROR";
      return res.status(400).json({ error: code });
    }
    const name = clean(req.body.name, 80);
    const message = clean(req.body.message, 5000);
    if (!name || !message) {
      return res.status(400).json({ error: "NAME_AND_MESSAGE_REQUIRED" });
    }

    // Move the photo to Cloudflare R2 (permanent storage) when configured.
    let photoError = false;
    if (req.file && r2.isConfigured()) {
      const localPath = path.join(store.UPLOADS_DIR, req.file.filename);
      try {
        const buffer = fs.readFileSync(localPath);
        await r2.putObject(`photos/${req.file.filename}`, buffer, req.file.mimetype);
        fs.unlinkSync(localPath);
      } catch (e) {
        photoError = true;
        console.error("R2 photo upload failed:", e.message);
      }
    }

    const tribute = store.addTribute({
      name,
      community: clean(req.body.community, 120) || null,
      contact: clean(req.body.contact, 120) || null,
      message,
      photo: req.file ? `/uploads/${req.file.filename}` : null,
    });
    if (photoError) {
      return res.status(201).json({ ok: true, tribute: publicTribute(tribute), warning: "PHOTO_UPLOAD_FAILED" });
    }
    res.status(201).json({ ok: true, tribute: publicTribute(tribute) });
  });
});

app.get("/api/tributes", (_req, res) => {
  const tributes = store
    .readAll()
    .filter((t) => !t.hidden)
    .map(publicTribute)
    .slice(0, 300);
  res.json({ tributes });
});

// ---- admin login ----
app.post("/api/admin/login", (req, res) => {
  const password = typeof req.body.password === "string" ? req.body.password : "";
  if (!password || password !== (process.env.ADMIN_PASSWORD || auth.DEFAULT_PASSWORD)) {
    return res.status(401).json({ error: "WRONG_PASSWORD" });
  }
  res.json({ token: auth.sign({ role: "admin", exp: Date.now() + 12 * 60 * 60 * 1000 }) });
});

// ---- admin: manage tributes ----
app.get("/api/admin/tributes", auth.requireAdmin, (_req, res) => {
  res.json({ tributes: store.readAll() });
});

app.patch("/api/admin/tributes/:id", auth.requireAdmin, (req, res) => {
  const patch = {};
  if (typeof req.body.hidden === "boolean") patch.hidden = req.body.hidden;
  if (Object.keys(patch).length === 0) return res.status(400).json({ error: "NOTHING_TO_UPDATE" });
  const tribute = store.updateTribute(req.params.id, patch);
  if (!tribute) return res.status(404).json({ error: "NOT_FOUND" });
  res.json({ ok: true, tribute });
});

app.delete("/api/admin/tributes/:id", auth.requireAdmin, (req, res) => {
  const tribute = store.removeTribute(req.params.id);
  if (!tribute) return res.status(404).json({ error: "NOT_FOUND" });
  if (tribute.photo) {
    const file = path.join(store.UPLOADS_DIR, path.basename(tribute.photo));
    try {
      if (fs.existsSync(file)) fs.unlinkSync(file);
    } catch {
      // best-effort cleanup
    }
    if (r2.isConfigured()) {
      r2.deleteObject(`photos/${path.basename(tribute.photo)}`);
    }
  }
  res.json({ ok: true });
});

// ---- admin: exports ----
function csvCell(value) {
  const s = String(value ?? "");
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

app.get("/api/admin/export.csv", auth.requireAdmin, (_req, res) => {
  const rows = [["Date", "Name", "Community", "Contact", "Message", "Photo"]];
  for (const t of store.readAll()) {
    rows.push([t.createdAt, t.name, t.community || "", t.contact || "", t.message || "", t.photo || ""]);
  }
  const csv = rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", 'attachment; filename="nzuzo-tributes.csv"');
  res.send("\uFEFF" + csv);
});

app.get("/api/admin/export.zip", auth.requireAdmin, async (_req, res) => {
  const archive = archiver("zip", { zlib: { level: 9 } });
  archive.on("error", () => res.destroy());
  res.setHeader("Content-Type", "application/zip");
  res.setHeader("Content-Disposition", 'attachment; filename="nzuzo-tribute-photos.zip"');
  archive.pipe(res);
  let count = 0;
  for (const t of store.readAll()) {
    if (!t.photo) continue;
    const basename = path.basename(t.photo);
    const safe =
      `${String(t.name).replace(/[^\w -]/g, "").trim().slice(0, 40) || "tribute"}-${t.id.slice(0, 6)}${path.extname(basename)}`;
    try {
      if (r2.isConfigured()) {
        const buffer = await r2.getObjectBuffer(`photos/${basename}`);
        archive.append(buffer, { name: safe });
      } else {
        const file = path.join(store.UPLOADS_DIR, basename);
        if (fs.existsSync(file)) archive.file(file, { name: safe });
      }
      count++;
    } catch {
      // skip missing photo
    }
  }
  if (count === 0) archive.append("No photos have been submitted yet.", { name: "README.txt" });
  archive.finalize();
});

// ---- serve the built frontend in production ----
const dist = path.join(__dirname, "..", "dist");
if (process.env.NODE_ENV === "production" && fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get(/^(?!\/(api|uploads)).*/, (_req, res) => res.sendFile(path.join(dist, "index.html")));
}

// Restore tributes from Cloudflare R2 (when configured) before accepting traffic.
store.init().then(() => {
  app.listen(PORT, () => {
    console.log(`Nzuzo Tribute server running on http://localhost:${PORT}`);
    console.log(r2.isConfigured() ? "Storage: Cloudflare R2 (permanent)" : "Storage: local disk (not permanent)");
  });
});

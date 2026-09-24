const express = require("express");
const multer = require("multer");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const app = express();
const PORT = Number(process.env.PORT || 10000);
const HOST = process.env.HOST || "0.0.0.0";
const ADMIN_USER = process.env.ADMIN_USER || "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "TRC1234";

// Set DATA_DIR=/var/data on Render when using a persistent disk.
const dataDir = process.env.DATA_DIR || path.join(__dirname, "data");
const videoDir = process.env.UPLOAD_DIR || path.join(__dirname, "uploads");
fs.mkdirSync(dataDir, { recursive: true });
fs.mkdirSync(videoDir, { recursive: true });

const dbFile = path.join(dataDir, "ads.json");
if (!fs.existsSync(dbFile)) fs.writeFileSync(dbFile, "[]");

const upload = multer({
  storage: multer.diskStorage({
    destination: videoDir,
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, Date.now() + "-" + crypto.randomBytes(6).toString("hex") + ext);
    }
  }),
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype || !file.mimetype.startsWith("video/")) {
      return cb(new Error("Only video files are allowed"));
    }
    cb(null, true);
  }
});

app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(videoDir));
app.use(express.static(path.join(__dirname, "admin")));

function readAds() {
  try { return JSON.parse(fs.readFileSync(dbFile, "utf8")); }
  catch { return []; }
}
function writeAds(ads) {
  const tmp = dbFile + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(ads, null, 2));
  fs.renameSync(tmp, dbFile);
}
function adminAuth(req, res, next) {
  const header = req.headers.authorization || "";
  if (!header.startsWith("Basic ")) return res.status(401).set("WWW-Authenticate", 'Basic realm="TRC Ads Server"').json({error:"Admin login required"});
  const decoded = Buffer.from(header.slice(6), "base64").toString();
  const i = decoded.indexOf(":");
  if (i < 0 || decoded.slice(0,i) !== ADMIN_USER || decoded.slice(i+1) !== ADMIN_PASSWORD)
    return res.status(403).json({error:"Invalid admin credentials"});
  next();
}

app.get("/api/health", (req,res)=>res.json({ok:true,service:"TRC Ads Server",time:new Date().toISOString()}));

app.post("/api/ads", upload.single("video"), (req,res)=>{
  const {business,title,description,packageName,price,duration,contact} = req.body;
  if (!business || !title || !req.file) return res.status(400).json({error:"business, title and video are required"});
  const ads = readAds();
  const ad = {
    id: crypto.randomUUID(), business, title, description: description || "",
    packageName: packageName || "Starter", price: price || "R50", duration: duration || "7 days",
    contact: contact || "", videoUrl: "/uploads/" + req.file.filename,
    status: "Pending", views: 0, createdAt: new Date().toISOString(), reviewedAt: null
  };
  ads.unshift(ad); writeAds(ads); res.status(201).json(ad);
});

app.get("/api/ads", (req,res)=>{
  const status = req.query.status;
  let ads = readAds();
  if (req.query.public === "1") ads = ads.filter(a=>a.status === "Approved");
  else if (status) ads = ads.filter(a=>a.status === status);
  res.json(ads);
});

app.get("/api/admin/stats", adminAuth, (req,res)=>{
  const ads = readAds();
  res.json({total:ads.length,pending:ads.filter(a=>a.status==="Pending").length,approved:ads.filter(a=>a.status==="Approved").length,rejected:ads.filter(a=>a.status==="Rejected").length,views:ads.reduce((n,a)=>n+(a.views||0),0)});
});

app.patch("/api/admin/ads/:id", adminAuth, (req,res)=>{
  const ads = readAds(); const ad = ads.find(a=>a.id===req.params.id);
  if (!ad) return res.status(404).json({error:"Ad not found"});
  const allowed = ["Pending","Approved","Rejected"];
  if (!allowed.includes(req.body.status)) return res.status(400).json({error:"Invalid status"});
  ad.status = req.body.status; ad.reviewedAt = new Date().toISOString();
  writeAds(ads); res.json(ad);
});

app.delete("/api/admin/ads/:id", adminAuth, (req,res)=>{
  const ads = readAds(); const i = ads.findIndex(a=>a.id===req.params.id);
  if (i<0) return res.status(404).json({error:"Ad not found"});
  const ad = ads[i];
  if (ad.videoUrl) {
    const filename = path.basename(ad.videoUrl);
    const file = path.join(videoDir, filename);
    if (fs.existsSync(file)) fs.unlinkSync(file);
  }
  ads.splice(i,1); writeAds(ads); res.json({ok:true});
});

app.post("/api/ads/:id/view", (req,res)=>{
  const ads = readAds(); const ad = ads.find(a=>a.id===req.params.id && a.status==="Approved");
  if(!ad) return res.status(404).json({error:"Ad not found"});
  ad.views=(ad.views||0)+1; writeAds(ads); res.json({views:ad.views});
});

// Express 5 compatible SPA/admin fallback.
app.get("/*splat", (req,res)=>res.sendFile(path.join(__dirname,"admin","index.html")));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(400).json({error: err.message || "Server error"});
});

app.listen(PORT, HOST, ()=>console.log(`TRC Ads Server running on ${HOST}:${PORT}`));

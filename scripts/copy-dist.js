const fs = require("fs");
const path = require("path");

const dist = path.join(__dirname, "..", "dist");
fs.mkdirSync(dist, { recursive: true });

["index.html", "early-repay.html", "about.html", "privacy.html", "app.js", "risk.js", "mortgage.js", "styles.css", "robots.txt", "sitemap.xml", "baidu_verify_codeva-9aofZiE323.html", "baidu_verify_codeva-ibiAlhviFeT.html", "baidu_verify_codeva-S2v9LVE1CY.html", "BingSiteAuth.xml"].forEach((file) => {
  fs.copyFileSync(path.join(__dirname, "..", file), path.join(dist, file));
});
fs.cpSync(path.join(__dirname, "..", "vendor"), path.join(dist, "vendor"), { recursive: true });
fs.cpSync(path.join(__dirname, "..", "blog"), path.join(dist, "blog"), { recursive: true });

// Servidor estatico minimo (sin dependencias) para servir esteban-serna.com
// desde Railway. Reemplaza al hosting Apache/StackCP + el despliegue por
// SFTP: ahora un push a main redespliega el sitio solo, sin contrasenas
// FTP ni bloqueos por IP.
//
// Porta las reglas que antes vivian en .htaccess: redireccion a www, tipos
// MIME, compresion, cache, y cabeceras del service worker. Solo se sirven
// los archivos de la lista blanca de abajo (igual que el paso "Armar
// carpeta" del workflow viejo) -- nunca CLAUDE.md, README, .github, el
// script de Apps Script de respaldo, etc.
const http = require("http");
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const ROOT = __dirname;
const PORT = process.env.PORT || 8080;
const CANONICAL_HOST = "www.esteban-serna.com";
const BARE_HOST = "esteban-serna.com";

// Archivos sueltos en la raiz y carpetas que SI se publican.
const ROOT_FILES = new Set(["index.html", "manifest.json", "sw.js", "robots.txt", "sitemap.xml"]);
const PUBLIC_DIRS = ["css/", "js/", "images/", "blog/"];

const MIME = {
  ".html": "text/html; charset=UTF-8",
  ".css": "text/css; charset=UTF-8",
  ".js": "application/javascript; charset=UTF-8",
  ".json": "application/json; charset=UTF-8",
  ".webmanifest": "application/manifest+json; charset=UTF-8",
  ".txt": "text/plain; charset=UTF-8",
  ".xml": "application/xml; charset=UTF-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".gif": "image/gif"
};
const COMPRESSIBLE = new Set([".html", ".css", ".js", ".json", ".txt", ".xml", ".svg"]);

const compressedCache = new Map(); // "ruta|mtime|encoding" -> Buffer

function isPublicPath(rel) {
  if (ROOT_FILES.has(rel)) return true;
  return PUBLIC_DIRS.some((dir) => rel.startsWith(dir));
}

function cacheControlFor(rel, ext, hasVersionQuery) {
  if (rel === "sw.js") return "no-cache, no-store, must-revalidate";
  if (ext === ".html" || rel === "sitemap.xml" || rel === "robots.txt" || rel === "manifest.json" || rel === "blog/posts.json") {
    return "public, max-age=60, must-revalidate";
  }
  if ([".png", ".jpg", ".jpeg", ".webp", ".gif", ".ico", ".svg"].includes(ext)) {
    // Las portadas del blog tienen nombre unico por articulo; el resto de
    // imagenes casi no cambia.
    return "public, max-age=31536000";
  }
  if (ext === ".css" || ext === ".js") {
    // Con ?v=N (el sitio sube el numero en cada cambio) se puede cachear
    // un mes sin riesgo; sin version, cache corta.
    return hasVersionQuery ? "public, max-age=2592000" : "public, max-age=300, must-revalidate";
  }
  return "public, max-age=300, must-revalidate";
}

function send(res, status, headers, body) {
  res.writeHead(status, headers);
  res.end(body);
}

const NOT_FOUND_HTML = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Página no encontrada | Esteban IA</title><meta name="robots" content="noindex"><style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#040405;color:#f0f0f5;font-family:Arial,sans-serif;text-align:center;padding:24px}h1{font-size:64px;margin:0;color:#d4af37}p{color:#a0a0a8;margin:12px 0 24px}a{display:inline-block;background:#d4af37;color:#0a0a0a;font-weight:700;text-decoration:none;padding:12px 28px;border-radius:30px}</style></head><body><div><h1>404</h1><p>Esta página no existe o se movió.</p><a href="https://${CANONICAL_HOST}/">Volver al inicio</a></div></body></html>`;

const server = http.createServer(async (req, res) => {
  try {
    const host = (req.headers.host || "").split(":")[0].toLowerCase();
    const proto = (req.headers["x-forwarded-proto"] || "https").split(",")[0].trim();
    const url = new URL(req.url, `https://${host || CANONICAL_HOST}`);

    // Health check simple (Railway y pruebas).
    if (url.pathname === "/healthz") {
      return send(res, 200, { "Content-Type": "text/plain" }, "ok");
    }

    if (req.method !== "GET" && req.method !== "HEAD") {
      return send(res, 405, { Allow: "GET, HEAD", "Content-Type": "text/plain" }, "Method Not Allowed");
    }

    // Dominio sin www -> www (misma regla que tenia el .htaccess), y
    // http -> https. Solo aplica a los dominios reales, no a la URL
    // provisional de Railway ni a localhost.
    if (host === BARE_HOST) {
      res.writeHead(301, { Location: `https://${CANONICAL_HOST}${url.pathname}${url.search}` });
      return res.end();
    }
    if (proto === "http" && host === CANONICAL_HOST) {
      res.writeHead(301, { Location: `https://${CANONICAL_HOST}${url.pathname}${url.search}` });
      return res.end();
    }

    let rel;
    try {
      rel = decodeURIComponent(url.pathname).replace(/^\/+/, "");
    } catch {
      return send(res, 400, { "Content-Type": "text/plain" }, "Bad Request");
    }
    if (rel.includes("\0") || rel.split("/").some((seg) => seg === ".." || seg.startsWith("."))) {
      return send(res, 404, { "Content-Type": "text/html; charset=UTF-8" }, NOT_FOUND_HTML);
    }

    if (rel === "") rel = "index.html";
    if (rel.endsWith("/")) rel += "index.html";

    // /blog -> /blog/ (para que las rutas relativas funcionen bien).
    if (!rel.includes(".") && isPublicPath(rel + "/")) {
      res.writeHead(301, { Location: `/${rel}/${url.search}` });
      return res.end();
    }

    if (!isPublicPath(rel)) {
      return send(res, 404, { "Content-Type": "text/html; charset=UTF-8" }, NOT_FOUND_HTML);
    }

    const filePath = path.join(ROOT, rel);
    if (!filePath.startsWith(ROOT + path.sep)) {
      return send(res, 404, { "Content-Type": "text/html; charset=UTF-8" }, NOT_FOUND_HTML);
    }

    let stat;
    try {
      stat = await fs.promises.stat(filePath);
    } catch {
      return send(res, 404, { "Content-Type": "text/html; charset=UTF-8", "Cache-Control": "no-cache" }, NOT_FOUND_HTML);
    }
    if (!stat.isFile()) {
      return send(res, 404, { "Content-Type": "text/html; charset=UTF-8" }, NOT_FOUND_HTML);
    }

    const ext = path.extname(rel).toLowerCase();
    const etag = `W/"${stat.size.toString(16)}-${Math.floor(stat.mtimeMs).toString(16)}"`;
    const headers = {
      "Content-Type": MIME[ext] || "application/octet-stream",
      "Cache-Control": cacheControlFor(rel, ext, url.searchParams.has("v")),
      ETag: etag,
      "Last-Modified": stat.mtime.toUTCString(),
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      Vary: "Accept-Encoding"
    };
    if (rel === "sw.js") headers["Service-Worker-Allowed"] = "/";
    if (rel.startsWith("blog/drafts/")) headers["X-Robots-Tag"] = "noindex, nofollow";

    if (req.headers["if-none-match"] === etag) {
      res.writeHead(304, headers);
      return res.end();
    }

    // Compresion (br o gzip) para los tipos de texto, con cache en memoria.
    const accept = String(req.headers["accept-encoding"] || "");
    const encoding = COMPRESSIBLE.has(ext) ? (/\bbr\b/.test(accept) ? "br" : /\bgzip\b/.test(accept) ? "gzip" : null) : null;

    let body = await fs.promises.readFile(filePath);
    if (encoding) {
      const key = `${rel}|${stat.mtimeMs}|${encoding}`;
      let packed = compressedCache.get(key);
      if (!packed) {
        packed = encoding === "br" ? zlib.brotliCompressSync(body) : zlib.gzipSync(body);
        compressedCache.set(key, packed);
      }
      body = packed;
      headers["Content-Encoding"] = encoding;
    }
    headers["Content-Length"] = body.length;

    res.writeHead(200, headers);
    res.end(req.method === "HEAD" ? undefined : body);
  } catch (err) {
    console.error("Error sirviendo la peticion:", err);
    if (!res.headersSent) send(res, 500, { "Content-Type": "text/plain" }, "Error interno");
    else res.end();
  }
});

server.listen(PORT, () => console.log(`esteban-ia (sitio estatico) escuchando en el puerto ${PORT}`));

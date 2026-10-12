// =====================================================================
// bangun-halaman.mjs
// Mengambil berita & kegiatan dari Supabase, lalu membuat satu halaman HTML
// statis untuk tiap item (judul, deskripsi, canonical, Open Graph, JSON-LD).
// Hasil ada di folder _site/ (salinan situs + halaman baru).
//
// Jalankan: node scripts/bangun-halaman.mjs
// Uji tanpa internet: node scripts/bangun-halaman.mjs --contoh=berkas.json
// Hanya memakai kunci PUBLIK (publishable/anon). Kunci rahasia ditolak.
// =====================================================================
import { readFileSync, writeFileSync, mkdirSync, rmSync, cpSync, existsSync, readdirSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const AKAR = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const KELUAR = join(AKAR, "_site");
const INFO = join(AKAR, "build");
const BASE = (process.env.SITE_BASE_URL || "https://mim1654.github.io/himpalubi/").replace(/\/?$/, "/");
const NAMA_ORG = "HIMPALUBI UNIPAR";

// Berkas/folder di root repo yang TIDAK ikut dipublikasikan
const DILEWATI = new Set([".git", ".github", ".gitattributes", ".gitignore", "scripts", "templates", "sql", "supabase", "_site", "build", "node_modules", "package.json", "package-lock.json"]);

// ---------- Util teks ----------
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function ringkas(teks, panjang) {
  const bersih = String(teks || "").replace(/\s+/g, " ").trim();
  if (bersih.length <= panjang) return bersih;
  const potong = bersih.slice(0, panjang);
  const spasi = potong.lastIndexOf(" ");
  return (spasi > panjang * 0.6 ? potong.slice(0, spasi) : potong) + "...";
}

function formatTanggal(tgl) {
  const d = new Date(tgl);
  if (isNaN(d)) return "";
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}

function buatSlug(judul, id) {
  const dasar = String(judul || "")
    .normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/['’`]/g, "").replace(/&/g, " dan ")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  let p = dasar.slice(0, 60);
  if (dasar.length > 60) { const i = p.lastIndexOf("-"); if (i > 20) p = p.slice(0, i); }
  const kode = String(id).replace(/-/g, "").slice(0, 8);
  return [p, kode].filter(Boolean).join("-");
}

function urlGambar(u) {
  const s = String(u ?? "").trim();
  if (!s) return "";
  if (/^https?:\/\//i.test(s)) return s;
  if (/^[a-z][a-z0-9+.-]*:/i.test(s) || s.startsWith("//")) return "";
  return new URL(s, BASE).href;
}

// ---------- Konfigurasi Supabase (hanya kunci publik) ----------
function bacaKonfigurasi() {
  let url = (process.env.SUPABASE_URL || "").trim();
  let kunci = (process.env.SUPABASE_ANON_KEY || "").trim();
  const berkas = join(AKAR, "js", "supabaseClient.js");
  if ((!url || !kunci) && existsSync(berkas)) {
    const t = readFileSync(berkas, "utf8");
    url = url || (t.match(/https:\/\/[a-z0-9]+\.supabase\.co/i) || [""])[0];
    kunci = kunci || (t.match(/sb_publishable_[A-Za-z0-9_-]+|eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/) || [""])[0];
  }
  if (!url || !kunci) {
    throw new Error("Alamat atau kunci publik Supabase tidak ditemukan di js/supabaseClient.js. Isi rahasia SUPABASE_URL dan SUPABASE_ANON_KEY di GitHub (Settings > Secrets).");
  }
  if (kunci.startsWith("sb_secret_")) throw new Error("DITOLAK: ini kunci rahasia. Pakai kunci publishable/anon saja.");
  if (kunci.startsWith("eyJ")) {
    try {
      const muatan = JSON.parse(Buffer.from(kunci.split(".")[1], "base64url").toString("utf8"));
      if (muatan.role === "service_role") throw new Error("DITOLAK: ini kunci service_role (rahasia). Pakai kunci anon/publishable saja.");
    } catch (e) { if (String(e.message).startsWith("DITOLAK")) throw e; }
  }
  return { url: url.replace(/\/$/, ""), kunci };
}

async function ambilData() {
  const arg = process.argv.find((a) => a.startsWith("--contoh="));
  if (arg) return JSON.parse(readFileSync(arg.slice("--contoh=".length), "utf8"));

  const { url, kunci } = bacaKonfigurasi();
  const kolom = "id,judul,isi,tanggal,penulis,foto_url,created_at,kategori,views";
  const alamat = `${url}/rest/v1/berita?select=${kolom}&order=tanggal.desc,created_at.desc&limit=1000`;
  const kepala = { apikey: kunci, Accept: "application/json" };
  if (kunci.startsWith("eyJ")) kepala.Authorization = `Bearer ${kunci}`;

  let galat;
  for (let percobaan = 1; percobaan <= 3; percobaan++) {
    try {
      const r = await fetch(alamat, { headers: kepala });
      if (!r.ok) throw new Error(`Supabase membalas ${r.status}: ${(await r.text()).slice(0, 200)}`);
      const data = await r.json();
      if (!Array.isArray(data)) throw new Error("Balasan Supabase bukan daftar data.");
      return data;
    } catch (e) {
      galat = e;
      if (percobaan < 3) await new Promise((s) => setTimeout(s, 2000 * percobaan));
    }
  }
  throw new Error("Gagal mengambil data dari Supabase: " + galat.message);
}

// ---------- Susun data tiap halaman ----------
function siapkanItem(baris) {
  const adalahKegiatan = baris.kategori === "Kegiatan";
  const awalan = adalahKegiatan ? "kegiatan" : "berita";
  const slug = buatSlug(baris.judul, baris.id);
  const berkas = `${awalan}-${slug}.html`;
  return {
    ...baris,
    adalahKegiatan,
    berkas,
    url: BASE + berkas,
    induk: adalahKegiatan ? "kegiatan.html" : "berita.html",
    gambar: urlGambar(baris.foto_url),
    deskripsi: ringkas(baris.isi, 155),
    tanggalIso: /^\d{4}-\d{2}-\d{2}/.test(baris.tanggal || "") ? String(baris.tanggal).slice(0, 10) : "",
  };
}

function bangunJsonLd(it) {
  const gambar = it.gambar || BASE + "img/og-default.png";
  const artikel = {
    "@type": it.adalahKegiatan ? "Article" : "NewsArticle",
    headline: ringkas(it.judul, 110),
    description: it.deskripsi,
    image: [gambar],
    datePublished: it.tanggalIso || undefined,
    author: it.penulis && !/^(admin|redaksi|administrator)$/i.test(it.penulis.trim())
      ? { "@type": "Person", name: it.penulis }
      : { "@type": "Organization", name: NAMA_ORG, url: BASE },
    publisher: { "@type": "Organization", name: NAMA_ORG, url: BASE, logo: { "@type": "ImageObject", url: BASE + "img/logo.png" } },
    mainEntityOfPage: { "@type": "WebPage", "@id": it.url },
    inLanguage: "id-ID",
  };
  const remah = {
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Beranda", item: BASE },
      { "@type": "ListItem", position: 2, name: it.adalahKegiatan ? "Agenda Kegiatan" : "Warta & Berita", item: BASE + it.induk },
      { "@type": "ListItem", position: 3, name: it.judul, item: it.url },
    ],
  };
  const graf = { "@context": "https://schema.org", "@graph": [artikel, remah] };
  // "<" diganti agar isi berita tidak bisa menutup tag <script>
  return JSON.stringify(graf).replace(/</g, "\\u003c");
}

function bangunArtikel(it) {
  const kata = String(it.isi || "").trim().split(/\s+/).filter(Boolean).length;
  const menit = Math.max(1, Math.ceil(kata / 180));
  const kategori = it.adalahKegiatan ? "Kegiatan" : "Berita";
  const teksBagikan = encodeURIComponent(`${it.judul} — Publikasi Resmi HIMPALUBI UNIPAR\n\n`);
  const urlBagikan = encodeURIComponent(it.url);
  const paragraf = String(it.isi || "").split(/\n+/).map((p) => p.trim()).filter(Boolean);
  const isiHtml = paragraf.length
    ? paragraf.map((p, i) => i === 0
        ? `<p class="text-lg sm:text-xl font-medium text-on-surface leading-relaxed mb-6">${esc(p)}</p>`
        : `<p class="text-base sm:text-lg text-secondary leading-relaxed sm:leading-[1.9]">${esc(p)}</p>`).join("\n")
    : `<p class="text-secondary italic">Belum ada rincian isi teks untuk publikasi ini.</p>`;

  const foto = it.gambar
    ? `<div class="rounded-2xl sm:rounded-3xl overflow-hidden shadow-sm border border-surface-container bg-surface-container">
        <img src="${esc(it.gambar)}" alt="Dokumentasi ${esc(it.judul)}" class="w-full h-auto max-h-[520px] object-cover" fetchpriority="high">
        <div class="py-2.5 px-4 bg-surface-container-low text-xs text-secondary flex flex-wrap items-center justify-between gap-2 border-t border-surface-container">
          <span class="flex items-center gap-1.5 font-medium text-on-surface/80"><span class="material-symbols-outlined text-[15px] text-primary-container" aria-hidden="true">photo_camera</span>Dokumentasi</span>
          <span class="text-secondary">HIMPALUBI FKIP UNIPAR</span>
        </div>
      </div>`
    : `<div class="rounded-2xl sm:rounded-3xl bg-gradient-to-r from-surface-container to-surface-container-low border border-surface-container p-6 sm:p-8 flex items-center gap-4">
        <div class="w-12 h-12 rounded-2xl bg-primary-fixed text-primary flex items-center justify-center shrink-0"><span aria-hidden="true" class="material-symbols-outlined text-[26px]">newspaper</span></div>
        <div>
          <p class="text-sm font-bold text-on-surface">Warta Publikasi Inklusif</p>
          <p class="text-xs text-secondary">Rilis resmi Himpunan Mahasiswa Pendidikan Luar Biasa Universitas PGRI Argopuro Jember.</p>
        </div>
      </div>`;

  return `<article class="bg-surface-container-lowest rounded-3xl p-6 sm:p-10 lg:p-12 shadow-sm border border-surface-container flex flex-col">
      <header class="flex flex-col gap-4 border-b border-surface-container pb-6 sm:pb-8">
        <div class="flex flex-wrap items-center gap-2.5">
          <span class="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-primary-fixed text-primary font-bold text-xs uppercase tracking-wider shadow-xs">
            <span aria-hidden="true" class="material-symbols-outlined text-[14px]">label</span><span>${kategori}</span>
          </span>
          <span class="inline-flex items-center gap-1 text-xs font-semibold text-secondary">
            <span aria-hidden="true" class="material-symbols-outlined text-[15px] text-primary-container">schedule</span><span>${menit} Menit Baca</span>
          </span>
          <span class="opacity-40 text-secondary" aria-hidden="true">•</span>
          <span class="inline-flex items-center gap-1 text-xs font-semibold text-secondary">
            <span aria-hidden="true" class="material-symbols-outlined text-[15px] text-primary-container">visibility</span>
            <span><span id="jumlah-pembaca-detail">${Number(it.views || 0).toLocaleString("id-ID")}</span> Pembaca</span>
          </span>
        </div>
        <h1 class="text-2xl sm:text-3xl md:text-4xl lg:text-[38px] font-extrabold text-on-surface leading-tight tracking-tight">${esc(it.judul)}</h1>
        <div class="flex flex-wrap items-center justify-between gap-4 pt-2">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-full bg-primary text-on-primary flex items-center justify-center font-bold text-sm shadow-xs shrink-0 overflow-hidden">
              <img src="img/logo.png" alt="" class="w-full h-full object-cover" width="40" height="40">
            </div>
            <div>
              <div class="text-xs sm:text-sm font-bold text-on-surface">${esc(it.penulis || "Redaksi HIMPALUBI")}</div>
              <div class="flex items-center gap-2 text-xs text-secondary">
                <time datetime="${esc(it.tanggalIso)}">${esc(formatTanggal(it.tanggal))}</time>
                <span class="opacity-40" aria-hidden="true">•</span>
                <span>HIMPALUBI FKIP UNIPAR</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div class="my-6 sm:my-8">${foto}</div>

      <div class="detail-isi space-y-6 pt-2 pb-8 border-b border-surface-container">
${isiHtml}
      </div>

      <div class="py-6 border-b border-surface-container flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 class="text-xs font-bold uppercase tracking-wider text-primary">Bagikan Artikel</h2>
          <p class="text-xs text-secondary mt-0.5">Sebarluaskan warta dan narasi edukasi inklusif ini.</p>
        </div>
        <div class="flex flex-wrap items-center gap-1.5 p-1.5 rounded-2xl sm:rounded-full max-w-full bg-surface-container-low border border-surface-container shadow-xs">
          <a href="https://api.whatsapp.com/send?text=${teksBagikan}${urlBagikan}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1.5 px-3.5 py-1.5 min-h-[44px] rounded-full hover:bg-surface-container-lowest text-on-surface hover:text-primary transition-all text-xs font-semibold">
            <span aria-hidden="true" class="material-symbols-outlined text-[16px] text-secondary">chat</span><span>WhatsApp</span><span class="sr-only">(tab baru)</span>
          </a>
          <a href="https://twitter.com/intent/tweet?text=${teksBagikan}&url=${urlBagikan}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1.5 px-3.5 py-1.5 min-h-[44px] rounded-full hover:bg-surface-container-lowest text-on-surface hover:text-primary transition-all text-xs font-semibold">
            <span aria-hidden="true" class="material-symbols-outlined text-[16px]">send</span><span>X / Twitter</span><span class="sr-only">(tab baru)</span>
          </a>
          <button type="button" class="btn-copy-link inline-flex items-center gap-1.5 px-3.5 py-1.5 min-h-[44px] rounded-full hover:bg-surface-container-lowest text-on-surface hover:text-primary transition-all text-xs font-semibold cursor-pointer">
            <span aria-hidden="true" class="material-symbols-outlined text-[16px]">link</span><span>Salin tautan</span>
          </button>
          <button type="button" id="btn-dengar" aria-pressed="false" aria-label="Dengarkan artikel" title="Dengarkan Artikel" class="hidden w-11 h-11 rounded-full hover:bg-surface-container-lowest text-secondary hover:text-on-surface transition-all items-center justify-center cursor-pointer">
            <span aria-hidden="true" class="material-symbols-outlined text-[16px]">volume_up</span>
          </button>
          <button type="button" onclick="window.print()" aria-label="Cetak artikel" title="Cetak Artikel" class="w-11 h-11 rounded-full hover:bg-surface-container-lowest text-secondary hover:text-on-surface transition-all flex items-center justify-center cursor-pointer">
            <span aria-hidden="true" class="material-symbols-outlined text-[16px]">print</span>
          </button>
        </div>
      </div>

      <footer class="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-5 bg-surface-container-low/60 rounded-2xl p-5 sm:p-6 mt-8 border border-surface-container">
        <div class="w-14 h-14 rounded-full bg-surface-container-lowest p-2 border border-primary/20 shadow-xs shrink-0 flex items-center justify-center">
          <img src="img/logo.png" alt="Logo HIMPALUBI" class="w-full h-full object-contain" width="56" height="56">
        </div>
        <div class="flex-1 text-center sm:text-left">
          <h2 class="text-sm sm:text-base font-bold text-on-surface mb-1.5">Redaksi &amp; Media HIMPALUBI UNIPAR</h2>
          <p class="text-xs text-secondary leading-relaxed mb-3">Himpunan Mahasiswa Pendidikan Luar Biasa (HIMPALUBI) FKIP Universitas PGRI Argopuro Jember. Wadah aspirasi mahasiswa, advokasi disabilitas, dan pengembangan keilmuan pendidikan khusus.</p>
          <div class="flex items-center justify-center sm:justify-start gap-4 text-xs font-semibold text-primary">
            <a href="tentang.html" class="hover:underline inline-flex items-center gap-1 min-h-[44px] hover:text-primary-container transition-colors"><span>Profil Organisasi</span><span aria-hidden="true" class="material-symbols-outlined text-[14px]">arrow_forward</span></a>
            <a href="kontak.html" class="hover:underline inline-flex items-center gap-1 min-h-[44px] hover:text-primary-container transition-colors"><span>Hubungi Redaksi</span><span aria-hidden="true" class="material-symbols-outlined text-[14px]">arrow_forward</span></a>
          </div>
        </div>
      </footer>
    </article>`;
}

function bangunKartuTerkait(it) {
  const kategori = it.adalahKegiatan ? "Kegiatan" : "Berita";
  const gambar = it.gambar
    ? `<img src="${esc(it.gambar)}" alt="" class="w-full h-full object-cover" loading="lazy">`
    : `<div class="w-full h-full flex items-center justify-center bg-gradient-to-br from-surface-container-low to-surface-container text-primary"><span aria-hidden="true" class="material-symbols-outlined text-[28px]">newspaper</span></div>`;
  return `<article class="bg-surface-container-lowest rounded-2xl overflow-hidden shadow-sm hover:shadow-md border border-surface-container transition-all duration-300 flex flex-col sm:flex-row group">
        <div class="sm:w-36 sm:min-w-[144px] h-36 sm:h-auto bg-surface-container overflow-hidden shrink-0">${gambar}</div>
        <div class="p-4 flex flex-col justify-between flex-1">
          <div>
            <div class="flex items-center gap-2 text-[11px] font-semibold text-secondary mb-1.5">
              <span class="px-2 py-0.5 rounded-full bg-primary-fixed text-primary font-bold uppercase tracking-wider text-[10px]">${kategori}</span>
              <span class="opacity-40" aria-hidden="true">•</span>
              <time datetime="${esc(it.tanggalIso)}">${esc(formatTanggal(it.tanggal))}</time>
            </div>
            <h3 class="text-sm font-bold text-on-surface leading-snug"><a href="${esc(it.berkas)}" class="hover:text-primary-container hover:underline">${esc(it.judul)}</a></h3>
          </div>
        </div>
      </article>`;
}

// ---------- Isi template ----------
function isiTemplate(templat, nilai) {
  return templat.replace(/\{\{([A-Z_]+)\}\}/g, (_, kunci) => {
    if (!(kunci in nilai)) throw new Error(`Template memakai {{${kunci}}} yang tidak dikenal.`);
    return nilai[kunci];
  });
}

function salinSitus() {
  rmSync(KELUAR, { recursive: true, force: true });
  mkdirSync(KELUAR, { recursive: true });
  for (const nama of readdirSync(AKAR)) {
    if (DILEWATI.has(nama) || nama.toLowerCase().endsWith(".md")) continue;
    cpSync(join(AKAR, nama), join(KELUAR, nama), { recursive: true });
  }
}


// ---------- Sitemap, peta alamat, dan pengalihan detail.html ----------
// Halaman tetap di root situs. Hanya berkas yang benar-benar ada di repo yang dimasukkan sitemap.
const HALAMAN_UTAMA = ["index", "tentang", "kegiatan", "berita", "anggota", "struktur", "program-kerja", "galeri", "pendaftaran", "kontak", "kampus", "privasi"];

const tglDari = (iso) => (/^\d{4}-\d{2}-\d{2}/.test(iso || "") ? String(iso).slice(0, 10) : "");
const tglTerbaru = (daftar) => daftar.filter(Boolean).sort().pop() || "";
const xml = (t) => String(t).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" }[c]));

function tulisSitemap(semua) {
  // lastmod artikel = tanggal data dimasukkan ke database (created_at); suntingan belum bisa dideteksi.
  for (const it of semua) it.lastmod = tglDari(it.created_at) || it.tanggalIso;
  const terbaru = (saring) => tglTerbaru(semua.filter(saring).map((i) => i.lastmod));
  const lastmodHalaman = {
    index: terbaru(() => true),
    berita: terbaru((i) => !i.adalahKegiatan),
    kegiatan: terbaru((i) => i.adalahKegiatan),
  };
  const baris = [];
  for (const nama of HALAMAN_UTAMA) {
    if (!existsSync(join(AKAR, nama + ".html"))) continue;
    const loc = nama === "index" ? BASE : `${BASE}${nama}.html`;
    const lm = lastmodHalaman[nama];
    baris.push(`  <url><loc>${xml(loc)}</loc>${lm ? `<lastmod>${lm}</lastmod>` : ""}</url>`);
  }
  for (const it of semua) {
    baris.push(`  <url><loc>${xml(it.url)}</loc>${it.lastmod ? `<lastmod>${it.lastmod}</lastmod>` : ""}</url>`);
  }
  writeFileSync(join(KELUAR, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${baris.join("\n")}\n</urlset>\n`, "utf8");
  return baris.length;
}

function tulisPetaAlamat(semua) {
  const peta = {};
  for (const it of semua) peta[it.id] = it.berkas;
  writeFileSync(join(KELUAR, "peta-artikel.json"), JSON.stringify(peta), "utf8");
}

// Menyisipkan pengalihan ke SALINAN detail.html di _site/ (berkas asli di repo tidak diubah).
// Tautan lama detail.html?id=... dialihkan ke halaman statisnya; id yang belum ada di peta tetap dimuat seperti biasa.
const SKRIP_ALIH = `
<script>
(function () {
  var id = new URLSearchParams(location.search).get("id");
  if (!id || !window.fetch) return;
  fetch("peta-artikel.json", { cache: "no-cache" })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (peta) {
      if (!peta || !peta[id]) return;
      var kanonik = document.querySelector('link[rel="canonical"]');
      if (kanonik) kanonik.href = new URL(peta[id], location.href).href;
      location.replace(peta[id]);
    })
    .catch(function () {});
})();
</script>`;

function suntikDetail() {
  const berkas = join(KELUAR, "detail.html");
  if (!existsSync(berkas)) { console.log("Peringatan: detail.html tidak ada, pengalihan dilewati."); return false; }
  const html = readFileSync(berkas, "utf8");
  if (!/<head[^>]*>/i.test(html)) throw new Error("detail.html tidak punya tag <head>; pengalihan tidak bisa disisipkan.");
  writeFileSync(berkas, html.replace(/<head[^>]*>/i, (m) => m + SKRIP_ALIH), "utf8");
  return true;
}

async function utama() {
  const berkasTemplat = join(AKAR, "templates", "artikel.html");
  if (!existsSync(berkasTemplat)) throw new Error("templates/artikel.html tidak ditemukan.");
  const templat = readFileSync(berkasTemplat, "utf8");

  const baris = await ambilData();
  const semua = baris.filter((b) => b && b.id && b.judul).map(siapkanItem);

  const dipakai = new Map();
  for (const it of semua) {
    if (dipakai.has(it.berkas)) throw new Error(`Nama berkas kembar: ${it.berkas}`);
    dipakai.set(it.berkas, it.id);
  }

  salinSitus();

  for (const it of semua) {
    const terkait = semua.filter((x) => x.id !== it.id && x.adalahKegiatan === it.adalahKegiatan).slice(0, 2);
    const nilai = {
      JUDUL_HALAMAN: esc(`${it.judul} — ${NAMA_ORG}`),
      DESKRIPSI: esc(it.deskripsi),
      KANONIK: esc(it.url),
      GAMBAR: esc(it.gambar || BASE + "img/og-default.png"),
      TANGGAL_ISO: esc(it.tanggalIso),
      JSONLD_RAW: bangunJsonLd(it),
      HALAMAN_NAV: it.adalahKegiatan ? "kegiatan" : "berita",
      ID: esc(it.id),
      TAUTAN_INDUK: it.induk,
      LABEL_KEMBALI: it.adalahKegiatan ? "Kembali ke Agenda Kegiatan" : "Kembali ke Warta &amp; Berita",
      LABEL_INDUK: it.adalahKegiatan ? "Agenda Kegiatan" : "Warta &amp; Berita",
      JUDUL_TEKS: esc(it.judul),
      ARTIKEL_HTML: bangunArtikel(it),
      TERKAIT_KELAS: terkait.length ? "" : "hidden",
      TERKAIT_JUDUL: it.adalahKegiatan ? "Agenda Kegiatan Terkait" : "Warta &amp; Publikasi Terkait",
      TERKAIT_HTML: terkait.map(bangunKartuTerkait).join("\n"),
    };
    const html = isiTemplate(templat, nilai);
    writeFileSync(join(KELUAR, it.berkas), html, "utf8");
  }

  const nUrl = tulisSitemap(semua);
  tulisPetaAlamat(semua);
  const dialihkan = suntikDetail();

  mkdirSync(INFO, { recursive: true });
  writeFileSync(
    join(INFO, "halaman.json"),
    JSON.stringify(semua.map((it) => ({ id: it.id, kategori: it.adalahKegiatan ? "Kegiatan" : "Berita", url: it.url, berkas: it.berkas, tanggal: it.tanggalIso, dibuat: it.created_at || null })), null, 2)
  );

  const nBerita = semua.filter((i) => !i.adalahKegiatan).length;
  console.log(`Selesai: ${nBerita} berita dan ${semua.length - nBerita} kegiatan -> ${semua.length} halaman statis di _site/`);
  console.log(`sitemap.xml: ${nUrl} alamat | peta-artikel.json: ${semua.length} id | pengalihan detail.html: ${dialihkan ? "aktif" : "TIDAK aktif"}`);
  if (semua.length === 0) console.log("Peringatan: tidak ada data berita/kegiatan. Situs disalin tanpa halaman tambahan.");
}

utama().catch((e) => { console.error("GAGAL: " + e.message); process.exit(1); });

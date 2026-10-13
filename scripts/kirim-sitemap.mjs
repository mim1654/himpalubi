// =====================================================================
// kirim-sitemap.mjs
// Mengirim ulang sitemap ke Google Search Console lewat API resmi
// (akun layanan / service account). Tanpa paket tambahan.
//
// Rahasia yang dibutuhkan: GSC_CREDENTIALS_JSON (isi berkas kunci JSON dari Google Cloud).
// Bila rahasia itu belum dibuat, skrip berhenti dengan tenang (tidak dianggap gagal).
// =====================================================================
import { createSign } from "node:crypto";

const PROPERTI = process.env.SITE_URL || "https://mim1654.github.io/himpalubi/";
const SITEMAP = process.env.SITEMAP_URL || PROPERTI.replace(/\/?$/, "/") + "sitemap.xml";
const API = (process.env.GSC_API_BASE || "https://www.googleapis.com").replace(/\/$/, "");
const COBA_LAGI = Number(process.env.RETRY_KALI || 6);
const JEDA_DETIK = Number(process.env.RETRY_JEDA_DETIK || 10);
const tidur = (detik) => new Promise((r) => setTimeout(r, detik * 1000));
const b64url = (x) => Buffer.from(x).toString("base64url");

function bacaKunci() {
  const mentah = (process.env.GSC_CREDENTIALS_JSON || "").trim();
  if (!mentah) return null;
  let kunci;
  try { kunci = JSON.parse(mentah); } catch { throw new Error("Rahasia GSC_CREDENTIALS_JSON bukan JSON yang valid. Tempel ulang SELURUH isi berkas kunci, dari tanda { sampai }."); }
  if (!kunci.client_email || !kunci.private_key) throw new Error("Berkas kunci tidak memuat client_email atau private_key. Pastikan yang ditempel adalah kunci JSON akun layanan.");
  return kunci;
}

async function ambilTokenAkses(kunci) {
  const tujuan = process.env.GOOGLE_TOKEN_URL || kunci.token_uri || "https://oauth2.googleapis.com/token";
  const sekarang = Math.floor(Date.now() / 1000);
  const badan = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" })) + "." + b64url(JSON.stringify({
    iss: kunci.client_email,
    scope: "https://www.googleapis.com/auth/webmasters",
    aud: tujuan,
    iat: sekarang,
    exp: sekarang + 3600,
  }));
  const tanda = createSign("RSA-SHA256").update(badan).sign(kunci.private_key).toString("base64url");
  const r = await fetch(tujuan, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: badan + "." + tanda }),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok || !data.access_token) throw new Error(`Gagal masuk ke Google (${r.status}): ${data.error_description || data.error || "tanpa keterangan"}. Periksa kunci JSON dan pastikan Search Console API sudah diaktifkan di proyek Google Cloud.`);
  return data.access_token;
}

async function pastikanSitemapTayang() {
  let terakhir = "";
  for (let i = 1; i <= COBA_LAGI; i++) {
    try {
      const r = await fetch(SITEMAP, { headers: { "Cache-Control": "no-cache" } });
      const teks = await r.text();
      if (r.ok && teks.includes("<urlset")) return (teks.match(/<loc>/g) || []).length;
      terakhir = `status ${r.status}`;
    } catch (e) { terakhir = e.message; }
    if (i < COBA_LAGI) { console.log(`Sitemap belum tayang (${terakhir}). Menunggu ${JEDA_DETIK} detik (${i}/${COBA_LAGI})...`); await tidur(JEDA_DETIK); }
  }
  throw new Error(`Sitemap ${SITEMAP} tidak bisa dibuka (${terakhir}). Pengiriman dibatalkan.`);
}

function pesanGalat(status, isi) {
  if (status === 403) return "Ditolak (403). Akun layanan belum ditambahkan di Search Console, atau izinnya 'Terbatas'. Tambahkan emailnya dengan izin 'Penuh' (Full) pada properti yang sama persis.";
  if (status === 404) return `Properti tidak ditemukan (404). Alamat properti harus persis "${PROPERTI}" (jenis awalan URL, dengan garis miring di akhir) dan sudah terdaftar di Search Console.`;
  return `Google membalas ${status}: ${String(isi).slice(0, 300)}`;
}

async function utama() {
  const kunci = bacaKunci();
  if (!kunci) { console.log("Dilewati: rahasia GSC_CREDENTIALS_JSON belum dibuat di GitHub. Tidak ada yang dikirim."); return; }

  const jumlah = await pastikanSitemapTayang();
  console.log(`Sitemap tayang: ${jumlah} alamat.`);

  const token = await ambilTokenAkses(kunci);
  const alamat = `${API}/webmasters/v3/sites/${encodeURIComponent(PROPERTI)}/sitemaps/${encodeURIComponent(SITEMAP)}`;
  const kepala = { Authorization: `Bearer ${token}` };

  const kirim = await fetch(alamat, { method: "PUT", headers: kepala });
  if (!kirim.ok) throw new Error(pesanGalat(kirim.status, await kirim.text()));
  console.log(`Sitemap dikirim ke Search Console (status ${kirim.status}).`);

  const cek = await fetch(alamat, { headers: kepala });
  if (cek.ok) {
    const s = await cek.json();
    console.log(`Status di Google: terakhir dikirim ${s.lastSubmitted || "-"}, menunggu diproses: ${s.isPending ? "ya" : "tidak"}, galat: ${s.errors ?? 0}, peringatan: ${s.warnings ?? 0}`);
    if (Number(s.errors) > 0) console.log("Peringatan: Google melaporkan galat pada sitemap. Buka Search Console > Sitemap untuk rinciannya.");
  }
}

utama().catch((e) => { console.error("GAGAL: " + e.message); process.exit(1); });

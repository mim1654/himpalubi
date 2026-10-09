# Audit Website HIMPALUBI UNIPAR

Tanggal audit: 10 Oktober 2026 · Situs: https://mim1654.github.io/himpalubi/ · Repo: mim1654/himpalubi (commit `db78989`)

**Cara audit:** seluruh repo di-clone dan dibaca (HTML, `js/public.js`, `js/admin.js`, `js/components.js`, edge function, 17 file SQL), lalu dicek dengan skrip. Setiap perbaikan sudah diuji (sintaks JS, keseimbangan tag HTML, uji fungsi `initial()`).

**Yang TIDAK bisa saya periksa:** pengaturan Supabase yang sedang berjalan (apakah semua migrasi sudah dijalankan, Auth, Storage), isi tampilan di browser, dan halaman lain selain `index`, `pendaftaran`, `admin/login`, `admin/daftar`. Bagian yang bergantung pada itu ditandai **[verifikasi]**.

---

## Ringkasan

Fondasinya **lebih baik dari rata-rata** proyek serupa: semua teks dari database di-escape (`escapeHtml`), pakai RLS di semua tabel, kunci Supabase yang dipakai di front-end adalah kunci *publishable* (memang boleh publik, **bukan kebocoran**), `service_role` hanya di edge function, ada skrip rollback, honeypot, dan skip-link. Tahap 3 dan 13 sudah menutup celah admin dan undangan.

Masalah utama ada di empat hal: **formulir aspirasi palsu**, **NIM anggota terbuka untuk publik**, **ketergantungan CDN tanpa build** (kecepatan + keamanan), dan **SEO/pratinjau tautan** karena konten dimuat lewat JavaScript.

| Prioritas | Temuan | Status |
|---|---|---|
| Tinggi | Formulir aspirasi hanya menampilkan "terkirim" palsu | ✅ Diperbaiki |
| Tinggi | NIM anggota terbaca publik | ✅ Diperbaiki (urutan deploy penting) |
| Tinggi | Data pribadi pendaftar tanpa persetujuan/kebijakan privasi | ⬜ Perlu keputusan Anda |
| Sedang | Tailwind CDN di 15 halaman, config disalin 15×, tanpa SRI | ⬜ Arah di bawah |
| Sedang | Pratinjau tautan WhatsApp/Facebook tidak memuat judul berita | ⬜ Arah di bawah |
| Sedang | `robots.txt` dan `sitemap.xml` tidak terbaca mesin pencari | ⬜ 5 menit manual |
| Sedang | Berita contoh palsu di HTML statis (terindeks Google) | ✅ Diperbaiki |
| Sedang | Klaim statis yang mungkin sudah usang | ⬜ Anda yang memastikan |
| Sedang | Aksesibilitas (ikon dibaca "arrow_forward", dll.) | ✅ Sebagian diperbaiki |
| Rendah | XSS potensial di lightbox dan atribut `onerror` | ✅ Diperbaiki |
| Rendah | 11 permintaan terpisah ke tabel `pengaturan` per halaman | ✅ Diperbaiki |
| Rendah | Tautan Instagram/YouTube di beranda tidak pernah terisi | ✅ Diperbaiki |
| Rendah | File duplikat/yatim, README, kebersihan repo | ⬜ Daftar di bawah |

---

## 1. Temuan beserta perbaikannya

### 1.1 Formulir aspirasi palsu — TINGGI ✅
`index.html` baris ~593: `onsubmit="event.preventDefault(); alert('Terima kasih! … telah terkirim …'); this.reset();"`. **Tidak ada data yang dikirim ke mana pun.** Pengunjung mengira aspirasinya sampai, padahal hilang. Di sebuah organisasi advokasi, ini merusak kepercayaan.

**Perbaikan:** fungsi `pasangFormAspirasi()` di `js/public.js` menyimpan ke tabel baru `aspirasi` (RLS: publik hanya boleh *insert* dengan batas panjang; hanya admin yang boleh baca). Ditambah honeypot, `autocomplete`, dan pesan status yang dibacakan pembaca layar.
**Sisa pekerjaan:** dashboard admin belum punya menu "Aspirasi". Sementara, baca lewat Supabase → Table Editor → `aspirasi`. Menu dashboard adalah langkah berikutnya yang saya sarankan.

### 1.2 NIM anggota terbuka untuk publik — TINGGI ✅
Policy `anggota` adalah `select using (true)` dan `public.js` memakai `select("*")`, bahkan menampilkan NIM di kartu anggota (`kartuAnggota`). Siapa pun bisa mengunduh daftar NIM seluruh anggota lewat API. NIM adalah data pribadi (UU No. 27/2022 tentang PDP).

**Perbaikan:** `sql/migrasi_tahap17_hasil_audit.sql` mencabut `select` dari `anon` lalu memberi hak hanya pada kolom yang aman; `public.js` kini memilih kolom eksplisit dan tidak menampilkan NIM. Admin tidak terpengaruh.
⚠️ **Urutan wajib:** unggah `public.js` baru **dulu**, baru jalankan SQL. Kalau terbalik, halaman Anggota/Struktur sementara kosong.

### 1.3 Data pribadi pendaftar tanpa persetujuan — TINGGI ⬜
Formulir mengumpulkan NIM, tempat/tanggal lahir, WhatsApp, dan email, tanpa pernyataan tujuan, lama penyimpanan, atau kotak persetujuan.
**Saran:** tambah kotak centang wajib ("Saya setuju datanya dipakai HIMPALUBI untuk proses keanggotaan") + halaman kebijakan privasi singkat + aturan hapus data pendaftar yang ditolak. Teksnya sebaiknya disetujui pengurus/pembina, jadi tidak saya tulis otomatis.

### 1.4 Tailwind lewat CDN + konfigurasi disalin 15 kali — SEDANG ⬜
`<script src="https://cdn.tailwindcss.com">` dipakai di 15 halaman (termasuk **halaman login admin**). Itu "Play CDN" yang oleh pembuatnya tidak untuk produksi: ±300 KB JS yang meng-compile CSS di browser setiap kunjungan, tampilan sempat berkedip, dan **skrip pihak ketiga berjalan di halaman tempat token admin berada**. Konfigurasi warna (60 baris) disalin di tiap file dan **sudah mulai berbeda**: `pendaftaran.html` kehilangan token `secondary-fixed*` yang ada di `index.html`. `supabase-js@2` dari jsDelivr juga tanpa versi terkunci dan tanpa SRI.
**Arah:** lihat Roadmap, langkah 2.

### 1.5 Pratinjau tautan tidak memuat judul berita — SEDANG ⬜
`perbaruiMetaDetail()` mengisi `og:title`/`og:image` lewat JavaScript. Crawler WhatsApp, Facebook, dan X **tidak menjalankan JS**, jadi setiap tautan berita yang dibagikan tampil dengan pratinjau generik. Sebagian besar traffic organisasi mahasiswa datang dari WhatsApp, jadi ini berdampak nyata.
**Arah:** pra-render halaman berita saat build (Roadmap, langkah 3).

### 1.6 `robots.txt` & `sitemap.xml` tidak terbaca — SEDANG ⬜
Situs ada di sub-folder `/himpalubi/`, sedangkan crawler hanya membaca `https://mim1654.github.io/robots.txt` (milik repo lain/tidak ada). Jadi `robots.txt` dan baris `Sitemap:` **diabaikan**. Sitemap juga tidak memuat halaman berita (`detail.html?id=…`), dan `index.html` vs `/` tercatat ganda.
**Lakukan (5 menit):** Google Search Console (Anda sudah punya file verifikasi) → Sitemaps → kirim `https://mim1654.github.io/himpalubi/sitemap.xml`. Halaman admin sudah aman karena memakai `<meta name="robots" content="noindex">`.

### 1.7 Konten statis yang mungkin keliru — SEDANG
- ✅ Tiga berita contoh ("Mahasiswa PLB UNIPAR Raih Juara Inovasi…", dll., tertanggal April 2025) tertulis permanen di HTML. Muncul tanpa JS, dan **terindeks Google sebagai berita asli**. Sudah diganti placeholder netral.
- ⬜ Periksa: `header.html` (baris 99) dan `public.js` (baris ~1829) berisi *"Pendaftaran Calon Anggota Baru Gelombang 2026/2027 telah dibuka"* sebagai teks bawaan. Kalau pendaftaran sedang tutup, pengunjung melihat info yang salah.
- ⬜ Periksa: "Akreditasi Unggul", "Sejak 2008", "KEPENGURUSAN 2025/2026" (sekarang Oktober 2026). Semuanya bisa diubah dari Dashboard → Pengaturan; pastikan sudah diisi dan akreditasinya sesuai SK terbaru.

### 1.8 Aksesibilitas — SEDANG ✅ sebagian
Organisasi ini bergerak di pendidikan disabilitas, jadi situsnya idealnya jadi contoh WCAG 2.2 AA.
- ✅ Ikon Material Symbols (ligatur teks) tanpa `aria-hidden` dibacakan pembaca layar sebagai "arrow underscore forward". Sudah diperbaiki di `index`, `header`, `detail`, `404`, `berita`, dan seluruh template di `public.js` (53 tempat).
- ✅ `aria-live="polite"` pada blok besar di beranda dihapus (pembaca layar membacakan seluruh isi tiap kali data masuk).
- ✅ Typo CSS `'wght: 500'` (tidak valid) di `.icon-fill`.
- ⬜ Teks berjalan (ticker) tanpa `prefers-reduced-motion`. Tombol tutup ada, tetapi animasi tetap berjalan bagi yang mengaktifkan "kurangi gerakan".
- ⬜ Banyak teks isi berukuran 11–12 px (`text-xs`, `text-[11px]`). Naikkan ke ≥14 px untuk teks bacaan.
- ⬜ Pesan kesalahan form perlu `role="alert"`; tanda `*` wajib perlu teks "wajib diisi" untuk pembaca layar.
- ⬜ Dua skip-link berbeda (`index` memakai kelas Tailwind, `pendaftaran` memakai `.skip-link`). Satukan.
- **Uji nyata:** coba situs dengan NVDA (Windows) atau TalkBack (Android), hanya dengan keyboard.

### 1.9 Keamanan kode — RENDAH ✅
- **Lightbox**: `src` dan `alt` gambar disisipkan mentah ke `innerHTML`. Judul foto berisi tanda kutip bisa menyuntikkan HTML. Kini diisi lewat properti DOM.
- **`onerror` kartu anggota**: dua huruf inisial nama dimasukkan tanpa escape ke string JavaScript dalam atribut. `initial()` sekarang hanya mengembalikan huruf/angka (diuji: `"'<b x"` → `X`).
- `.single()` melempar galat 406 bila baris tak ada → diganti `.maybeSingle()` di halaman detail.

### 1.10 Performa data — RENDAH ✅
Beranda memanggil tabel `pengaturan` **11 kali** per halaman (tagline, tentang, kontak, label, statistik, footer, ticker…). Kini lewat `ambilPengaturan()` yang mengambil sekali dan dipakai ulang. Masih ada `select("*")` di sisa fungsi (termasuk memuat teks berita penuh untuk kartu daftar); pertimbangkan memilih kolom saja dan pagination di halaman Berita.

### 1.11 Tautan sosial beranda — RENDAH ✅
`public.js` sudah memanggil `pasangTautanSosial("beranda-instagram", …)`, tetapi tag di `index.html` tidak punya `id` tersebut → tautan selalu menuju `instagram.com` / `youtube.com` polos. Sudah diberi id.

---

## 2. Temuan yang sudah benar (jangan diubah)

- **Tahap 13 menutup dua celah serius** yang saya curigai di awal: undangan admin kini butuh *email + kode* (12 karakter acak), dan pendaftaran publik dipaksa `status = 'Menunggu'` dengan batas panjang. Terverifikasi di kode SQL.
- Semua policy admin memakai `is_admin()`, bukan sekadar `authenticated` (tahap 3, 7). Pembukaan *sign-up* publik aman karena akun biasa tidak mendapat akses apa pun.
- Edge function `reset-password-admin`: verifikasi peran di server, `service_role` hanya di sana, sandi tidak dicatat di log.
- Skrip *backup* dan *rollback* per migrasi: kebiasaan yang bagus.

## 3. Risiko kecil untuk dipantau

1. **Edge function:** admin utama mengetik sandi orang lain (jadi *tahu* sandinya). Lebih aman mengirim tautan reset lewat email. Fungsi juga tidak memeriksa bahwa target ada di `admin_users`, dan CORS `*` sebaiknya dibatasi ke domain situs.
2. **Undangan bisa "diserobot":** orang yang tahu email yang diundang bisa mendaftar lebih dulu tanpa kode. Ia tidak mendapat akses admin, tetapi email itu terpakai sehingga yang diundang gagal daftar. Solusi: hapus akunnya di Supabase → Authentication → Users, lalu undang ulang.
3. **`tambah_pembaca` bisa dipanggil berulang** oleh siapa pun, sehingga angka "pembaca" bisa digelembungkan. Pencegahan hanya di browser. Jangan jadikan angka itu bukti kinerja.
4. **[verifikasi] Supabase gratis menjeda proyek yang tidak aktif ±1 minggu.** Bila itu terjadi, seluruh situs hanya menampilkan "Belum ada data". Cek dashboard Supabase; solusi gratis: GitHub Action terjadwal yang memanggil API tiap beberapa hari (sekaligus bisa mengekspor cadangan data mingguan).
5. **`schema.sql` sudah usang**: hanya membuat 3 tabel, padahal kode memakai `galeri`, `program_kerja`, `pengaturan`, `faq`, `testimoni`, dst. (dibuat tahap 1–16). Database baru dari README akan rusak. Buat satu berkas skema lengkap (`supabase db dump --schema public`).
6. **Pencegahan spam pendaftaran:** hanya honeypot. Pasang Cloudflare Turnstile (panduan sudah ada di README Anda) bila mulai ada spam.

## 4. Kebersihan repo

Boleh dihapus (sudah saya verifikasi tidak dipakai kode):
- `style.css` di root (versi lama; yang dipakai `css/style.css`, 68 baris berbeda)
- `partials/admin-navbar.html`, `partials/admin-sidebar.html` (salinan identik dari `admin/partials/`)
- `header.html`, `footer.html` di root: hanya cadangan `components.js`, identik dengan `partials/`. Boleh dihapus bila `partials/` dijamin ada.

Pertimbangkan: `.agents/`, `AGENTS.md`, `GEMINI.md` adalah berkas alat AI di repo publik (tidak berbahaya, tetapi membuat repo berantakan); tambahkan `.gitignore` dan `LICENSE`; ubah README yang berisi kalimat percakapan ("…tanyakan lagi — akan dibantu ditelusuri") menjadi dokumentasi yang rapi. Tidak ditemukan rahasia (`service_role`, JWT, kunci pribadi) di seluruh repo.

---

## 5. Roadmap yang disarankan

**Langkah 1 — hari ini (±1 jam)**
1. Unggah berkas di folder `paket/` ke repo (timpa berkas lama dengan nama dan folder yang sama).
2. Tunggu situs ter-deploy, cek beranda, halaman Anggota, dan Struktur.
3. Jalankan `sql/migrasi_tahap17_hasil_audit.sql` di Supabase SQL Editor.
4. Uji: kirim formulir aspirasi → cek tabel `aspirasi`. Kirim pendaftaran uji → cek tabel `pendaftaran`.
5. Kirim sitemap di Google Search Console.
6. **[verifikasi]** Di Supabase SQL Editor jalankan, lalu pastikan **tidak ada** baris yang memakai `auth.role() = 'authenticated'`:
   ```sql
   select tablename, policyname, cmd, qual, with_check
   from pg_policies where schemaname in ('public','storage') order by 1,2;
   ```

**Langkah 2 — minggu ini**
- Hapus berkas yatim (bagian 4). Pastikan teks "Pendaftaran … dibuka", akreditasi, dan periode kepengurusan benar.
- Tambah persetujuan data pribadi di formulir pendaftaran.
- Ganti Tailwind CDN dengan *build* sungguhan: satu `tailwind.config.js`, satu `input.css`, `npx tailwindcss -o css/tailwind.css --minify`, lalu hapus 15 blok konfigurasi. Kunci versi `supabase-js` (mis. `@2.45.0`) dan tambahkan `integrity`. Hasilnya lebih cepat, tanpa kedipan, dan CSP bisa dipasang.
- Subset font ikon: `...Material+Symbols+Outlined&icon_names=arrow_forward,send,...` (file dari ratusan KB jadi beberapa KB).

**Langkah 3 — 1 sampai 2 bulan (peningkatan terbesar)**
- Pindah ke generator situs statis (**Astro** atau **Eleventy**), tetap gratis di GitHub Pages. Header/footer menjadi komponen (tanpa `fetch` saat jalan), dan GitHub Action terjadwal menarik berita dari Supabase lalu membuat halaman statis per berita `/berita/judul.html` dengan `og:title`/`og:image` benar. Hasilnya pratinjau WhatsApp bagus, SEO bagus, situs tetap tampil walau Supabase sedang jeda, dan sitemap otomatis.
- Menu **Aspirasi** di dashboard (tandai dibaca, hapus, ekspor).
- Cloudflare Turnstile + Edge Function verifikasi untuk pendaftaran dan aspirasi.
- Audit aksesibilitas dengan pembaca layar sungguhan dan perbaiki sisa butir 1.8.
- Cadangan data mingguan otomatis (GitHub Action → ekspor tabel ke repo privat).

---

## 6. Isi paket perbaikan

| Berkas | Perubahan |
|---|---|
| `index.html` | Formulir aspirasi asli, berita contoh palsu dihapus, id tautan sosial, `aria-live`/`aria-hidden`, typo CSS |
| `js/public.js` | `pasangFormAspirasi`, `ambilPengaturan` (cache), tanpa NIM publik, lightbox & `initial()` aman, `maybeSingle`, `aria-hidden` ikon |
| `header.html`, `partials/header.html`, `detail.html`, `404.html`, `berita.html` | `aria-hidden` pada ikon dekoratif |
| `sql/migrasi_tahap17_hasil_audit.sql` | Tabel `aspirasi`, NIM tertutup, validasi pendaftaran di server |
| `sql/rollback_tahap17.sql` | Pembatalan tahap 17 |
| `_referensi-perubahan.patch` | Diff lengkap (untuk yang paham Git; tidak perlu diunggah) |

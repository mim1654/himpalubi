# Panduan Setting Website HIMPALUBI (Tanpa Coding)

Ikuti langkah-langkah ini secara berurutan. Semua layanan yang dipakai **gratis**.

---

## Langkah 1 — Buat Project Supabase (Database + Login Admin)

1. Buka **supabase.com** → klik **Start your project** → daftar pakai akun Google/GitHub.
2. Klik **New project**.
   - Nama project: `himpalubi` (bebas)
   - Buat kata sandi database (simpan baik-baik, tapi ini bukan kata sandi login admin website, ini cuma untuk database)
   - Pilih region terdekat, misalnya **Southeast Asia (Singapore)**
   - Klik **Create new project** dan tunggu 1-2 menit sampai selesai disiapkan.

## Langkah 2 — Buat Tabel Database

1. Di sidebar kiri Supabase, klik **SQL Editor**.
2. Klik **New query**.
3. Buka file `sql/schema.sql` di folder ini, salin semua isinya, tempel ke kotak SQL Editor.
4. Klik **Run**. Kalau berhasil akan muncul "Success. No rows returned".
5. Cek di menu **Table Editor** — harus muncul 3 tabel: `berita`, `anggota`, `pendaftaran`.

## Langkah 3 — Buat Akun Admin/Pengurus

1. Di sidebar kiri, klik **Authentication** → **Users**.
2. Klik **Add user** → **Create new user**.
3. Isi email dan kata sandi untuk admin pertama (misalnya ketua/sekretaris).
4. Centang **Auto Confirm User** supaya bisa langsung login tanpa verifikasi email.
5. Ulangi untuk setiap pengurus yang perlu akses admin.

## Langkah 4 — Ambil Kunci API Supabase

1. Di sidebar kiri, klik ikon **Settings (gerigi)** → **API**.
2. Salin dua nilai ini:
   - **Project URL**
   - **anon public key**
3. Buka file `js/supabaseClient.js` di folder ini menggunakan Notepad atau text editor apa pun.
4. Ganti:
   ```
   const SUPABASE_URL = "ISI_URL_SUPABASE_KAMU";
   const SUPABASE_ANON_KEY = "ISI_ANON_KEY_SUPABASE_KAMU";
   ```
   dengan nilai yang tadi kamu salin. Simpan file.

## Langkah 5 — Unggah ke GitHub Pages

1. Buka **github.com** → daftar/login.
2. Klik **+** di kanan atas → **New repository**.
   - Nama repository: `himpalubi-website` (bebas)
   - Pilih **Public**
   - Klik **Create repository**
3. Di halaman repository kosong, klik **uploading an existing file**.
4. Seret (drag) **semua isi folder** `himpalubi-website` ini (bukan foldernya, tapi isinya: `index.html`, folder `css`, `js`, `admin`, `sql`, dan `README.md`) ke kotak upload.
5. Klik **Commit changes**.
6. Setelah terupload, klik tab **Settings** di repository → menu **Pages** di sidebar kiri.
7. Di bagian **Branch**, pilih `main` dan folder `/ (root)` → klik **Save**.
8. Tunggu 1-2 menit, lalu refresh halaman itu — akan muncul link seperti:
   `https://namakamu.github.io/himpalubi-website/`
9. Buka link itu — website HIMPALUBI kamu sudah online!

## Langkah 6 — Coba Semuanya

1. Buka halaman **Pendaftaran**, isi form, kirim — cek di Supabase **Table Editor > pendaftaran**, datanya harus muncul.
2. Buka `/admin/login.html`, login pakai akun admin yang dibuat di Langkah 3.
3. Coba tambah berita dan anggota dari dashboard — cek apakah muncul di halaman publik.
4. Coba terima/tolak satu pendaftar dari dashboard.

---

## Kalau Ingin Pakai Domain Sendiri Nanti

Kalau organisasi sudah punya budget untuk domain (misalnya `himpalubi.org`):
1. Beli domain di penyedia mana saja (Niagahoster, Rumahweb, Namecheap, dll).
2. Di GitHub Pages **Settings > Pages**, masukkan domain itu ke kolom **Custom domain**.
3. Ikuti instruksi provider domain untuk mengarahkan DNS ke GitHub Pages.

Semua langkah di atas **tidak wajib berbayar** — domain custom hanya opsional.

## Kalau ada bagian yang error atau bingung

Simpan pesan errornya (screenshot boleh) dan tanyakan lagi — akan dibantu ditelusuri penyebabnya.

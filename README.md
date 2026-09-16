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

## Cara Menambah Admin/Pengurus Baru (Setelah Migrasi Keamanan)

Ada 2 cara menambah admin baru:

### Cara 1 — Fitur "Undang Admin" di dashboard (disarankan)

Perlu jalankan dulu `sql/migrasi_tahap4_undang_admin.sql` **dan** `sql/migrasi_tahap5_admin_utama.sql` di Supabase (SQL Editor, urut), dan **nyalakan kembali pendaftaran akun**:
1. Supabase → **Authentication → Providers** → provider **Email** → nyalakan lagi **"Allow new users to sign up"**
2. Ini tetap aman: siapa pun boleh bikin akun, tapi TIDAK dapat akses admin sama sekali kecuali emailnya sudah diundang oleh admin utama.

Menu **"Kelola Admin"** di dashboard sekarang **hanya terlihat untuk 1 akun admin utama** (default: email yang diisi di `migrasi_tahap5_admin_utama.sql`). Admin biasa sama sekali tidak melihat menu ini.

Alurnya:
1. Login sebagai admin utama → menu **Kelola Admin** → isi email teman di form "Undang Admin Baru" → **Kirim Undangan**
2. Kirim link `admin/daftar.html` ke temanmu, minta dia daftar pakai **email yang sama persis** dengan yang diundang
3. Begitu daftar, sistem otomatis memberi akses admin **biasa** (bukan admin utama) — undangan otomatis hangus setelah dipakai
4. Admin utama bisa **mencabut akses** atau **mereset sandi** admin biasa kapan saja lewat menu yang sama; riwayat reset sandi tercatat di bagian "Riwayat Reset Sandi" untuk transparansi

### Deploy Edge Function `reset-password-admin` (wajib untuk fitur Reset Sandi)

Ini perlu dipasang lewat Supabase, **bukan** lewat upload file ke GitHub:
1. Supabase → sidebar **Edge Functions** → **Deploy a new function** → **Via Editor**
2. Beri nama: `reset-password-admin`
3. Salin isi file `supabase/functions/reset-password-admin/index.ts` ke editor tersebut (hapus dulu kode bawaan/template)
4. Klik **Deploy**

Kunci `SUPABASE_SERVICE_ROLE_KEY` otomatis tersedia untuk Edge Function ini dari Supabase — **tidak perlu diisi manual**, dan **tidak pernah** ditulis di kode website.

### Cara 2 — Manual lewat Supabase (kalau tidak mau nyalakan sign-up publik)

1. Buat akunnya dulu seperti biasa: **Authentication > Users > Add user** (isi email, password, centang **Auto Confirm User**).
2. Buka **SQL Editor > New query**, jalankan (ganti email-nya):
   ```sql
   insert into admin_users (id, email)
   select id, email from auth.users where email = 'email_pengurus_baru@contoh.com'
   on conflict (id) do nothing;
   ```
3. Selesai — akun itu sekarang bisa login ke dashboard admin.

## Kalau ada bagian yang error atau bingung

Simpan pesan errornya (screenshot boleh) dan tanyakan lagi — akan dibantu ditelusuri penyebabnya.

## (Opsional) Mencegah Spam di Form Pendaftaran dengan Cloudflare Turnstile

Form Pendaftaran saat ini sudah divalidasi formatnya (NIM angka saja, No. WhatsApp format Indonesia), tapi tetap bisa "diisi" berkali-kali oleh bot otomatis. **Cloudflare Turnstile** adalah captcha gratis yang bisa menyaring itu. Implementasi penuhnya butuh "Site Key" dari akun Cloudflare kamu sendiri, jadi ini opsional dan belum dipasang otomatis — begini caranya kalau suatu saat mau dipasang:

1. Buat akun gratis di **dash.cloudflare.com** → menu **Turnstile** → **Add Site**, isi domain website kamu (`mim1654.github.io`)
2. Cloudflare akan kasih kamu **Site Key** (untuk frontend, publik) dan **Secret Key** (rahasia, untuk verifikasi)
3. Tambahkan script Turnstile di `pendaftaran.html`, sebelum `</body>`:
   ```html
   <script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
   ```
4. Tambahkan widget-nya di dalam form, sebelum tombol submit:
   ```html
   <div class="cf-turnstile" data-sitekey="ISI_SITE_KEY_KAMU"></div>
   ```
5. **Penting**: supaya benar-benar aman, hasil verifikasi Turnstile idealnya dicek ulang di sisi server (bukan cuma browser) sebelum data disimpan — ini butuh Edge Function tambahan (mirip pola `reset-password-admin` yang sudah kita buat) yang memanggil endpoint verifikasi Cloudflare pakai Secret Key. Kalau kamu mau fitur ini benar-benar aktif, kabari saja dan siapkan Site Key + Secret Key-nya, nanti dibantu buatkan Edge Function verifikasinya.

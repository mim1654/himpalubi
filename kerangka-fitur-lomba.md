# Kerangka fitur Info Lomba & Pendaftaran (rancangan, belum dikerjakan)

## Keputusan yang disarankan
- Juknis dan berkas unduhan disimpan di Google Drive; situs hanya menyimpan tautannya.
- Pendaftaran tahap 1 memakai Google Form per kategori; jawabannya otomatis masuk Google Sheet. Tidak ada data pribadi peserta di Supabase.
- Data lomba (judul, kategori, tanggal, biaya, tautan) disimpan di Supabase dengan RLS: pengunjung hanya boleh membaca yang aktif.
- Tautan hanya diterima dari drive.google.com, docs.google.com, forms.gle, dan forms.google.com (divalidasi di admin dan di halaman publik).
- Google Sheet berisi data peserta tidak boleh dibagikan publik. Hanya pengurus yang punya akses.

## Halaman
1. lomba.html: daftar lomba (kartu: poster, judul, tanggal, status Buka/Tutup).
2. lomba.html?slug=NAMA: detail lomba, tab/daftar kategori, tiap kategori punya syarat, biaya, kuota, tombol "Unduh Juknis" (Drive) dan "Daftar" (Google Form).
3. Admin: menu "Lomba" untuk tambah/ubah lomba dan kategori.

## Tabel (rancangan)
- lomba: id, slug, judul, ringkasan, deskripsi, poster_url, tanggal_buka, tanggal_tutup, tanggal_acara, lokasi, kontak, aktif
- lomba_kategori: id, lomba_id, nama, deskripsi, syarat, biaya, kuota, juknis_url, form_url, urutan, aktif

## Tahap kerja
1. Tabel + RLS (SQL dengan rollback), uji baca/tulis.
2. Halaman publik daftar + detail.
3. Menu admin.
4. Menu navigasi + sitemap.

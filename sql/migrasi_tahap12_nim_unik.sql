-- =========================================================
-- MIGRASI TAHAP 12 — Cegah Duplikat NIM di Pendaftaran
-- Jalankan di: Supabase > SQL Editor > New query > Run
-- =========================================================

-- LANGKAH A (jalankan dan lihat dulu hasilnya SEBELUM lanjut ke Langkah B):
-- Kalau hasilnya KOSONG (0 baris), aman lanjut ke Langkah B.
select nim, count(*) as jumlah
from pendaftaran
where nim is not null and nim <> ''
group by nim
having count(*) > 1;

-- LANGKAH B (jalankan HANYA kalau Langkah A di atas hasilnya kosong):
alter table pendaftaran add constraint pendaftaran_nim_unique unique (nim);

-- =========================================================
-- ROLLBACK TAHAP 14
-- Mengembalikan pengaturan bucket "foto" dari cadangan, menghapus fungsi
-- tambah_pembaca, dan menghapus kolom views.
-- PERHATIAN: jumlah pembaca yang sudah tercatat di server ikut hilang.
-- Data lain tidak disentuh.
-- =========================================================

begin;

drop function if exists public.tambah_pembaca(uuid);
alter table berita drop column if exists views;

update storage.buckets b
set file_size_limit = c.file_size_limit,
    allowed_mime_types = c.allowed_mime_types
from cadangan.bucket_sebelum_t14 c
where b.id = c.id;

commit;

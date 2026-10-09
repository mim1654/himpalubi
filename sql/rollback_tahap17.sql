-- Pembatalan MIGRASI TAHAP 17.
-- Tidak menghapus tabel aspirasi (supaya pesan yang sudah masuk tidak hilang).
begin;

-- NIM anggota kembali terbuka untuk publik (seperti sebelum tahap 17)
grant select on public.anggota to anon;

-- Kebijakan pendaftaran kembali ke versi tahap 13
drop policy if exists "Publik bisa mengirim pendaftaran" on public.pendaftaran;
create policy "Publik bisa mengirim pendaftaran" on public.pendaftaran
  for insert
  with check (
    status = 'Menunggu'
    and char_length(btrim(nama)) between 1 and 100
    and char_length(coalesce(nim, '')) <= 20
    and char_length(coalesce(program_studi, '')) <= 100
    and char_length(coalesce(angkatan, '')) <= 10
    and char_length(coalesce(tempat_lahir, '')) <= 100
    and char_length(coalesce(no_wa, '')) <= 20
    and char_length(coalesce(email, '')) <= 254
    and char_length(coalesce(alasan, '')) <= 2000
    and created_at >= now() - interval '10 minutes'
    and created_at <= now() + interval '1 minute'
  );

commit;

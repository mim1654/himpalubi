-- =========================================================
-- ROLLBACK TAHAP 13 — mengembalikan fungsi & policy ke kondisi sebelum tahap 13
-- Gunakan hanya jika setelah migrasi tahap 13 ada masalah.
-- Tidak menyentuh data pendaftaran/anggota/berita/admin.
-- PERHATIAN: kolom "kode" di admin_undangan dihapus; setelah rollback,
-- undangan kembali hanya dicek berdasarkan email (celah lama aktif lagi).
-- Jalankan di: Supabase > SQL Editor > New query > Run
-- =========================================================

begin;

create or replace function public.cek_undangan_admin()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (select 1 from admin_undangan where email = new.email) then
    insert into admin_users (id, email) values (new.id, new.email)
    on conflict (id) do nothing;
    delete from admin_undangan where email = new.email;

    -- Lewati kebutuhan verifikasi email untuk admin yang memang sudah diundang
    update auth.users set email_confirmed_at = now()
    where id = new.id and email_confirmed_at is null;
  end if;
  return new;
end;
$$;

drop policy if exists "Publik bisa mengirim pendaftaran" on pendaftaran;
create policy "Publik bisa mengirim pendaftaran" on pendaftaran
  for insert with check (true);

alter table admin_undangan drop column if exists kode;

commit;

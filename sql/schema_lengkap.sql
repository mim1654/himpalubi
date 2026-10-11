-- =====================================================================
-- SKEMA LENGKAP HIMPALUBI (hasil gabungan schema.sql + migrasi tahap 1-18)
--
-- HANYA untuk membuat database BARU yang masih kosong.
-- JANGAN dijalankan di database yang sudah berjalan (pakai migrasi bernomor saja).
--
-- Dibuat dengan menjalankan seluruh migrasi berurutan di Postgres uji lalu mengekspor
-- skema `public`. Bagian setelah garis "BAGIAN SUPABASE" ditambahkan manual karena
-- berada di luar skema public (storage, pemicu auth).
--
-- Setelah menjalankan file ini:
--   1. Buat admin utama pertama: lihat langkah akhir di migrasi_tahap5_admin_utama.sql
--      (isi email Anda sendiri; jangan menaruh kunci rahasia di kode situs).
--   2. Isi tabel `pengaturan` lewat Dashboard > Pengaturan.
-- =====================================================================

--
-- PostgreSQL database dump
--



SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--



--
-- Name: batasi_kiriman_publik(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.batasi_kiriman_publik() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  batas_global int;
  jumlah_global int;
  jumlah_email int;
begin
  if tg_table_name = 'aspirasi' then
    batas_global := 30;
    select count(*) into jumlah_global from public.aspirasi
      where created_at > now() - interval '10 minutes';
    select count(*) into jumlah_email from public.aspirasi
      where lower(email) = lower(new.email) and created_at > now() - interval '1 hour';
  elsif tg_table_name = 'pendaftaran' then
    batas_global := 60;
    select count(*) into jumlah_global from public.pendaftaran
      where created_at > now() - interval '10 minutes';
    select count(*) into jumlah_email from public.pendaftaran
      where lower(email) = lower(new.email) and created_at > now() - interval '1 hour';
  else
    return new;
  end if;

  if jumlah_global >= batas_global or jumlah_email >= 3 then
    raise exception 'Terlalu banyak kiriman. Coba lagi beberapa saat lagi.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;


--
-- Name: cek_undangan_admin(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cek_undangan_admin() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  v_kode text;
begin
  select kode into v_kode
  from admin_undangan
  where lower(email) = lower(new.email);

  if v_kode is not null
     and lower(v_kode) = lower(btrim(coalesce(new.raw_user_meta_data ->> 'kode_undangan', ''))) then

    insert into admin_users (id, email) values (new.id, new.email)
    on conflict (id) do nothing;

    delete from admin_undangan where lower(email) = lower(new.email);

    -- Email dianggap terkonfirmasi HANYA untuk pendaftar dengan kode yang benar.
    update auth.users set email_confirmed_at = now()
    where id = new.id and email_confirmed_at is null;
  end if;

  return new;
end;
$$;


--
-- Name: is_admin(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_admin() RETURNS boolean
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select exists (select 1 from admin_users where id = auth.uid());
$$;


--
-- Name: is_admin_utama(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_admin_utama() RETURNS boolean
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select exists (select 1 from admin_users where id = auth.uid() and peran = 'utama');
$$;


--
-- Name: tambah_pembaca(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.tambah_pembaca(p_id uuid) RETURNS integer
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  update berita set views = views + 1 where id = p_id returning views;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: admin_activity_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_activity_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    dilakukan_oleh uuid,
    dilakukan_oleh_email text,
    aksi text NOT NULL,
    target_user_id uuid,
    target_email text,
    waktu timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: admin_undangan; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_undangan (
    email text NOT NULL,
    diundang_oleh text,
    dibuat_pada timestamp with time zone DEFAULT now() NOT NULL,
    kode text DEFAULT substr(replace((gen_random_uuid())::text, '-'::text, ''::text), 1, 12) NOT NULL
);


--
-- Name: admin_users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_users (
    id uuid NOT NULL,
    email text,
    dibuat_pada timestamp with time zone DEFAULT now() NOT NULL,
    peran text DEFAULT 'admin'::text NOT NULL
);


--
-- Name: anggota; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.anggota (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nama text NOT NULL,
    jabatan text,
    angkatan text,
    foto_url text,
    status text DEFAULT 'Aktif'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    kategori text DEFAULT 'Anggota'::text NOT NULL,
    divisi text,
    urutan integer,
    nim text
);


--
-- Name: aspirasi; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.aspirasi (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nama text NOT NULL,
    email text NOT NULL,
    kategori text DEFAULT 'umum'::text NOT NULL,
    pesan text NOT NULL,
    dibaca boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: berita; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.berita (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    judul text NOT NULL,
    isi text NOT NULL,
    tanggal date DEFAULT CURRENT_DATE NOT NULL,
    penulis text,
    foto_url text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    kategori text DEFAULT 'Berita'::text NOT NULL,
    views integer DEFAULT 0 NOT NULL,
    jenis_kegiatan text,
    CONSTRAINT berita_jenis_kegiatan_check CHECK (((jenis_kegiatan IS NULL) OR (jenis_kegiatan = ANY (ARRAY['inklusi'::text, 'seminar'::text, 'pengabdian'::text, 'kaderisasi'::text, 'kompetisi'::text]))))
);


--
-- Name: faq; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.faq (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    pertanyaan text NOT NULL,
    jawaban text NOT NULL,
    urutan integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: galeri; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.galeri (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    judul text,
    foto_url text NOT NULL,
    tanggal date DEFAULT CURRENT_DATE NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: pendaftaran; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pendaftaran (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nama text NOT NULL,
    nim text,
    program_studi text,
    angkatan text,
    no_wa text,
    email text,
    alasan text,
    status text DEFAULT 'Menunggu'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    tempat_lahir text,
    tanggal_lahir date,
    setuju_pada timestamp with time zone
);


--
-- Name: pengaturan; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pengaturan (
    id integer DEFAULT 1 NOT NULL,
    nama_organisasi text DEFAULT 'HIMPALUBI'::text NOT NULL,
    tagline text DEFAULT 'Himpunan Mahasiswa Pendidikan Luar Biasa'::text,
    tentang text DEFAULT 'Tulis deskripsi organisasi di sini melalui menu Pengaturan pada dashboard admin.'::text,
    alamat text,
    email text,
    telepon text,
    instagram text,
    youtube text,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    tahun_berdiri text,
    tagline_hero text,
    visi text,
    misi text,
    sejarah text,
    tujuan text,
    teks_berjalan text,
    akreditasi_label text DEFAULT 'Akreditasi Unggul'::text,
    akreditasi_periode text DEFAULT '2025/2026'::text,
    periode_kepengurusan text DEFAULT '2025/2026'::text,
    tiktok text,
    jam_layanan text DEFAULT 'Senin - Jumat: 09.00 - 17.00 WIB'::text,
    CONSTRAINT id_harus_satu CHECK ((id = 1))
);


--
-- Name: program_kerja; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.program_kerja (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nama_program text NOT NULL,
    divisi text NOT NULL,
    deskripsi text,
    status text DEFAULT 'Berjalan'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: testimoni; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.testimoni (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nama text NOT NULL,
    jabatan text,
    isi text NOT NULL,
    foto_url text,
    urutan integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: admin_activity_log admin_activity_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_activity_log
    ADD CONSTRAINT admin_activity_log_pkey PRIMARY KEY (id);


--
-- Name: admin_undangan admin_undangan_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_undangan
    ADD CONSTRAINT admin_undangan_pkey PRIMARY KEY (email);


--
-- Name: admin_users admin_users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_users
    ADD CONSTRAINT admin_users_pkey PRIMARY KEY (id);


--
-- Name: anggota anggota_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.anggota
    ADD CONSTRAINT anggota_pkey PRIMARY KEY (id);


--
-- Name: aspirasi aspirasi_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.aspirasi
    ADD CONSTRAINT aspirasi_pkey PRIMARY KEY (id);


--
-- Name: berita berita_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.berita
    ADD CONSTRAINT berita_pkey PRIMARY KEY (id);


--
-- Name: faq faq_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.faq
    ADD CONSTRAINT faq_pkey PRIMARY KEY (id);


--
-- Name: galeri galeri_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.galeri
    ADD CONSTRAINT galeri_pkey PRIMARY KEY (id);


--
-- Name: pendaftaran pendaftaran_nim_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pendaftaran
    ADD CONSTRAINT pendaftaran_nim_unique UNIQUE (nim);


--
-- Name: pendaftaran pendaftaran_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pendaftaran
    ADD CONSTRAINT pendaftaran_pkey PRIMARY KEY (id);


--
-- Name: pengaturan pengaturan_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pengaturan
    ADD CONSTRAINT pengaturan_pkey PRIMARY KEY (id);


--
-- Name: program_kerja program_kerja_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.program_kerja
    ADD CONSTRAINT program_kerja_pkey PRIMARY KEY (id);


--
-- Name: testimoni testimoni_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.testimoni
    ADD CONSTRAINT testimoni_pkey PRIMARY KEY (id);


--
-- Name: aspirasi batasi_kiriman_aspirasi; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER batasi_kiriman_aspirasi BEFORE INSERT ON public.aspirasi FOR EACH ROW EXECUTE FUNCTION public.batasi_kiriman_publik();


--
-- Name: pendaftaran batasi_kiriman_pendaftaran; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER batasi_kiriman_pendaftaran BEFORE INSERT ON public.pendaftaran FOR EACH ROW EXECUTE FUNCTION public.batasi_kiriman_publik();


--
-- Name: admin_users admin_users_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_users
    ADD CONSTRAINT admin_users_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: admin_users Admin bisa lihat daftar admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin bisa lihat daftar admin" ON public.admin_users FOR SELECT USING (public.is_admin());


--
-- Name: aspirasi Admin hapus aspirasi; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin hapus aspirasi" ON public.aspirasi FOR DELETE USING (public.is_admin());


--
-- Name: pendaftaran Admin hapus pendaftaran; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin hapus pendaftaran" ON public.pendaftaran FOR DELETE USING (public.is_admin());


--
-- Name: anggota Admin kelola anggota; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin kelola anggota" ON public.anggota USING (public.is_admin()) WITH CHECK (public.is_admin());


--
-- Name: berita Admin kelola berita; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin kelola berita" ON public.berita USING (public.is_admin()) WITH CHECK (public.is_admin());


--
-- Name: faq Admin kelola faq; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin kelola faq" ON public.faq USING (public.is_admin()) WITH CHECK (public.is_admin());


--
-- Name: galeri Admin kelola galeri; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin kelola galeri" ON public.galeri USING (public.is_admin()) WITH CHECK (public.is_admin());


--
-- Name: program_kerja Admin kelola program kerja; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin kelola program kerja" ON public.program_kerja USING (public.is_admin()) WITH CHECK (public.is_admin());


--
-- Name: testimoni Admin kelola testimoni; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin kelola testimoni" ON public.testimoni USING (public.is_admin()) WITH CHECK (public.is_admin());


--
-- Name: aspirasi Admin lihat aspirasi; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin lihat aspirasi" ON public.aspirasi FOR SELECT USING (public.is_admin());


--
-- Name: pendaftaran Admin lihat pendaftaran; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin lihat pendaftaran" ON public.pendaftaran FOR SELECT USING (public.is_admin());


--
-- Name: aspirasi Admin ubah aspirasi; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin ubah aspirasi" ON public.aspirasi FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());


--
-- Name: pengaturan Admin ubah pengaturan; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin ubah pengaturan" ON public.pengaturan FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());


--
-- Name: pendaftaran Admin ubah status pendaftaran; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin ubah status pendaftaran" ON public.pendaftaran FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());


--
-- Name: admin_users Admin utama bisa hapus admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin utama bisa hapus admin" ON public.admin_users FOR DELETE USING (public.is_admin_utama());


--
-- Name: admin_activity_log Admin utama bisa lihat log aktivitas; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin utama bisa lihat log aktivitas" ON public.admin_activity_log FOR SELECT USING (public.is_admin_utama());


--
-- Name: admin_users Admin utama bisa update admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin utama bisa update admin" ON public.admin_users FOR UPDATE USING (public.is_admin_utama()) WITH CHECK (public.is_admin_utama());


--
-- Name: admin_undangan Admin utama kelola undangan; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin utama kelola undangan" ON public.admin_undangan USING (public.is_admin_utama()) WITH CHECK (public.is_admin_utama());


--
-- Name: aspirasi Publik bisa kirim aspirasi; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Publik bisa kirim aspirasi" ON public.aspirasi FOR INSERT WITH CHECK ((((char_length(btrim(nama)) >= 1) AND (char_length(btrim(nama)) <= 100)) AND ((char_length(email) >= 5) AND (char_length(email) <= 254)) AND (email ~~ '%_@_%._%'::text) AND (kategori = ANY (ARRAY['advokasi'::text, 'kegiatan'::text, 'kolaborasi'::text, 'umum'::text])) AND ((char_length(btrim(pesan)) >= 5) AND (char_length(btrim(pesan)) <= 2000)) AND (dibaca = false)));


--
-- Name: anggota Publik bisa lihat anggota; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Publik bisa lihat anggota" ON public.anggota FOR SELECT USING (true);


--
-- Name: berita Publik bisa lihat berita; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Publik bisa lihat berita" ON public.berita FOR SELECT USING (true);


--
-- Name: faq Publik bisa lihat faq; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Publik bisa lihat faq" ON public.faq FOR SELECT USING (true);


--
-- Name: galeri Publik bisa lihat galeri; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Publik bisa lihat galeri" ON public.galeri FOR SELECT USING (true);


--
-- Name: pengaturan Publik bisa lihat pengaturan; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Publik bisa lihat pengaturan" ON public.pengaturan FOR SELECT USING (true);


--
-- Name: program_kerja Publik bisa lihat program kerja; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Publik bisa lihat program kerja" ON public.program_kerja FOR SELECT USING (true);


--
-- Name: testimoni Publik bisa lihat testimoni; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Publik bisa lihat testimoni" ON public.testimoni FOR SELECT USING (true);


--
-- Name: pendaftaran Publik bisa mengirim pendaftaran; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Publik bisa mengirim pendaftaran" ON public.pendaftaran FOR INSERT WITH CHECK (((status = 'Menunggu'::text) AND ((char_length(btrim(nama)) >= 1) AND (char_length(btrim(nama)) <= 100)) AND (nim ~ '^[A-Za-z0-9]{6,20}$'::text) AND (char_length(COALESCE(program_studi, ''::text)) <= 100) AND (char_length(COALESCE(angkatan, ''::text)) <= 10) AND (char_length(COALESCE(tempat_lahir, ''::text)) <= 100) AND ((tanggal_lahir IS NULL) OR ((tanggal_lahir >= '1940-01-01'::date) AND (tanggal_lahir <= CURRENT_DATE))) AND (no_wa ~ '^(\+62|62|0)8[0-9]{8,12}$'::text) AND (email ~~ '%_@_%._%'::text) AND (char_length(email) <= 254) AND (char_length(COALESCE(alasan, ''::text)) <= 2000) AND (created_at >= (now() - '00:10:00'::interval)) AND (created_at <= (now() + '00:01:00'::interval))));


--
-- Name: admin_activity_log; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.admin_activity_log ENABLE ROW LEVEL SECURITY;

--
-- Name: admin_undangan; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.admin_undangan ENABLE ROW LEVEL SECURITY;

--
-- Name: admin_users; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

--
-- Name: anggota; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.anggota ENABLE ROW LEVEL SECURITY;

--
-- Name: aspirasi; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.aspirasi ENABLE ROW LEVEL SECURITY;

--
-- Name: berita; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.berita ENABLE ROW LEVEL SECURITY;

--
-- Name: faq; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.faq ENABLE ROW LEVEL SECURITY;

--
-- Name: galeri; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.galeri ENABLE ROW LEVEL SECURITY;

--
-- Name: pendaftaran; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.pendaftaran ENABLE ROW LEVEL SECURITY;

--
-- Name: pengaturan; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.pengaturan ENABLE ROW LEVEL SECURITY;

--
-- Name: program_kerja; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.program_kerja ENABLE ROW LEVEL SECURITY;

--
-- Name: testimoni; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.testimoni ENABLE ROW LEVEL SECURITY;

--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: -
--

GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;


--
-- Name: FUNCTION batasi_kiriman_publik(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.batasi_kiriman_publik() FROM PUBLIC;


--
-- Name: FUNCTION cek_undangan_admin(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.cek_undangan_admin() TO anon;
GRANT ALL ON FUNCTION public.cek_undangan_admin() TO authenticated;


--
-- Name: FUNCTION is_admin(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.is_admin() TO anon;
GRANT ALL ON FUNCTION public.is_admin() TO authenticated;


--
-- Name: FUNCTION is_admin_utama(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.is_admin_utama() TO anon;
GRANT ALL ON FUNCTION public.is_admin_utama() TO authenticated;


--
-- Name: FUNCTION tambah_pembaca(p_id uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.tambah_pembaca(p_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.tambah_pembaca(p_id uuid) TO anon;
GRANT ALL ON FUNCTION public.tambah_pembaca(p_id uuid) TO authenticated;


--
-- Name: TABLE admin_activity_log; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.admin_activity_log TO anon;
GRANT ALL ON TABLE public.admin_activity_log TO authenticated;


--
-- Name: TABLE admin_undangan; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.admin_undangan TO anon;
GRANT ALL ON TABLE public.admin_undangan TO authenticated;


--
-- Name: TABLE admin_users; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.admin_users TO anon;
GRANT ALL ON TABLE public.admin_users TO authenticated;


--
-- Name: TABLE anggota; Type: ACL; Schema: public; Owner: -
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.anggota TO anon;
GRANT ALL ON TABLE public.anggota TO authenticated;


--
-- Name: COLUMN anggota.id; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(id) ON TABLE public.anggota TO anon;


--
-- Name: COLUMN anggota.nama; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(nama) ON TABLE public.anggota TO anon;


--
-- Name: COLUMN anggota.jabatan; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(jabatan) ON TABLE public.anggota TO anon;


--
-- Name: COLUMN anggota.angkatan; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(angkatan) ON TABLE public.anggota TO anon;


--
-- Name: COLUMN anggota.foto_url; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(foto_url) ON TABLE public.anggota TO anon;


--
-- Name: COLUMN anggota.status; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(status) ON TABLE public.anggota TO anon;


--
-- Name: COLUMN anggota.kategori; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(kategori) ON TABLE public.anggota TO anon;


--
-- Name: COLUMN anggota.divisi; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(divisi) ON TABLE public.anggota TO anon;


--
-- Name: COLUMN anggota.urutan; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(urutan) ON TABLE public.anggota TO anon;


--
-- Name: TABLE aspirasi; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.aspirasi TO anon;
GRANT ALL ON TABLE public.aspirasi TO authenticated;


--
-- Name: TABLE berita; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.berita TO anon;
GRANT ALL ON TABLE public.berita TO authenticated;


--
-- Name: TABLE faq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.faq TO anon;
GRANT ALL ON TABLE public.faq TO authenticated;


--
-- Name: TABLE galeri; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.galeri TO anon;
GRANT ALL ON TABLE public.galeri TO authenticated;


--
-- Name: TABLE pendaftaran; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.pendaftaran TO anon;
GRANT ALL ON TABLE public.pendaftaran TO authenticated;


--
-- Name: TABLE pengaturan; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.pengaturan TO anon;
GRANT ALL ON TABLE public.pengaturan TO authenticated;


--
-- Name: TABLE program_kerja; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.program_kerja TO anon;
GRANT ALL ON TABLE public.program_kerja TO authenticated;


--
-- Name: TABLE testimoni; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.testimoni TO anon;
GRANT ALL ON TABLE public.testimoni TO authenticated;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO authenticated;


--
-- PostgreSQL database dump complete
--




-- =====================================================================
-- BAGIAN SUPABASE (di luar skema public)
-- =====================================================================

insert into public.pengaturan (id) values (1) on conflict (id) do nothing;

-- Pemicu: akun baru hanya jadi admin bila email + kode undangannya cocok
drop trigger if exists on_auth_user_created_cek_undangan on auth.users;
create trigger on_auth_user_created_cek_undangan
  after insert on auth.users
  for each row execute function public.cek_undangan_admin();

-- Bucket foto: publik, maksimal 5 MB, hanya JPEG
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('foto', 'foto', true, 5242880, array['image/jpeg'])
on conflict (id) do update
  set public = true, file_size_limit = 5242880, allowed_mime_types = array['image/jpeg'];

drop policy if exists "Publik bisa lihat foto" on storage.objects;
create policy "Publik bisa lihat foto" on storage.objects
  for select using (bucket_id = 'foto');

drop policy if exists "Admin bisa upload foto" on storage.objects;
create policy "Admin bisa upload foto" on storage.objects
  for insert with check (bucket_id = 'foto' and public.is_admin());

drop policy if exists "Admin bisa hapus foto" on storage.objects;
create policy "Admin bisa hapus foto" on storage.objects
  for delete using (bucket_id = 'foto' and public.is_admin());

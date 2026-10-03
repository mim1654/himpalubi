# Project Directives & Design Rules (HIMPALUBI UNIPAR)

> **MANDATORY INSTRUCTION FOR ALL AGENTS / ASSISTANTS:**
> Setiap kali menerima permintaan atau melakukan tindakan (pembuatan halaman, perubahan kode, perbaikan CSS/HTML, penulisan teks, atau perencanaan fitur), agen **WAJIB** membaca dan mematuhi:
> 1. [AGENTS.md](file:///d:/PROJEK%20WEB/himpalubi/AGENTS.md)
> 2. [DESIGN.MD](file:///d:/PROJEK%20WEB/himpalubi/DESIGN.MD)

---

## Aturan Utama (Non-Negotiable)

1. **DESIGN.MD sebagai Sumber Kebenaran Tunggal**:
   - Seluruh token warna (`primary: #9E001F`, `primary-container: #C8102E`, `surface: #F8F9FF`, `on-surface: #121C28`, `secondary: #5C5E66`), tipografi (**Inter**), sistem spacing, radius pill untuk tombol, elevasi bayangan halus, dan ikon (**Material Symbols Outlined**) harus merujuk ke [DESIGN.MD](file:///d:/PROJEK%20WEB/himpalubi/DESIGN.MD).
   - Jangan pernah menambahkan warna merek baru di luar spesifikasi ini.

2. **Kepatuhan Antislop**:
   - Mengikuti modul antislop yang terpasang di `.agents/skills/` (UI bersih, teks natural, tidak ada kode slop atau komentar redundan, ramah aksesibilitas, responsive mobile-first).

3. **Integritas Backend & Fungsionalitas**:
   - Menjaga koneksi Supabase di [js/supabaseClient.js](file:///d:/PROJEK%20WEB/himpalubi/js/supabaseClient.js), form pendaftaran, login admin, dan manajemen data agar tidak terganggu saat pengubahan UI.

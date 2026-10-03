# Workspace Rules & Agent Directives (HIMPALUBI)

> **MANDATORY INSTRUCTION FOR ALL AGENTS / ASSISTANTS:**
> Sebelum melakukan analisis, perencanaan, modifikasi kode, pembuatan halaman, atau styling, Anda **WAJIB** membaca dan mematuhi:
> 1. `AGENTS.md` (Panduan perilaku agen dan aturan antislop).
> 2. `DESIGN.MD` (Sumber kebenaran tunggal untuk seluruh token warna, tipografi Inter, radius, bayangan, ikon, komponen, dan tata letak).

---

## 1. Aturan Wajib Desain (`DESIGN.MD` Enforcement)

1. **Single Source of Truth**: Setiap pembuatan atau perubahan visual/UI wajib merujuk secara ketat ke [DESIGN.MD](file:///d:/PROJEK%20WEB/himpalubi/DESIGN.MD).
2. **Palet Warna Terkunci**:
   - `primary`: `#9E001F` (tombol utama, chip aktif, aksen)
   - `primary-container`: `#C8102E` (merah identitas)
   - `on-surface` / `on-background`: `#121C28` (charcoal untuk judul & teks utama)
   - `secondary`: `#5C5E66` (deskripsi & teks isi)
   - `background` / `surface`: `#F8F9FF` (latar halaman)
   - `surface-container-lowest`: `#FFFFFF` (kartu & input)
   - *Dilarang memakai warna acak/hex sembarangan di luar token `DESIGN.MD`.*
3. **Tipografi & Ikon**:
   - Font wajib: **Inter** (400, 500, 600, 700, 800).
   - Ikon wajib: **Material Symbols Outlined**.
4. **Bahasa & Aksesibilitas**:
   - Seluruh teks antarmuka berbahasa Indonesia ("HIMPALUBI UNIPAR").
   - Wajib memenuhi standar aksesibilitas WCAG AA (kontras jelas, area sentuh min 44x44px, `alt` gambar, `aria-label`).
5. **Integritas Backend**:
   - Jangan merusak atau mengubah integrasi backend Supabase ([js/supabaseClient.js](file:///d:/PROJEK%20WEB/himpalubi/js/supabaseClient.js), form pendaftaran, login admin, CRUD berita & anggota).

---

<!-- antislop:start -->
## antislop
For UI, copy, people, mobile layout, or code comments work, read these installed skill files directly (use these paths even if a same-named global skill exists):
- Core filter, always on: `antislop`: `.agents/skills/antislop/SKILL.md`
- UI / visual: `antislop-ui`: `.agents/skills/antislop-ui/SKILL.md`
- People: `antislop-human`: `.agents/skills/antislop-human/SKILL.md`
- Mobile / responsive: `antislop-layoutmobile`: `.agents/skills/antislop-layoutmobile/SKILL.md`
- Code comments: `antislop-code`: `.agents/skills/antislop-code/SKILL.md`
Before starting, follow the core's "Two Usage Modes" section in strict order: explicit session instruction first, then global preference, then ask. A session instruction always wins. For a resolved mode, say `antislop active: <mode> (session override).` or `antislop active: <mode> (global preference).` once before presenting findings or making edits, using the actual mode and source. Acknowledging the user's request without naming the source does not replace this notice.
Only an explicit choice of antislop during or after selects a session mode. A request to review, audit, or avoid file edits does not select a mode; read the global preference in that case. Another skill's mode does not select antislop's mode.
If the mode is unresolved, ask during/after and end the response; wait for the answer before any UI review, planning, or concept. For read-only tasks, put the active-mode notice only at the start of the final answer, never in progress messages. For editing tasks, announce before the first edit and omit it from the final answer.
To update antislop later: `npx antislop-ai --update`, or run `npx antislop-ai` and pick Overwrite them.
<!-- antislop:end -->

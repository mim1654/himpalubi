# DESIGN.md — Website HIMPALUBI UNIPAR

Dokumen ini adalah **sumber kebenaran tunggal** untuk tema visual. Setiap pembuatan atau perubahan halaman wajib mengikuti token dan aturan di bawah. Jangan menambah warna, font, radius, atau gaya komponen baru di luar dokumen ini.

## 1. Identitas

- Organisasi: HIMPALUBI UNIPAR (himpunan mahasiswa Pendidikan Luar Biasa).
- Karakter: bersih, modern, formal-institusional, inklusif dan aksesibel.
- Palet: dominan putih kebiruan muda dan charcoal, dengan **merah crimson sebagai aksen**.
- Bahasa antarmuka: Indonesia.

## 2. Warna (token)

Gunakan nama token ini (Tailwind), bukan nilai heksadesimal langsung.

| Token | Hex | Penggunaan |
|---|---|---|
| `primary` | #9E001F | Tombol utama, chip aktif, tab/nav aktif, ikon aksen, tautan aksi |
| `primary-container` | #C8102E | Merah identitas (band, gradien, aksen besar) |
| `on-primary` | #FFFFFF | Teks/ikon di atas `primary` |
| `primary-fixed` | #FFDAD8 | Latar badge/pill merah muda |
| `on-primary-fixed` | #410007 | Teks di atas `primary-fixed` |
| `on-primary-fixed-variant` | #92001C | Teks badge pada `primary-fixed` |
| `inverse-primary` | #FFB3B1 | Ikon aksen pada latar gelap (toast) |
| `background` / `surface` | #F8F9FF | Latar halaman |
| `surface-container-lowest` | #FFFFFF | Kartu, input, chip tidak aktif |
| `surface-container-low` | #EEF4FF | Footer kartu, area sekunder |
| `surface-container` | #E5EEFF | Wadah segmented tab, banner sekunder |
| `surface-container-high` | #DFE9FA | Bar aksesibilitas |
| `surface-variant` | #D9E3F4 | Badge netral |
| `on-surface` / `on-background` | #121C28 | Judul dan teks utama, tombol gelap |
| `on-surface-variant` | #5C403F | Teks sekunder pada label |
| `secondary` | #5C5E66 | Teks isi/deskripsi, ikon tidak aktif |
| `outline` / `outline-variant` | #906F6E / #E5BDBB | Garis/batas (jarang dipakai) |
| `inverse-surface` | #27313E | Latar toast |
| `inverse-on-surface` | #EAF1FF | Teks toast |
| `error` | #BA1A1A | Status galat |

Aturan:
- Merah dipakai **hemat** sebagai aksen. Area luas memakai putih, `surface`, atau `on-surface`.
- Gradien yang diizinkan hanya: `from-primary via-primary-container to-on-surface` (banner unggulan) dan `from-on-surface/80 via-transparent to-black/20` (overlay gambar).
- Dilarang memakai biru, hijau, ungu, atau oranye sebagai warna merek.

## 3. Tipografi

Satu keluarga font: **Inter** (400, 500, 600, 700, 800). Fallback: `system-ui, sans-serif`.

| Token | Ukuran / Line-height | Bobot | Letter-spacing | Penggunaan |
|---|---|---|---|---|
| `display` | 48 / 56 | 800 | -0.025em | Hero desktop |
| `display-mobile` | 36 / 44 | 800 | -0.02em | Hero mobile |
| `headline-lg` | 32 / 40 | 700 | -0.02em | Judul halaman desktop |
| `headline-lg-mobile` | 26 / 34 | 700 | -0.015em | Judul halaman mobile |
| `headline-md` | 24 / 32 | 700 | -0.015em | Judul seksi |
| `headline-sm` | 20 / 28 | 600 | -0.01em | Judul kartu besar/banner |
| `title-md` | 16 / 24 | 600 | -0.005em | Judul kartu, judul berita |
| `body-lg` | 16 / 26 | 400 | 0 | Paragraf utama |
| `body-md` | 14 / 22 | 400 | 0 | Teks isi, deskripsi |
| `label-md` | 12 / 16 | 600 | 0.04em | Tombol kecil, chip, tab |
| `label-sm` | 11 / 14 | 500 | 0.02em | Meta (tanggal, kategori, badge) |

Aturan: label kategori/badge ditulis `uppercase` dengan `tracking-wider`. Deskripsi dipotong `line-clamp-2`, judul berita `line-clamp-2`.

## 4. Spasi, radius, bayangan

**Spasi** (token): `space-xs` 4px, `space-sm` 8px, `space-md` 16px, `space-lg` 24px, `space-xl` 40px, `margin-sm` 16px, `margin` 32px, `gutter-sm` 16px, `gutter` 24px. Kelipatan 4/8px. Padding horizontal halaman mobile: `px-4`.

**Radius**: `DEFAULT` 4px, `lg` 8px (gambar dalam kartu, tab), `xl` 12px (kartu, input, dropdown), `2xl` 16px (banner besar), `full` (tombol pill, chip, badge, avatar).

**Bayangan**: kartu `shadow-sm`; elemen mengambang `shadow-md`/`shadow-xl` (toast); header `0 1px 8px rgba(0,0,0,0.04)`; bottom nav `0 -2px 12px rgba(0,0,0,0.04)`. Tidak memakai border tebal; pemisahan memakai perbedaan warna surface dan bayangan lembut.

## 5. Ikonografi

- **Material Symbols Outlined** (satu-satunya set ikon).
- Ukuran standar: 22px (navigasi), 20px (input), 18px (aksi), 16px (meta), 14px (badge).
- Ikon aktif/penting boleh `FILL 1`. Warna ikon aksen: `text-primary`; netral: `text-secondary`.

## 6. Komponen

### 6.1 Navbar desktop (acuan referensi)
- Latar putih, sticky, bayangan lembut saat scroll.
- Kiri: logo bulat. Menu berurutan: **Beranda, Tentang (panah dropdown), Kegiatan, Berita, Anggota, Galeri, Kontak**. Inter 500, 15–16px.
- Dropdown "Tentang": kartu putih, radius 8–12px, bayangan lembut, spasi vertikal lega; isi: Profil, Struktur Organisasi, Program Kerja.
- Kanan: tombol ikon pencarian bulat berkontur, tombol pill **Masuk** (kontur gelap, teks gelap), tombol pill **Daftar** (solid `primary`, teks putih).
- Hover/aktif pada menu: teks `primary`.
- Di bawah navbar: pita merah tipis (`primary-container`, tinggi ±60px), lalu area hero `on-surface` (charcoal).

### 6.2 Header mobile
- `fixed top-0`, tinggi 64px (`h-16`), `bg-surface/85` + `backdrop-blur-xl`, `pt-safe`.
- Kiri: logo (tinggi 32px) + nama "HIMPALUBI UNIPAR" (`title-md`) dan nama halaman aktif (`label-sm`, uppercase, `on-surface-variant`).
- Kanan: tombol cari 44×44 bulat dan avatar 32px bulat `bg-primary` dengan ikon `person`.

### 6.3 Bottom navigation (mobile)
- `fixed bottom-0`, tinggi 64px, `bg-surface-container-lowest/90` + blur, `pb-safe`.
- Lima item: **Beranda, Kegiatan, Berita, Anggota, Galeri** (ikon 22px + label `label-sm`).
- Aktif: `text-primary font-semibold` dan `aria-current="page"`. Tidak aktif: `text-secondary`. Area sentuh minimal 56×44px.
- Konten halaman memakai `pt-16 pb-20` agar tidak tertutup.

### 6.4 Tombol
- **Utama**: pill, `bg-primary text-on-primary`, `label-md` bold, hover transisi halus.
- **Sekunder/kontur**: pill, border `on-surface`, teks `on-surface`.
- **Gelap**: pill, `bg-on-surface text-surface` (contoh: "Kirim Artikel Mahasiswa").
- **Di atas latar merah**: pill putih, teks `primary`.
- **Ikon**: 44×44, bulat atau `rounded-xl`, hover `bg-surface-container`.
- Umpan balik tekan: `active:scale-95`. Tinggi sentuh minimal 44px.

### 6.5 Chip kategori
- Pill, `px-4 py-1.5`, `label-md`. Aktif: `bg-primary text-on-primary`. Tidak aktif: `bg-surface-container-lowest text-secondary shadow-sm`. Baris bisa digeser horizontal, scrollbar disembunyikan.

### 6.6 Segmented tab
- Wadah `bg-surface-container rounded-xl p-1`. Tab aktif: `bg-surface-container-lowest text-primary shadow-sm rounded-lg font-semibold`. Tidak aktif: `text-secondary`.

### 6.7 Kartu berita unggulan
- `bg-surface-container-lowest rounded-xl overflow-hidden shadow-sm`. Gambar rasio 16:9 dengan overlay gradien gelap; badge pill `bg-primary` di kiri atas; meta tanggal dan tombol "Dengar" (pill putih transparan) di kiri-kanan bawah.
- Isi: judul `title-md` bold (hover `primary`), deskripsi `body-md text-secondary`. Footer `bg-surface-container-low` berisi sumber redaksi dan tautan "Baca Selengkapnya" (`primary`, ikon panah).

### 6.8 Kartu daftar berita
- `bg-surface-container-lowest rounded-xl p-3 shadow-sm`, gambar 96×96 `rounded-lg` dengan label kategori di sudut kiri bawah, badge subkategori pill, judul `title-md` semibold dua baris, meta tanggal dan penanda simpan (`bookmark_border`, `primary`).

### 6.9 Banner unggulan (E-Magazine)
- `rounded-2xl`, `bg-gradient-to-br from-primary via-primary-container to-on-surface`, teks `on-primary`, `p-5`, bayangan `shadow-md`, lingkaran dekoratif blur putih 10%. Tombol aksi pill putih.

### 6.10 Banner ajakan (kirim naskah)
- `bg-surface-container rounded-2xl p-4`, ikon bulat `primary-fixed`, pill info putih, tombol gelap penuh lebar.

### 6.11 Bar aksesibilitas
- `bg-surface-container-high rounded-xl px-3 py-2`, ikon `accessibility_new` dan status "Aktif" berwarna `primary` dengan titik berdenyut.

### 6.12 Toast
- `fixed bottom-20`, `bg-inverse-surface text-inverse-on-surface rounded-xl shadow-xl`, ikon `inverse-primary`, hilang otomatis ±3,8 detik, bisa ditutup.

### 6.13 Footer (desktop)
- Latar `on-surface`, teks putih, empat kolom: Tentang, Tautan Cepat, Kontak, Media Sosial; garis merah tipis di atas hak cipta.

## 7. Tata letak dan responsivitas

- Mobile-first. Satu kolom, `px-4`, jarak antarseksi `py-2` sampai `pt-4`, jarak antarkartu `gap-3`.
- Desktop: kontainer maksimum ±1200px, grid 3 kolom untuk kegiatan, 4 kolom untuk galeri, kartu unggulan besar disertai 3 daftar kecil untuk berita.
- Mobile memakai header + bottom nav; desktop memakai navbar atas (bagian 6.1). Jangan menampilkan keduanya sekaligus.

## 8. Gerak

- Transisi 150–300ms (`transition-colors`, `transition-all`). Zoom gambar kartu `scale-105` selama 500ms saat hover. Panah tautan bergeser `translate-x-0.5`.
- Hormati `prefers-reduced-motion`: nonaktifkan animasi non-esensial.

## 9. Aksesibilitas

- Kontras teks minimal WCAG AA. Semua tombol ikon memiliki `aria-label` berbahasa Indonesia.
- Chip memakai `role="tab"` dengan `aria-selected`; navigasi aktif memakai `aria-current="page"`.
- Gambar wajib `alt` deskriptif. Sediakan fitur pembaca layar dan narasi audio untuk berita.
- Area sentuh minimal 44×44px.

## 10. Aturan perubahan (anti-melenceng)

**Wajib**
1. Pakai hanya token pada dokumen ini; jangan menulis hex atau ukuran sembarang.
2. Pertahankan Inter, Material Symbols Outlined, radius, dan pola bayangan yang ada.
3. Komponen baru dibangun dari komponen di bagian 6 (kartu, pill, chip, tab).
4. Seluruh teks antarmuka berbahasa Indonesia, nama organisasi "HIMPALUBI UNIPAR".
5. Saat memperbarui satu halaman, jangan mengubah header, navigasi, dan palet halaman lain.

**Dilarang**
- Mengganti warna utama, menambah warna merek baru, atau menjadikan merah sebagai latar seluruh halaman.
- Mengubah font atau set ikon.
- Sudut tajam (0 radius) atau bayangan tebal/gelap.
- Menambah gradien selain dua yang diizinkan.

## 11. Konfigurasi Tailwind (salin ke proyek)

```js
tailwind.config = {
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        "primary": "#9e001f", "primary-container": "#c8102e",
        "on-primary": "#ffffff", "primary-fixed": "#ffdad8",
        "primary-fixed-dim": "#ffb3b1", "on-primary-fixed": "#410007",
        "on-primary-fixed-variant": "#92001c", "on-primary-container": "#ffdad8",
        "inverse-primary": "#ffb3b1", "surface-tint": "#bf0229",
        "background": "#f8f9ff", "surface": "#f8f9ff", "surface-bright": "#f8f9ff",
        "surface-dim": "#d1dbec", "surface-container-lowest": "#ffffff",
        "surface-container-low": "#eef4ff", "surface-container": "#e5eeff",
        "surface-container-high": "#dfe9fa", "surface-container-highest": "#d9e3f4",
        "surface-variant": "#d9e3f4", "on-surface": "#121c28",
        "on-background": "#121c28", "on-surface-variant": "#5c403f",
        "inverse-surface": "#27313e", "inverse-on-surface": "#eaf1ff",
        "outline": "#906f6e", "outline-variant": "#e5bdbb",
        "secondary": "#5c5e66", "on-secondary": "#ffffff",
        "secondary-container": "#e0e2ec", "on-secondary-container": "#62646d",
        "tertiary": "#4b4d4f", "on-tertiary": "#ffffff",
        "error": "#ba1a1a", "on-error": "#ffffff",
        "error-container": "#ffdad6", "on-error-container": "#93000a"
      },
      borderRadius: { DEFAULT: "0.25rem", lg: "0.5rem", xl: "0.75rem", full: "9999px" },
      spacing: {
        "space-xs": "0.25rem", "space-sm": "0.5rem", "space-md": "1rem",
        "space-lg": "1.5rem", "space-xl": "2.5rem", "margin-sm": "1rem",
        "margin": "2rem", "gutter-sm": "1rem", "gutter": "1.5rem"
      },
      fontFamily: { sans: ["Inter", "system-ui", "sans-serif"] },
      fontSize: {
        "display": ["48px", { lineHeight: "56px", letterSpacing: "-0.025em", fontWeight: "800" }],
        "display-mobile": ["36px", { lineHeight: "44px", letterSpacing: "-0.02em", fontWeight: "800" }],
        "headline-lg": ["32px", { lineHeight: "40px", letterSpacing: "-0.02em", fontWeight: "700" }],
        "headline-lg-mobile": ["26px", { lineHeight: "34px", letterSpacing: "-0.015em", fontWeight: "700" }],
        "headline-md": ["24px", { lineHeight: "32px", letterSpacing: "-0.015em", fontWeight: "700" }],
        "headline-sm": ["20px", { lineHeight: "28px", letterSpacing: "-0.01em", fontWeight: "600" }],
        "title-md": ["16px", { lineHeight: "24px", letterSpacing: "-0.005em", fontWeight: "600" }],
        "body-lg": ["16px", { lineHeight: "26px", fontWeight: "400" }],
        "body-md": ["14px", { lineHeight: "22px", fontWeight: "400" }],
        "label-md": ["12px", { lineHeight: "16px", letterSpacing: "0.04em", fontWeight: "600" }],
        "label-sm": ["11px", { lineHeight: "14px", letterSpacing: "0.02em", fontWeight: "500" }]
      }
    }
  }
};
```

## 12. Cara memakai dokumen ini

Awali setiap prompt ke Stitch, Antigravity, atau agen lain dengan:

> Ikuti `design.md` pada proyek ini secara ketat. Jangan mengubah palet, tipografi, radius, ikon, maupun struktur navigasi. Hanya ubah bagian yang saya sebutkan.
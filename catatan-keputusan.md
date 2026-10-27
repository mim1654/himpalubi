# Catatan Keputusan

## 2026-10-27: Tailwind Play CDN diganti CSS statis
- Alasan: Play CDN mengompilasi CSS di browser tiap kunjungan, penyebab utama Performance Lighthouse 71.
- Hasil: `css/tailwind.css` (50 KB, minify) dibuat dari `tailwind.config.js` (gabungan token 21 halaman, tanpa konflik).
- Tautan CSS ditaruh di akhir `<head>` agar urutan prioritas sama seperti sebelumnya.
- PENTING: bila menambah kelas Tailwind baru di HTML/JS, CSS harus dibuat ulang:
  `npx tailwindcss@3.4.17 -c tailwind.config.js -i input.css -o css/tailwind.css --minify`
  (input.css berisi tiga baris: @tailwind base; @tailwind components; @tailwind utilities;), lalu naikkan `?v=` pada tautan.
- Belum dikerjakan: `defer` pada skrip, font Material Symbols dipangkas, sitemap.

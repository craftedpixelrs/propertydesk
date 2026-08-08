# Slike za landing stranicu

Ovaj folder sadrži marketing slike koje se pojavljuju na `https://propertydesk.app/`. Sadržaj se servira preko Next.js `<Image>` komponente sa auto-optimizacijom (WebP/AVIF konverzija, responsive `srcset`, lazy loading za sekcije ispod prevoja).

## Trenutni fajlovi

| Fajl | Gde se pojavljuje | Natural dimensions |
|---|---|---|
| `desktop.webp` | Hero (desno pored naslova) | 1448 × 1086 (~4:3) |
| `mobile.webp` | Personas sekcija (mobilni frame) | 1122 × 1402 (~4:5) |
| `logo.png` | Marketing header + footer, favicon, Apple touch icon, PWA manifest ikone | 649 × 621 (≈ kvadrat) |

Landing komponente čitaju putanje i intrinsic dimenzije iz `LANDING_IMAGES` konstante u [`src/lib/constants/app.ts`](../../../src/lib/constants/app.ts). Ako želiš da neku sliku privremeno sakriješ i vratiš placeholder — postavi vrednost na `null` u konstanti umesto da brišeš fajl.

## Kako se logo koristi za favicon

Kad `logo.png` ovde postoji, treba ga kopirati u dva mesta koja Next.js file-convention automatski upire kao ikone:

- `src/app/icon.png` → `<link rel="icon">` (svi browseri)
- `src/app/apple-icon.png` → `<link rel="apple-touch-icon">` (iOS home screen)

I u dve PWA-manifest ikone koje generišemo iz izvornog `logo.png` sa transparentnom pozadinom:

- `public/icons/icon-192.png` — 192 × 192 (Android install prompt)
- `public/icons/icon-512.png` — 512 × 512 (splash screen, PWA)

Generisanje PWA ikona (kad promeniš logo):

```powershell
Add-Type -AssemblyName System.Drawing
$src = [System.Drawing.Image]::FromFile((Resolve-Path 'public\images\landing\logo.png'))
foreach ($size in @(192, 512)) {
  $bmp = New-Object System.Drawing.Bitmap $size, $size
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.InterpolationMode = 'HighQualityBicubic'
  $g.SmoothingMode = 'HighQuality'
  $g.PixelOffsetMode = 'HighQuality'
  $g.Clear([System.Drawing.Color]::Transparent)
  $ratio = [Math]::Min($size / $src.Width, $size / $src.Height)
  $w = [int]($src.Width * $ratio); $h = [int]($src.Height * $ratio)
  $x = [int](($size - $w) / 2); $y = [int](($size - $h) / 2)
  $g.DrawImage($src, $x, $y, $w, $h)
  $bmp.Save((Join-Path (Resolve-Path 'public\icons').Path "icon-$size.png"), 'Png')
  $g.Dispose(); $bmp.Dispose()
}
$src.Dispose()
Copy-Item 'public\images\landing\logo.png' 'src\app\icon.png' -Force
Copy-Item 'public\images\landing\logo.png' 'src\app\apple-icon.png' -Force
```

## Preporučene dimenzije za buduće mockupove

- **Desktop** hero mockup: bilo koji odnos radi, `MockupFrame` prati prirodne dimenzije. Za sharpness, ciljaj bar 1440 px širine (retina: 2880 px).
- **Mobile** personas mockup: takođe prirodni odnos. Ciljaj bar 540 px širine (retina: 1080 px).
- **Logo**: kvadratan, sa transparentnom pozadinom (PNG), bar 512 × 512 za retina + PWA install prompt.

## Format i optimizacija

- **PNG** je uvek OK — Next.js svakako reoptimizuje pri isporuci
- **WebP** kvalitet 85: ~1/3 veličine PNG-a bez vidljive razlike (kvalitet za landing)
- **AVIF** još bolja kompresija, ali sporija konverzija
- **Ne kopiraj RAW/PSD/TIFF** — samo finalne rasterske slike

**Konverzija PNG → WebP (opciono):**
```powershell
cwebp -q 85 desktop.png -o desktop.webp
# ili
magick desktop.png -quality 85 desktop.webp
```

Ako pređeš na WebP, izmeni ekstenziju u `LANDING_IMAGES` konstanti.

## Dodavanje NOVE slike

1. Dropni sliku ovde
2. Dodaj novi ključ u `LANDING_IMAGES` u `src/lib/constants/app.ts` (uključi `src`, `width`, `height`)
3. Uvezi je u odgovarajuću komponentu i koristi kroz `<MockupFrame>` ili direktno `<Image>` iz `next/image`

# Ensancha las imágenes de diálogo estirando solo columnas sin decoración, banda por banda.
# Uso (desde la raíz del repo): python3 frontend/tools/generar-dialogos.py Imagenes frontend/public/img/ui   (requiere Pillow y numpy)
import sys, numpy as np
from PIL import Image
SRC = sys.argv[1]; DST = sys.argv[2]
ASPECTO = 4.4; ANCHO_FINAL = 1600
# (archivo origen, destino, cortes de banda en coordenadas del recorte)
# (origen, destino, modo, exclusiones [x0,x1) en coords del recorte)
#  'bandas': cada banda estira sus propias columnas lisas (decoraciones dentro de una sola banda)
#  'comun' : todas las bandas estiran las mismas columnas (decoración que cruza bandas, p. ej. la muesca)
CONF = [
  ('DialogoDeZinnia.png', 'dialogo_zinnia.png', 'bandas', [(0, 720)]),
  ('Dialogo del usuario en español.png', 'dialogo_usuario.png', 'comun', [(0, 615), (1130, 1300)]),
  ('DialogoDeNarracionGeneral.png', 'dialogo_narracion.png', 'comun', []),
]
def recorte(im):
  a = np.array(im)[:, :, 3]; ys, xs = np.where(a > 20)
  return im.crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))
def bandas(arr):
  # cortes: filas casi totalmente opacas y oscuras (líneas de borde horizontales largas)
  h, w = arr.shape[:2]
  opaco = (arr[:, :, 3] > 200).mean(axis=1)
  # la banda del cuerpo empieza en la primera fila con >85% opaca y termina en la última
  filas = np.where(opaco > 0.85)[0]
  top, bot = filas.min(), filas.max()
  return [(0, top + 3), (top + 3, bot - 3), (bot - 3, h)]
def libres(band):
  b = band.astype(int); d = np.abs(b[:, 1:] - b[:, :-1]).max(axis=(0, 2))
  return np.concatenate([d < 10, [False]])
def zonas_libres(band, libre=None, excl=()):
  if libre is None: libre = libres(band)
  libre = libre.copy(); w = band.shape[1]
  for a, b in excl: libre[a:b] = False
  m = int(w * 0.08); libre[:m] = False; libre[w - m:] = False
  zs, i = [], 0
  while i < w:
    if libre[i]:
      j = i
      while j < w and libre[j]: j += 1
      if j - i >= 60: zs.append((i, j))
      i = j
    else: i += 1
  return zs
def estirar(band, W, zs):
  h, w = band.shape[:2]; extra = W - w
  tot = sum(b - a for a, b in zs)
  if not zs: raise SystemExit('sin zonas libres')
  partes, x, usado = [], 0, 0
  for k, (a, b) in enumerate(zs):
    partes.append(band[:, x:a])
    add = extra - usado if k == len(zs) - 1 else round(extra * (b - a) / tot)
    usado += add
    seg = Image.fromarray(band[:, a:b]).resize((b - a + add, h), Image.BILINEAR)
    partes.append(np.array(seg)); x = b
  partes.append(band[:, x:])
  out = np.concatenate(partes, axis=1); assert out.shape[1] == W, (out.shape, W); return out
for src, dst, modo, excl in CONF:
  im = recorte(Image.open(f'{SRC}/{src}').convert('RGBA')); arr = np.array(im); h, w = arr.shape[:2]
  W = round(h * ASPECTO); bs = bandas(arr)
  if modo == 'comun':
    comun = np.logical_and.reduce([libres(arr[a:b]) for a, b in bs]); zs = [zonas_libres(arr, comun, excl)] * len(bs)
  else:
    zs = [zonas_libres(arr[a:b], None, excl if k == 0 else ()) for k, (a, b) in enumerate(bs)]
  out = np.concatenate([estirar(arr[a:b], W, z) for (a, b), z in zip(bs, zs)], axis=0)
  out[:, :, 3] = np.where(out[:, :, 3] > 150, 255, out[:, :, 3])  # cuerpo opaco: el texto se lee sobre cualquier fondo
  res = Image.fromarray(out).resize((ANCHO_FINAL, round(ANCHO_FINAL * h / W)), Image.LANCZOS)
  res.save(f'{DST}/{dst}', optimize=True)
  print(dst, (w, h), '->', res.size, 'bandas', bandas(arr), zs)

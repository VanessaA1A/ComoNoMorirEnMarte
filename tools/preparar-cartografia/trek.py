"""Recortes de capas de NASA Mars Trek (WMTS) bajando SOLO los mosaicos que tocan la zona pedida.

Mars Trek sirve Marte en cilíndrica equidistante (lon/lat, esfera Mars 2000) con la rejilla "default028mm":
en el nivel z hay 2^(z+1) × 2^z mosaicos de 256 px y cada píxel mide 180 / (256 · 2^z) grados.
Plantilla: https://trek.nasa.gov/tiles/Mars/EQ/{capa}/1.0.0/default/default028mm/{z}/{fila}/{col}.{ext}
Un mosaico que no existe (404) significa que el producto no cubre ese lugar: queda transparente y se cuenta.
"""
import io
import math
import os
import time
import urllib.error
import urllib.request

from PIL import Image

PLANTILLA = "https://trek.nasa.gov/tiles/Mars/EQ/{capa}/1.0.0/default/default028mm/{z}/{fila}/{col}.{ext}"
UA = {"User-Agent": "cartografia-juego/1.0"}
M_POR_GRADO = 3396190.0 * math.pi / 180.0
LADO = 256
ESTADO = {"bytes": 0, "peticiones": 0, "faltantes": 0}


def grados_por_px(z):
    return 180.0 / (LADO * 2 ** z)


def m_por_px(z):
    return grados_por_px(z) * M_POR_GRADO


def _mosaico(capa, ext, z, fila, col, cache):
    ruta = os.path.join(cache, capa, str(z), str(fila), f"{col}.{ext}")
    if os.path.exists(ruta):
        return Image.open(ruta).convert("RGBA") if os.path.getsize(ruta) else None
    os.makedirs(os.path.dirname(ruta), exist_ok=True)
    url = PLANTILLA.format(capa=capa, z=z, fila=fila, col=col, ext=ext)
    for intento in range(4):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60) as r:
                datos = r.read()
            ESTADO["bytes"] += len(datos)
            ESTADO["peticiones"] += 1
            with open(ruta, "wb") as f:
                f.write(datos)
            return Image.open(io.BytesIO(datos)).convert("RGBA")
        except urllib.error.HTTPError as e:
            if e.code == 404:  # sin cobertura
                ESTADO["peticiones"] += 1
                ESTADO["faltantes"] += 1
                open(ruta, "wb").close()
                return None
            if intento == 3:
                raise
        except Exception:  # noqa: BLE001
            if intento == 3:
                raise
        time.sleep(1 + intento)


def recorte(capa, ext, z, oeste, este, sur, norte, cache, px=None):
    """Imagen RGBA de la caja lon/lat (longitud Este −180..180) a la resolución del nivel z (o al tamaño px)."""
    g = grados_por_px(z)
    gx0, gx1 = (oeste + 180) / g, (este + 180) / g      # píxeles globales (columnas)
    gy0, gy1 = (90 - norte) / g, (90 - sur) / g          # píxeles globales (filas)
    c0, c1 = int(gx0 // LADO), int((gx1 - 1e-9) // LADO)
    f0, f1 = int(gy0 // LADO), int((gy1 - 1e-9) // LADO)
    lienzo = Image.new("RGBA", ((c1 - c0 + 1) * LADO, (f1 - f0 + 1) * LADO), (0, 0, 0, 0))
    faltan = 0
    for fila in range(f0, f1 + 1):
        for col in range(c0, c1 + 1):
            m = _mosaico(capa, ext, z, fila, col, cache)
            if m is None:
                faltan += 1
            else:
                lienzo.paste(m, ((col - c0) * LADO, (fila - f0) * LADO))
    caja = (gx0 - c0 * LADO, gy0 - f0 * LADO, gx1 - c0 * LADO, gy1 - f0 * LADO)
    tam = px or (max(1, round(gx1 - gx0)), max(1, round(gy1 - gy0)))
    img = lienzo.transform(tam, Image.EXTENT, caja, resample=Image.BILINEAR)
    total = (c1 - c0 + 1) * (f1 - f0 + 1)
    return img, {"nivel": z, "m_por_px_nativo": round(m_por_px(z), 1), "mosaicos": total, "mosaicos_sin_datos": faltan,
                 "px": list(tam), "url_plantilla": PLANTILLA.format(capa=capa, z="{z}", fila="{fila}", col="{col}", ext=ext)}


def sin_datos(img):
    """True si la imagen no tiene ningún píxel con datos (todo transparente)."""
    return img.getchannel("A").getextrema()[1] == 0

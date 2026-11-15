"""PARTE 3: corredor de la ruta en alta resolución (lectura por rangos, sin descargar archivos completos).

- Ortofoto USGS de 25 cm: solo los mosaicos a <= 150 m de cualquier tramo de ruta_real.json (corredor de ~300 m),
  con rangos HTTP EXACTOS por fila (rangos_exactos.py). Pirámide: nivel 5 = 25 cm/px y nivel 4 = 50 cm/px,
  en Frontend/public/cartografia/ortofoto/{nivel}/{x}/{y}.jpg, junto a los niveles 0-3 de la zona.
- Relieve USGS de 1 m: filas comprimidas EXACTAS del corredor; se guarda en mosaicos PNG de 16 bits de 128 m
  (relieve_1m/{x}/{y}.png) solo donde hay corredor, con la misma codificación que relieve.png.
Uso: tools/cache/venv/Scripts/python.exe tools/preparar-cartografia/corredor.py [--solo ortofoto|relieve]
"""
import argparse
import json
import math
import os
import sys
import time

import numpy as np
from PIL import Image

sys.path.insert(0, os.path.dirname(__file__))
import rangos_exactos as R  # noqa: E402

RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
CART = os.path.join(RAIZ, "Frontend", "public", "cartografia")
CACHE = os.path.join(RAIZ, "tools", "cache", "carto", "corredor")
R_M = 3396190.0
URL_ORTO = "https://asc-pds-services.s3.us-west-2.amazonaws.com/mosaic/MSL_Gale_Orthophoto_Mosaic_25cm_v3.tif"
URL_DEM = "https://planetarymaps.usgs.gov/mosaic/Mars/MSL/MSL_Gale_DEM_Mosaic_1m_v3.tif"
BUFFER_M = 150.0
REL = json.load(open(os.path.join(CART, "relieve.json"), encoding="utf-8"))
X0, Y1 = REL["proyectado_m"]["x0"], REL["proyectado_m"]["y1"]
LADO_ZONA = REL["lado_m"]


def lineas_xy():
    ruta = json.load(open(os.path.join(RAIZ, "Frontend", "src", "data", "ruta_real.json"), encoding="utf-8"))
    salida = []
    for t in ruta["tramos"].values():
        salida.append([(R_M * math.radians(lon if lon <= 180 else lon - 360), R_M * math.radians(lat)) for lon, lat in t["linea"]])
    for p in ruta["puntos"]:
        x, y = R_M * math.radians(p["lon"] if p["lon"] <= 180 else p["lon"] - 360), R_M * math.radians(p["lat"])
        salida.append([(x, y), (x, y)])
    return salida


def dist_seg(px, py, a, b):
    ax, ay = a; bx, by = b
    dx, dy = bx - ax, by - ay
    t = 0.0 if dx == dy == 0 else max(0.0, min(1.0, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)))
    return math.hypot(px - ax - t * dx, py - ay - t * dy)


def mosaicos_corredor(lado_m):
    """Mosaicos (tx, ty) de lado `lado_m` cuyo cuadrado toca el corredor de BUFFER_M."""
    lineas = lineas_xy()
    n = math.ceil(LADO_ZONA / lado_m)
    medio = lado_m / 2 * math.sqrt(2)
    sel = set()
    for tx in range(n):
        for ty in range(n):
            cx, cy = X0 + (tx + 0.5) * lado_m, Y1 - (ty + 0.5) * lado_m
            if any(dist_seg(cx, cy, a, b) <= BUFFER_M + medio for l in lineas for a, b in zip(l, l[1:])):
                sel.add((tx, ty))
    return sel


# ---------------------------------------------------------------- ortofoto 25 cm
def ortofoto():
    os.makedirs(CACHE, exist_ok=True)
    geo = R.geometria("/vsicurl/" + URL_ORTO)
    T = geo["transform"]
    col0 = int(round((X0 - T.c) / 0.25)); fila0 = int(round((T.f - Y1) / 0.25))
    sel = mosaicos_corredor(64.0)  # nivel 5: 256 px × 0,25 m = 64 m
    print(f"ortofoto 25 cm: {len(sel)} mosaicos en el corredor; ~{len(sel) * 256 * (256 + 2.3) / 1e6:.1f} MB a transferir")
    R.BYTES.update(total=0, peticiones=0)
    t0 = time.time()
    filas_ty = sorted({ty for _, ty in sel})
    for n, ty in enumerate(filas_ty):
        txs = sorted(tx for tx, t in sel if t == ty and not os.path.exists(os.path.join(CACHE, f"o5_{tx}_{ty}.npy")))
        tramos, ini = [], None
        for tx in txs:  # tramos contiguos de mosaicos de la misma fila
            if ini is None:
                ini = prev = tx
            elif tx == prev + 1:
                prev = tx
            else:
                tramos.append((ini, prev)); ini = prev = tx
        if ini is not None:
            tramos.append((ini, prev))
        for a, b in tramos:
            bloque = R.leer_ventana(URL_ORTO, geo, fila0 + ty * 256, col0 + a * 256, 256, (b - a + 1) * 256, hilos=16)
            for tx in range(a, b + 1):
                np.save(os.path.join(CACHE, f"o5_{tx}_{ty}.npy"), bloque[:, (tx - a) * 256:(tx - a + 1) * 256])
        print(f"  fila de mosaicos {n + 1}/{len(filas_ty)} · {R.BYTES['total'] / 1e6:.1f} MB · {time.time() - t0:.0f} s", flush=True)
    # nivel 5 (25 cm) y nivel 4 (50 cm; donde falte el 25 cm se completa con el 1 m de la zona)
    orto1 = np.load(os.path.join(RAIZ, "tools", "cache", "carto", "ortofoto_1m.npy"))
    total = 0
    for tx, ty in sel:
        d = np.load(os.path.join(CACHE, f"o5_{tx}_{ty}.npy"))
        ruta = os.path.join(CART, "ortofoto", "5", str(tx)); os.makedirs(ruta, exist_ok=True)
        Image.fromarray(d).save(os.path.join(ruta, f"{ty}.jpg"), quality=75, optimize=True)
        total += os.path.getsize(os.path.join(ruta, f"{ty}.jpg"))
    sel4 = {(tx // 2, ty // 2) for tx, ty in sel}
    for tx4, ty4 in sel4:
        lienzo = np.zeros((512, 512), dtype=np.uint8)
        for dx in (0, 1):
            for dy in (0, 1):
                f = os.path.join(CACHE, f"o5_{2 * tx4 + dx}_{2 * ty4 + dy}.npy")
                if os.path.exists(f) and (2 * tx4 + dx, 2 * ty4 + dy) in sel:
                    lienzo[dy * 256:(dy + 1) * 256, dx * 256:(dx + 1) * 256] = np.load(f)
                else:  # relleno con la ortofoto de 1 m de la zona (misma fuente, menor resolución)
                    r0, c0 = (2 * ty4 + dy) * 64, (2 * tx4 + dx) * 64
                    trozo = orto1[r0:r0 + 64, c0:c0 + 64]
                    if trozo.size:
                        lienzo[dy * 256:dy * 256 + trozo.shape[0] * 4, dx * 256:dx * 256 + trozo.shape[1] * 4] = np.kron(trozo, np.ones((4, 4), dtype=np.uint8))
        im = Image.fromarray(lienzo).resize((256, 256), Image.LANCZOS)
        ruta = os.path.join(CART, "ortofoto", "4", str(tx4)); os.makedirs(ruta, exist_ok=True)
        im.save(os.path.join(ruta, f"{ty4}.jpg"), quality=75, optimize=True)
        total += os.path.getsize(os.path.join(ruta, f"{ty4}.jpg"))
    tiles = json.load(open(os.path.join(CART, "ortofoto", "tiles.json"), encoding="utf-8"))
    tiles["niveles"] = [n for n in tiles["niveles"] if n["nivel"] <= 3] + [
        {"nivel": 4, "m_por_px": 0.5, "px": 6000, "mosaicos_por_lado": 24, "solo_corredor": True},
        {"nivel": 5, "m_por_px": 0.25, "px": 12000, "mosaicos_por_lado": 47, "solo_corredor": True}]
    tiles["corredor_25cm"] = {"ancho_m": BUFFER_M * 2, "descripcion": "Solo los mosaicos a <= 150 m de algún tramo de ruta_real.json (incluidas las alternativas).",
                              "remuestreo": "nivel 5: píxeles originales de 25 cm sin remuestrear; nivel 4: Lanczos desde el nivel 5 (huecos con la ortofoto de 1 m)",
                              "mosaicos": {"4": sorted(f"{x}/{y}" for x, y in sel4), "5": sorted(f"{x}/{y}" for x, y in sel)},
                              "transferido_mb": round(R.BYTES["total"] / 1e6, 1), "bytes": total}
    with open(os.path.join(CART, "ortofoto", "tiles.json"), "w", encoding="utf-8") as f:
        json.dump(tiles, f, ensure_ascii=False, indent=1)
    print(f"ortofoto corredor: {len(sel)} mosaicos de 25 cm + {len(sel4)} de 50 cm = {total / 1e6:.2f} MB; transferido {R.BYTES['total'] / 1e6:.1f} MB")


# ---------------------------------------------------------------- relieve 1 m
def relieve():
    import rasterio
    os.makedirs(CACHE, exist_ok=True)
    sel = mosaicos_corredor(128.0)  # 128 px × 1 m (corredor más ajustado: menos filas que bajar)
    with rasterio.open("/vsicurl/" + URL_DEM) as ds:
        T = ds.transform
        col0 = int(round((X0 - T.c) / T.a)); fila0 = int(round((T.f - Y1) / -T.e))
        nodata = ds.nodata
        # solo las filas a <= 150 m (norte-sur) de algún tramo: el resto de cada mosaico queda sin dato
        ys = [y for l in lineas_xy() for _, y in l]
        y_max, y_min = max(ys) + BUFFER_M, min(ys) - BUFFER_M
        filas = sorted({fila0 + ty * 128 + k for _, ty in sel for k in range(128)
                        if ty * 128 + k < LADO_ZONA and y_min <= Y1 - (ty * 128 + k + 0.5) <= y_max})
        faltan = [f for f in filas if not os.path.exists(os.path.join(CACHE, f"d_{f}.npy"))]
        mb = sum(int(ds.get_tag_item(f"BLOCK_SIZE_0_{f}", "TIFF", bidx=1)) for f in faltan) / 1e6
    print(f"relieve 1 m: {len(sel)} mosaicos de 128 m; {len(faltan)} filas por bajar = {mb:.1f} MB")
    if mb > 150:
        raise SystemExit("relieve: más de 150 MB, me detengo")
    R.BYTES.update(total=0, peticiones=0); t0 = time.time()
    for i in range(0, len(faltan), 100):
        tanda = faltan[i:i + 100]
        leidas, _ = R.filas_lzw(URL_DEM, "/vsicurl/" + URL_DEM, tanda, hilos=16)
        for f in tanda:
            np.save(os.path.join(CACHE, f"d_{f}.npy"), leidas[f][col0:col0 + int(LADO_ZONA)].astype(np.float32))
        print(f"  filas {i + len(tanda)}/{len(faltan)} · {R.BYTES['total'] / 1e6:.1f} MB · {time.time() - t0:.0f} s", flush=True)
    hmin = REL.get("altura_min_exacta_m", REL["altura_min_m"]); esc = REL["escala_m"]
    total, err_max = 0, 0.0
    for tx, ty in sel:
        def fila(k):
            f = os.path.join(CACHE, f"d_{fila0 + ty * 128 + k}.npy")
            return np.load(f)[tx * 128:(tx + 1) * 128] if os.path.exists(f) else np.full(128, np.nan, dtype=np.float32)
        bloque = np.stack([fila(k) for k in range(128) if ty * 128 + k < LADO_ZONA]).astype(np.float64)
        bloque[bloque == nodata] = np.nan  # fuera del corredor: sin dato (se guarda como 0)
        v = np.clip(np.round((np.nan_to_num(bloque, nan=hmin) - hmin) / esc), 0, 65535).astype(np.uint16)
        err_max = max(err_max, float(np.nanmax(np.abs(v * esc + hmin - bloque))) if np.isfinite(bloque).any() else 0.0)
        ruta = os.path.join(CART, "relieve_1m", str(tx)); os.makedirs(ruta, exist_ok=True)
        Image.fromarray(v).save(os.path.join(ruta, f"{ty}.png"), optimize=True)
        total += os.path.getsize(os.path.join(ruta, f"{ty}.png"))
    meta = {"descripcion": "Relieve de 1 m (sin remuestrear) solo en el corredor de la ruta (<= 150 m de algún tramo).",
            "plantilla": "relieve_1m/{x}/{y}.png", "lado_mosaico_px": 128, "m_por_px": 1, "limites": REL["limites"], "proyectado_m": REL["proyectado_m"],
            "codificacion": f"PNG gris 16 bits: altura = {hmin} + valor × {esc} m (igual que relieve.png)", "altura_min_m": hmin, "escala_m": esc,
            "error_max_m": round(err_max, 4), "mosaicos": sorted(f"{x}/{y}" for x, y in sel), "transferido_mb": round(R.BYTES["total"] / 1e6, 1),
            "bytes": total, "fuente": REL["fuente"]}
    with open(os.path.join(CART, "relieve_1m", "relieve_1m.json"), "w", encoding="utf-8") as f:
        json.dump(meta, f, ensure_ascii=False, indent=1)
    print(f"relieve 1 m: {len(sel)} mosaicos = {total / 1e6:.2f} MB; error máx {err_max:.4f} m; transferido {R.BYTES['total'] / 1e6:.1f} MB")


if __name__ == "__main__":
    ap = argparse.ArgumentParser(); ap.add_argument("--solo", choices=["ortofoto", "relieve"]); a = ap.parse_args()
    if a.solo in (None, "ortofoto"):
        ortofoto()
    if a.solo in (None, "relieve"):
        relieve()

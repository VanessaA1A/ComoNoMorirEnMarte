"""Prueba pequeña: recorta 200 x 200 m alrededor de Bradbury Landing (posición de aterrizaje de Curiosity
según PLACES, sitio 1) del DEM 1 m y de la ortofoto 25 cm de Gale, leyendo SOLO por rangos HTTP.

Uso:  tools/cache/venv/Scripts/python.exe tools/preparar-cartografia/prueba_recorte.py
Salida: tools/cache/prueba/ (relieve_200m.tif, relieve_200m.png, ortofoto_200m.jpg, prueba.json)
"""
import json
import os
import sys
import time

sys.path.insert(0, os.path.dirname(__file__))
from sondear import FUENTES, contador  # noqa: E402

import numpy as np  # noqa: E402
import rasterio  # noqa: E402
from rasterio.windows import from_bounds  # noqa: E402
from PIL import Image  # noqa: E402

# PLACES (localized_pos.csv, SITE 1): este/norte en la MISMA proyección equirectangular de los mosaicos
ATERRIZAJE = {"easting": 8146811.223, "northing": -272039.268, "lat": -4.589466996, "lon": 137.441632997}
LADO = 200.0
SALIDA = "tools/cache/prueba"


def recortar(nombre, url, direct_io):
    c = contador()
    x, y = ATERRIZAJE["easting"], ATERRIZAJE["northing"]
    caja = (x - LADO / 2, y - LADO / 2, x + LADO / 2, y + LADO / 2)
    t0 = time.time()
    opciones = {"CPL_DEBUG": "ON", "GDAL_DISABLE_READDIR_ON_OPEN": "EMPTY_DIR", "CPL_VSIL_CURL_ALLOWED_EXTENSIONS": ".tif",
                "GDAL_HTTP_MERGE_CONSECUTIVE_RANGES": "YES"}
    if direct_io:
        opciones["GTIFF_DIRECT_IO"] = "YES"  # sin compresión: lee solo los bytes de la ventana en cada fila
    with rasterio.Env(**opciones):
        with rasterio.open(url) as ds:
            ventana = from_bounds(*caja, transform=ds.transform).round_offsets().round_lengths()
            datos = ds.read(1, window=ventana)
            perfil = ds.profile.copy()
            perfil.update(width=datos.shape[1], height=datos.shape[0], transform=ds.window_transform(ventana),
                          driver="GTiff", tiled=False, compress="deflate")
            nodata = ds.nodata
    seg = time.time() - t0
    return datos, perfil, nodata, {"mb_transferidos": round(c.bytes / 1e6, 2), "peticiones": c.peticiones,
                                   "segundos": round(seg, 1), "px": list(datos.shape[::-1]), "ventana": str(ventana)}


if __name__ == "__main__":
    os.makedirs(SALIDA, exist_ok=True)
    informe = {"centro": ATERRIZAJE, "lado_m": LADO}

    dem, perfil, nd, info = recortar("relieve", FUENTES["relieve"], direct_io=False)
    with rasterio.open(f"{SALIDA}/relieve_200m.tif", "w", **perfil) as f:
        f.write(dem, 1)
    validos = dem[dem != nd]
    info.update(alt_min_m=float(validos.min()), alt_max_m=float(validos.max()))
    # Vista para mirar: alturas estiradas a 0..255 con sombreado simple (solo para la prueba)
    gy, gx = np.gradient(dem.astype("float64"))
    sombra = np.clip(0.5 + (gx * -0.7 + gy * 0.7) / 2, 0, 1)
    alt = (dem - validos.min()) / max(1e-6, validos.max() - validos.min())
    Image.fromarray((np.clip(0.55 * alt + 0.45 * sombra, 0, 1) * 255).astype("uint8")).resize((600, 600), Image.NEAREST).save(f"{SALIDA}/relieve_200m.png")
    informe["relieve"] = info
    print("relieve:", info)

    orto, perfil, nd, info = recortar("ortofoto", FUENTES["ortofoto"], direct_io=True)
    Image.fromarray(orto).save(f"{SALIDA}/ortofoto_200m.jpg", quality=85)
    informe["ortofoto"] = info
    print("ortofoto:", info)

    with open(f"{SALIDA}/prueba.json", "w", encoding="utf-8") as f:
        json.dump(informe, f, ensure_ascii=False, indent=2)

"""Sondea los mosaicos de Gale (USGS, Parker y Calef, 2016) SIN descargarlos: lee solo la cabecera por rangos HTTP.

Uso (desde la raíz del repo):
    tools/cache/venv/Scripts/python.exe tools/preparar-cartografia/sondear.py

Dice de cada archivo: CRS, resolución, tamaño, bloques (tiled) o franjas (striped), overviews,
y estima cuántos MB habría que transferir para recortar una zona de 3 x 3 km.
"""
import json
import logging
import math
import os
import re
import time

os.environ.setdefault("GDAL_DISABLE_READDIR_ON_OPEN", "EMPTY_DIR")
os.environ.setdefault("CPL_VSIL_CURL_ALLOWED_EXTENSIONS", ".tif")

import rasterio  # noqa: E402

FUENTES = {
    "relieve": "/vsicurl/https://planetarymaps.usgs.gov/mosaic/Mars/MSL/MSL_Gale_DEM_Mosaic_1m_v3.tif",
    "ortofoto": "/vsicurl/https://asc-pds-services.s3.us-west-2.amazonaws.com/mosaic/MSL_Gale_Orthophoto_Mosaic_25cm_v3.tif",
}


class ContadorBytes(logging.Handler):
    """Suma los rangos que GDAL pide por HTTP (mensajes de depuración "Downloading a-b")."""

    def __init__(self):
        super().__init__(logging.DEBUG)
        self.bytes = 0
        self.peticiones = 0

    def emit(self, registro):
        for a, b in re.findall(r"Downloading (\d+)-(\d+)", registro.getMessage()):
            self.bytes += int(b) - int(a) + 1
            self.peticiones += 1


def contador():
    c = ContadorBytes()
    for nombre in ("rasterio", "rasterio._env", "rasterio._base", "rasterio._io"):
        lg = logging.getLogger(nombre)
        lg.setLevel(logging.DEBUG)
        lg.addHandler(c)
    return c


def describir(nombre, url):
    c = contador()
    t0 = time.time()
    with rasterio.Env(CPL_DEBUG="ON", CPL_CURL_VERBOSE="NO"):
        with rasterio.open(url) as ds:
            perfil = ds.profile
            bloque = ds.block_shapes[0]  # (filas, columnas)
            tiled = bool(perfil.get("tiled")) or bloque[1] < ds.width
            res = ds.res
            km = 3000
            px = (math.ceil(km / abs(res[0])), math.ceil(km / abs(res[1])))
            bytes_px = ds.dtypes[0] and rasterio.dtypes.get_minimum_dtype  # solo para que el lint no se queje
            tam = {"uint8": 1, "int16": 2, "uint16": 2, "float32": 4, "float64": 8}[ds.dtypes[0]] * ds.count
            if tiled:
                bloques = math.ceil(px[0] / bloque[1] + 1) * math.ceil(px[1] / bloque[0] + 1)
                sin_comprimir = bloques * bloque[0] * bloque[1] * tam
            else:
                filas = px[1]
                sin_comprimir = filas * ds.width * tam  # en franjas se lee el ancho COMPLETO de cada fila
            info = {
                "archivo": url.split("/")[-1],
                "url": url.replace("/vsicurl/", ""),
                "crs": ds.crs.to_wkt() if ds.crs else None,
                "crs_corto": (ds.crs.to_string()[:160] if ds.crs else None),
                "resolucion_m": [abs(res[0]), abs(res[1])],
                "tamano_px": [ds.width, ds.height],
                "bandas": ds.count,
                "tipo": ds.dtypes[0],
                "nodata": ds.nodata,
                "compresion": perfil.get("compress"),
                "organizacion": "bloques (tiled)" if tiled else "franjas (striped)",
                "bloque_px": [bloque[1], bloque[0]],
                "overviews": ds.overviews(1),
                "limites": list(ds.bounds),
                "recorte_3km_px": list(px),
                "recorte_3km_mb_sin_comprimir": round(sin_comprimir / 1e6, 1),
            }
    info["cabecera_mb_transferidos"] = round(c.bytes / 1e6, 2)
    info["cabecera_peticiones"] = c.peticiones
    info["cabecera_segundos"] = round(time.time() - t0, 1)
    return info


if __name__ == "__main__":
    salida = {}
    for nombre, url in FUENTES.items():
        try:
            salida[nombre] = describir(nombre, url)
        except Exception as e:  # noqa: BLE001
            salida[nombre] = {"error": f"{type(e).__name__}: {e}"}
        d = salida[nombre]
        print(f"\n=== {nombre} ===")
        for k, v in d.items():
            if k != "crs":
                print(f"  {k}: {v}")
    os.makedirs("tools/cache/prueba", exist_ok=True)
    with open("tools/cache/prueba/sondeo.json", "w", encoding="utf-8") as f:
        json.dump(salida, f, ensure_ascii=False, indent=2)

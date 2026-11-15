"""Lector por rangos EXACTOS para la ortofoto de Gale (TIFF sin comprimir, franjas de 1 fila).

GDAL baja casi la franja entera de cada fila (~130-180 KB) aunque solo se necesiten unos cientos de bytes.
Como cada fila es contigua y sin compresión, aquí se pide por HTTP (Range) solo el tramo de cada fila
que cae dentro de la ventana. El desplazamiento de cada fila se lee del propio TIFF (BLOCK_OFFSET_0_<fila>).

Uso como módulo:  leer_ventana(url, fila0, col0, filas, cols, paso=1) -> numpy uint8 (filas/paso x cols)
"""
import os
import threading
import time
import urllib.request
from concurrent.futures import ThreadPoolExecutor

import numpy as np
import rasterio

os.environ.setdefault("GDAL_DISABLE_READDIR_ON_OPEN", "EMPTY_DIR")
os.environ.setdefault("CPL_VSIL_CURL_ALLOWED_EXTENSIONS", ".tif")

_estado = threading.local()
BYTES = {"total": 0, "peticiones": 0}
_candado = threading.Lock()


def _abrir():
    return urllib.request.build_opener()


def _rango(url, inicio, largo, reintentos=5):
    for i in range(reintentos):
        try:
            req = urllib.request.Request(url, headers={"Range": f"bytes={inicio}-{inicio + largo - 1}", "User-Agent": "como-no-morir-en-marte/cartografia"})
            with urllib.request.urlopen(req, timeout=60) as r:
                datos = r.read()
            if len(datos) != largo:
                raise IOError(f"esperaba {largo} bytes, llegaron {len(datos)}")
            with _candado:
                BYTES["total"] += len(datos) + 600  # + cabeceras HTTP aproximadas
                BYTES["peticiones"] += 1
            return datos
        except Exception:  # noqa: BLE001
            if i == reintentos - 1:
                raise
            time.sleep(1 + i)


def geometria(url_vsicurl):
    """Desplazamiento de la fila 0, bytes por fila y transformación, leídos del TIFF (solo cabecera)."""
    with rasterio.open(url_vsicurl) as ds:
        assert ds.count == 1 and ds.dtypes[0] == "uint8" and ds.profile.get("compress") is None
        o0 = int(ds.get_tag_item("BLOCK_OFFSET_0_0", "TIFF", bidx=1))
        o1 = int(ds.get_tag_item("BLOCK_OFFSET_0_1", "TIFF", bidx=1))
        omed = int(ds.get_tag_item(f"BLOCK_OFFSET_0_{ds.height // 2}", "TIFF", bidx=1))
        paso = o1 - o0
        assert paso == ds.width and omed == o0 + (ds.height // 2) * paso, "las filas no son contiguas: usar GDAL"
        return {"offset0": o0, "bytes_fila": paso, "transform": ds.transform, "ancho": ds.width, "alto": ds.height, "crs": ds.crs}


def leer_ventana(url_http, geo, fila0, col0, filas, cols, paso=1, hilos=12):
    """Lee filas fila0..fila0+filas (cada `paso` filas) y columnas col0..col0+cols. Devuelve uint8 2D."""
    indices = list(range(fila0, fila0 + filas, paso))
    salida = np.zeros((len(indices), cols), dtype=np.uint8)

    def una(i_f):
        i, f = i_f
        datos = _rango(url_http, geo["offset0"] + f * geo["bytes_fila"] + col0, cols)
        salida[i] = np.frombuffer(datos, dtype=np.uint8)

    with ThreadPoolExecutor(max_workers=hilos) as ex:
        list(ex.map(una, enumerate(indices)))
    return salida

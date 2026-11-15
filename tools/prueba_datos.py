"""Prueba de acceso a los mosaicos de Gale (USGS, Parker y Calef, 2016) SIN descargarlos completos.

Lee por rangos HTTP (/vsicurl/) solo la cabecera y los bytes del recorte que se pide.

Uso (desde la raiz del repo):
    tools/cache/venv/Scripts/python.exe tools/prueba_datos.py

Hace:
  1. Describe cada archivo: CRS, resolucion, tamano, bloques (tiled) o franjas (striped), overviews.
  2. Estima los MB a transferir para un recorte de 3 x 3 km (con los tamanos REALES de las franjas
     cuando el archivo esta comprimido). No hace ese recorte.
  3. Recorta 200 x 200 m alrededor de Bradbury Landing y lo guarda en tools/cache/prueba/ (.tif y .png),
     con un tope de seguridad de MB por archivo.
"""
import os

# Antes de importar rasterio: que GDAL no liste directorios ni pida archivos auxiliares (.aux.xml, .ovr...).
os.environ["GDAL_DISABLE_READDIR_ON_OPEN"] = "EMPTY_DIR"
os.environ["CPL_VSIL_CURL_ALLOWED_EXTENSIONS"] = ".tif"

import json  # noqa: E402
import logging  # noqa: E402
import math  # noqa: E402
import re  # noqa: E402
import time  # noqa: E402

import numpy as np  # noqa: E402
import rasterio  # noqa: E402
from PIL import Image  # noqa: E402
from rasterio.windows import Window, from_bounds  # noqa: E402

RAIZ = os.path.dirname(os.path.abspath(__file__))
SALIDA = os.path.join(RAIZ, "cache", "prueba")

FUENTES = {
    "relieve": "https://planetarymaps.usgs.gov/mosaic/Mars/MSL/MSL_Gale_DEM_Mosaic_1m_v3.tif",
    # URL de descarga que da el catalogo de astrogeology.usgs.gov
    # (Mars MSL Gale Merged Orthophoto Mosaic 25cm, Calef y Parker 2016).
    "ortofoto": "https://asc-pds-services.s3.us-west-2.amazonaws.com/mosaic/MSL_Gale_Orthophoto_Mosaic_25cm_v3.tif",
}

# Bradbury Landing (sitio 1 de Curiosity) segun PLACES (localized_pos.csv, PDS Imaging Node),
# en la misma proyeccion de los mosaicos (Equirectangular, esfera de Marte R = 3396190 m).
# Equivale a 4.589467 S, 137.441633 E (planetocentrica).
BRADBURY_E = 8146811.223
BRADBURY_N = -272039.268

LADO_PRUEBA_M = 200
LADO_ZONA_M = 3000
TOPE_MB = 150  # tope por archivo: si se pasa, no se recorta (regla del plan B)
BYTES_TIPO = {"uint8": 1, "int16": 2, "uint16": 2, "float32": 4, "float64": 8}


class ContadorBytes(logging.Handler):
    """Suma los rangos HTTP que GDAL pide (mensajes de depuracion de /vsicurl/)."""

    def __init__(self):
        super().__init__(logging.DEBUG)
        self.bytes = 0
        self.peticiones = 0
        self.mensajes = []

    def emit(self, registro):
        msg = registro.getMessage()
        if "Downloading" not in msg:
            return
        self.mensajes.append(msg)
        for a, b in re.findall(r"(\d+)-(\d+)", msg):
            self.bytes += int(b) - int(a) + 1
            self.peticiones += 1

    def reiniciar(self):
        self.bytes = 0
        self.peticiones = 0
        self.mensajes = []

    @property
    def mb(self):
        return self.bytes / 1e6


CONTADOR = ContadorBytes()
_lg = logging.getLogger("rasterio")
_lg.setLevel(logging.DEBUG)
_lg.addHandler(CONTADOR)


def ventana_centrada(ds, este, norte, lado_m):
    m = lado_m / 2
    v = from_bounds(este - m, norte - m, este + m, norte + m, ds.transform)
    v = v.round_offsets().round_lengths()
    return v.intersection(Window(0, 0, ds.width, ds.height))


def bytes_franja(ds, fila):
    """Bytes comprimidos REALES de la franja de una fila (lo lee de la tabla StripByteCounts)."""
    t = ds.get_tag_item(f"BLOCK_SIZE_0_{fila}", "TIFF", bidx=1)
    return int(t) if t else 0


def estimar_mb(ds, ventana, filas_por_franja, comprimido, muestras=None):
    """MB a transferir para leer `ventana`.

    - En franjas comprimidas hay que bajar la franja ENTERA (todo el ancho del mosaico).
    - En franjas SIN comprimir, con GTIFF_DIRECT_IO, GDAL lee solo los bytes de la ventana.
    """
    tam = BYTES_TIPO[ds.dtypes[0]] * ds.count
    fila0, filas = int(ventana.row_off), int(ventana.height)
    if comprimido:
        franjas = list(range(fila0 // filas_por_franja, (fila0 + filas - 1) // filas_por_franja + 1))
        if muestras and len(franjas) > muestras:
            paso = len(franjas) / muestras
            elegidas = [franjas[int(i * paso)] for i in range(muestras)]
            medio = sum(bytes_franja(ds, f * filas_por_franja) for f in elegidas) / len(elegidas)
            return {"mb": round(medio * len(franjas) / 1e6, 1), "metodo": f"franjas reales, {muestras} muestras"}
        total = sum(bytes_franja(ds, f * filas_por_franja) for f in franjas)
        return {"mb": round(total / 1e6, 2), "metodo": "franjas reales, todas"}
    completo = filas * ds.width * tam
    directo = filas * int(ventana.width) * tam
    return {
        "mb": round(directo / 1e6, 2),
        "mb_sin_lectura_directa": round(completo / 1e6, 1),
        "metodo": "sin comprimir: lectura directa (solo bytes de la ventana)",
    }


def describir(ds, url):
    bloque = ds.block_shapes[0]  # (filas, columnas)
    tiled = bool(ds.profile.get("tiled")) or bloque[1] < ds.width
    return {
        "archivo": url.rsplit("/", 1)[-1],
        "url": url,
        "crs": ds.crs.to_string() if ds.crs else None,
        "crs_wkt": ds.crs.to_wkt() if ds.crs else None,
        "resolucion_m": [abs(ds.res[0]), abs(ds.res[1])],
        "tamano_px": [ds.width, ds.height],
        "bandas": ds.count,
        "tipo": ds.dtypes[0],
        "nodata": ds.nodata,
        "compresion": ds.profile.get("compress"),
        "organizacion": "bloques (tiled)" if tiled else "franjas (striped)",
        "bloque_px": [bloque[1], bloque[0]],
        "overviews": ds.overviews(1),
        "limites": list(ds.bounds),
    }


def leer_con_tope(ds, ventana, tope_mb, trozo=50):
    """Lee la ventana por trozos de filas y se detiene si la transferencia pasa del tope."""
    partes = []
    fila = int(ventana.row_off)
    fin = fila + int(ventana.height)
    while fila < fin:
        n = min(trozo, fin - fila)
        partes.append(ds.read(1, window=Window(ventana.col_off, fila, ventana.width, n)))
        fila += n
        if CONTADOR.mb > tope_mb:
            raise RuntimeError(f"se pasaron {CONTADOR.mb:.1f} MB (tope {tope_mb}); recorte cancelado")
    return np.vstack(partes)


def png_relieve(z, nodata, ruta):
    z = z.astype("float64")
    malo = (z == nodata) | ~np.isfinite(z)
    z[malo] = np.nan
    relleno = np.where(malo, np.nanmean(z), z)
    dy, dx = np.gradient(relleno, 1.0)  # 1 m por pixel
    pendiente = np.pi / 2 - np.arctan(np.hypot(dx, dy))
    aspecto = np.arctan2(-dx, dy)
    az, alt = np.radians(315), np.radians(45)
    sombra = np.sin(alt) * np.sin(pendiente) + np.cos(alt) * np.cos(pendiente) * np.cos(az - aspecto)
    lo, hi = np.nanpercentile(z, [1, 99])
    altura = np.clip((relleno - lo) / max(hi - lo, 1e-6), 0, 1)
    gris = np.clip(0.65 * np.clip(sombra, 0, 1) + 0.35 * altura, 0, 1)
    img = (gris * 255).astype("uint8")
    img[malo] = 0
    Image.fromarray(img).save(ruta)


def png_orto(a, nodata, ruta):
    validos = a[a != (nodata if nodata is not None else -1)]
    lo, hi = np.percentile(validos, [1, 99]) if validos.size else (0, 255)
    img = np.clip((a.astype("float64") - lo) / max(hi - lo, 1) * 255, 0, 255).astype("uint8")
    Image.fromarray(img).save(ruta)


def procesar(nombre, url):
    CONTADOR.reiniciar()
    t0 = time.time()
    opciones = {"CPL_DEBUG": "ON", "GTIFF_DIRECT_IO": "YES"}
    with rasterio.Env(**opciones):
        with rasterio.open("/vsicurl/" + url) as ds:
            info = describir(ds, url)
            info["cabecera"] = {"mb": round(CONTADOR.mb, 3), "peticiones": CONTADOR.peticiones,
                                "segundos": round(time.time() - t0, 1)}
            comprimido = info["compresion"] not in (None, "none")
            fpf = ds.block_shapes[0][0]

            # Estimacion para 3 x 3 km (no se recorta).
            CONTADOR.reiniciar()
            v3 = ventana_centrada(ds, BRADBURY_E, BRADBURY_N, LADO_ZONA_M)
            est3 = estimar_mb(ds, v3, fpf, comprimido, muestras=24)
            est3["px"] = [int(v3.width), int(v3.height)]
            est3["mb_para_estimar"] = round(CONTADOR.mb, 3)
            striped = info["organizacion"].startswith("franjas")
            est3["supera_tope"] = striped and est3["mb"] > TOPE_MB
            info["zona_3km"] = est3

            # Prueba 200 x 200 m.
            CONTADOR.reiniciar()
            v = ventana_centrada(ds, BRADBURY_E, BRADBURY_N, LADO_PRUEBA_M)
            est = estimar_mb(ds, v, fpf, comprimido)
            prueba = {"px": [int(v.width), int(v.height)], "estimado_mb": est["mb"]}
            if est["mb"] > TOPE_MB:
                prueba["error"] = f"estimado {est['mb']} MB > tope {TOPE_MB} MB; no se recorta"
                info["prueba_200m"] = prueba
                return info
            CONTADOR.reiniciar()
            t1 = time.time()
            try:
                datos = leer_con_tope(ds, v, TOPE_MB)
            except RuntimeError as e:
                prueba["error"] = str(e)
                prueba["mb_transferidos"] = round(CONTADOR.mb, 2)
                info["prueba_200m"] = prueba
                return info
            prueba["segundos"] = round(time.time() - t1, 1)
            prueba["mb_transferidos"] = round(CONTADOR.mb, 2)
            prueba["peticiones_http"] = CONTADOR.peticiones

            perfil = {
                "driver": "GTiff", "width": datos.shape[1], "height": datos.shape[0], "count": 1,
                "dtype": datos.dtype.name, "crs": ds.crs, "transform": ds.window_transform(v),
                "nodata": ds.nodata, "compress": "deflate",
            }
            nodata = ds.nodata

    os.makedirs(SALIDA, exist_ok=True)
    base = os.path.join(SALIDA, f"{nombre}_bradbury_200m")
    with rasterio.open(base + ".tif", "w", **perfil) as dst:
        dst.write(datos, 1)
    if nombre == "relieve":
        png_relieve(datos, nodata, base + ".png")
        validos = datos[(datos != nodata) & np.isfinite(datos)]
        if validos.size:
            prueba["altura_min_max_m"] = [round(float(validos.min()), 1), round(float(validos.max()), 1)]
    else:
        png_orto(datos, nodata, base + ".png")
    prueba["tif"] = base + ".tif"
    prueba["png"] = base + ".png"
    info["prueba_200m"] = prueba
    info["segundos_total"] = round(time.time() - t0, 1)
    return info


def main():
    resultado = {}
    for nombre, url in FUENTES.items():
        try:
            resultado[nombre] = procesar(nombre, url)
        except Exception as e:  # noqa: BLE001
            resultado[nombre] = {"error": f"{type(e).__name__}: {e}"}
        print(f"\n=== {nombre} ===")
        for k, v in resultado[nombre].items():
            if k != "crs_wkt":
                print(f"  {k}: {v}")
    os.makedirs(SALIDA, exist_ok=True)
    with open(os.path.join(SALIDA, "resultado.json"), "w", encoding="utf-8") as f:
        json.dump(resultado, f, ensure_ascii=False, indent=2)


if __name__ == "__main__":
    main()

"""Prepara la cartografía REAL de la zona boxwork de Gale para el juego (se corre UNA vez; el juego funciona sin conexión).

Fuentes (todas reales, con cita en Frontend/public/cartografia/fuentes.json):
  - Relieve: USGS "Mars MSL Gale Merged DEM 1m" (Parker y Calef, 2016), leído por rangos HTTP con GDAL.
  - Imagen: USGS "MSL Gale Merged Orthophoto Mosaic 25cm" (Calef y Parker, 2016), leída con rangos EXACTOS por fila.
  - Ruta de Curiosity: PDS PLACES de MSL (localized_pos.csv), doi:10.17189/1520397.

Zona: recuadro de 3 x 3 km centrado en el promedio de las 3 perforaciones del boxwork de 2025 (Altadena,
Valle de la Luna y Nevado Sajama; posiciones de PLACES). Nada se dibuja a mano: todo sale de los datos.

Uso (desde la raíz del repo):
    tools/cache/venv/Scripts/python.exe tools/preparar-cartografia/preparar.py [--solo relieve|ortofoto|ruta|derivadas]
Los recortes crudos quedan en tools/cache/carto/ (fuera del repo); al repo van solo los productos finales.
"""
import argparse
import csv
import datetime as dt
import json
import math
import os
import sys
import time

os.environ.setdefault("GDAL_DISABLE_READDIR_ON_OPEN", "EMPTY_DIR")
os.environ.setdefault("CPL_VSIL_CURL_ALLOWED_EXTENSIONS", ".tif")

import numpy as np  # noqa: E402
import rasterio  # noqa: E402
from rasterio.windows import Window  # noqa: E402
from PIL import Image  # noqa: E402

sys.path.insert(0, os.path.dirname(__file__))
import rangos_exactos as R  # noqa: E402

RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
CACHE = os.path.join(RAIZ, "tools", "cache", "carto")
SALIDA = os.path.join(RAIZ, "Frontend", "public", "cartografia")
PLACES = os.path.join(RAIZ, "tools", "cache", "places", "localized_pos.csv")

R_MARTE = 3396190.0  # radio de la esfera Mars 2000 que usan los mosaicos (ESRI:103885)
URL_DEM = "https://planetarymaps.usgs.gov/mosaic/Mars/MSL/MSL_Gale_DEM_Mosaic_1m_v3.tif"
URL_ORTO = "https://asc-pds-services.s3.us-west-2.amazonaws.com/mosaic/MSL_Gale_Orthophoto_Mosaic_25cm_v3.tif"
URL_PLACES = "https://planetarydata.jpl.nasa.gov/img/data/msl/msl_places/data_localizations/localized_pos.csv"

# Perforaciones del boxwork en 2025. Posición: PLACES localized_pos.csv (sitio/drive donde estaba el rover).
# Nombre, lugar y sol: partes de misión de NASA (blog de Curiosity), enlazados en "fuente".
BLOG_ALTADENA = "https://science.nasa.gov/blog/curiosity-blog-sols-4568-4569-a-close-look-at-the-altadena-drill-hole-and-tailings/"
BLOG_MONTE_GRANDE = "https://science.nasa.gov/blog/curiosity-blog-sols-4709-4715-drilling-high-and-low-in-the-boxwork-unit"
PERFORACIONES = [
    {"nombre": "Altadena", "sitio": 116, "drive": 1944, "sol": 4564, "lugar": "borde de la unidad boxwork", "lat": -4.799847, "lon": 137.383541,
     "nota_sol": "perforación del 8 de junio de 2025 (sol 4564); el rover estuvo en ese sitio/drive de los soles 4560 a 4571", "fuente": BLOG_ALTADENA},
    {"nombre": "Valle de la Luna", "sitio": 119, "drive": 1722, "sol": 4687, "lugar": "hondonada Monte Grande", "lat": -4.807839, "lon": 137.381035,
     "nota_sol": "sol de llegada a ese sitio/drive; la perforación terminó antes del sol 4709", "fuente": BLOG_MONTE_GRANDE},
    {"nombre": "Nevado Sajama", "sitio": 120, "drive": 82, "sol": 4711, "lugar": "cresta junto a Monte Grande", "lat": -4.808008, "lon": 137.381004,
     "nota_sol": "sol de llegada a ese sitio/drive (campaña de perforación de los soles 4709 a 4715)", "fuente": BLOG_MONTE_GRANDE},
]
LADO_M = 3000.0
PASO_DEM_M = 2  # relieve a 2 m/px (1 de cada 2 filas y columnas del DEM de 1 m: vecino más cercano)


def xy(lat, lon):
    return R_MARTE * math.radians(lon), R_MARTE * math.radians(lat)


def latlon(x, y):
    return math.degrees(y / R_MARTE), math.degrees(x / R_MARTE)


def zona():
    lat = sum(p["lat"] for p in PERFORACIONES) / len(PERFORACIONES)
    lon = sum(p["lon"] for p in PERFORACIONES) / len(PERFORACIONES)
    cx, cy = xy(lat, lon)
    # alineada a metros enteros
    x0, y1 = math.floor(cx - LADO_M / 2), math.floor(cy + LADO_M / 2)
    x1, y0 = x0 + LADO_M, y1 - LADO_M
    sur, oeste = latlon(x0, y0)
    norte, este = latlon(x1, y1)
    return {"centro": {"lat": lat, "lon": lon}, "x0": x0, "x1": x1, "y0": y0, "y1": y1,
            "limites": {"norte": norte, "sur": sur, "oeste": oeste, "este": este}}


def guardar_json(nombre, datos):
    os.makedirs(SALIDA, exist_ok=True)
    with open(os.path.join(SALIDA, nombre), "w", encoding="utf-8") as f:
        json.dump(datos, f, ensure_ascii=False, indent=1)


# ---------------------------------------------------------------- relieve (DEM 1 m -> 2 m)
def relieve(z):
    os.makedirs(CACHE, exist_ok=True)
    crudo = os.path.join(CACHE, "relieve_2m.npy")
    if not os.path.exists(crudo):
        t0 = time.time()
        with rasterio.open("/vsicurl/" + URL_DEM) as ds:
            T = ds.transform
            col0 = int(round((z["x0"] - T.c) / T.a))
            fila0 = int(round((T.f - z["y1"]) / -T.e))
            n = int(LADO_M)
            filas = list(range(fila0, fila0 + n, PASO_DEM_M))
            mb = sum(int(ds.get_tag_item(f"BLOCK_SIZE_0_{f}", "TIFF", bidx=1)) for f in filas) / 1e6
            print(f"relieve: {len(filas)} filas comprimidas, {mb:.1f} MB a transferir")
            if mb > 150:
                raise SystemExit("relieve: pasa de 150 MB, me detengo")
            nodata = ds.nodata
        # Rangos EXACTOS de cada fila comprimida (GDAL bajaría casi el doble), en tandas de 100 filas
        R.BYTES.update(total=0, peticiones=0)
        datos = np.empty((len(filas), n // PASO_DEM_M), dtype=np.float32)
        for i in range(0, len(filas), 100):
            tanda = filas[i:i + 100]
            leidas, _ = R.filas_lzw(URL_DEM, "/vsicurl/" + URL_DEM, tanda)
            for k, f in enumerate(tanda):
                datos[i + k] = leidas[f][col0:col0 + n:PASO_DEM_M]
            print(f"  filas {i + len(tanda)}/{len(filas)} · {R.BYTES['total'] / 1e6:.1f} MB · {time.time() - t0:.0f} s", flush=True)
        datos[datos == nodata] = np.nan
        np.save(crudo, datos)
        print(f"relieve: listo en {time.time() - t0:.0f} s")
    return np.load(crudo)


# ---------------------------------------------------------------- ortofoto (25 cm -> 1 m, rangos exactos)
def ortofoto_zona(z):
    os.makedirs(CACHE, exist_ok=True)
    crudo = os.path.join(CACHE, "ortofoto_1m.npy")
    if not os.path.exists(crudo):
        geo = R.geometria("/vsicurl/" + URL_ORTO)
        T = geo["transform"]
        col0 = int(round((z["x0"] - T.c) / 0.25))
        fila0 = int(round((T.f - z["y1"]) / 0.25))
        n = int(LADO_M / 0.25)
        R.BYTES.update(total=0, peticiones=0)
        t0 = time.time()
        print(f"ortofoto: {n // 4} filas x {n} bytes = {n // 4 * (n + 600) / 1e6:.1f} MB a transferir")
        datos = R.leer_ventana(URL_ORTO, geo, fila0, col0, n, n, paso=4, hilos=12)[:, ::4]  # 1 m: vecino más cercano
        print(f"ortofoto: {R.BYTES['total'] / 1e6:.1f} MB en {R.BYTES['peticiones']} peticiones, {time.time() - t0:.0f} s")
        np.save(crudo, datos)
    return np.load(crudo)


def piramide(img, z, carpeta, niveles_m=(8, 4, 2, 1), lado=256, calidad=75):
    """Mosaicos JPG {nivel}/{x}/{y}.jpg; nivel 0 = el más grueso. Devuelve la descripción para tiles.json."""
    destino = os.path.join(SALIDA, carpeta)
    os.makedirs(destino, exist_ok=True)
    base = Image.fromarray(img)
    info = []
    total = 0
    for nivel, m in enumerate(niveles_m):
        px = int(LADO_M / m)
        im = base.resize((px, px), Image.LANCZOS) if px != base.width else base
        nx = math.ceil(px / lado)
        for tx in range(nx):
            for ty in range(nx):
                caja = (tx * lado, ty * lado, min(px, (tx + 1) * lado), min(px, (ty + 1) * lado))
                trozo = im.crop(caja)
                os.makedirs(os.path.join(destino, str(nivel), str(tx)), exist_ok=True)
                ruta = os.path.join(destino, str(nivel), str(tx), f"{ty}.jpg")
                trozo.save(ruta, quality=calidad, optimize=True)
                total += os.path.getsize(ruta)
        info.append({"nivel": nivel, "m_por_px": m, "px": px, "mosaicos_por_lado": nx})
    return info, total


# ---------------------------------------------------------------- capas derivadas del relieve real
def derivadas(dem, paso):
    gy, gx = np.gradient(dem, paso)  # dz/dy (filas hacia el sur), dz/dx
    pendiente = np.degrees(np.arctan(np.hypot(gx, gy)))
    # Sombreado (luz desde el noroeste, 45° de altura), convención estándar de cartografía
    az, alt = math.radians(315), math.radians(45)
    aspecto = np.arctan2(-gx, gy)
    sombra = np.sin(alt) * np.cos(np.radians(pendiente)) + np.cos(alt) * np.sin(np.radians(pendiente)) * np.cos(az - aspecto)
    sombra = np.clip(sombra, 0, 1)
    return pendiente, sombra


def guardar_derivadas(dem):
    pend, sombra = derivadas(dem, PASO_DEM_M)
    validos = ~np.isnan(dem)
    Image.fromarray((np.nan_to_num(sombra) * 255).astype(np.uint8)).save(os.path.join(SALIDA, "sombreado.png"), optimize=True)
    # Pendiente en 3 clases (Curiosity, JPL 2023: se desvió ante 23° para buscar menos de 15°)
    rgba = np.zeros(dem.shape + (4,), dtype=np.uint8)
    rgba[(pend < 15) & validos] = (1, 239, 172, 70)
    rgba[(pend >= 15) & (pend <= 23) & validos] = (250, 200, 46, 150)
    rgba[(pend > 23) & validos] = (221, 40, 17, 190)
    Image.fromarray(rgba, "RGBA").save(os.path.join(SALIDA, "pendiente.png"), optimize=True)
    # Curvas de nivel cada 5 m: borde entre celdas cuyo piso(h/5) cambia (sin dibujar nada a mano)
    banda = np.floor(np.nan_to_num(dem, nan=-1e9) / 5)
    borde = np.zeros(dem.shape, dtype=bool)
    borde[:, 1:] |= banda[:, 1:] != banda[:, :-1]
    borde[1:, :] |= banda[1:, :] != banda[:-1, :]
    maestra = np.floor(np.nan_to_num(dem, nan=-1e9) / 25)
    borde25 = np.zeros(dem.shape, dtype=bool)
    borde25[:, 1:] |= maestra[:, 1:] != maestra[:, :-1]
    borde25[1:, :] |= maestra[1:, :] != maestra[:-1, :]
    curvas = np.zeros(dem.shape + (4,), dtype=np.uint8)
    curvas[borde & validos] = (255, 229, 201, 150)
    curvas[borde25 & validos] = (255, 229, 201, 235)
    Image.fromarray(curvas, "RGBA").save(os.path.join(SALIDA, "curvas.png"), optimize=True)
    clases = {"menos_15": float(np.mean(pend[validos] < 15)), "15_a_23": float(np.mean((pend[validos] >= 15) & (pend[validos] <= 23))), "mas_23": float(np.mean(pend[validos] > 23))}
    return {"pendiente_max_grados": float(np.nanmax(pend)), "fraccion_por_clase": {k: round(v, 4) for k, v in clases.items()}}


def escala_relieve(dem):
    """Paso en metros para que TODO el desnivel quepa en 16 bits (0..65535), redondeado al cm hacia arriba."""
    rango = float(np.nanmax(dem) - np.nanmin(dem))
    return max(0.01, math.ceil(rango / 65535 * 100) / 100)


def guardar_relieve(dem, z):
    hmin, hmax = float(np.nanmin(dem)), float(np.nanmax(dem))
    escala = escala_relieve(dem)
    valores = np.round((np.nan_to_num(dem, nan=hmin) - hmin) / escala)
    assert valores.max() <= 65535, "el relieve no cabe en 16 bits"
    Image.fromarray(valores.astype(np.uint16)).save(os.path.join(SALIDA, "relieve.png"))
    # Comprobación: decodificar y comparar con el DEM real
    leido = np.array(Image.open(os.path.join(SALIDA, "relieve.png"))).astype(np.float64) * escala + hmin
    error = float(np.nanmax(np.abs(leido - dem)))
    assert error <= escala / 2 + 1e-3, f"relieve.png no reproduce el DEM (error {error} m)"  # + redondeo de float32 a ~4000 m
    return {"altura_min_m": round(hmin, 2), "altura_max_m": round(hmax, 2), "escala_m": escala,
            "codificacion": f"PNG gris 16 bits: altura = altura_min_m + valor × {escala} m", "error_max_m": round(error, 4),
            "huecos": int(np.isnan(dem).sum())}


# ---------------------------------------------------------------- ruta real de Curiosity (PLACES)
def fecha_sol(sol):
    # Sol 0 = 6 ago 2012 05:17 UTC (aterrizaje); un sol = 1,0274912517 días terrestres. Aproximada (±1 día).
    return (dt.datetime(2012, 8, 6, 5, 17) + dt.timedelta(days=sol * 1.0274912517)).date().isoformat()


def ruta_curiosity(z):
    filas = [r for r in csv.DictReader(open(PLACES, encoding="utf-8")) if r["frame"] == "ROVER" and int(r["sol"]) >= 0]
    margen = 1500
    todo, zona_pts = [], []
    for r in filas:
        lat, lon = float(r["planetocentric_latitude"]), float(r["longitude"])
        p = {"lat": round(lat, 6), "lon": round(lon, 6), "sol": int(r["sol"]), "fecha": fecha_sol(int(r["sol"])),
             "sitio": int(r["site"]), "drive": int(r["drive"]), "elevacion_m": round(float(r["elevation"]), 1)}
        todo.append(p)
        x, y = float(r["easting"]), float(r["northing"])
        if z["x0"] - margen <= x <= z["x1"] + margen and z["y0"] - margen <= y <= z["y1"] + margen:
            zona_pts.append(p)
    linea = lambda pts: {"type": "LineString", "coordinates": [[p["lon"], p["lat"]] for p in pts]}  # noqa: E731
    return {
        "type": "FeatureCollection",
        "fuente": {"producto": "MSL PLACES, localized_pos.csv (posición localizada del rover por sitio/drive)", "url": URL_PLACES,
                   "doi": "10.17189/1520397", "nota": "Latitud planetocéntrica y longitud este. Fechas calculadas desde el sol (±1 día)."},
        "features": [
            {"type": "Feature", "properties": {"nombre": "Recorrido completo de Curiosity (soles 0 a %d)" % todo[-1]["sol"]}, "geometry": linea(todo[::3] + [todo[-1]])},
            {"type": "Feature", "properties": {"nombre": "Curiosity en la zona del juego", "puntos": zona_pts}, "geometry": linea(zona_pts)},
            *[{"type": "Feature", "properties": {"nombre": p["nombre"], "tipo": "perforacion", "sol": p["sol"], "lugar": p["lugar"],
                                                 "nota_sol": p["nota_sol"], "fuente": p["fuente"]},
               "geometry": {"type": "Point", "coordinates": [p["lon"], p["lat"]]}} for p in PERFORACIONES],
        ],
    }


# ---------------------------------------------------------------- otras capas reales (NASA Mars Trek)
import trek as TREK  # noqa: E402

CACHE_TREK = os.path.join(RAIZ, "tools", "cache", "trek")
LADO_REGION_M = 15000.0  # contexto regional alrededor de la zona
TREK_FUENTE = "https://trek.nasa.gov/mars/"
CAPAS_TREK = [
    # archivo, capa de Mars Trek, extensión, nivel, caja, modo de salida, producto, instrumento, fecha, cita
    ("terreno_themis.png", "THEMIS_NightIR_ControlledMosaics_100m_v2_oct2018", "png", 9, "zona", "L",
     "THEMIS IR nocturno, mosaico controlado global 100 m (v2, 2018)", "THEMIS (Mars Odyssey)", "2018", "NASA/JPL/ASU, vía NASA Mars Trek"),
    ("terreno_themis_region.png", "THEMIS_NightIR_ControlledMosaics_100m_v2_oct2018", "png", 9, "region", "L",
     "THEMIS IR nocturno, mosaico controlado global 100 m (v2, 2018)", "THEMIS (Mars Odyssey)", "2018", "NASA/JPL/ASU, vía NASA Mars Trek"),
    ("contexto_ctx.jpg", "Gale_CTX_BlockAdj_dd", "png", 12, "region", "L",
     "MRO CTX, mosaico del cráter Gale", "CTX (Mars Reconnaissance Orbiter)", "2020 (publicación en Mars Trek)", "NASA/JPL/MSSS, vía NASA Mars Trek"),
    ("globo_viking.jpg", "Mars_Viking_MDIM21_ClrMosaic_global_232m", "jpg", 2, "global", "RGB",
     "Viking MDIM 2.1, mosaico global en color (232 m)", "Viking Orbiter", "2020 (publicación en Mars Trek)", "NASA/USGS, vía NASA Mars Trek"),
    ("globo_mola_sombreado.jpg", "Mars_MGS_MOLA_ClrShade_merge_global_463m", "jpg", 2, "global", "RGB",
     "MOLA, relieve sombreado en color global (463 m)", "MOLA (Mars Global Surveyor)", "2020 (publicación en Mars Trek)", "NASA/GSFC, vía NASA Mars Trek"),
]
# Productos de CRISM en Mars Trek que se revisan sobre la zona (ninguno tenía mosaicos ahí al preparar esto)
CRISM_REVISADOS = [("Hydrous_Mineral_Detections_CRISM_clon0", "png"), ("Aqueous_Mineral_Distribution_Options_clon0", "png"),
                   ("frt_07_brhysj_mtr3_ll", "png"), ("frt_07_brpfmj_mtr3_ll", "png")]


def caja(z, tipo):
    L = z["limites"]
    if tipo == "zona":
        return L["oeste"], L["este"], L["sur"], L["norte"]
    if tipo == "global":
        return -180.0, 180.0, -90.0, 90.0
    lat_c, lon_c = (L["norte"] + L["sur"]) / 2, (L["oeste"] + L["este"]) / 2
    d = LADO_REGION_M / 2 / TREK.M_POR_GRADO
    return lon_c - d, lon_c + d, lat_c - d, lat_c + d


def desplazamiento_contra_hirise(img, o, e, s, n, z, busqueda_px=60, reduccion=2):
    """Mide cuánto está corrido un recorte respecto a la ortofoto HiRISE (USGS) con correlación normalizada.

    Devuelve (este_m, sur_m, ncc): dónde aparece en `img` lo que la ortofoto tiene en su sitio.
    """
    orto = np.load(os.path.join(CACHE, "ortofoto_1m.npy"))
    gris = img.convert("L")
    mpp = (e - o) * TREK.M_POR_GRADO / gris.width * reduccion
    a = np.array(gris.resize((gris.width // reduccion, gris.height // reduccion), Image.LANCZOS), dtype=float)
    k = round(LADO_M / mpp)
    t = np.array(Image.fromarray(orto).resize((k, k), Image.LANCZOS), dtype=float)
    t = (t - t.mean()) / t.std()
    # posición de la zona dentro del recorte
    L = z["limites"]
    cx = round(((L["oeste"] + L["este"]) / 2 - o) / (e - o) * a.shape[1]) - k // 2
    cy = round((n - (L["norte"] + L["sur"]) / 2) / (n - s) * a.shape[0]) - k // 2
    mejor = (-2, 0, 0)
    for dy in range(-busqueda_px, busqueda_px + 1):
        for dx in range(-busqueda_px, busqueda_px + 1):
            w = a[cy + dy:cy + dy + k, cx + dx:cx + dx + k]
            if w.shape != t.shape:
                continue
            v = float((((w - w.mean()) / (w.std() + 1e-9)) * t).mean())
            if v > mejor[0]:
                mejor = (v, dx, dy)
    return mejor[1] * mpp, mejor[2] * mpp, mejor[0]


def capas_trek(z):
    TREK.ESTADO.update(bytes=0, peticiones=0, faltantes=0)
    t0 = time.time()
    salida = []
    for archivo, capa, ext, nivel, tipo, modo, producto, instrumento, fecha, cita in CAPAS_TREK:
        o, e, s, n = caja(z, tipo)
        img, info = TREK.recorte(capa, ext, nivel, o, e, s, n, CACHE_TREK)
        if capa.startswith("Gale_CTX"):
            # El mosaico CTX de Mars Trek no está alineado con el de HiRISE de USGS: se mide y se corrige
            de, ds, ncc = desplazamiento_contra_hirise(img, o, e, s, n, z)
            if ncc < 0.4:
                raise SystemExit(f"{archivo}: no pude alinear el CTX con HiRISE (correlación {ncc:.2f})")
            dlon, dlat = de / TREK.M_POR_GRADO, -ds / TREK.M_POR_GRADO
            img, info = TREK.recorte(capa, ext, nivel, o + dlon, e + dlon, s + dlat, n + dlat, CACHE_TREK)
            de2, ds2, ncc2 = desplazamiento_contra_hirise(img, o, e, s, n, z, busqueda_px=10)
            info["corregistro"] = {"metodo": "correlación normalizada con la ortofoto HiRISE de USGS (zona de 3 × 3 km)",
                                   "corrimiento_original_m": {"este": round(de), "sur": round(ds)}, "correlacion": round(ncc, 3),
                                   "residuo_m": {"este": round(de2), "sur": round(ds2)}, "correlacion_final": round(ncc2, 3),
                                   "nota": "Se recortó el CTX en la caja corrida para que coincida con la ortofoto y el relieve."}
            print(f"  {archivo}: CTX corrido {de:.0f} m al este y {ds:.0f} m al sur (r = {ncc:.2f}); corregido, residuo {de2:.0f} / {ds2:.0f} m (r = {ncc2:.2f})")
        if TREK.sin_datos(img):
            raise SystemExit(f"{archivo}: {capa} no tiene datos en la caja pedida")
        fondo = Image.new("RGBA", img.size, (0, 0, 0, 255))
        plano = Image.alpha_composite(fondo, img).convert(modo)
        ruta = os.path.join(SALIDA, archivo)
        if archivo.endswith(".jpg"):
            plano.save(ruta, quality=80, optimize=True)
        else:
            plano.save(ruta, optimize=True)
        salida.append({"archivo": archivo, "capa_trek": capa, "caja": tipo, "limites": {"oeste": o, "este": e, "sur": s, "norte": n},
                       "producto": producto, "instrumento": instrumento, "fecha_producto": fecha, "cita": cita, **info,
                       "bytes": os.path.getsize(ruta)})
        print(f"  {archivo}: nivel {nivel} (~{info['m_por_px_nativo']} m/px), {info['px'][0]}×{info['px'][1]} px, "
              f"{info['mosaicos']} mosaicos ({info['mosaicos_sin_datos']} sin datos)")
    # CRISM: ¿algún producto tiene mosaicos sobre la zona en algún nivel?
    lon_c = (z["limites"]["oeste"] + z["limites"]["este"]) / 2
    lat_c = (z["limites"]["norte"] + z["limites"]["sur"]) / 2
    crism = []
    for capa, ext in CRISM_REVISADOS:
        encontrado = None
        for nivel in range(0, 13):
            g = TREK.grados_por_px(nivel)
            fila, col = int((90 - lat_c) / g // 256), int((lon_c + 180) / g // 256)
            if TREK._mosaico(capa, ext, nivel, fila, col, CACHE_TREK) is not None:
                encontrado = nivel
        crism.append({"capa_trek": capa, "cubre_la_zona": encontrado is not None, "nivel_max": encontrado})
    print(f"trek: {TREK.ESTADO['bytes'] / 1e6:.1f} MB en {TREK.ESTADO['peticiones']} peticiones "
          f"({TREK.ESTADO['faltantes']} sin datos), {time.time() - t0:.0f} s · CRISM sobre la zona: {[c['capa_trek'] for c in crism if c['cubre_la_zona']] or 'ninguno'}")
    datos = {"capas": salida, "crism_revisados": crism, "transferido_mb": round(TREK.ESTADO["bytes"] / 1e6, 2)}
    with open(os.path.join(CACHE, "trek.json"), "w", encoding="utf-8") as f:
        json.dump(datos, f, ensure_ascii=False, indent=1)
    return datos


# ---------------------------------------------------------------- geología real (USGS SIM 3292, Tanaka et al. 2014)
URL_SIM = "https://astrogeology.usgs.gov/pygeoapi/collections/mars/sim3292_global_geologic_map/units"
CITA_SIM = {"producto": "Geologic Map of Mars, SIM 3292", "autores": "Tanaka, K. L. et al.", "anio": 2014, "editor": "USGS",
            "doi": "10.3133/sim3292", "url": "https://pubs.usgs.gov/sim/3292", "servicio": URL_SIM, "escala": "1:20.000.000"}
NOTA_SULFATOS = {"texto_original": "The whole region is part of a layer on Mount Sharp enriched in salty minerals called sulfates.",
                 "texto": "Toda la región del boxwork es parte de una capa de Mount Sharp rica en minerales salinos llamados sulfatos.",
                 "fuente": "https://www.nasa.gov/missions/mars-science-laboratory/curiosity-rover/NASAs-curiosity-rover-sees-martian-spiderwebs-up-close/",
                 "editor": "NASA", "fecha": "2026-02-23"}


def _pedir_json(url):
    import urllib.request
    req = urllib.request.Request(url, headers={"User-Agent": "cartografia-juego/1.0", "Accept": "application/geo+json, application/json"})
    with urllib.request.urlopen(req, timeout=120) as r:
        crudo = r.read()
    return json.loads(crudo), len(crudo)


def _contiene(geom, x, y):
    def anillo(a):
        dentro = False
        for i in range(len(a)):
            (x1, y1), (x2, y2) = a[i][:2], a[(i + 1) % len(a)][:2]
            if (y1 > y) != (y2 > y) and x < x1 + (y - y1) * (x2 - x1) / (y2 - y1):
                dentro = not dentro
        return dentro
    pols = [geom["coordinates"]] if geom["type"] == "Polygon" else geom["coordinates"]
    return any(anillo(p[0]) and not any(anillo(h) for h in p[1:]) for p in pols)


def geologia(z):
    L = z["limites"]
    bbox = f"{L['oeste']},{L['sur']},{L['este']},{L['norte']}"
    lista, b1 = _pedir_json(f"{URL_SIM}/items?f=json&skipGeometry=true&bbox={bbox}")
    candidatas = sorted(lista["features"], key=lambda f: f["properties"].get("spharea_km") or 0)
    malla = [(L["oeste"] + (L["este"] - L["oeste"]) * i / 20, L["sur"] + (L["norte"] - L["sur"]) * j / 20) for i in range(21) for j in range(21)]
    asignados, unidades, transferido = {}, [], b1
    for f in candidatas:  # de la más chica a la más grande: se bajan solo las geometrías necesarias
        if len(asignados) == len(malla):
            break
        item, b = _pedir_json(f"{URL_SIM}/items/{f['id']}?f=json")
        transferido += b
        dentro = [p for p in malla if p not in asignados and _contiene(item["geometry"], *p)]
        for p in dentro:
            asignados[p] = item["properties"]["unit"]
        if dentro:
            unidades.append(item)
    print(f"geología: {len(candidatas)} unidades tocan la zona; {transferido / 1e6:.2f} MB transferidos")
    conteo = {}
    for u in asignados.values():
        conteo[u] = conteo.get(u, 0) + 1
    principal = max(unidades, key=lambda it: conteo[it["properties"]["unit"]])
    codigo, nombre = principal["properties"]["unit"], principal["properties"]["unitdesc"]
    fraccion = conteo[codigo] / len(malla)
    texto = (f"A esta escala, toda la ruta está dentro de la unidad {codigo} ({nombre})." if fraccion == 1
             else f"La zona cruza {len(conteo)} unidades del SIM 3292: " + ", ".join(f"{k} ({v / len(malla):.0%})" for k, v in conteo.items()))
    redondear = lambda c: [redondear(x) for x in c] if isinstance(c[0], list) else [round(c[0], 4), round(c[1], 4)]  # noqa: E731
    geo = {"type": "FeatureCollection", "fuente": CITA_SIM,
           "nota": "Longitud Este (−180..180) y latitud sobre la esfera Mars 2000 (IAU 49900). Coordenadas redondeadas a 4 decimales (~6 m).",
           "features": [{"type": "Feature", "properties": {"unidad": it["properties"]["unit"], "nombre_oficial": it["properties"]["unitdesc"],
                                                            "area_km2": it["properties"].get("spharea_km"), "objectid": it["properties"].get("objectid")},
                         "geometry": {"type": it["geometry"]["type"], "coordinates": redondear(it["geometry"]["coordinates"])}} for it in unidades]}
    guardar_json("geologia_sim3292.geojson", geo)
    datos = {"unidad": {"codigo": codigo, "nombre_oficial": nombre, "fraccion_de_la_zona": fraccion},
             "texto": texto, "nota_nasa": NOTA_SULFATOS,
             "mapa_local": "No se usó un mapa geológico local: no hay uno publicado por NASA o el equipo de MSL con unidades a la escala de la ruta que se pueda incorporar.",
             "unidades_que_tocan_el_recuadro": [f["properties"]["unit"] for f in candidatas], "muestreo": "malla de 21 × 21 puntos sobre la zona",
             "fuente": CITA_SIM, "transferido_mb": round(transferido / 1e6, 2)}
    guardar_json("geologia.json", datos)
    print("geología:", texto)
    return datos


# ---------------------------------------------------------------- radiación y clima (RAD y REMS miden en UN punto)
VALORES_RAD_REMS = [
    {"magnitud": "Dosis equivalente en la superficie (rayos cósmicos galácticos)", "valor": 0.64, "unidad": "mSv/día",
     "periodo": "300 soles desde agosto de 2012, cerca del lugar de aterrizaje", "instrumento": "RAD (Curiosity)",
     "cita": "Hassler, D. M. et al. (2014), Science 343(6169)", "fuente": "https://doi.org/10.1126/science.1244797",
     "verificado_en_texto": False, "nota": "No se pudo abrir el texto completo del artículo para confirmarlo; algunas notas de prensa sobre los mismos datos dan 0,67 mSv/día."},
    {"magnitud": "Dosis absorbida (rayos cósmicos galácticos)", "valor": 210, "unidad": "µGy/día", "aproximado": True,
     "periodo": "primeros meses de la misión (2012–2013)", "instrumento": "RAD (Curiosity)",
     "cita": "NASA, Radiation Measurements on Mars (9 dic 2013)", "fuente": "https://science.nasa.gov/resource/radiation-measurements-on-mars", "verificado_en_texto": True},
    {"magnitud": "Temperatura del aire, máximas diarias", "valor": 0, "unidad": "°C", "aproximado": True,
     "periodo": "agosto de 2012 a principios de 2013", "instrumento": "REMS (Curiosity)",
     "cita": "NASA/JPL-Caltech, PIA16913 'Steady Temperatures at Mars' Gale Crater' (2013)",
     "fuente": "https://science.nasa.gov/photojournal/steady-temperatures-at-mars-gale-crater", "verificado_en_texto": True},
    {"magnitud": "Temperatura del aire, mínimas diarias", "valor": -70, "unidad": "°C", "aproximado": True,
     "periodo": "agosto de 2012 a principios de 2013", "instrumento": "REMS (Curiosity)",
     "cita": "NASA/JPL-Caltech, PIA16913 'Steady Temperatures at Mars' Gale Crater' (2013)",
     "fuente": "https://science.nasa.gov/photojournal/steady-temperatures-at-mars-gale-crater", "verificado_en_texto": True},
]
DISTANCIA_REFUGIO_M = 10


def distancia_km(lat1, lon1, lat2, lon2):
    """Distancia sobre la esfera de Marte (haversine, R = 3396,19 km)."""
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp, dl = p2 - p1, math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * R_MARTE / 1000 * math.asin(math.sqrt(a))


def radiacion(z, dem):
    pend, _ = derivadas(dem, PASO_DEM_M)
    pared = pend > 23
    cerca = pared.copy()
    for _ in range(int(DISTANCIA_REFUGIO_M / PASO_DEM_M)):  # dilatación de 1 píxel (2 m) por vuelta
        d = cerca.copy()
        d[1:, :] |= cerca[:-1, :]; d[:-1, :] |= cerca[1:, :]; d[:, 1:] |= cerca[:, :-1]; d[:, :-1] |= cerca[:, 1:]  # noqa: E702
        cerca = d
    refugio = cerca & ~pared
    rgba = np.zeros(dem.shape + (4,), dtype=np.uint8)
    rgba[~refugio & ~pared] = (250, 147, 46, 45)   # exposición (regla del juego)
    rgba[refugio] = (32, 130, 166, 150)            # refugio (regla del juego)
    Image.fromarray(rgba, "RGBA").save(os.path.join(SALIDA, "radiacion_reglas.png"), optimize=True)
    ubic = PERFORACIONES[-1]
    datos = {
        "aviso": "RAD y REMS miden en UN solo punto (el rover). Esto NO es un mapa de radiación ni de temperatura.",
        "curiosity_en_la_zona": {"lat": ubic["lat"], "lon": ubic["lon"], "sol": ubic["sol"], "sitio": ubic["sitio"], "drive": ubic["drive"],
                                 "lugar": f"{ubic['nombre']} ({ubic['lugar']})", "fuente": URL_PLACES},
        "valores": VALORES_RAD_REMS,
        "donde_se_midieron": f"Los valores citados se midieron en el rover entre 2012 y 2013, cerca de Bradbury Landing (−4,5895°, 137,4416° E), "
                             f"a {distancia_km(-4.589467, 137.441633, (z['limites']['norte'] + z['limites']['sur']) / 2, (z['limites']['oeste'] + z['limites']['este']) / 2):.1f} km "
                             "del centro de esta zona (al norte).",
        "reglas_del_juego": {
            "texto": f"Regla del juego (no es una medición): a menos de {DISTANCIA_REFUGIO_M} m del pie de una pared de más de 23° (según el relieve real) "
                     "el terreno cuenta como refugio; el resto, como exposición.",
            "archivo": "radiacion_reglas.png", "colores": {"refugio": "#2082A6", "exposicion": "#FA932E"},
            "fraccion_refugio": round(float(refugio.mean()), 4), "fraccion_exposicion": round(float((~refugio & ~pared).mean()), 4)},
    }
    guardar_json("radiacion.json", datos)
    print(f"radiación: refugio {datos['reglas_del_juego']['fraccion_refugio']:.1%} de la zona (regla del juego)")
    return datos


# ---------------------------------------------------------------- metadatos y fuentes
PROYECCION = "Equirectangular sobre la esfera Mars 2000 (R = 3.396.190 m), meridiano central 0° (ESRI:103885); x = R·lon, y = R·lat"
CITA_DEM = {"producto": "Mars MSL Gale Merged DEM 1m (v3)", "autores": "Parker, T. J. y Calef, F. J. III", "anio": 2016, "editor": "USGS Astrogeology Science Center",
            "url": "https://astrogeology.usgs.gov/search/map/mars_msl_gale_merged_dem_1m", "archivo": URL_DEM,
            "instrumento": "HiRISE (Mars Reconnaissance Orbiter), modelos estéreo", "resolucion_original_m": 1.0}
CITA_ORTO = {"producto": "MSL Gale Merged Orthophoto Mosaic 25cm (v3)", "autores": "Calef, F. J. III y Parker, T. J.", "anio": 2016, "editor": "USGS Astrogeology Science Center",
             "url": "https://astrogeology.usgs.gov/search/map/mars_msl_gale_merged_orthophoto_mosaic_25cm", "archivo": URL_ORTO,
             "instrumento": "HiRISE (Mars Reconnaissance Orbiter)", "resolucion_original_m": 0.25}
CITA_PLACES = {"producto": "MSL Rover PLACES (localized_pos.csv)", "editor": "NASA/JPL, PDS Imaging Node", "doi": "10.17189/1520397", "url": URL_PLACES}
CITA_PENDIENTE = {"texto": "Umbrales 15° y 23°: Curiosity se desvió 150 m ante una pendiente de 23° para buscar una de menos de 15° (NASA/JPL, 2023).",
                  "url": "https://www.jpl.nasa.gov/news/nasas-curiosity-rover-faces-its-toughest-climb-yet-on-mars/"}


def metadatos(z):
    dem = np.load(os.path.join(CACHE, "relieve_2m.npy"))
    base = {"limites": z["limites"], "proyectado_m": {"x0": z["x0"], "x1": z["x1"], "y0": z["y0"], "y1": z["y1"]}, "proyeccion": PROYECCION,
            "lado_m": LADO_M, "norte": "arriba (filas de norte a sur, columnas de oeste a este)"}
    pend, _ = derivadas(dem, PASO_DEM_M)
    relieve_json = {**base, "archivo": "relieve.png", "px": list(dem.shape[::-1]), "m_por_px": PASO_DEM_M,
                    "remuestreo": "vecino más cercano: 1 de cada 2 filas y columnas del DEM de 1 m",
                    "altura_min_m": round(float(np.nanmin(dem)), 2), "altura_max_m": round(float(np.nanmax(dem)), 2),
                    "escala_m": escala_relieve(dem), "altura_min_exacta_m": float(np.nanmin(dem)),
                    "codificacion": f"PNG gris 16 bits: altura = altura_min_exacta_m + valor × {escala_relieve(dem)} m", "datum": "altura sobre el areoide de MOLA (como el DEM original)",
                    "derivadas": {"sombreado.png": "sombreado del relieve (luz del noroeste a 45°)",
                                  "curvas.png": "curvas de nivel cada 5 m (más marcadas cada 25 m)",
                                  "pendiente.png": "pendiente en 3 clases: < 15° (verde), 15–23° (amarillo), > 23° (rojo)"},
                    "pendiente_fraccion": {"menos_15": round(float(np.mean(pend < 15)), 4), "15_a_23": round(float(np.mean((pend >= 15) & (pend <= 23))), 4), "mas_23": round(float(np.mean(pend > 23)), 4)},
                    "fuente": CITA_DEM, "umbrales_pendiente": CITA_PENDIENTE}
    guardar_json("relieve.json", relieve_json)
    niveles = [{"nivel": i, "m_por_px": m, "px": int(LADO_M / m), "mosaicos_por_lado": math.ceil(LADO_M / m / 256)} for i, m in enumerate((8, 4, 2, 1))]
    tiles = {**base, "plantilla": "ortofoto/{nivel}/{x}/{y}.jpg", "lado_mosaico_px": 256, "formato": "JPG calidad 75, gris", "niveles": niveles,
             "remuestreo": "zona completa a 1 m: vecino más cercano (1 de cada 4 filas y columnas de la ortofoto de 25 cm); niveles más gruesos con Lanczos",
             "corredor_25cm": "pendiente: se agrega cuando se aprueben las posiciones de la ruta (Parte 2)", "fuente": CITA_ORTO}
    guardar_json(os.path.join("ortofoto", "tiles.json"), tiles)
    peso = lambda r: os.path.getsize(os.path.join(SALIDA, r))  # noqa: E731
    total_orto = sum(os.path.getsize(os.path.join(d, f)) for d, _, fs in os.walk(os.path.join(SALIDA, "ortofoto")) for f in fs)
    fuentes = {
        "zona": {"descripcion": "Recuadro de 3 × 3 km centrado en el promedio de las 3 perforaciones de Curiosity en el boxwork (2025)", **z["limites"], "perforaciones": PERFORACIONES},
        "archivos": [
            {"archivo": "ortofoto/", "producto": CITA_ORTO["producto"], "instrumento": CITA_ORTO["instrumento"], "resolucion": "1 m/px (zona); 25 cm/px en el corredor de la ruta (pendiente)", "fecha_producto": "2016", "url": CITA_ORTO["url"], "cita": "Calef y Parker (2016), USGS", "bytes": total_orto},
            {"archivo": "relieve.png", "producto": CITA_DEM["producto"], "instrumento": CITA_DEM["instrumento"], "resolucion": "2 m/px (del DEM de 1 m)", "fecha_producto": "2016", "url": CITA_DEM["url"], "cita": "Parker y Calef (2016), USGS", "bytes": peso("relieve.png")},
            {"archivo": "sombreado.png", "producto": "Calculado del relieve real", "instrumento": CITA_DEM["instrumento"], "resolucion": "2 m/px", "fecha_producto": "2016", "url": CITA_DEM["url"], "cita": "Derivado de Parker y Calef (2016)", "bytes": peso("sombreado.png")},
            {"archivo": "curvas.png", "producto": "Curvas de nivel cada 5 m calculadas del relieve real", "instrumento": CITA_DEM["instrumento"], "resolucion": "2 m/px", "fecha_producto": "2016", "url": CITA_DEM["url"], "cita": "Derivado de Parker y Calef (2016)", "bytes": peso("curvas.png")},
            {"archivo": "pendiente.png", "producto": "Pendiente en grados calculada del relieve real (3 clases)", "instrumento": CITA_DEM["instrumento"], "resolucion": "2 m/px", "fecha_producto": "2016", "url": CITA_DEM["url"], "cita": f"Derivado de Parker y Calef (2016); umbrales: NASA/JPL (2023)", "bytes": peso("pendiente.png")},
            {"archivo": "curiosity_ruta.geojson", "producto": CITA_PLACES["producto"], "instrumento": "Localización del rover Curiosity (MSL)", "resolucion": "una posición por sitio/drive localizado", "fecha_producto": "PLACES hasta el sol 4865 (13 abr 2026)", "url": CITA_PLACES["url"], "cita": "NASA/JPL PDS, doi:10.17189/1520397", "bytes": peso("curiosity_ruta.geojson")},
        ],
    }
    # Capas de Mars Trek
    trek = json.load(open(os.path.join(CACHE, "trek.json"), encoding="utf-8"))
    for c in trek["capas"]:
        fuentes["archivos"].append({"archivo": c["archivo"], "producto": c["producto"], "instrumento": c["instrumento"],
                                    "resolucion": f"~{c['m_por_px_nativo']} m/px (Mars Trek, nivel {c['nivel']})", "fecha_producto": c["fecha_producto"],
                                    "url": TREK_FUENTE, "capa_trek": c["capa_trek"], "plantilla": c["url_plantilla"], "cita": c["cita"],
                                    "limites": c["limites"], "bytes": peso(c["archivo"])})
    # Geología y radiación
    geo = json.load(open(os.path.join(SALIDA, "geologia.json"), encoding="utf-8"))
    rad = json.load(open(os.path.join(SALIDA, "radiacion.json"), encoding="utf-8"))
    fuentes["archivos"] += [
        {"archivo": "geologia.json", "producto": CITA_SIM["producto"], "instrumento": "Mapa geológico global (fotogeología sobre MOLA, THEMIS y otros)",
         "resolucion": f"escala {CITA_SIM['escala']}", "fecha_producto": "2014", "url": CITA_SIM["url"], "cita": "Tanaka et al. (2014), USGS SIM 3292, doi:10.3133/sim3292",
         "bytes": peso("geologia.json")},
        {"archivo": "geologia_sim3292.geojson", "producto": f"Polígono de la unidad {geo['unidad']['codigo']} del SIM 3292", "instrumento": "Mapa geológico global",
         "resolucion": f"escala {CITA_SIM['escala']}", "fecha_producto": "2014", "url": CITA_SIM["servicio"], "cita": "Tanaka et al. (2014), USGS SIM 3292",
         "bytes": peso("geologia_sim3292.geojson")},
        {"archivo": "radiacion.json", "producto": "Valores medidos por RAD y REMS (Curiosity) y posición del rover", "instrumento": "RAD y REMS (Curiosity)",
         "resolucion": "un punto (el rover)", "fecha_producto": "2013–2014", "url": rad["valores"][0]["fuente"],
         "cita": "Hassler et al. (2014); NASA (2013); NASA/JPL PIA16913 (2013)", "bytes": peso("radiacion.json")},
        {"archivo": "radiacion_reglas.png", "producto": "Zonas de refugio y exposición: REGLA DEL JUEGO calculada del relieve real (no es una medición)",
         "instrumento": CITA_DEM["instrumento"], "resolucion": f"{PASO_DEM_M} m/px", "fecha_producto": "2016", "url": CITA_DEM["url"],
         "cita": "Regla del juego sobre el relieve de Parker y Calef (2016)", "bytes": peso("radiacion_reglas.png")},
    ]
    for a in fuentes["archivos"]:  # el peso real del archivo, siempre
        ruta = os.path.join(SALIDA, a["archivo"])
        if os.path.isfile(ruta):
            a["bytes"] = os.path.getsize(ruta)
    guardar_json("fuentes.json", fuentes)

    # Qué muestra cada capa del mapa (lo usa el juego en la Parte 3)
    t = {c["archivo"]: c for c in trek["capas"]}
    crism_ok = [c["capa_trek"] for c in trek["crism_revisados"] if c["cubre_la_zona"]]
    capas = {"limites_zona": z["limites"], "capas": [
        {"id": "optica", "estado": "ok", "archivos": ["ortofoto/tiles.json"], "instrumento": "HiRISE (MRO)",
         "resolucion": "1 m/px en la zona; 25 cm/px en el corredor de la ruta (pendiente de la Parte 2)",
         "atribucion": "HiRISE · 1 m/px · USGS/NASA/JPL", "fuente": CITA_ORTO["url"], "limitacion": "Mosaico de imágenes de fechas distintas."},
        {"id": "relieve", "estado": "ok", "archivos": ["relieve.png", "sombreado.png", "curvas.png", "pendiente.png"], "instrumento": "HiRISE estéreo (MRO)",
         "resolucion": f"{PASO_DEM_M} m/px", "atribucion": f"DEM HiRISE · {PASO_DEM_M} m/px · USGS (Parker y Calef, 2016)", "fuente": CITA_DEM["url"],
         "limitacion": "Remuestreado de 1 m a 2 m: no muestra rocas sueltas.", "umbrales_pendiente": CITA_PENDIENTE},
        {"id": "termico", "estado": "ok", "archivos": ["terreno_themis.png", "terreno_themis_region.png"], "instrumento": "THEMIS IR nocturno (Mars Odyssey)",
         "resolucion": f"~{t['terreno_themis.png']['m_por_px_nativo']} m/px", "atribucion": f"THEMIS IR noche · ~{t['terreno_themis.png']['m_por_px_nativo']:.0f} m/px · NASA/JPL/ASU (Mars Trek)",
         "fuente": TREK_FUENTE, "limitacion": "Un píxel mide unos 80 m: distingue zonas grandes de arena o roca, no crestas ni rocas sueltas. "
                                              "Su posición no se ajustó a HiRISE (a 80 m/px no hay detalle para alinearla)."},
        {"id": "minerales", "estado": "ok" if crism_ok else "sin_datos", "archivos": [], "instrumento": "CRISM (MRO)",
         "texto": None if crism_ok else "Sin datos de CRISM a esta escala",
         "detalle": "Ningún producto de CRISM de Mars Trek tiene mosaicos sobre esta zona." if not crism_ok else None,
         "productos_revisados": [c["capa_trek"] for c in trek["crism_revisados"]], "fuente": TREK_FUENTE},
        {"id": "geologia", "estado": "ok", "archivos": ["geologia.json", "geologia_sim3292.geojson"], "instrumento": "Mapa geológico global",
         "resolucion": f"escala {CITA_SIM['escala']}", "texto": geo["texto"], "nota_nasa": geo["nota_nasa"],
         "atribucion": f"Geología {geo['unidad']['codigo']} · 1:20 M · USGS SIM 3292 (Tanaka et al., 2014)", "fuente": CITA_SIM["url"],
         "limitacion": "Escala global: a la escala de la caminata toda la zona es una sola unidad."},
        {"id": "radiacion", "estado": "ok", "archivos": ["radiacion.json", "radiacion_reglas.png"], "instrumento": "RAD y REMS (Curiosity)",
         "resolucion": "un punto (el rover)", "texto": rad["aviso"], "regla_del_juego": rad["reglas_del_juego"]["texto"],
         "atribucion": "RAD/REMS · un punto · NASA/JPL", "fuente": rad["valores"][0]["fuente"],
         "limitacion": "Medido en un solo punto; los eventos solares son difíciles de predecir."},
        {"id": "contexto", "estado": "ok", "archivos": ["contexto_ctx.jpg"], "instrumento": "CTX (MRO)",
         "resolucion": f"~{t['contexto_ctx.jpg']['m_por_px_nativo']} m/px", "limites": t["contexto_ctx.jpg"]["limites"],
         "atribucion": f"CTX · ~{t['contexto_ctx.jpg']['m_por_px_nativo']:.0f} m/px · NASA/JPL/MSSS (Mars Trek)", "fuente": TREK_FUENTE,
         "limitacion": f"Contexto de {LADO_REGION_M / 1000:.0f} × {LADO_REGION_M / 1000:.0f} km alrededor de la zona. Alineado a la ortofoto HiRISE "
                       f"(el mosaico de Mars Trek estaba corrido {t['contexto_ctx.jpg']['corregistro']['corrimiento_original_m']['este']} m al este).",
         "corregistro": t["contexto_ctx.jpg"]["corregistro"]},
        {"id": "globo", "estado": "ok", "archivos": ["globo_viking.jpg", "globo_mola_sombreado.jpg"], "instrumento": "Viking Orbiter y MOLA (MGS)",
         "resolucion": f"~{t['globo_viking.jpg']['m_por_px_nativo'] / 1000:.1f} km/px", "atribucion": "Viking MDIM 2.1 y MOLA · NASA/USGS (Mars Trek)",
         "fuente": TREK_FUENTE, "limitacion": "Mosaicos globales para el globo 3D; columna 0 = 180° O, longitud Este hacia la derecha."},
        {"id": "ruta_curiosity", "estado": "ok", "archivos": ["curiosity_ruta.geojson"], "instrumento": "Localización del rover (PLACES)",
         "resolucion": "una posición por sitio/drive", "atribucion": "Ruta de Curiosity · PDS PLACES · NASA/JPL", "fuente": URL_PLACES},
    ]}
    guardar_json("capas_reales.json", capas)
    total = sum(os.path.getsize(os.path.join(d, f)) for d, _, fs in os.walk(SALIDA) for f in fs)
    print(f"metadatos escritos · peso total de Frontend/public/cartografia: {total / 1e6:.2f} MB")


# ---------------------------------------------------------------- principal
if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--solo", choices=["relieve", "ortofoto", "ruta", "derivadas", "trek", "geologia", "radiacion", "metadatos"])
    a = ap.parse_args()
    z = zona()
    print("zona:", json.dumps(z["limites"]), "centro:", z["centro"])
    os.makedirs(SALIDA, exist_ok=True)
    meta = {}
    if a.solo in (None, "ruta"):
        guardar_json("curiosity_ruta.geojson", ruta_curiosity(z))
        print("ruta de Curiosity guardada")
    if a.solo in (None, "relieve", "derivadas"):
        dem = relieve(z)
        meta["relieve"] = guardar_relieve(dem, z)
        meta["derivadas"] = guardar_derivadas(dem)
        print("relieve:", meta["relieve"], meta["derivadas"])
    if a.solo in (None, "ortofoto"):
        img = ortofoto_zona(z)
        info, total = piramide(img, z, "ortofoto")
        meta["ortofoto"] = {"niveles": info, "bytes": total}
        print(f"ortofoto: {len(info)} niveles, {total / 1e6:.2f} MB en mosaicos")
    if a.solo in (None, "trek"):
        meta["trek"] = {"transferido_mb": capas_trek(z)["transferido_mb"]}
    if a.solo in (None, "geologia"):
        meta["geologia"] = geologia(z)["unidad"]
    if a.solo in (None, "radiacion"):
        meta["radiacion"] = radiacion(z, relieve(z))["reglas_del_juego"]
    if a.solo in (None, "metadatos"):
        metadatos(z)
    os.makedirs(CACHE, exist_ok=True)
    with open(os.path.join(CACHE, "meta_ultima_corrida.json"), "w", encoding="utf-8") as f:
        json.dump({"zona": z, **meta}, f, ensure_ascii=False, indent=1)

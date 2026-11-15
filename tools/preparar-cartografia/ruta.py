"""PARTE 2: posiciones REALES de la ruta del juego, elegidas con datos (no a mano).

Criterio (el más fiel a los datos): la caminata sigue el RECORRIDO REAL de Curiosity (PDS PLACES), que un rover
ya transitó, y las paradas de ciencia son los lugares REALES donde Curiosity perforó en 2025:
  P2 = Altadena (transición antes de las crestas), P3 = Nevado Sajama (cresta), P4 = Valle de la Luna (hondonada).
Las demás se calculan con el relieve real (DEM 1 m de USGS, a 2 m) y las distancias de diseño del juego:
  H   base: punto del recorrido ~1,0 km antes de P2 con terreno llano (pendiente media < 5° en 15 m).
  P1  mirador: punto del recorrido entre H y P2 (~0,5 km de H) más alto que su entorno (prominencia en 150 m).
  D1  hondonada: punto del recorrido entre P2 y P3 más bajo que su entorno y liso (arena según la ortofoto).
  DEP depósito: punto llano a 150–250 m de P3, junto al recorrido.
  D2  decisión de bajar la cresta: borde de la cresta entre P3 y P4 (máxima pendiente del tramo).
  P5  mirador alto (opcional): cima a 300–700 m de P4 cuya subida directa pasa por pendientes > 23°.
Distancias sobre la esfera de Marte, radio ecuatorial 3.396,2 km (NASA Mars Fact Sheet).
Salidas: Frontend/src/data/ruta_real.json y docs/ruta_propuesta.md.
Uso: tools/cache/venv/Scripts/python.exe tools/preparar-cartografia/ruta.py
"""
import csv
import datetime as dt
import json
import math
import os

import numpy as np

RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
CACHE = os.path.join(RAIZ, "tools", "cache")
R_PROY = 3396190.0   # esfera de la proyección de los mosaicos (x = R·lon, y = R·lat)
R_FACT = 3396200.0   # radio ecuatorial de Marte para distancias (NASA Mars Fact Sheet: 3.396,2 km)
REL = json.load(open(os.path.join(RAIZ, "Frontend", "public", "cartografia", "relieve.json"), encoding="utf-8"))
X0, Y1 = REL["proyectado_m"]["x0"], REL["proyectado_m"]["y1"]
PASO = REL["m_por_px"]
DEM = np.load(os.path.join(CACHE, "carto", "relieve_2m.npy")).astype(np.float64)
ORTO = np.load(os.path.join(CACHE, "carto", "ortofoto_1m.npy")).astype(np.float64)
GY, GX = np.gradient(DEM, PASO)
PEND = np.degrees(np.arctan(np.hypot(GX, GY)))

PLACES = "https://planetarydata.jpl.nasa.gov/img/data/msl/msl_places/data_localizations/localized_pos.csv"
F_DEM = "https://astrogeology.usgs.gov/search/map/mars_msl_gale_merged_dem_1m"
F_ORTO = "https://astrogeology.usgs.gov/search/map/mars_msl_gale_merged_orthophoto_mosaic_25cm"
F_BLOG_ALT = "https://science.nasa.gov/blog/curiosity-blog-sols-4568-4569-a-close-look-at-the-altadena-drill-hole-and-tailings/"
F_BLOG_MG = "https://science.nasa.gov/solar-system/curiosity-blog-sols-4695-4701-searching-for-answers-at-monte-grande"
F_BLOG_NS = "https://science.nasa.gov/solar-system/curiosity-blog-sols-4716-4722-drilling-success-at-nevado-sajama"
F_PEND = "https://www.jpl.nasa.gov/news/nasas-curiosity-rover-faces-its-toughest-climb-yet-on-mars/"
F_UYUNI = "https://science.nasa.gov/blog/curiosity-blog-sols-4573-4574-welcome-to-the-uyuni-quad/"
F_JPL_ALT = "https://www.jpl.nasa.gov/news/nasas-curiosity-mars-rover-starts-unpacking-boxwork-formations/"
F_BLOG_DRILL = "https://science.nasa.gov/blog/curiosity-blog-sols-4709-4715-drilling-high-and-low-in-the-boxwork-unit"
NOMBRE_UYUNI = ("Esta zona está en el cuadrante \"Uyuni\" del mapa de Curiosity: cada cuadrante lleva el nombre de un pueblo de la Tierra "
                "de menos de 100.000 habitantes (Uyuni, Bolivia, la puerta del salar más grande del mundo) y sus objetivos toman nombres "
                "de Uyuni y alrededores, incluido el desierto de Atacama en Chile.")


def ij(x, y):
    return int((Y1 - y) / PASO), int((x - X0) / PASO)


def latlon(x, y):
    return math.degrees(y / R_PROY), math.degrees(x / R_PROY)


def dist(a, b):
    """Haversine sobre la esfera de 3.396,2 km. a, b = (lat, lon) en grados."""
    la1, lo1, la2, lo2 = map(math.radians, (a[0], a[1], b[0], b[1]))
    h = math.sin((la2 - la1) / 2) ** 2 + math.cos(la1) * math.cos(la2) * math.sin((lo2 - lo1) / 2) ** 2
    return 2 * R_FACT * math.asin(math.sqrt(h))


def media(arr, i, j, r):
    return float(np.nanmean(arr[max(0, i - r):i + r + 1, max(0, j - r):j + r + 1]))


def elev(i, j):
    return float(DEM[i, j])


def fecha_sol(sol):
    return (dt.datetime(2012, 8, 6, 5, 17) + dt.timedelta(days=sol * 1.0274912517)).date().isoformat()


# ---------------------------------------------------------------- recorrido real en la zona
pts = []
for r in csv.DictReader(open(os.path.join(CACHE, "places", "localized_pos.csv"), encoding="utf-8")):
    if r["frame"] != "ROVER" or int(r["sol"]) < 0:
        continue
    x, y = float(r["easting"]), float(r["northing"])
    i, j = ij(x, y)
    if 3 <= i < DEM.shape[0] - 3 and 3 <= j < DEM.shape[1] - 3:
        pts.append({"x": x, "y": y, "i": i, "j": j, "lat": float(r["planetocentric_latitude"]), "lon": float(r["longitude"]),
                    "sol": int(r["sol"]), "sitio": int(r["site"]), "drive": int(r["drive"])})
pts.sort(key=lambda p: (p["sitio"], p["drive"]))
acum = [0.0]
for a, b in zip(pts, pts[1:]):
    acum.append(acum[-1] + dist((a["lat"], a["lon"]), (b["lat"], b["lon"])))
for p, d in zip(pts, acum):
    p["km"] = d / 1000


def buscar_sitio(sitio, drive):
    return next(k for k, p in enumerate(pts) if p["sitio"] == sitio and p["drive"] == drive)


k_p2, k_d_mg, k_p3 = buscar_sitio(116, 1944), buscar_sitio(119, 1722), buscar_sitio(120, 82)

# ---------------------------------------------------------------- H: ~1,0 km antes de P2, llano
cand = [k for k in range(k_p2) if 0.85 <= pts[k_p2]["km"] - pts[k]["km"] <= 1.25]
k_h = min(cand, key=lambda k: (media(PEND, pts[k]["i"], pts[k]["j"], 7), abs(pts[k_p2]["km"] - pts[k]["km"] - 1.0)))
# ---------------------------------------------------------------- P1: entre H y P2, ~0,5 km de H, el más prominente
prom_ij = lambda i, j: elev(i, j) - media(DEM, i, j, 75)  # noqa: E731
base_p1 = [pts[k] for k in range(k_h + 1, k_p2) if 0.3 <= pts[k]["km"] - pts[k_h]["km"] <= 0.75]
mejor_p1 = None
for q in base_p1:
    for di in range(-75, 76, 3):
        for dj in range(-75, 76, 3):
            i, j = q["i"] + di, q["j"] + dj
            if not (10 <= i < DEM.shape[0] - 10 and 10 <= j < DEM.shape[1] - 10) or media(PEND, i, j, 3) >= 15:
                continue
            pr = prom_ij(i, j)
            if not mejor_p1 or pr > mejor_p1[0]:
                mejor_p1 = (pr, i, j)
_, i_p1, j_p1 = mejor_p1
x_p1, y_p1 = X0 + (j_p1 + 0.5) * PASO, Y1 - (i_p1 + 0.5) * PASO
# ---------------------------------------------------------------- D1: entre P2 y P3, hondonada lisa
cand = [k for k in range(k_p2 + 1, k_d_mg) if PEND[pts[k]["i"], pts[k]["j"]] < 15]
def hondonada(k):
    i, j = pts[k]["i"], pts[k]["j"]
    bajo = media(DEM, i, j, 40) - elev(i, j)             # cuánto más bajo que su entorno (80 m)
    liso = float(np.std(ORTO[2 * i - 10:2 * i + 10, 2 * j - 10:2 * j + 10]))  # textura de la ortofoto (20 m)
    return bajo - 0.15 * liso
k_d1 = max(cand, key=hondonada)

P2, P3, P4 = pts[k_p2], pts[k_p3], pts[k_d_mg]
# Coordenadas exactas de las perforaciones (PLACES): Valle de la Luna = 119/1722, Nevado Sajama = 120/82

# ---------------------------------------------------------------- DEP: llano a 150–250 m de P3, junto al recorrido
cand = [k for k in range(len(pts)) if 150 <= dist((pts[k]["lat"], pts[k]["lon"]), (P3["lat"], P3["lon"])) <= 250]
k_dep = min(cand, key=lambda k: media(PEND, pts[k]["i"], pts[k]["j"], 5))

# ---------------------------------------------------------------- borde de la cresta entre P3 y P4 (capítulo 8: bajar de frente o rodear)
n = 12
seg = [(P3["i"] + (P4["i"] - P3["i"]) * t / n, P3["j"] + (P4["j"] - P3["j"]) * t / n) for t in range(n + 1)]
i_borde, j_borde = max(((int(round(a)), int(round(b))) for a, b in seg), key=lambda q: PEND[q])


# ---------------------------------------------------------------- caminos a pie: menor costo sobre el relieve real
from skimage.graph import MCP_Geometric  # noqa: E402
COSTO = 1.0 + np.where(PEND > 15, 8.0, 0.0) + np.where(PEND > 23, 120.0, 0.0)
COSTO[np.isnan(PEND)] = 1e6


def camino(a, b):
    """Camino de menor costo entre dos puntos (x, y): evita > 15° y casi prohíbe > 23° (umbrales de Curiosity)."""
    ia, ja = ij(*a); ib, jb = ij(*b)
    mcp = MCP_Geometric(COSTO)
    mcp.find_costs([(ia, ja)], [(ib, jb)])
    ruta = mcp.traceback((ib, jb))
    xy = [(X0 + (j + 0.5) * PASO, Y1 - (i + 0.5) * PASO) for i, j in ruta[::3]] + [b]
    return [a] + xy[1:]


def camino_rodeando(a, b, i_borde, j_borde, radio_px=3):
    """Camino de menor costo de a hasta b que NO cruza el borde empinado (radio de 3 px = 6 m alrededor del borde)."""
    costo = COSTO.copy()
    costo[max(0, i_borde - radio_px):i_borde + radio_px + 1, max(0, j_borde - radio_px):j_borde + radio_px + 1] = 1e6
    ia, ja = ij(*a); ib, jb = ij(*b)
    costo[ia, ja] = costo[ib, jb] = 1.0  # los extremos siempre transitables
    mcp = MCP_Geometric(costo)
    mcp.find_costs([(ia, ja)], [(ib, jb)])
    ruta = mcp.traceback((ib, jb))
    return [a] + [(X0 + (j + 0.5) * PASO, Y1 - (i + 0.5) * PASO) for i, j in ruta[1:-1]] + [b]


# ---------------------------------------------------------------- D2 (capítulo 9): alerta solar, DESPUÉS de P4, ya de regreso
# Primer lugar llano (pendiente media < 10° en 10 m) a ≥ 120 m de P4 sobre el camino real de regreso P4 → H.
_regreso = camino((P4["x"], P4["y"]), (pts[k_h]["x"], pts[k_h]["y"]))
_acum, x_d2, y_d2 = 0.0, None, None
for a, b in zip(_regreso, _regreso[1:]):
    _acum += math.hypot(b[0] - a[0], b[1] - a[1])
    if _acum >= 120 and media(PEND, *ij(*b), 5) < 10:
        x_d2, y_d2 = b
        break
if x_d2 is None:
    x_d2, y_d2 = _regreso[min(len(_regreso) - 1, 40)]
i_d2, j_d2 = ij(x_d2, y_d2)

# ---------------------------------------------------------------- Refugio (capítulo 9, "junto a la cresta"): REGLA DEL JUEGO
# El lugar más cercano a D2 con pendiente < 15° al pie (≤ 10 m) de una pared real (> 23° y >= 3 m de alto).
# pared = pendiente > 23° Y al menos 3 m de desnivel real en un círculo de ~7 m (no un escalón del DEM)
from skimage.morphology import dilation, erosion, disk  # noqa: E402
_dem0 = np.nan_to_num(DEM, nan=float(np.nanmean(DEM)))
_pared = (PEND > 23) & ((dilation(_dem0, disk(3)) - erosion(_dem0, disk(3))) >= 3.0)
_cerca_pared = np.zeros_like(_pared)
for di in range(-5, 6):
    for dj in range(-5, 6):
        if di * di + dj * dj <= 25:
            _cerca_pared |= np.roll(np.roll(_pared, di, 0), dj, 1)
_cand = np.argwhere(_cerca_pared & (PEND < 15))
_k = int(np.argmin(np.hypot(_cand[:, 0] - i_d2, _cand[:, 1] - j_d2)))
i_ref, j_ref = map(int, _cand[_k])
x_ref, y_ref = X0 + (j_ref + 0.5) * PASO, Y1 - (i_ref + 0.5) * PASO

# ---------------------------------------------------------------- P5 (capítulo 9, opcional): cima a 300–700 m de D2 con subida > 23°
mejor = None
ri = int(700 / PASO)
for i in range(max(10, i_d2 - ri), min(DEM.shape[0] - 10, i_d2 + ri), 4):
    for j in range(max(10, j_d2 - ri), min(DEM.shape[1] - 10, j_d2 + ri), 4):
        d = math.hypot(i - i_d2, j - j_d2) * PASO
        if not 300 <= d <= 700 or PEND[i, j] > 15:
            continue
        pr = elev(i, j) - media(DEM, i, j, 60)
        if pr < 8:
            continue
        linea = [PEND[int(i_d2 + (i - i_d2) * t / 60), int(j_d2 + (j - j_d2) * t / 60)] for t in range(61)]
        if max(linea) <= 23:
            continue
        puntaje = pr - abs(d - 500) / 50
        if not mejor or puntaje > mejor[0]:
            mejor = (puntaje, i, j, d, pr, max(linea))
_, i_p5, j_p5, d_p5, pr_p5, max_p5 = mejor
x_p5, y_p5 = X0 + (j_p5 + 0.5) * PASO, Y1 - (i_p5 + 0.5) * PASO


# ---------------------------------------------------------------- perfiles de cada tramo
def muestras_linea(a, b, paso_m=2.0):
    d = math.hypot(a[0] - b[0], a[1] - b[1])
    n = max(2, int(d / paso_m))
    return [(a[0] + (b[0] - a[0]) * t / n, a[1] + (b[1] - a[1]) * t / n) for t in range(n + 1)]


def tramo_recorrido(k1, k2):
    paso = 1 if k2 >= k1 else -1
    return [(pts[k]["x"], pts[k]["y"]) for k in range(k1, k2 + paso, paso)]


def estadisticas(xy):
    densos = []
    for a, b in zip(xy, xy[1:]):
        densos += muestras_linea(a, b)[:-1]
    densos.append(xy[-1])
    pend = [PEND[ij(x, y)] for x, y in densos if 0 <= ij(x, y)[0] < DEM.shape[0] and 0 <= ij(x, y)[1] < DEM.shape[1]]
    lls = [latlon(x, y) for x, y in xy]
    largo = sum(dist(a, b) for a, b in zip(lls, lls[1:]))
    # Perfil de elevación REAL (DEM) cada ~10 m: [distancia_m, elevación_m]
    perfil, d_acum, prev = [], 0.0, None
    for k, (x, y) in enumerate(densos):
        if prev is not None:
            d_acum += math.hypot(x - prev[0], y - prev[1])
        prev = (x, y)
        if k % 5 == 0 or k == len(densos) - 1:
            i, j = ij(x, y)
            if 0 <= i < DEM.shape[0] and 0 <= j < DEM.shape[1]:
                perfil.append([round(d_acum), round(float(DEM[i, j]), 1)])
    return {"largo_m": round(largo), "pendiente_media": round(float(np.mean(pend)), 1), "pendiente_p90": round(float(np.percentile(pend, 90)), 1),
            "pendiente_max": round(float(np.max(pend)), 1), "frac_mas_15": round(float(np.mean(np.array(pend) > 15)), 3), "perfil": perfil}


def punto(ide, x, y, extra):
    la, lo = latlon(x, y)
    i, j = ij(x, y)
    return {"id": ide, "lat": round(la, 6), "lon": round(lo % 360, 6), "elevacion_m": round(elev(i, j), 1),
            "pendiente_grados": round(float(PEND[i, j]), 1), "pendiente_media_15m": round(media(PEND, i, j, 7), 1), **extra}


H, D1, DEP = pts[k_h], pts[k_d1], pts[k_dep]
_c42 = camino((P4["x"], P4["y"]), (x_d2, y_d2))
media_dist_d2 = sum(math.hypot(b[0] - a[0], b[1] - a[1]) for a, b in zip(_c42, _c42[1:]))
P1 = {"x": x_p1, "y": y_p1}
puntos = [
    punto("H", H["x"], H["y"], {"capitulos": [3, 10], "terreno": f"Terreno llano sobre el recorrido real de Curiosity (sitio {H['sitio']}, sol {H['sol']}, {fecha_sol(H['sol'])}), unos 1,0 km antes de Altadena.", "criterio": "punto del recorrido a 0,85–1,25 km de P2 con la menor pendiente media en 15 m", "fuentes": [PLACES, F_DEM]}),
    punto("P1", P1["x"], P1["y"], {"capitulos": [4], "terreno": f"Loma {prom_ij(i_p1, j_p1):.1f} m más alta que su entorno de 150 m, a menos de 150 m del recorrido de Curiosity; desde aquí se ven las capas de Mount Sharp al sur.", "criterio": "punto más prominente (pendiente media < 15° en 7 m) a ≤ 150 m del recorrido entre 0,3 y 0,75 km de H", "fuentes": [PLACES, F_DEM]}),
    punto("P2", P2["x"], P2["y"], {"capitulos": [5], "nombre_real": "Altadena", "terreno": "Altadena: primera perforación de Curiosity en el boxwork (8 jun 2025), en la transición antes de las crestas.", "por_que_el_nombre": "Lleva el nombre de una comunidad cerca de JPL muy afectada por el incendio de Eaton Canyon en enero de 2025. " + NOMBRE_UYUNI, "criterio": "lugar real de la perforación (PLACES sitio 116, drive 1944)", "fuentes": [PLACES, F_BLOG_ALT, F_JPL_ALT, F_UYUNI]}),
    punto("D1", D1["x"], D1["y"], {"capitulos": [6], "terreno": f"Hondonada sobre el recorrido (sol {D1['sol']}): {media(DEM, D1['i'], D1['j'], 40) - elev(D1['i'], D1['j']):.1f} m más baja que su entorno de 80 m y de textura lisa en la ortofoto (arena).", "criterio": "punto del recorrido entre P2 y Monte Grande más bajo y liso, con pendiente < 15°", "fuentes": [PLACES, F_DEM, F_ORTO]}),
    punto("P3", P3["x"], P3["y"], {"capitulos": [7, 8], "nombre_real": "Nevado Sajama", "terreno": "Nevado Sajama: cresta boxwork donde Curiosity perforó (sol 4718); arcillas en la cresta. Desde aquí se baja a la hondonada (capítulo 8: de frente o rodeando).", "por_que_el_nombre": "Nevado Sajama es un volcán extinto, el pico más alto de Bolivia. " + NOMBRE_UYUNI, "criterio": "lugar real de la perforación (PLACES sitio 120, drive 82)", "fuentes": [PLACES, F_BLOG_NS, F_BLOG_DRILL, F_UYUNI]}),
    punto("DEP", DEP["x"], DEP["y"], {"capitulos": [7], "terreno": f"Punto llano junto al recorrido, a {dist((DEP['lat'], DEP['lon']), (P3['lat'], P3['lon'])):.0f} m de la cresta. El depósito es ficción del juego; el lugar es real.", "criterio": "punto del recorrido a 150–250 m de P3 con la menor pendiente media", "fuentes": [PLACES, F_DEM], "ficcion": "depósito de suministros (regla del juego)"}),
    punto("P4", P4["x"], P4["y"], {"capitulos": [8], "nombre_real": "Valle de la Luna (hondonada Monte Grande)", "terreno": "Valle de la Luna: perforación de Curiosity en la hondonada Monte Grande (sol ~4693); carbonatos en la hondonada.", "por_que_el_nombre": "Valle de la Luna se llama así por una zona de valles del desierto de Atacama, en Chile. " + NOMBRE_UYUNI + " (No encontramos una fuente que explique el nombre \"Monte Grande\".)", "criterio": "lugar real de la perforación (PLACES sitio 119, drive 1722)", "fuentes": [PLACES, F_BLOG_MG, F_BLOG_DRILL, F_UYUNI]}),
    punto("D2", x_d2, y_d2, {"capitulos": [9], "terreno": f"Ya de regreso, a {media_dist_d2:.0f} m de la hondonada por el camino: lugar llano (pendiente media {media(PEND, i_d2, j_d2, 5):.0f}° en 10 m) donde llega la alerta solar y se decide: regresar ya, refugiarse junto a una cresta o subir al mirador alto.", "criterio": "primer lugar llano (< 10° en 10 m) a >= 120 m de P4 sobre el camino real de regreso", "fuentes": [F_DEM]}),
    punto("REF", x_ref, y_ref, {"capitulos": [9], "terreno": f"Al pie de una pared real (más de 23° y al menos 3 m de alto en el DEM), a {math.hypot(x_ref - x_d2, y_ref - y_d2):.0f} m de D2: la roca tapa una parte del cielo.", "criterio": "lugar más cercano a D2 con pendiente < 15° a <= 10 m de una pared > 23° con >= 3 m de desnivel en ~7 m", "fuentes": [F_DEM], "ficcion": "refugio: REGLA DEL JUEGO (no es una medición de radiación)"}),
    punto("P5", x_p5, y_p5, {"capitulos": [9], "requiere": "flags.mirador_alto", "terreno": f"Cima {pr_p5:.0f} m más alta que su entorno, a {d_p5:.0f} m de D2; la subida directa pasa por pendientes de hasta {max_p5:.0f}°.", "criterio": "cima a 300–700 m de D2, prominencia >= 8 m y subida con pendiente > 23°", "fuentes": [F_DEM, F_PEND]}),
]
por_id = {p["id"]: p for p in puntos}

# ---------------------------------------------------------------- tramos (líneas en lat/lon) y distancias
def ll(xy):
    return [[round(latlon(x, y)[1] % 360, 6), round(latlon(x, y)[0], 6)] for x, y in xy]


tramos = {
    "H-P1": camino((H["x"], H["y"]), (P1["x"], P1["y"])), "P1-P2": camino((P1["x"], P1["y"]), (P2["x"], P2["y"])),
    "P2-D1": camino((P2["x"], P2["y"]), (D1["x"], D1["y"])),
    "D1-P3 (camino firme)": camino((D1["x"], D1["y"]), (P3["x"], P3["y"])),
    "D1-P3 (atajo por la arena)": [(D1["x"], D1["y"]), (P3["x"], P3["y"])],
    "P3-DEP (desvío)": camino((P3["x"], P3["y"]), (DEP["x"], DEP["y"])),
    "P3-P4 (bajar de frente)": [(P3["x"], P3["y"]), (P4["x"], P4["y"])],
    "P3-P4 (rodear la cresta)": camino_rodeando((P3["x"], P3["y"]), (P4["x"], P4["y"]), i_borde, j_borde),
    "P4-D2": camino((P4["x"], P4["y"]), (x_d2, y_d2)),
    "D2-H (regresar ya)": camino((x_d2, y_d2), (H["x"], H["y"])),
    "D2-REF (refugio)": camino((x_d2, y_d2), (x_ref, y_ref)),
    "REF-H (regreso tras el refugio)": camino((x_ref, y_ref), (H["x"], H["y"])),
    "D2-P5 (subir al mirador alto)": [(x_d2, y_d2), (x_p5, y_p5)],
    "P5-H (regreso desde el mirador)": camino((x_p5, y_p5), (H["x"], H["y"])),
}
# "rodear la cresta": camino de menor costo de P3 a P4 que evita el borde empinado; "de frente": recta por el borde.
info_tramos = {k: {**estadisticas(v), "linea": ll(v)} for k, v in tramos.items()}

# Orden de la HISTORIA: cap. 3 H · 4 P1 · 5 P2 · 6 D1 · 7 P3 (+ desvío DEP) · 8 P3 → P4 · 9 D2 (+ refugio o P5) · 10 H
orden = ["H", "P1", "P2", "D1", "P3", "DEP", "P4", "D2", "REF", "P5"]
anterior = {"P1": "H", "P2": "P1", "D1": "P2", "P3": "D1", "DEP": "P3", "P4": "P3", "D2": "P4", "REF": "D2", "P5": "D2"}
tramo_de = {"P1": "H-P1", "P2": "P1-P2", "D1": "P2-D1", "P3": "D1-P3 (camino firme)", "DEP": "P3-DEP (desvío)", "P4": "P3-P4 (rodear la cresta)",
            "D2": "P4-D2", "REF": "D2-REF (refugio)", "P5": "D2-P5 (subir al mirador alto)"}
acum_m = 0
for ide in orden:
    p = por_id[ide]
    if ide in anterior:
        p["anterior"] = anterior[ide]
        p["distancia_al_anterior_m"] = info_tramos[tramo_de[ide]]["largo_m"]
        if ide not in ("DEP", "REF", "P5"):
            acum_m += p["distancia_al_anterior_m"]
            p["distancia_acumulada_m"] = acum_m
    else:
        p["distancia_acumulada_m"] = 0
ida = acum_m
vuelta = info_tramos["D2-H (regresar ya)"]["largo_m"]

salida = {
    "descripcion": "Posiciones REALES de la ruta del juego (Parte 2). Para cambiar un punto, edita su lat/lon aquí: el mapa 2D, el minimapa y el 3D la leen de este archivo.",
    "coordenadas": "latitud planetocéntrica y longitud Este 0–360° (esfera Mars 2000)",
    "criterio_general": "La historia manda en el orden (cap. 3 H, 4 P1, 5 P2, 6 D1, 7 P3 + DEP, 8 P3→P4, 9 D2 + REF o P5, 10 H); el terreno real decide dónde queda cada punto. Las paradas de ciencia son las perforaciones reales de Curiosity en el boxwork (2025, PDS PLACES); H, D1 y DEP están sobre el recorrido real del rover; P1, D2, REF y P5 se eligieron con el relieve real (DEM 1 m USGS). Los tramos a pie son caminos de menor costo sobre el relieve real que evitan pendientes > 15° y casi prohíben > 23°; el atajo y la subida a P5 son rectas a propósito.",
    "distancias": f"Haversine sobre la esfera de radio 3.396,2 km (NASA Mars Fact Sheet). Ida H→D2 (camino firme, rodeando la cresta): {ida} m; regreso D2→H: {vuelta} m; total {ida + vuelta} m. Opcionales: depósito {info_tramos['P3-DEP (desvío)']['largo_m']} m, refugio {info_tramos['D2-REF (refugio)']['largo_m']} m, mirador alto {info_tramos['D2-P5 (subir al mirador alto)']['largo_m']} m.",
    "umbrales_pendiente": {"camina": 15, "peligro": 23, "fuente": F_PEND},
    "puntos": puntos, "tramos": info_tramos,
    "fuentes": {"recorrido": PLACES, "relieve": F_DEM, "ortofoto": F_ORTO, "doi_places": "10.17189/1520397"},
    "estado": "propuesta automática pendiente de revisión (usuaria y Sefora)",
}
with open(os.path.join(RAIZ, "Frontend", "src", "data", "ruta_real.json"), "w", encoding="utf-8") as f:
    json.dump(salida, f, ensure_ascii=False, indent=1)

# ---------------------------------------------------------------- docs/ruta_propuesta.md
nombre = {"H": "Base Aurora", "P1": "Mirador de Mount Sharp", "P2": "Zona de transición (Altadena)", "D1": "Hondonada: atajo o camino firme", "P3": "Cresta boxwork (Nevado Sajama)",
          "DEP": "Depósito de suministros (desvío)", "P4": "Hondonada con carbonatos (Valle de la Luna)", "D2": "Alerta solar: decisión", "REF": "Refugio junto a la cresta", "P5": "Mirador alto (opcional)"}
filas = []
for ide in orden:
    p = por_id[ide]
    d = p.get("distancia_al_anterior_m")
    nombre_real = f" · nombre real: {p['nombre_real']}" if p.get("nombre_real") else ""
    filas.append(f"| {ide} · {nombre[ide]} | {', '.join(map(str, p['capitulos']))} | {p['lat']:.6f} | {p['lon']:.6f} | {p['elevacion_m']:.1f} m | {p['terreno']}{nombre_real} | {p['pendiente_media_15m']}° (punto: {p['pendiente_grados']}°) | {'—' if d is None else f'{d} m desde {p['anterior']}'} | {' · '.join(p['fuentes'])} |")
tr = [f"| {k} | {v['largo_m']} m | {v['pendiente_media']}° | {v['pendiente_p90']}° | {v['pendiente_max']}° | {v['frac_mas_15'] * 100:.0f} % |" for k, v in info_tramos.items()]
nombres = [f"- **{por_id[i]['nombre_real']}** ({i}): {por_id[i]['por_que_el_nombre']}" for i in ("P2", "P3", "P4")]
md = f"""# Propuesta de la ruta real del juego

**Estado: propuesta para revisar (usuaria y Sefora).** Todos los puntos están en `Frontend/src/data/ruta_real.json`: para mover uno, se cambia su lat/lon ahí y el mapa 2D, el minimapa y el 3D lo toman de ese archivo (después hay que volver a correr `tools/preparar-cartografia/corredor.py`).

**Regla: la historia manda en el orden; el terreno real decide dónde queda cada punto.** Orden del guion: cap. 3 **H** (base) · 4 **P1** (mirador) · 5 **P2** (transición) · 6 **D1** (atajo por la arena o camino firme) · 7 **P3** (cresta; desvío opcional al depósito **DEP**) · 8 de **P3** a **P4** (bajar de frente o rodear la cresta) · 9 **D2** ya de regreso (alerta solar: regresar ya, refugiarse en **REF** o subir al mirador alto **P5**) · 10 **H**.

**Criterio.** Las tres paradas de ciencia son las **perforaciones reales de Curiosity en 2025** (PDS PLACES, doi:10.17189/1520397): Altadena (P2, transición), Nevado Sajama (P3, cresta) y Valle de la Luna (P4, hondonada Monte Grande, con carbonatos). H, D1 y DEP están **sobre el recorrido real del rover**; P1, D2, REF y P5 se eligieron con el relieve real (DEM 1 m de USGS a 2 m). Los tramos a pie son **caminos de menor costo sobre el relieve real** (evitan > 15° y casi prohíben > 23°). Las opciones arriesgadas (atajo por la arena, bajar la cresta de frente, subir al mirador alto) son rectas a propósito. El recorrido real de Curiosity se muestra como capa aparte. Coordenadas: latitud planetocéntrica y longitud Este 0–360°. Distancias: haversine sobre una esfera de 3.396,2 km (NASA Mars Fact Sheet).

**Distancias.** Ida H → D2 (por el camino firme y rodeando la cresta): **{ida} m**; regreso D2 → H: **{vuelta} m**; total **{(ida + vuelta) / 1000:.2f} km**. Opcionales: desvío al depósito {info_tramos['P3-DEP (desvío)']['largo_m']} m (ida), refugio {info_tramos['D2-REF (refugio)']['largo_m']} m, subida al mirador alto {info_tramos['D2-P5 (subir al mirador alto)']['largo_m']} m.

| Punto | Capítulo | Lat | Lon E | Elevación | Qué hay en el terreno real | Pendiente | Distancia al anterior | Fuente |
|---|---|---|---|---|---|---|---|---|
{chr(10).join(filas)}

## Por qué se llaman así (nombres reales del equipo de Curiosity)

{chr(10).join(nombres)}

Fuentes: Curiosity Blog, Sols 4573-4574 ("Welcome to the Uyuni Quad", Lauren Edgar, USGS, 18 jun 2025); NASA/JPL, 23 jun 2025 (Altadena); Curiosity Blog, Sols 4709-4715 (Catherine O'Connell-Cooper, 18 nov 2025).

## Tramos (pendiente calculada cada 2 m sobre el DEM a 2 m)

| Tramo | Largo | Pendiente media | Percentil 90 | Máxima | Parte > 15° |
|---|---|---|---|---|---|
{chr(10).join(tr)}

Notas:
- Umbrales de pendiente: 15° para caminar y 23° de peligro (Curiosity se desvió 150 m ante una pendiente de 23° para buscar una de menos de 15°; NASA/JPL, 2023).
- El DEM a 2 m suaviza las crestas de 1–2 m del boxwork; las pendientes muy cortas pueden ser más fuertes en el terreno real.
- P3 y P4 están a unos {dist((P3['lat'], P3['lon']), (P4['lat'], P4['lon'])):.0f} m: así de cerca están la cresta y la hondonada que perforó Curiosity. Las diferencias de escala con el guion están en `docs/correcciones_guion.md`.
- El depósito (DEP) y el refugio (REF) son reglas del juego; sus lugares son reales.
"""
with open(os.path.join(RAIZ, "docs", "ruta_propuesta.md"), "w", encoding="utf-8") as f:
    f.write(md)
print(md)

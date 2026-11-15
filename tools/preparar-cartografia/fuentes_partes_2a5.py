"""Agrega a cartografia/fuentes.json los archivos de las Partes 3 y 5 (idempotente). Uso: python fuentes_partes_2a5.py"""
import json
import os

RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
CART = os.path.join(RAIZ, "Frontend", "public", "cartografia")
F = os.path.join(CART, "fuentes.json")
fu = json.load(open(F, encoding="utf-8"))
DEM = "https://astrogeology.usgs.gov/search/map/mars_msl_gale_merged_dem_1m"
ORTO = "https://astrogeology.usgs.gov/search/map/mars_msl_gale_merged_orthophoto_mosaic_25cm"
peso = lambda r: sum(os.path.getsize(os.path.join(d, f)) for d, _, fs in os.walk(os.path.join(CART, r)) for f in fs) if os.path.isdir(os.path.join(CART, r)) else os.path.getsize(os.path.join(CART, r))  # noqa: E731
nuevos = [
    {"archivo": "relieve_1m/", "producto": "Mars MSL Gale Merged DEM 1m (v3), corredor de la ruta sin remuestrear", "instrumento": "HiRISE (Mars Reconnaissance Orbiter), modelos estéreo",
     "resolucion": "1 m/px (solo a <= 150 m de la ruta)", "fecha_producto": "2016", "url": DEM, "cita": "Parker y Calef (2016), USGS"},
    {"archivo": "relieve_malla.bin", "producto": "Malla 3D del DEM 1m (v3) remuestreada a 512 × 512", "instrumento": "HiRISE (Mars Reconnaissance Orbiter), modelos estéreo",
     "resolucion": "~5,9 m entre vértices", "fecha_producto": "2016", "url": DEM, "cita": "Derivado de Parker y Calef (2016)"},
    {"archivo": "relieve_malla.json", "producto": "Metadatos de la malla 3D", "instrumento": "HiRISE (Mars Reconnaissance Orbiter), modelos estéreo",
     "resolucion": "~5,9 m entre vértices", "fecha_producto": "2016", "url": DEM, "cita": "Derivado de Parker y Calef (2016)"},
    {"archivo": "ortofoto_3d.jpg", "producto": "Textura 3D de la ortofoto 25cm (v3) reducida a 2048 px", "instrumento": "HiRISE (Mars Reconnaissance Orbiter)",
     "resolucion": "~1,46 m/px", "fecha_producto": "2016", "url": ORTO, "cita": "Derivado de Calef y Parker (2016), USGS"},
]
for n in nuevos:
    n["bytes"] = peso(n["archivo"].rstrip("/"))
    fu["archivos"] = [a for a in fu["archivos"] if a["archivo"] != n["archivo"]] + [n]
for a in fu["archivos"]:
    if a["archivo"] == "ortofoto/":
        a["resolucion"] = "25 cm/px en el corredor de la ruta (<= 150 m); 1 m/px en la zona; niveles de 50 cm, 2, 4 y 8 m"
        a["bytes"] = peso("ortofoto")
with open(F, "w", encoding="utf-8") as f:
    json.dump(fu, f, ensure_ascii=False, indent=1)
cr = json.load(open(os.path.join(CART, "capas_reales.json"), encoding="utf-8"))
for c in cr["capas"]:
    if c["id"] == "optica":
        c["resolucion"] = "25 cm/px en el corredor de la ruta; 1 m/px en la zona"
        c["atribucion"] = "HiRISE · 25 cm/px (ruta) y 1 m/px (zona) · USGS (Calef y Parker, 2016)"
with open(os.path.join(CART, "capas_reales.json"), "w", encoding="utf-8") as f:
    json.dump(cr, f, ensure_ascii=False, indent=1)
print("fuentes.json:", len(fu["archivos"]), "archivos")

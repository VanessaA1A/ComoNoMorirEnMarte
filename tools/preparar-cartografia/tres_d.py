"""PARTE 5: datos para el 3D de Gale, desde los recortes REALES ya preparados (sin descargar nada).

- relieve_malla.bin: alturas del DEM 1 m de USGS (Parker y Calef, 2016), remuestreadas (bilineal) a 512 × 512 vértices
  (~5,9 m entre vértices) para la malla de three.js; uint16 little-endian con la MISMA codificación que relieve.png.
  El navegador no puede leer un PNG de 16 bits con canvas (lo baja a 8 bits): por eso va en binario.
- ortofoto_3d.jpg: ortofoto USGS de 25 cm (Calef y Parker, 2016) a 1 m, reducida a 2048 px (~1,46 m/px) con Lanczos.
Uso: tools/cache/venv/Scripts/python.exe tools/preparar-cartografia/tres_d.py
"""
import json
import os

import numpy as np
from PIL import Image

RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
CART = os.path.join(RAIZ, "Frontend", "public", "cartografia")
CACHE = os.path.join(RAIZ, "tools", "cache", "carto")
REL = json.load(open(os.path.join(CART, "relieve.json"), encoding="utf-8"))
N = 512

dem = np.load(os.path.join(CACHE, "relieve_2m.npy")).astype(np.float32)
hmin = REL.get("altura_min_exacta_m", REL["altura_min_m"]); esc = REL["escala_m"]
malla = np.array(Image.fromarray(dem, mode="F").resize((N, N), Image.BILINEAR))
v = np.clip(np.round((malla - hmin) / esc), 0, 65535).astype("<u2")
v.tofile(os.path.join(CART, "relieve_malla.bin"))
err = float(np.abs(v * esc + hmin - malla).max())
meta = {"archivo": "relieve_malla.bin", "formato": "uint16 little-endian, filas de norte a sur, columnas de oeste a este",
        "vertices": [N, N], "m_entre_vertices": round(REL["lado_m"] / (N - 1), 2), "lado_m": REL["lado_m"],
        "codificacion": f"altura = {hmin} + valor × {esc} m (igual que relieve.png)", "altura_min_m": hmin, "escala_m": esc,
        "altura_min_malla_m": round(float(malla.min()), 2), "altura_max_malla_m": round(float(malla.max()), 2),
        "remuestreo": "bilineal desde el relieve de 2 m (que viene del DEM de 1 m)", "error_codificacion_max_m": round(err, 4),
        "limites": REL["limites"], "proyectado_m": REL["proyectado_m"], "fuente": REL["fuente"]}
with open(os.path.join(CART, "relieve_malla.json"), "w", encoding="utf-8") as f:
    json.dump(meta, f, ensure_ascii=False, indent=1)

orto = np.load(os.path.join(CACHE, "ortofoto_1m.npy"))
Image.fromarray(orto).resize((2048, 2048), Image.LANCZOS).save(os.path.join(CART, "ortofoto_3d.jpg"), quality=80, optimize=True)
print(f"relieve_malla.bin {os.path.getsize(os.path.join(CART, 'relieve_malla.bin')) / 1e3:.0f} KB · ortofoto_3d.jpg {os.path.getsize(os.path.join(CART, 'ortofoto_3d.jpg')) / 1e3:.0f} KB · error {err:.4f} m")

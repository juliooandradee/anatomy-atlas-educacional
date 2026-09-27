from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / 'data/raw'
OUT = ROOT / 'web/public/data'
STRUCTURES = [
    ('liver', 'Fígado', '#cf859c', 'Hepar'),
    ('spleen', 'Baço', '#b7a0db', 'Lien'),
    ('stomach', 'Estômago', '#e8b195', 'Gaster'),
    ('kidney_right', 'Rim direito', '#ef9d99', 'Ren dexter'),
    ('kidney_left', 'Rim esquerdo', '#e87e93', 'Ren sinister'),
    ('aorta', 'Aorta', '#e85178', 'Aorta'),
    ('inferior_vena_cava', 'Veia cava inferior', '#97afe8', 'Vena cava inferior'),
    ('spine', 'Coluna vertebral', '#e7d9be', 'Columna vertebralis'),
]
REQUIRED = [s[0] for s in STRUCTURES[:7]]

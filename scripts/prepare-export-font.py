"""Build the bundled PDF font from Google's OFL-licensed Noto Sans SC variable TTF.

Optional maintenance utility: python3 -m pip install fonttools
python3 scripts/prepare-export-font.py /path/to/NotoSansSC-wght.ttf
The generated font is committed; normal app builds do not need Python.
"""
from pathlib import Path
import sys
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools import subset

font = TTFont(sys.argv[1])
instantiateVariableFont(font, {"wght": 400}, inplace=True)
options = subset.Options()
options.hinting = False
options.layout_features = []
options.name_IDs = ["*"]
subsetter = subset.Subsetter(options=options)
subsetter.populate(unicodes=[code for code in font.getBestCmap() if code < 0xA000 or 0xF900 <= code <= 0xFAFF or 0xFF00 <= code <= 0xFFEF])
subsetter.subset(font)
for record in font["name"].names:
    replacement = {1: "GreenLink Sans", 2: "Regular", 3: "GreenLinkSans-Regular-1", 4: "GreenLink Sans Regular", 6: "GreenLinkSans-Regular", 16: "GreenLink Sans", 17: "Regular"}.get(record.nameID)
    if replacement:
        record.string = replacement.encode(record.getEncoding())
output = Path(__file__).resolve().parents[1] / "src/assets/fonts/GreenLinkSans-Regular.ttf"
output.parent.mkdir(parents=True, exist_ok=True)
font.save(output)
print(f"Prepared PDF font: {output.stat().st_size:,} bytes")

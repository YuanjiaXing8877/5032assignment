# PDF font

GreenLinkSans-Regular.ttf is a static weight-400, unhinted subset derived from Noto Sans SC. It retains the source font's supported characters below U+A000, CJK compatibility ideographs and fullwidth forms. It supports Latin and common Chinese text; it is not a universal font for every writing system or emoji.

Source: https://github.com/google/fonts/tree/main/ofl/notosanssc

Original variable font SHA-256: a3041811a78c361b1de50f953c805e0244951c21c5bd412f7232ef0d899af0da

Rebuild with `python3 scripts/prepare-export-font.py /path/to/NotoSansSC-wght.ttf` after installing fonttools. The generated font is committed, so app builds do not need Python. The derivative font retains the SIL Open Font License 1.1 and original copyright notice in OFL.txt.

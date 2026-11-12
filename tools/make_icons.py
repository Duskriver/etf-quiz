"""生成 PWA 图标（纯 Python，无依赖）：红底 + 白色对勾"""
import os
import struct
import zlib

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def seg_dist(px, py, ax, ay, bx, by):
    dx, dy = bx - ax, by - ay
    t = max(0, min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)))
    cx, cy = ax + t * dx, ay + t * dy
    return ((px - cx) ** 2 + (py - cy) ** 2) ** 0.5


def make(size, path):
    red, white = (195, 1, 35), (255, 255, 255)
    s = size
    pts = [(0.28 * s, 0.52 * s), (0.44 * s, 0.68 * s), (0.74 * s, 0.34 * s)]
    w = 0.055 * s
    rows = []
    for y in range(s):
        row = bytearray([0])
        for x in range(s):
            d = min(seg_dist(x + .5, y + .5, *pts[0], *pts[1]), seg_dist(x + .5, y + .5, *pts[1], *pts[2]))
            a = max(0.0, min(1.0, w - d + 0.5))  # 抗锯齿
            row += bytes(round(r * (1 - a) + c * a) for r, c in zip(red, white))
        rows.append(bytes(row))
    raw = zlib.compress(b"".join(rows), 9)

    def chunk(t, d):
        return struct.pack(">I", len(d)) + t + d + struct.pack(">I", zlib.crc32(t + d) & 0xffffffff)

    png = b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", s, s, 8, 2, 0, 0, 0)) + chunk(b"IDAT", raw) + chunk(b"IEND", b"")
    open(path, "wb").write(png)
    print(path)


for n in (192, 512):
    make(n, os.path.join(ROOT, "docs", f"icon-{n}.png"))

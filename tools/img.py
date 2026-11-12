"""Read and write screenshots without PIL, ImageMagick or ffmpeg.

sips ships with every Mac and converts anything to BMP, which is
uncompressed and trivial to parse — so sips does the codec work and this
only moves bytes. Everything round-trips through BMP and goes back out as
whatever the file was (PNG, or JPEG by extension).

    import img
    a = img.load("screen.png")      # numpy array, H x W x 3, RGB
    img.save("screen.png", a)
"""
import struct, subprocess, os, tempfile
import numpy as np


def _sips(*args):
    subprocess.run(["sips", *args], check=True, capture_output=True)


def load(path):
    tmp = tempfile.mktemp(suffix=".bmp")
    _sips("-s", "format", "bmp", path, "--out", tmp)
    b = open(tmp, "rb").read()
    os.unlink(tmp)
    assert b[:2] == b"BM", path
    off = struct.unpack("<I", b[10:14])[0]
    w, h = struct.unpack("<ii", b[18:26])
    bpp = struct.unpack("<H", b[28:30])[0]
    assert bpp in (24, 32), "bpp %d in %s" % (bpp, path)
    px = bpp // 8
    rows = abs(h)
    stride = ((w * px + 3) // 4) * 4
    a = np.frombuffer(b[off:off + stride * rows], dtype=np.uint8)
    a = a.reshape(rows, stride)[:, :w * px].reshape(rows, w, px)
    if h > 0:                                   # bottom-up bitmap
        a = a[::-1]
    return np.ascontiguousarray(a[:, :, 2::-1])  # BGR(A) -> RGB


def save(path, arr, quality=86):
    h, w, _ = arr.shape
    stride = ((w * 3 + 3) // 4) * 4
    body = np.zeros((h, stride), dtype=np.uint8)
    body[:, :w * 3] = arr[:, :, ::-1].reshape(h, w * 3)       # RGB -> BGR
    data = body.tobytes()
    hdr = (b"BM" + struct.pack("<IHHI", 14 + 40 + len(data), 0, 0, 54)
           + struct.pack("<iiiHHIIiiII", 40, w, -h, 1, 24, 0, len(data), 2835, 2835, 0, 0))
    tmp = tempfile.mktemp(suffix=".bmp")
    open(tmp, "wb").write(hdr + data)
    if path.lower().endswith((".jpg", ".jpeg")):
        _sips("-s", "format", "jpeg", "-s", "formatOptions", str(quality), tmp, "--out", path)
    else:
        _sips("-s", "format", "png", tmp, "--out", path)
    os.unlink(tmp)

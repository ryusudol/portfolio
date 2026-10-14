"""Packs the Orbit Explorer engine exports into the portfolio's binaries.

    python3 scripts/orbit/pack.py <export dir> <earth-day-2k.jpg> <earth-night-2k.jpg> public/orbit

Writes (little-endian):
  catalog.bin   u32 n | f64 jd | then per object, structure of arrays:
                u16 log-altitude, u16 ecc, u16 incl, u16 raan, u16 argp, u16 mean anomaly, u8 group
                (a random sample in shuffled order, so any prefix is a random sample too)
  shell.bin     u32 n | f64 jd | f64 gmst | u16 planes | then SoA:
                u8 plane, u16 raan, u16 arg of latitude, u16 altitude (10 m), u16 incl,
                u16 mean motion ((rev/day - 14) * 16384)
                (sorted by plane RAAN, then argument of latitude)
  earth.bin     360 x 180 u8 surface (class | lights << 2; row 0 = 90N, col 0 = 180W) | 90 x 180 u8 coverage (row 0 = 90S)
  encounters.bin u32 n | then SoA: u16 rel speed (m/s), u16 miss (m), u16 tca (s), u8 cat a, u8 cat b,
                i16 lat, i16 lon (0.01°), u16 altitude (0.1 km)
"""

import csv
import math
import random
import struct
import sys

from PIL import Image

MU = 398600.8
RE = 6378.135
LOG_LO, LOG_HI = math.log(6400.0), math.log(420000.0)

src, jpg, night_jpg, out = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4]


def osculating(x, y, z, vx, vy, vz):
    r = math.sqrt(x * x + y * y + z * z)
    v2 = vx * vx + vy * vy + vz * vz
    hx, hy, hz = y * vz - z * vy, z * vx - x * vz, x * vy - y * vx
    h = math.sqrt(hx * hx + hy * hy + hz * hz)
    i = math.acos(max(-1.0, min(1.0, hz / h)))
    raan = math.atan2(hx, -hy) % math.tau
    rv = x * vx + y * vy + z * vz
    ex = ((v2 - MU / r) * x - rv * vx) / MU
    ey = ((v2 - MU / r) * y - rv * vy) / MU
    ez = ((v2 - MU / r) * z - rv * vz) / MU
    e = math.sqrt(ex * ex + ey * ey + ez * ez)
    # argument of latitude: angle from the ascending node to r, in the orbit plane
    cO, sO = math.cos(raan), math.sin(raan)
    u = math.atan2(z / math.sin(i) if math.sin(i) > 1e-9 else -x * sO + y * cO, x * cO + y * sO) % math.tau
    if e > 1e-7:
        argp = math.atan2(ez / math.sin(i) if math.sin(i) > 1e-9 else -ex * sO + ey * cO, ex * cO + ey * sO) % math.tau
    else:
        argp = 0.0
    nu = (u - argp) % math.tau
    E = 2 * math.atan2(math.sqrt(1 - e) * math.sin(nu / 2), math.sqrt(1 + e) * math.cos(nu / 2)) if e < 1 else 0.0
    M = (E - e * math.sin(E)) % math.tau
    return e, i, raan, argp, M, u


def q_angle(rad):
    return int(round((rad % math.tau) / math.tau * 65536)) % 65536


def q_incl(deg):
    return int(round(deg / 180.0 * 65535))


def group(cat):
    # the app's display groups: Starlink, debris (incl. rocket bodies), other satellites
    return 0 if cat == 1 else (1 if cat in (3, 4) else 2)


# ---------------------------------------------------------------- catalog
rows = [r for r in csv.DictReader(open(f"{src}/catalog-states.csv")) if r["ok"] == "1"]
jd = None
for line in open(f"{src}/../jd.txt"):
    jd = float(line)
rng = random.Random(20261009)
rng.shuffle(rows)
SAMPLE = 8192
cols = [[] for _ in range(7)]
for r in rows[:SAMPLE]:
    st = [float(r[k]) for k in ("x", "y", "z", "vx", "vy", "vz")]
    e_osc, i, raan, argp, M, u = osculating(*st)
    a = float(r["a_km"])
    e = float(r["ecc_mean"])
    if e < 1e-3:
        # near-circular: the perigee is ill-defined, so carry the argument of latitude in M
        argp, M = 0.0, u
    else:
        nu = (u - argp) % math.tau
        E = 2 * math.atan2(math.sqrt(1 - e) * math.sin(nu / 2), math.sqrt(1 + e) * math.cos(nu / 2))
        M = (E - e * math.sin(E)) % math.tau
    cols[0].append(int(round((math.log(max(a, 6400.0)) - LOG_LO) / (LOG_HI - LOG_LO) * 65535)))
    cols[1].append(int(round(min(e, 0.99999) * 65535)))
    cols[2].append(q_incl(float(r["incl_mean"])))
    cols[3].append(q_angle(raan))
    cols[4].append(q_angle(argp))
    cols[5].append(q_angle(M))
    cols[6].append(group(int(r["category"])))
n = len(cols[0])
with open(f"{out}/catalog.bin", "wb") as fh:
    fh.write(struct.pack("<Id", n, jd))
    for c in cols[:6]:
        fh.write(struct.pack(f"<{n}H", *c))
    fh.write(struct.pack(f"<{n}B", *cols[6]))
print("catalog.bin", n, "objects")

# ------------------------------------------------------------ 53 deg shell
sl = [r for r in csv.DictReader(open(f"{src}/starlink.csv")) if r["shell"] == "3"]
gmst = float(open(f"{src}/../gmst.txt").read())
XKE = 60.0 / math.sqrt(RE ** 3 / MU)
J2, J4 = 0.001082616, -0.00000165597


def mean_node(r):
    """SGP4's secularly propagated node (initl + the nodedot terms), as the engine clusters on."""
    no = float(r["n"]) * math.tau / 1440.0
    ecc, inc = float(r["ecc"]), math.radians(float(r["incl"]))
    cosio = math.cos(inc)
    theta2 = cosio * cosio
    eccsq = ecc * ecc
    omeosq = 1 - eccsq
    rteosq = math.sqrt(omeosq)
    x3thm1 = 3 * theta2 - 1
    ak = (XKE / no) ** (2 / 3)
    d1 = 0.75 * J2 * x3thm1 / (rteosq * omeosq)
    del_ = d1 / (ak * ak)
    adel = ak * (1 - del_ * del_ - del_ * (1 / 3 + 134 * del_ * del_ / 81))
    del_ = d1 / (adel * adel)
    no = no / (1 + del_)
    ao = (XKE / no) ** (2 / 3)
    po = ao * omeosq
    pinvsq = 1 / (po * po)
    temp1 = 1.5 * J2 * pinvsq * no
    temp2 = 0.5 * temp1 * J2 * pinvsq
    temp3 = -0.46875 * J4 * pinvsq * pinvsq * no
    xhdot1 = -temp1 * cosio
    nodedot = xhdot1 + (0.5 * temp2 * (4 - 19 * theta2) + 2 * temp3 * (3 - 7 * theta2)) * cosio
    tsince = (jd - float(r["epoch"])) * 1440.0
    return (math.radians(float(r["raan"])) + nodedot * tsince) % math.tau


sats = []
for r in sl:
    st = [float(r[k]) for k in ("x", "y", "z", "vx", "vy", "vz")]
    e, i, raan, argp, M, u = osculating(*st)
    alt = math.sqrt(st[0] ** 2 + st[1] ** 2 + st[2] ** 2) - RE
    sats.append({"raan": mean_node(r), "osc": raan, "u": u, "i": math.degrees(i), "alt": alt, "sub": int(r["sub"]), "n": float(r["n"])})
# planes: RAAN gaps > 0.9 deg on the circle, as isl.rs does
sats.sort(key=lambda s: s["raan"])
gaps = [((sats[(k + 1) % len(sats)]["raan"] - sats[k]["raan"]) % math.tau, k) for k in range(len(sats))]
start = (max(gaps)[1] + 1) % len(sats)
ordered = sats[start:] + sats[:start]
plane = 0
base = ordered[0]["raan"]
prev = 0.0
for s in ordered:
    k = (s["raan"] - base) % math.tau
    if k - prev > math.radians(0.9):
        plane += 1
    prev = k
    s["plane"] = plane
planes = plane + 1
print("shell 3:", len(ordered), "sats in", planes, "planes")
by_plane = {}
for s in ordered:
    by_plane.setdefault(s["plane"], []).append(s)
plane_raan = {
    p: math.atan2(sum(math.sin(s["raan"]) for s in v), sum(math.cos(s["raan"]) for s in v)) % math.tau
    for p, v in by_plane.items()
}
order = sorted(by_plane, key=lambda p: plane_raan[p])
flat = []
for new_id, p in enumerate(order):
    for s in sorted(by_plane[p], key=lambda s: s["u"]):
        s["plane"] = new_id
        flat.append(s)
sizes = sorted(len(v) for v in by_plane.values())
print("plane sizes", sizes[0], sizes[len(sizes) // 2], sizes[-1])
with open(f"{out}/shell.bin", "wb") as fh:
    m = len(flat)
    fh.write(struct.pack("<IddH", m, jd, gmst, planes))
    fh.write(struct.pack(f"<{m}B", *[s["plane"] for s in flat]))
    fh.write(struct.pack(f"<{m}H", *[q_angle(s["osc"]) for s in flat]))
    fh.write(struct.pack(f"<{m}H", *[q_angle(s["u"]) for s in flat]))
    fh.write(struct.pack(f"<{m}H", *[int(round(s["alt"] * 100)) for s in flat]))
    fh.write(struct.pack(f"<{m}H", *[q_incl(s["i"]) for s in flat]))
    fh.write(struct.pack(f"<{m}H", *[int(round((s["n"] - 14.0) * 16384)) for s in flat]))
with open(f"{src}/shell-order.csv", "w") as fh:
    fh.write("k,sub,plane\n")
    for k, s in enumerate(flat):
        fh.write(f"{k},{s['sub']},{s['plane']}\n")

# ------------------------------------------------- surface, lights, coverage
# One byte per 1° cell: the surface class in the low 2 bits (0 ocean, 1 green
# land, 2 arid land, 3 ice) and city lights 0-63 (the brightest pixel in the
# cell) in the high 6 bits.
day = Image.open(jpg).convert("RGB").resize((1440, 720), Image.BOX)
night = Image.open(night_jpg).convert("L").resize((1440, 720), Image.BOX)
dp = day.load()
npx = night.load()
surface = bytearray(360 * 180)
land = 0
for row in range(180):
    for col in range(360):
        wet = 0
        rgb = [0, 0, 0]
        glow = 0
        for dy in range(4):
            for dx in range(4):
                r, g, b = dp[col * 4 + dx, row * 4 + dy]
                if b > r * 1.25 and b > g * 0.95 and r < 70:
                    wet += 1
                rgb[0] += r
                rgb[1] += g
                rgb[2] += b
                glow = max(glow, npx[col * 4 + dx, row * 4 + dy])
        r, g, b = (v / 16 for v in rgb)
        if wet >= 8:
            cls = 0
        elif min(r, g, b) > 185:
            cls = 3  # ice
        elif (r + g + b) / 3 > 120:
            cls = 2  # desert and other bright, arid land
        else:
            cls = 1  # vegetated land
        if cls:
            land += math.cos(math.radians(89.5 - row))
        lights = min(63, int(round(63 * min(1.0, max(0.0, glow - 14) / 140) ** 0.6)))
        surface[row * 360 + col] = cls | (lights << 2)
total = sum(math.cos(math.radians(89.5 - row)) * 360 for row in range(180))
print("land share of area %.1f%%" % (100 * land / total))
cov = bytearray(90 * 180)
for r in csv.DictReader(open(f"{src}/coverage.csv")):
    cov[int(r["row"]) * 180 + int(r["col"])] = min(255, int(r["count"]))
with open(f"{out}/earth.bin", "wb") as fh:
    fh.write(surface)
    fh.write(cov)

# --------------------------------------------------------------- encounters
ev = list(csv.DictReader(open(f"{src}/conjunctions-1h.csv")))
ev.sort(key=lambda e: float(e["tca_s"]))
with open(f"{out}/encounters.bin", "wb") as fh:
    k = len(ev)
    fh.write(struct.pack("<I", k))
    fh.write(struct.pack(f"<{k}H", *[int(round(float(e["rel_kms"]) * 1000)) for e in ev]))
    fh.write(struct.pack(f"<{k}H", *[int(round(float(e["miss_km"]) * 1000)) for e in ev]))
    fh.write(struct.pack(f"<{k}H", *[int(round(float(e["tca_s"]))) for e in ev]))
    fh.write(struct.pack(f"<{k}B", *[int(e["cat_a"]) for e in ev]))
    fh.write(struct.pack(f"<{k}B", *[int(e["cat_b"]) for e in ev]))
    # Where each happens (object a at closest approach), in 0.01° and 0.1 km.
    fh.write(struct.pack(f"<{k}h", *[int(round(float(e["lat"]) * 100)) for e in ev]))
    fh.write(struct.pack(f"<{k}h", *[int(round(float(e["lon"]) * 100)) for e in ev]))
    fh.write(struct.pack(f"<{k}H", *[int(round(float(e["alt_km"]) * 10)) for e in ev]))
print("encounters.bin", len(ev))

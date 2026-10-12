//! Exports real Orbit Explorer engine results for the portfolio case study.
//! Reads the app's catalogue snapshot and writes CSVs (and jd.txt, gmst.txt
//! one level up) for `scripts/orbit/pack.py`.
//!
//!     cargo run --release -- <catalog.bin> <out dir>

use orbit_explorer_engine::batch::{Batch, ELEMENT_STRIDE};
use orbit_explorer_engine::conjunction::Screener;
use orbit_explorer_engine::coverage::coverage_grid;
use orbit_explorer_engine::frames::{ecef_to_geodetic, teme_to_ecef, C_KM_S};
use orbit_explorer_engine::isl::{self, IslConfig, Terminal};
use orbit_explorer_engine::sgp4::gstime;
use std::fmt::Write as _;
use std::time::Instant;

struct Snapshot {
    packed: Vec<f64>,
    category: Vec<u8>,
    ids: Vec<u32>,
    names: Vec<String>,
    generated_jd: f64,
}

fn load(path: &str) -> Snapshot {
    let b = std::fs::read(path).expect("read snapshot");
    assert_eq!(&b[0..4], b"ORBX");
    let n = u32::from_le_bytes(b[8..12].try_into().unwrap()) as usize;
    let gen_ms = f64::from_le_bytes(b[16..24].try_into().unwrap());
    let f64_at = |off: usize, i: usize| f64::from_le_bytes(b[off + 8 * i..off + 8 * i + 8].try_into().unwrap());
    let f32_at = |off: usize, i: usize| f32::from_le_bytes(b[off + 4 * i..off + 4 * i + 4].try_into().unwrap()) as f64;
    let mut packed = vec![0.0; n * ELEMENT_STRIDE];
    let base = 32;
    for i in 0..n {
        let e = &mut packed[i * ELEMENT_STRIDE..(i + 1) * ELEMENT_STRIDE];
        e[0] = f64_at(base, i);
        e[1] = f64_at(base + 8 * n, i);
        for k in 0..6 {
            e[2 + k] = f32_at(base + 16 * n + 4 * n * k, i);
        }
    }
    let id_off = base + 16 * n + 24 * n;
    let ids = (0..n).map(|i| u32::from_le_bytes(b[id_off + 4 * i..id_off + 4 * i + 4].try_into().unwrap())).collect();
    let cat_off = id_off + 4 * n;
    let len_off = cat_off + n;
    let mut off = len_off + n;
    let mut names = Vec::with_capacity(n);
    for i in 0..n {
        let l = b[len_off + i] as usize;
        names.push(String::from_utf8_lossy(&b[off..off + l]).replace(',', " "));
        off += l;
    }
    Snapshot { packed, category: b[cat_off..cat_off + n].to_vec(), ids, names, generated_jd: gen_ms / 86_400_000.0 + 2440587.5 }
}

fn main() {
    let path = std::env::args().nth(1).expect("catalog.bin");
    let out = std::env::args().nth(2).expect("out dir");
    let snap = load(&path);
    let n = snap.category.len();
    let jd = snap.generated_jd;
    println!("catalogue: {n} objects, generated jd {jd:.6}, gmst {:.6} rad", gstime(jd));
    std::fs::write(format!("{out}/../jd.txt"), format!("{jd:.10}\n")).unwrap();
    std::fs::write(format!("{out}/../gmst.txt"), format!("{:.12}\n", gstime(jd))).unwrap();

    // ---- every object's TEME state at the snapshot time ----
    let mut batch = Batch::from_packed(&snap.packed);
    let ok = batch.propagate(jd, false);
    let mut s = String::from("idx,norad,category,name,ok,a_km,ecc_mean,incl_mean,x,y,z,vx,vy,vz\n");
    for i in 0..n {
        let r = batch.position(i);
        let v = batch.velocity(i);
        let e = &snap.packed[i * ELEMENT_STRIDE..(i + 1) * ELEMENT_STRIDE];
        writeln!(
            s,
            "{i},{},{},{},{},{:.3},{:.7},{:.4},{:.4},{:.4},{:.4},{:.6},{:.6},{:.6}",
            snap.ids[i],
            snap.category[i],
            snap.names[i],
            batch.ok[i] as u8,
            batch.sats[i].semi_major_axis_km(),
            e[2],
            e[3],
            r[0],
            r[1],
            r[2],
            v[0],
            v[1],
            v[2]
        )
        .unwrap();
    }
    std::fs::write(format!("{out}/catalog-states.csv"), s).unwrap();
    println!("states: {ok} of {n} propagated");

    // ---- Starlink laser mesh, exactly as the analysis worker builds it ----
    let sl_idx: Vec<usize> = (0..n).filter(|&i| snap.category[i] == 1).collect();
    let sl: Vec<f64> = sl_idx.iter().flat_map(|&i| snap.packed[i * ELEMENT_STRIDE..(i + 1) * ELEMENT_STRIDE].to_vec()).collect();
    let mut sb = Batch::from_packed(&sl);
    sb.propagate(jd, false);
    let t = Instant::now();
    let g = isl::build(&sb, &IslConfig::default());
    let build_ms = t.elapsed().as_secs_f64() * 1e3;
    let linked = g.shell_of.iter().filter(|&&s| s >= 0).count();
    println!("ISL: {} starlink, {linked} linked, {} edges, {build_ms:.2} ms", sb.len(), g.edges.len());
    let mut sh = String::from("shell,incl_deg,alt_km,satellites,planes\n");
    for (k, s) in g.shells.iter().enumerate() {
        println!("   shell {k}: {:6.2} deg {:6.1} km: {:5} sats, {:3} planes", s.inclination_deg, s.altitude_km, s.satellites, s.planes);
        writeln!(sh, "{k},{:.4},{:.2},{},{}", s.inclination_deg, s.altitude_km, s.satellites, s.planes).unwrap();
    }
    std::fs::write(format!("{out}/shells.csv"), sh).unwrap();
    let mut st = String::from("sub,idx,norad,shell,x,y,z,vx,vy,vz,epoch,n,ecc,incl,raan,argp,ma\n");
    for (k, &i) in sl_idx.iter().enumerate() {
        let r = sb.position(k);
        let v = sb.velocity(k);
        let e = &snap.packed[i * ELEMENT_STRIDE..(i + 1) * ELEMENT_STRIDE];
        writeln!(
            st,
            "{k},{i},{},{},{:.4},{:.4},{:.4},{:.6},{:.6},{:.6},{:.10},{:.8},{:.7},{:.4},{:.4},{:.4},{:.4}",
            snap.ids[i], g.shell_of[k], r[0], r[1], r[2], v[0], v[1], v[2], e[0], e[1], e[2], e[3], e[4], e[5], e[6]
        )
        .unwrap();
    }
    std::fs::write(format!("{out}/starlink.csv"), st).unwrap();
    let mut ed = String::from("a,b\n");
    for e in &g.edges {
        writeln!(ed, "{},{}", e[0], e[1]).unwrap();
    }
    std::fs::write(format!("{out}/edges.csv"), ed).unwrap();

    let gm = gstime(jd);
    let london = Terminal::new(51.5072, -0.1276, gm);
    let nyc = Terminal::new(40.7128, -74.0060, gm);
    if let Some(r) = isl::route(&g, &sb, &london, &nyc, 25.0) {
        println!(
            "London->NYC (all shells): {:.1} km, {} sats, {:.3} ms, up {:.0} km, down {:.0} km, path {:?}",
            r.total_km,
            r.path.len(),
            r.total_km / C_KM_S * 1e3,
            r.uplink_km,
            r.downlink_km,
            r.path
        );
        let shells: Vec<i32> = r.path.iter().map(|&p| g.shell_of[p as usize]).collect();
        println!("   shells on path: {shells:?}");
    }

    // ---- coverage of the linked satellites, 2 deg grid, 25 deg elevation ----
    let ecef = (0..sb.len()).filter(|&i| sb.ok[i] && g.shell_of[i] >= 0).map(|i| teme_to_ecef(sb.position(i), gm));
    let mut cov = Vec::new();
    coverage_grid(ecef, 90, 180, 25f64.to_radians(), &mut cov);
    let mut cv = String::from("row,col,count\n");
    for (k, c) in cov.iter().enumerate() {
        writeln!(cv, "{},{},{c}", k / 180, k % 180).unwrap();
    }
    std::fs::write(format!("{out}/coverage.csv"), cv).unwrap();
    println!("coverage: min {} max {}", cov.iter().min().unwrap(), cov.iter().max().unwrap());

    // ---- latency over the next 2 h at 1 min steps, all shells ----
    let mut lat = String::from("minute,latency_ms,hops\n");
    for m in 0..=120 {
        let t = jd + m as f64 / 1440.0;
        let mut b = Batch::from_packed(&sl);
        b.propagate(t, false);
        let g = isl::build(&b, &IslConfig::default());
        let gm = gstime(t);
        let l = Terminal::new(51.5072, -0.1276, gm);
        let ny = Terminal::new(40.7128, -74.0060, gm);
        match isl::route(&g, &b, &l, &ny, 25.0) {
            Some(r) => writeln!(lat, "{m},{:.4},{}", r.total_km / C_KM_S * 1e3, r.path.len()).unwrap(),
            None => writeln!(lat, "{m},,0").unwrap(),
        }
    }
    std::fs::write(format!("{out}/latency.csv"), lat).unwrap();

    // ---- one hour of screening at 20 s, 5 km: the "next hour" in the README ----
    let mut scr = Screener::new(Batch::from_packed(&snap.packed));
    scr.begin(jd, 60.0, 20.0, 5.0);
    let t = Instant::now();
    scr.advance(u32::MAX);
    let el = t.elapsed().as_secs_f64();
    let ev = scr.events();
    println!(
        "screen 1 h @ 20 s, 5 km: {el:.2} s, {} steps, {} candidate pairs, {} refined, {} formation, {} events",
        scr.stats.steps,
        scr.stats.candidate_pairs,
        scr.stats.refined,
        scr.stats.formation_pairs,
        ev.len()
    );
    let mut cs = String::from("a,b,cat_a,cat_b,name_a,name_b,tca_s,miss_km,rel_kms,lat,lon,alt_km\n");
    let mut sats = Batch::from_packed(&snap.packed);
    for e in &ev {
        let (a, b) = (e.a as usize, e.b as usize);
        // Where it happens: object a at the time of closest approach, Earth-fixed.
        let (lat, lon, h) = match sats.sats[a].propagate_jd(e.tca_jd) {
            Ok((r, _)) => {
                let (la, lo, h) = ecef_to_geodetic(teme_to_ecef(r, gstime(e.tca_jd)));
                (la.to_degrees(), lo.to_degrees(), h)
            }
            Err(_) => (f64::NAN, f64::NAN, f64::NAN),
        };
        writeln!(
            cs,
            "{a},{b},{},{},{},{},{:.2},{:.4},{:.4},{lat:.3},{lon:.3},{h:.1}",
            snap.category[a],
            snap.category[b],
            snap.names[a],
            snap.names[b],
            (e.tca_jd - jd) * 86400.0,
            e.miss_km,
            e.rel_speed_kms
        )
        .unwrap();
    }
    std::fs::write(format!("{out}/conjunctions-1h.csv"), cs).unwrap();
}

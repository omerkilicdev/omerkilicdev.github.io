"""Elastic modulus of argon confined in spherical pores from GCMC number
fluctuations, compared with Gor (2017), Poromechanics VI, pp. 465-472.

    K = k_B T <N>^2 / (V Var N)

Usage:  AR_LOGS=/path/to/LOGS/Turquoise/LOGS-5e3 AR_REF=cleaned_bulkmodulus_data.csv \
        python argon_modulus.py
Writes  argon_modulus.svg and prints the table.
"""
import csv
import glob
import os
import re

import matplotlib
import numpy as np

matplotlib.use("Agg")
import matplotlib.pyplot as plt

LOGS = os.environ.get("AR_LOGS", "LOGS-5e3")
REF = os.environ.get("AR_REF", "cleaned_bulkmodulus_data.csv")
KB = 1.380649e-23
DISCARD = 1000
NBLOCK = 10
CONVERGED_NM = 5.6   # beyond this, Var N is not converged in 5,000 sets


def modulus(n, volume_a3, T):
    return KB * T * n.mean() ** 2 / (volume_a3 * 1e-30 * n.var()) / 1e9   # GPa


def run_table():
    rows = []
    for path in glob.glob(f"{LOGS}/*/box0/simulation_ar.log"):
        a = np.array([l.split() for l in open(path) if l[:1].isdigit()], dtype=float)
        sets, n = a[:, 0], a[:, 11][a[:, 0] > DISCARD]
        V, T = a[0, 5], a[0, 1]
        blocks = [modulus(b, V, T) for b in np.array_split(n, NBLOCK)]
        d_nm = float(re.search(r"_([\d.]+)nm/", path).group(1)) / 10   # folder label is in Angstrom
        rows.append((d_nm, modulus(n, V, T), np.std(blocks, ddof=1) / np.sqrt(NBLOCK)))
    return np.array(sorted(rows))


def reference(colour="turquoise"):
    rows = list(csv.DictReader(open(REF)))
    return np.array(sorted((float(r[f"{colour}_diameter_nm"]), float(r[f"{colour}_K_GPa"]))
                           for r in rows if r[f"{colour}_diameter_nm"]))


def main():
    res, ref = run_table(), reference()
    for d, K, se in res:
        print(f"d = {d:5.2f} nm   K = {K:6.3f} +/- {se:.3f} GPa   "
              f"Gor 2017 = {np.interp(d, ref[:, 0], ref[:, 1]):.3f}")
    ok = res[:, 0] < CONVERGED_NM
    fig, ax = plt.subplots(figsize=(7.6, 4.1))
    ax.plot(ref[:, 0], ref[:, 1], color="#1c1c1d", lw=1.6, label="Gor (2017), digitized")
    ax.errorbar(res[ok, 0], res[ok, 1], yerr=2 * res[ok, 2], fmt="o", color="#b71c1c",
                capsize=2.5, label="GCMC fluctuations (+/-2 s.e.)")
    ax.plot(res[~ok, 0], res[~ok, 1], "o", mfc="none", mec="#8a8a8a",
            label="not converged in 5,000 sets")
    ax.set_xlabel("pore diameter (nm)")
    ax.set_ylabel("bulk modulus of confined argon, $K$ (GPa)")
    ax.set_ylim(0, 1.0)
    ax.legend(frameon=False)
    fig.tight_layout()
    fig.savefig("argon_modulus.svg")


if __name__ == "__main__":
    main()

"""Helium in a 3.0 nm spherical cavity: equilibration trace and density
versus imposed chemical potential at 573 K and 973 K, from MezCal GCMC logs.

Usage:  HE_DATA=/path/to/Datas python helium_isotherms.py
Expects <HE_DATA>/<T> Temperature/Sphere/<run>/box0/simulation_he.log
Writes  helium_isotherms.svg
"""
import glob
import os

import matplotlib
import numpy as np

matplotlib.use("Agg")
import matplotlib.pyplot as plt

DATA = os.environ.get("HE_DATA", "Datas")
DISCARD = 1000     # sets discarded as equilibration
NBLOCK = 20        # blocks for the standard error
RED, BLUE = "#b71c1c", "#1a5fb4"


def load(path):
    """Columns: Set Temp size_x size_y size_z Volume ffE sfE E NGauge NBox NTotal Dens muId muEx mu."""
    rows = [line.split() for line in open(path) if line[:1].isdigit()]
    a = np.array(rows, dtype=float)
    return a[:, 0], a[:, 11], a[:, 12], a[0, -1]


def block_mean_se(x, nb=NBLOCK):
    means = np.array([b.mean() for b in np.array_split(x, nb)])
    return x.mean(), means.std(ddof=1) / np.sqrt(nb)


def isotherm(T):
    pts = []
    for p in glob.glob(f"{DATA}/{T} Temperature/Sphere/*/box0/simulation_he.log"):
        sets, _, dens, mu = load(p)
        m, se = block_mean_se(dens[sets > DISCARD])
        pts.append((mu, m, se))
    return np.array(sorted(pts))


def main():
    fig, (a1, a2) = plt.subplots(1, 2, figsize=(9.6, 4.0),
                                 gridspec_kw={"width_ratios": [1, 1.15]})
    trace = glob.glob(f"{DATA}/573 Temperature/Sphere/he_spherical_mu_1500k/box0/simulation_he.log")[0]
    sets, n, _, _ = load(trace)
    a1.plot(sets, n, color=RED, lw=0.6)
    a1.axvline(DISCARD, color="#888", lw=0.9, ls="--")
    a1.set_xlabel("Monte Carlo set (10$^4$ moves each)")
    a1.set_ylabel("helium atoms in cavity, $N$")
    a1.set_title("Equilibration, 573 K, $\\mu$ = 1500 K", loc="left")

    for T, col in ((573, RED), (973, BLUE)):
        s = isotherm(T)
        a2.errorbar(s[:, 0], s[:, 1], yerr=2 * s[:, 2], fmt="o-", color=col,
                    ms=4.5, capsize=2.5, label=f"{T} K")
    a2.set_xlabel("imposed chemical potential $\\mu$ (K)")
    a2.set_ylabel("mean density (mmol cm$^{-3}$)")
    a2.set_title("Loading isotherms, 3.0 nm cavity", loc="left")
    a2.legend(frameon=False, loc="lower right")
    fig.tight_layout()
    fig.savefig("helium_isotherms.svg")


if __name__ == "__main__":
    main()

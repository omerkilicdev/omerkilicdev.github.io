import os
import shutil
import subprocess
import time
from multiprocessing import Pool
from pathlib import Path

# === CONFIGURATION === #

# Paths come from the environment so the script runs on any machine:
#   MEZCAL_DIR  where `make` and `./simulate` run (default: ./MezCal)
#   OUTPUT_DIR  where the collected logs are written (default: ./LOGS)
MEZCAL_DIR = os.environ.get("MEZCAL_DIR", "MezCal")
TEMPLATE_INP = os.path.join(MEZCAL_DIR, "examples/Argon/Sphere/GCMC/argon_sphere.inp")
TEMP_INP = os.path.join(MEZCAL_DIR, "temp.inp")
OUTPUT_DIR = os.environ.get("OUTPUT_DIR", "LOGS")

# Geometry-specific vdw and pore sizes (diameter × 10)
geometries = {
    "Darkblue" : {
        "vdw": 171.24,
        "pore_sizes": [89.706, 80.000, 69.914, 65.067, 59.951, 54.955, 50.000, 47.471, 45.018,
                        42.509, 40.000, 37.481, 35.007, 32.490, 30.012, 27.477, 25.000, 22.488]
                        
    },
    "Red": {
        "vdw": 171.24 * 0.25,
        "pore_sizes": [90.036, 80.0, 69.914, 65.066, 59.950, 54.954, 50.0, 47.470, 44.935, 
                       42.508, 40.0, 37.48, 35.007, 32.490, 29.975, 27.477, 25.0, 22.488]
    },
    "Blue": {
        "vdw": 171.24 * 0.5,
        "pore_sizes": [89.988, 79.969, 70.062, 65.056, 54.969, 49.969, 39.973, 37.505, 34.999
                       , 32.491, 29.991, 27.501, 24.995, 22.497, 47.471, 45.018, 42.509, 60.099]
    },
    "Green": {
        "vdw": 171.24 * 2.0,
        "pore_sizes": [90.037, 80, 69.914, 65.067, 59.951, 54.955, 50, 47.471, 44.936, 42.509, 
                       40, 37.481, 35.007, 30.012, 32.49, 27.508, 25, 22.489]
    },
    "Purple": {
        "vdw": 171.24 * 4.0,
        "pore_sizes": [91.386, 80.795, 70.725, 65.591, 60.546, 55.329, 50.309, 47.843, 45.269, 42.732,
                       40.264, 37.713, 35.159, 32.664, 30.123, 27.602, 25.077, 22.572]
    },
    "Turquoise": {
        "vdw": 119.6,
        "pore_sizes": [90.037, 80.0, 69.914, 64.894, 59.951, 54.955, 50.0, 47.471, 44.936, 42.509,
                        40.0, 37.481, 35.007, 32.49, 30.012, 27.477, 25.0, 22.489]
    }
}

# === FUNCTIONS === #

def modify_inp_file(size_value, vdw_value, label):
    """
    Modifies a copy of the template .inp file with updated Size, vdwParams, and ProjectName.
    Saves the modified file as temp.inp.
    """
    with open(TEMPLATE_INP, "r") as file:
        lines = file.readlines()

    # Update necessary lines (note: line numbers are zero-based)
    lines[2] = f"ProjectName Ar_Spherical_{label};\n"         # Line 3
    lines[23] = f"Size {size_value};\n"                       # Line 24
    lines[29] = f"Box0 Ar vdwParams {vdw_value} 3.0;\n"       # Line 30

    with open(TEMP_INP, "w") as file:
        file.writelines(lines)

def run_simulation(geometry, pore_size):
    label = f"{geometry}_{pore_size}nm"
    project_name = f"Ar_Spherical_{label}"
    vdw_value = geometries[geometry]["vdw"]

    modify_inp_file(size_value=pore_size, vdw_value=vdw_value, label=label)

    subprocess.run(["./simulate", "temp.inp"], cwd=MEZCAL_DIR)

    log_folder = Path(MEZCAL_DIR) / "ar_spherical_nanopore" / project_name.lower()
    source_log = log_folder / "simulation_ar.log"

    output_path = Path(OUTPUT_DIR) / label
    output_path.mkdir(parents=True, exist_ok=True)

    if source_log.exists():
        shutil.copy(source_log, output_path / "simulation_ar.log")
        shutil.rmtree(log_folder)
    else:
        print(f"[!] Log file not found at {source_log}")


def worker_wrapper(args):
    time.sleep(args[0])
    run_simulation(args[1], args[2])


# === MAIN EXECUTION === #

def main():
    # Compile MezCal only once before starting the simulations
    subprocess.run(["make", "clean"], cwd=MEZCAL_DIR)
    subprocess.run(["make"], cwd=MEZCAL_DIR)

    # Prepare (delay, pore_size) arguments for parallel execution
    args_list = []
    delay = 0
    for geometry, data in geometries.items():
        for pore_size in data["pore_sizes"]:
            args_list.append((delay, geometry, round(pore_size, 3)))
            delay += 60  # 1-minute delay between starts


    # Run simulations with up to 5 processes in parallel, 1 minute apart
    with Pool(processes=4) as pool:
        pool.map(worker_wrapper, args_list)

if __name__ == "__main__":
    main()


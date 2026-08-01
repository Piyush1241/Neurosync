import uuid
import socket
import platform
import getpass
import psutil

def _get_cpu_name() -> str:
    try:
        sys = platform.system()
        if sys == "Darwin":
            # On macOS sysctl returns brand string like 'Apple M1 Max' or 'Intel Core i7'
            import subprocess
            cmd = ["sysctl", "-n", "machdep.cpu.brand_string"]
            res = subprocess.run(cmd, capture_output=True, text=True)
            if res.returncode == 0 and res.stdout.strip():
                return res.stdout.strip()
        elif sys == "Windows":
            # On Windows wmic or platform.processor() / environment gives CPU name
            import subprocess
            cmd = ["wmic", "cpu", "get", "name"]
            res = subprocess.run(cmd, capture_output=True, text=True)
            if res.returncode == 0:
                lines = [l.strip() for l in res.stdout.splitlines() if l.strip()]
                if len(lines) > 1:
                    return lines[1]
        elif sys == "Linux":
            with open("/proc/cpuinfo", "r") as f:
                for line in f:
                    if "model name" in line:
                        return line.split(":")[1].strip()
    except Exception:
        pass

    brand = platform.processor() or platform.machine() or "x86_64"
    return brand

def get_device_info() -> dict:
    # Get primary local IP
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
    except Exception:
        ip = "unknown"

    # Get MAC address
    try:
        mac = ':'.join([
            '{:02x}'.format((uuid.getnode() >> i) & 0xff)
            for i in range(0, 48, 8)
        ][::-1])
    except Exception:
        mac = "unknown"

    # CPU and RAM
    try:
        cpu = _get_cpu_name()
        ram_gb = str(round(psutil.virtual_memory().total / (1024 ** 3), 1))
    except Exception:
        cpu = "unknown"
        ram_gb = "unknown"

    sys_name = platform.system()
    if sys_name == "Darwin":
        os_disp = f"macOS {platform.mac_ver()[0]}"
    elif sys_name == "Windows":
        os_disp = f"Windows {platform.release()}"
    else:
        os_disp = f"{sys_name} {platform.release()}"

    return {
        "device_id":   str(uuid.getnode()),          # stable hardware-based ID
        "hostname":    socket.gethostname(),
        "username":    getpass.getuser(),
        "os":          os_disp,
        "os_version":  platform.version(),
        "ip_address":  ip,
        "mac_address": mac,
        "cpu":         cpu,
        "ram_gb":      ram_gb,
    }
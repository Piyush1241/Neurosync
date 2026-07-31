import psutil
import json
import sys
import time

last_net = psutil.net_io_counters()
last_time = time.time()

while True:
    time.sleep(1.5)
    now = time.time()
    dt = max(now - last_time, 0.1)
    
    current_net = psutil.net_io_counters()
    
    recv_bytes = current_net.bytes_recv - last_net.bytes_recv
    sent_bytes = current_net.bytes_sent - last_net.bytes_sent
    
    recv_mb_s = round(max(0, recv_bytes / dt) / (1024 * 1024), 2)
    sent_mb_s = round(max(0, sent_bytes / dt) / (1024 * 1024), 2)
    
    last_net = current_net
    last_time = now

    cpu = psutil.cpu_percent(interval=None)
    ram = psutil.virtual_memory().percent
    disk = psutil.disk_usage('/').percent if sys.platform != 'win32' else psutil.disk_usage('C:\\').percent
    
    uptime = int(now - psutil.boot_time())

    data = {
        "cpu": round(cpu, 1),
        "ram": round(ram, 1),
        "disk": round(disk, 1),
        "net_recv": recv_mb_s,
        "net_sent": sent_mb_s,
        "procs": len(psutil.pids()),
        "uptime": uptime,
        "hostname": psutil.os.uname().nodename.split('.')[0].upper() if hasattr(psutil.os, 'uname') else "UNKNOWN"
    }
    print(json.dumps(data), flush=True)
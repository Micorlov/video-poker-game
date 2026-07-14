import os

paths = [
    '/Users/michael/.android/avd/vp_light.avd/hardware-qemu.ini.lock',
    '/Users/michael/.android/avd/vp_light.avd/multiinstance.lock',
    '/Users/michael/.android/avd/vp_light.avd/read-snapshot.txt',
]

for p in paths:
    try:
        os.remove(p)
        print(f'Removed: {p}')
    except OSError as e:
        print(f'Failed: {p} — {e}')

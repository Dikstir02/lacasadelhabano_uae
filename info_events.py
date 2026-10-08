from pathlib import Path

p = Path('styles.css')
s = p.read_text(encoding='utf-8')
NL = chr(10)
print('--- .event-title rule (lines 1140-1160) ---')
lines = s.split(NL)
for idx in range(1138, min(1160, len(lines))):
    print(idx + 1, lines[idx])
print()
print('--- existing color variables in :root ---')
for idx, l in enumerate(lines):
    if '--' in l and ':' in l and ('color' in l.lower() or 'gold' in l.lower() or 'red' in l.lower()):
        print(idx + 1, l)

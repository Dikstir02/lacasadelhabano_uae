from pathlib import Path

p = Path('index.html')
s = p.read_text(encoding='utf-8')

old = '<p class="eyebrow eyebrow-gold">NIGHTS AT THE CASA</p>'
new = '<p class="eyebrow eyebrow-gold">EVENTS</p>'

print('found index.html:', old in s)
if old in s:
    s = s.replace(old, new)
    p.write_text(s, encoding='utf-8')
    print('index.html updated')
else:
    print('NOT FOUND in index.html')

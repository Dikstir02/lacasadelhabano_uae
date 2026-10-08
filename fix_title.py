from pathlib import Path

p = Path('index.html')
s = p.read_text(encoding='utf-8')

old = 'class="section-title section-title-cream">RHYTHM, MASTERCRAFT &amp; REMEMBRANCE.</h2>'
new = 'class="section-title section-title-cream">HABANOS TASTING, CORPORATE, AND PRIVATE EVENTS</h2>'

print('old found:', old in s)
if old in s:
    s = s.replace(old, new)
    p.write_text(s, encoding='utf-8')
    print('replaced OK')
else:
    print('pattern not found, aborting')

from pathlib import Path

p = Path('index_pre_reference.html')
s = p.read_text(encoding='utf-8')

old = '<h2 class="section-title">NIGHTS AT THE CASA</h2>'
new = '<h2 class="section-title">EVENTS</h2>'
print('h2 found:', old in s)
if old in s:
    s = s.replace(old, new)

old2 = '<!-- ===== NIGHTS AT THE CASA ===== -->'
new2 = '<!-- ===== EVENTS ===== -->'
print('comment found:', old2 in s)
if old2 in s:
    s = s.replace(old2, new2)

p.write_text(s, encoding='utf-8')
print('written')

from PIL import Image

img = Image.open(r'd:\lacasadelhabano\reference.png').convert('RGB')
w, h = img.size

# Focus on the bottom 160px, render a character grid to "see" the pattern.
y0 = h - 160
COLS, ROWS = 96, 48
cw, ch = w / COLS, 160 / ROWS

def classify(c):
    r, g, b = c
    # coral brand red
    if r > 150 and g - b < 45 and r - g > 50 and b < 115:
        return 'R'
    # blue/navy
    if b > r + 6:
        return 'B'
    # light (cream text)
    if r > 180 and g > 160 and b > 130:
        return 'L'
    # dark navy bg
    return '.'

for rw in range(ROWS):
    from collections import Counter
    line = ''
    for cl in range(COLS):
        x0 = int(cl * (w / COLS)); x1 = int((cl + 1) * (w / COLS))
        y0 = int((h - 160) + rw * ch); y1 = int((h - 160) + (rw + 1) * ch)
        cnt = Counter(classify(img.getpixel((x, y))) for y in range(y0, y1) for x in range(x0, x1, 2))
        line += cnt.most_common(1)[0][0]
    print(f'{(h-160)+int(rw*ch):4d} {line}')
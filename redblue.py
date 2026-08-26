from PIL import Image
from collections import Counter

img = Image.open(r'd:\lacasadelhabano\reference.png').convert('RGB')
w, h = img.size
print('size', w, h)

def classify(c):
    r, g, b = c
    # coral/terracotta red
    if r > 130 and r - g > 50 and r - b > 60 and g < 140:
        return 'R'
    # blue (navy/teal-ish blue)
    if b > 90 and b > r and (b - r) > 25:
        return 'B'
    return None

# Scan by rows for red/blue, report distribution
for y0 in range(0, h, 16):
    y1 = min(y0 + 16, h)
    rc = bc = 0
    for y in range(y0, y1):
        for x in range(0, w, 2):
            c = classify(img.getpixel((x, y)))
            if c == 'R': rc += 1
            elif c == 'B': bc += 1
    if rc > 5 or bc > 5:
        xs_r = [x for y in range(y0, y1) for x in range(0, w, 2) if classify(img.getpixel((x, y))) == 'R']
        xs_b = [x for y in range(y0, y1) for x in range(0, w, 2) if classify(img.getpixel((x, y))) == 'B']
        rng_r = (min(xs_r), max(xs_r)) if xs_r else None
        rng_b = (min(xs_b), max(xs_b)) if xs_b else None
        print(f'y{y0}-{y1}: R={rc} x={rng_r}  B={bc} x={rng_b}')

# Full histogram of reddish & bluish for the bottom 15%
print('\n=== bottom 25% color histogram ===')
cnt = Counter()
for y in range(int(h * 0.75), h):
    for x in range(0, w, 3):
        cnt[img.getpixel((x, y))] += 1
for col, n in cnt.most_common(15):
    print(f'#{col[0]:02x}{col[1]:02x}{col[2]:02x} x{n}')
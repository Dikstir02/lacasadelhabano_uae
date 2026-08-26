from PIL import Image

img = Image.open(r'd:\lacasadelhabano\shot4.png').convert('RGB')
w, h = img.size

def is_red(c):
    r, g, b = c
    return abs(r - 0xa9) < 14 and abs(g - 0x36) < 14 and abs(b - 0x2c) < 14

def is_blue(c):
    r, g, b = c
    return abs(r - 0x17) < 12 and abs(g - 0x5d) < 14 and abs(b - 0x70) < 14

def is_cream(c):
    r, g, b = c
    return r > 225 and g > 205 and b > 170

for y in range(0, h):
    reds = blues = creams = 0
    for x in range(0, w, 2):
        c = img.getpixel((x, y))
        if is_red(c): reds += 1
        elif is_blue(c): blues += 1
        elif is_cream(c): creams += 1
    if reds > 50 and blues > 50:
        print(f'TILE RULE row y={y}: red={reds} blue={blues} cream={creams}')
        line = []
        for x in range(0, w, 4):
            c = img.getpixel((x, y))
            if is_red(c): line.append('R')
            elif is_blue(c): line.append('B')
            elif is_cream(c): line.append('C')
            else: line.append('.')
        print(''.join(line))
        break
else:
    print('No row with both red and blue. Checking hero end + first 40 rows of heritage:')
    for y in range(700, h):
        reds = blues = creams = 0
        for x in range(0, w, 2):
            c = img.getpixel((x, y))
            if is_red(c): reds += 1
            elif is_blue(c): blues += 1
            elif is_cream(c): creams += 1
        if reds or blues or creams:
            print(f'y={y}: red={reds} blue={blues} cream={creams}')
import json, re

d = json.load(open('bootstrap.json', encoding='utf-8'))

# Dump keys that look like decorative/separator/pattern elements anywhere
def walk(obj, path=''):
    if isinstance(obj, dict):
        keys = list(obj.keys())
        lower = '|'.join(k.lower() for k in keys)
        for kw in ('divider', 'separator', 'pattern', 'stripe', 'ribbon', 'wave',
                   'shape', 'accent', 'frame', 'bar', 'line', 'svg', 'path',
                   'deco', 'ornament', 'hero-bottom'):
            if kw in lower:
                print(f'[{kw}] {path}')
                for k in keys:
                    if any(kw in k.lower() for kw in ('divider','separator','pattern','stripe','ribbon','wave','shape','accent','frame','bar','line','svg','path','deco','ornament')):
                        print(f'    {k}')
                print()
        for k, v in obj.items():
            walk(v, path + '/' + str(k))
    elif isinstance(obj, list):
        for i, v in enumerate(obj):
            walk(v, path + f'[{i}]')

walk(d)
print('=== done ===')

# body keys
body = d['page']['A']['A'][0]['E'][0]['y']['A']['A']['B']['A']
print('ALL body keys:', list(body.keys()))
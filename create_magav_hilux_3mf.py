#!/usr/bin/env python3
"""Create a small, stylized, color-separated Toyota Hilux MAGAV patrol vehicle.

The output is a standards-compliant 3MF package built with only Python's standard
library. It is intentionally toy-scale and designed for FDM printing.
"""
from math import cos, sin, pi
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
from xml.sax.saxutils import escape

OUT = Path(__file__).with_name("toyota_hilux_magav.3mf")

MATERIALS = [
    ("white body", "#F3F4F1"),
    ("dark green police stripe", "#0D4A38"),
    ("black trim", "#151719"),
    ("rubber", "#202124"),
    ("silver", "#AEB5B5"),
    ("red light", "#E3212B"),
    ("blue light", "#0876D1"),
    ("amber light", "#F49A1B"),
]
M = {name: i for i, (name, _) in enumerate(MATERIALS)}

def box(x0, x1, y0, y1, z0, z1):
    v = [(x0,y0,z0),(x1,y0,z0),(x1,y1,z0),(x0,y1,z0),
         (x0,y0,z1),(x1,y0,z1),(x1,y1,z1),(x0,y1,z1)]
    t = [(0,2,1),(0,3,2),(4,5,6),(4,6,7),(0,1,5),(0,5,4),
         (1,2,6),(1,6,5),(2,3,7),(2,7,6),(3,0,4),(3,4,7)]
    return v, t

def wedge(x0, x1, y0, y1, sections):
    """Extrude an x/z polygon across y; sections is [(x,z), ...]."""
    v = [(x,y,z) for y in (y0,y1) for x,z in sections]
    n = len(sections)
    t = []
    for i in range(1, n-1):
        t += [(0,i+1,i),(n,n+i,n+i+1)]
    for i in range(n):
        j = (i+1) % n
        t += [(i,j,n+j),(i,n+j,n+i)]
    return v, t

def cylinder_y(cx, cy, cz, radius, width, sides=20):
    """Cylinder with its axis along y."""
    v = []
    for y in (cy-width/2, cy+width/2):
        for i in range(sides):
            a = 2*pi*i/sides
            v.append((cx + radius*cos(a), y, cz + radius*sin(a)))
    v += [(cx,cy-width/2,cz),(cx,cy+width/2,cz)]
    t = []
    for i in range(sides):
        j = (i+1) % sides
        t += [(i,j,sides+j),(i,sides+j,sides+i)]
        t += [(2*sides,i,j),(2*sides+1,sides+j,sides+i)]
    return v, t

def add_part(parts, name, mat, verts, tris):
    parts.append((name, M[mat], verts, tris))

def build_parts():
    p = []
    # Main scale: approximately 145 mm long, 56 mm wide, 55 mm tall.
    add_part(p, "lower body", "white body", *box(-72,72,-25,25,15,29))
    # Front hood and grille surround.
    add_part(p, "hood", "white body", *wedge(-72,-28,-25,25,[( -72,29),(-28,29),(-23,42),(-72,42)]))
    add_part(p, "cab", "white body", *wedge(-28,34,-24,24,[(-28,29),(34,29),(29,55),(-14,55)]))
    # Pickup canopy / rear utility box.
    add_part(p, "rear canopy", "white body", *wedge(34,70,-24,24,[(34,29),(70,29),(68,52),(42,52)]))
    # Dark green MAGAV stripe on both sides and tail/front ends.
    for y in (-25.3, 25.3):
        add_part(p, "side green stripe", "dark green police stripe", *box(-62,66,y-0.9,y+0.9,25.5,34.5))
        add_part(p, "side lower stripe", "dark green police stripe", *box(-61,65,y-0.75,y+0.75,23.0,26.0))
    add_part(p, "front green stripe", "dark green police stripe", *box(-72,-70,-18,18,24,33))
    add_part(p, "rear green stripe", "dark green police stripe", *box(69,71,-18,18,24,34))
    # Windows, deliberately slightly proud so they remain visible after slicing.
    for y in (-24.8, 24.8):
        add_part(p, "front side window", "black trim", *wedge(-20,4,y-0.5,y+0.5,[( -20,43),(4,43),(1,53),(-14,53)]))
        add_part(p, "rear side window", "black trim", *wedge(6,29,y-0.5,y+0.5,[(6,43),(29,43),(28,51),(9,51)]))
    add_part(p, "windshield", "black trim", *wedge(-15,-12,-20,20,[(-15,44),(-12,54),(-5,54),(-5,44)]))
    # Bumpers, grille, mirrors and handles.
    add_part(p, "front bumper", "black trim", *box(-74,-70,-25,25,13,19))
    add_part(p, "rear bumper", "silver", *box(70,74,-25,25,13,18))
    for y in (-26.3,26.3):
        add_part(p, "mirror", "black trim", *box(-13,-3,y-2.3,y+2.3,40,46))
        for x in (-8, 18, 44):
            add_part(p, "door handle", "black trim", *box(x,x+5,y-0.8,y+0.8,35,36.2))
    for x in (-54,-38,-22):
        add_part(p, "front grille bar", "black trim", *box(x,x+2,-25.8,25.8,27,28))
    # Six wheels with raised silver hubs.
    for x in (-48, 48):
        for y in (-29,29):
            add_part(p, "rubber wheel", "rubber", *cylinder_y(x,y,18,13,7,24))
            add_part(p, "wheel hub", "silver", *cylinder_y(x,y + (3.7 if y > 0 else -3.7),18,6,1.0,20))
    # Roof rack, side rails, and light bar.
    for y in (-21,21):
        add_part(p, "roof rail", "black trim", *box(25,67,y-1.3,y+1.3,53,55))
    for x in (28,47,65):
        add_part(p, "rack crossbar", "black trim", *box(x,x+2,-23,23,54,56))
    add_part(p, "light bar housing", "black trim", *box(-10,27,-22,22,55,58))
    add_part(p, "red light", "red light", *box(-8,0,-22,22,58,60))
    add_part(p, "blue light", "blue light", *box(1,9,-22,22,58,60))
    add_part(p, "amber light", "amber light", *box(10,18,-22,22,58,60))
    # Small emblem plaques: abstract shield-like blocks rather than fragile text.
    for y in (-26.0,26.0):
        add_part(p, "MAGAV emblem plaque", "silver", *box(-60,-49,y-0.7,y+0.7,29,37))
    return p

def xml_model(parts):
    resources = ['<basematerials id="1">']
    for name, color in MATERIALS:
        resources.append(f'<base name="{escape(name)}" displaycolor="{color}"/>')
    resources.append('</basematerials>')
    objects = []
    build = []
    for oid, (name, mat, verts, tris) in enumerate(parts, 2):
        vs = ''.join(f'<vertex x="{x:.3f}" y="{y:.3f}" z="{z:.3f}"/>' for x,y,z in verts)
        ts = ''.join(f'<triangle v1="{a}" v2="{b}" v3="{c}" pid="1" p1="{mat}"/>' for a,b,c in tris)
        objects.append(f'<object id="{oid}" type="model" name="{escape(name)}"><mesh><vertices>{vs}</vertices><triangles>{ts}</triangles></mesh></object>')
        build.append(f'<item objectid="{oid}"/>')
    return ('<?xml version="1.0" encoding="UTF-8"?>'
            '<model unit="millimeter" xml:lang="en-US" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02" xmlns:m="http://schemas.microsoft.com/3dmanufacturing/material/2015/02">'
            '<resources>' + ''.join(resources) + ''.join(objects) + '</resources><build>' + ''.join(build) + '</build></model>')

def main():
    parts = build_parts()
    model = xml_model(parts)
    types = ('<?xml version="1.0" encoding="UTF-8"?>'
             '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
             '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
             '<Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/>'
             '</Types>')
    rels = ('<?xml version="1.0" encoding="UTF-8"?>'
            '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
            '<Relationship Target="/3D/3dmodel.model" Id="rel-1" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/>'
            '</Relationships>')
    model_rels = ('<?xml version="1.0" encoding="UTF-8"?>'
                  '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>')
    with ZipFile(OUT, 'w', ZIP_DEFLATED) as z:
        z.writestr('[Content_Types].xml', types)
        z.writestr('_rels/.rels', rels)
        z.writestr('3D/3dmodel.model', model)
        z.writestr('3D/_rels/3dmodel.model.rels', model_rels)
    print(f'Wrote {OUT} ({OUT.stat().st_size} bytes, {len(parts)} parts)')

if __name__ == '__main__':
    main()

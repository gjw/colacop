# fixtures/raw

Workshop directory. Holds the raw bottle photos shot directly from a phone. Gitignored — the processed composites in `fixtures/labels/` are the committed deliverables.

## Source files → which bottle / which side

Filenames are Pixel timestamps. The mapping below was established by Chair on 2026-05-01 by looking at each photo:

| File | Bottle | Side | Notes |
|---|---|---|---|
| `PXL_20260501_204014544.jpg` | cointreau | front | |
| `PXL_20260501_204025507.jpg` | cointreau | back | |
| `PXL_20260501_204043157.jpg` | agave | front | |
| `PXL_20260501_204059122.MP.jpg` | agave | back | Pixel Motion Photo (still a valid JPG) |
| `PXL_20260501_204121155.jpg` | rumble | front | needs 90° CCW rotation |
| `PXL_20260501_204129507.MP.jpg` | rumble | back | needs 90° CCW rotation; Pixel Motion Photo |

## Rebuild composites

The three composites in `fixtures/labels/` (cointreau.jpg, agave.jpg, rumble.jpg) are produced by the following ImageMagick commands. Front panel on the left, back panel on the right, each side resized to 1600px height (preserves aspect ratio) and joined horizontally; final JPEG quality 82 lands each composite under 600KB.

```sh
cd fixtures/raw

magick \
  \( PXL_20260501_204014544.jpg -resize 'x1600' \) \
  \( PXL_20260501_204025507.jpg -resize 'x1600' \) \
  +append -quality 82 ../labels/cointreau.jpg

magick \
  \( PXL_20260501_204043157.jpg -resize 'x1600' \) \
  \( PXL_20260501_204059122.MP.jpg -resize 'x1600' \) \
  +append -quality 82 ../labels/agave.jpg

magick \
  \( PXL_20260501_204121155.jpg -rotate -90 -resize 'x1600' \) \
  \( PXL_20260501_204129507.MP.jpg -rotate -90 -resize 'x1600' \) \
  +append -quality 82 ../labels/rumble.jpg
```

ImageMagick's `-rotate -90` is 90° counter-clockwise (positive degrees rotate clockwise in IM convention).

## When to redo

Re-run the commands above if any of the following changes:

- Source photos are reshot (better lighting, less glare, etc.).
- Target dimensions change (e.g. Gemini extraction quality argues for higher resolution).
- A different panel layout is desired (vertical stack with `-append` instead of horizontal `+append`).
- A new bottle is added — repeat the same pattern with a new pair.

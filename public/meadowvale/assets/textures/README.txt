Pixel texture loading
=====================

Place original or licensed PNG textures in these folders:

terrain/   grass.png, dirt.png, path.png, water.png, tilled.png
buildings/ farmhouse.png
crops/     parsnip_0.png through parsnip_3.png; potato_0.png through potato_3.png
objects/   tree.png, rock.png, fence.png
characters/player.png, mara.png, eli.png, june.png
weather/  rain.png, snow.png

Optional walking sprite sheets:

characters/player_sheet.png
characters/mara_sheet.png
characters/eli_sheet.png
characters/june_sheet.png

Character sheets should be a transparent 16 x 32 source-pixel frame grid:
four columns by four rows. Rows are down, up, right, and left facing; columns
are idle plus up to three walking animation frames. The renderer uses nearest-
neighbor scaling so those source frames remain pixel crisp.

Textures should be transparent PNGs when they represent sprites. Each terrain
tile should be 32 x 32 pixels. Keep files in these exact locations for the
automatic loader to find them.

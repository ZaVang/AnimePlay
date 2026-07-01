import argparse
import subprocess
from pathlib import Path
from shutil import copy2

from PIL import Image


def make_runtime_sheet(source_path: Path, out_path: Path) -> None:
    source = Image.open(source_path).convert("RGBA")
    cols, rows = 3, 4
    cell_w = source.width // cols
    cell_h = source.height // rows
    scale = 8
    target_cell_w = 48 * scale
    target_cell_h = 64 * scale
    work = Image.new("RGBA", (target_cell_w * cols, target_cell_h * rows), (0, 0, 0, 0))

    for row in range(rows):
        for col in range(cols):
            cell = source.crop((col * cell_w, row * cell_h, (col + 1) * cell_w, (row + 1) * cell_h))
            bbox = cell.getchannel("A").getbbox()
            if not bbox:
                continue
            sprite = cell.crop(bbox)
            max_w = int(target_cell_w * 0.90)
            max_h = int(target_cell_h * 0.91)
            ratio = min(max_w / sprite.width, max_h / sprite.height)
            resized = sprite.resize(
                (max(1, round(sprite.width * ratio)), max(1, round(sprite.height * ratio))),
                Image.Resampling.LANCZOS,
            )
            x = col * target_cell_w + (target_cell_w - resized.width) // 2
            y = row * target_cell_h + target_cell_h - resized.height - int(target_cell_h * 0.055)
            work.alpha_composite(resized, (x, y))

    work.resize((48 * cols, 64 * rows), Image.Resampling.LANCZOS).save(out_path)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--id", required=True)
    parser.add_argument("--source", required=True)
    parser.add_argument("--key-helper", default=r"C:\Users\jjj_z\.codex\skills\.system\imagegen\scripts\remove_chroma_key.py")
    parser.add_argument("--sprite-dir", default=r"data\images\character\sprite")
    parser.add_argument("--threshold", type=int, default=90)
    args = parser.parse_args()

    sprite_dir = Path(args.sprite_dir)
    sprite_dir.mkdir(parents=True, exist_ok=True)
    source = Path(args.source)
    chroma = sprite_dir / f"{args.id}-chroma.png"
    hires = sprite_dir / f"{args.id}-hires.png"
    final = sprite_dir / f"{args.id}.png"

    copy2(source, chroma)
    subprocess.run(
        [
            "python",
            args.key_helper,
            "--input",
            str(chroma),
            "--out",
            str(hires),
            "--auto-key",
            "border",
            "--soft-matte",
            "--transparent-threshold",
            str(args.threshold),
            "--opaque-threshold",
            "210",
            "--despill",
        ],
        check=True,
    )
    make_runtime_sheet(hires, final)

    im = Image.open(final)
    alpha = im.getchannel("A")
    print(f"{final} mode={im.mode} size={im.size} alpha={alpha.getextrema()} corners={[alpha.getpixel((0,0)), alpha.getpixel((im.width-1,0)), alpha.getpixel((0,im.height-1)), alpha.getpixel((im.width-1,im.height-1))]}")


if __name__ == "__main__":
    main()

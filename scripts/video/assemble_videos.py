"""FFmpeg post-processor and assembler for Haven Space walkthrough videos.

Converts raw Playwright WebM recordings into crisp 1080p H.264 MP4s,
generates minimalist Haven Space chapter title cards, and concatenates
everything into a combined master walkthrough MP4.
"""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[2]
OUT_DIR = ROOT_DIR / "output" / "videos"
RAW_DIR = OUT_DIR / "raw"
CARDS_DIR = OUT_DIR / "cards"

CHAPTERS = [
    ("01-guest-and-auth", "01  Guest Experience & Auth", "Public discovery, interactive maps, Haven AI & onboarding"),
    ("02-boarder-pre-tenancy", "02  Boarder Pre-Tenancy", "Room search, tour scheduling & application submission"),
    ("03-boarder-tenancy", "03  Boarder Active Tenancy", "Dashboard, tenancy, payments, messaging & house rules"),
    ("04-landlord", "04  Landlord Portal", "Properties, listings, applications, payments, calendar & settings"),
    ("05-admin", "05  Admin Console", "Platform overview, users, properties, verification & audit log"),
]


def run(cmd: list[str]) -> None:
    print("+", " ".join(cmd))
    subprocess.run(cmd, check=True)


def transcode_chapter(name: str) -> Path:
    src = RAW_DIR / f"{name}.webm"
    dst = OUT_DIR / f"{name}.mp4"
    if not src.exists():
        raise FileNotFoundError(f"Missing raw recording: {src}")

    run([
        "ffmpeg", "-y",
        "-i", str(src),
        "-vf", "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=#f6f2e9,fps=30",
        "-c:v", "libx264",
        "-pix_fmt", "yuv420p",
        "-preset", "medium",
        "-crf", "18",
        "-movflags", "+faststart",
        "-an",
        str(dst),
    ])
    return dst


def make_chapter_card(name: str, title: str, subtitle: str) -> Path:
    CARDS_DIR.mkdir(parents=True, exist_ok=True)
    card_path = CARDS_DIR / f"card-{name}.mp4"

    safe_title = title.replace(":", "\\:").replace("'", "\\'")
    safe_sub = subtitle.replace(":", "\\:").replace("'", "\\'")

    vf = (
        f"drawtext=text='{safe_title}':fontcolor=#1f1f1f:fontsize=64:"
        f"x=(w-text_w)/2:y=(h-text_h)/2-28,"
        f"drawtext=text='{safe_sub}':fontcolor=#6b655c:fontsize=30:"
        f"x=(w-text_w)/2:y=(h-text_h)/2+42,"
        f"fade=t=in:st=0:d=0.45,fade=t=out:st=2.05:d=0.45"
    )

    run([
        "ffmpeg", "-y",
        "-f", "lavfi",
        "-i", "color=c=#f6f2e9:s=1920x1080:r=30:d=2.5",
        "-vf", vf,
        "-c:v", "libx264",
        "-pix_fmt", "yuv420p",
        "-preset", "medium",
        "-crf", "18",
        str(card_path),
    ])
    return card_path


def main() -> int:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    concat_entries: list[Path] = []

    for name, title, subtitle in CHAPTERS:
        mp4 = transcode_chapter(name)
        card = make_chapter_card(name, title, subtitle)
        concat_entries.append(card)
        concat_entries.append(mp4)

    concat_list = OUT_DIR / "concat.txt"
    concat_list.write_text(
        "\n".join(f"file '{p.resolve().as_posix()}'" for p in concat_entries) + "\n",
        encoding="utf-8",
    )

    master = OUT_DIR / "haven-space-full-walkthrough.mp4"
    run([
        "ffmpeg", "-y",
        "-f", "concat",
        "-safe", "0",
        "-i", str(concat_list),
        "-c:v", "libx264",
        "-pix_fmt", "yuv420p",
        "-preset", "medium",
        "-crf", "18",
        "-movflags", "+faststart",
        str(master),
    ])

    print(f"\nMaster walkthrough created: {master}")
    return 0


if __name__ == "__main__":
    sys.exit(main())

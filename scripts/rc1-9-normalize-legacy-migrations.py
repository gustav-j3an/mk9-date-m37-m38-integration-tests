#!/usr/bin/env python3
"""Normalize colliding migration versions in a disposable copy."""

from collections import defaultdict
from pathlib import Path
import re
import sys


LEGACY_DAY_ORDER = {
    "20260930": [
        "create_profiles",
        "add_status_to_profiles",
        "create_import_tables",
        "update_rotas_structure",
    ],
}


def normalize(directory: Path) -> list[tuple[str, str]]:
    groups: dict[str, list[Path]] = defaultdict(list)
    for path in directory.glob("*.sql"):
        match = re.fullmatch(r"(\d{8})_(.+)\.sql", path.name)
        if match:
            groups[match.group(1)].append(path)

    renames: list[tuple[str, str]] = []
    for day in sorted(groups):
        files = sorted(groups[day], key=lambda path: path.name)
        if day in LEGACY_DAY_ORDER:
            by_description = {path.stem.split("_", 1)[1]: path for path in files}
            required = LEGACY_DAY_ORDER[day]
            if set(by_description) != set(required):
                raise ValueError(f"Unexpected legacy migration set for {day}")
            files = [by_description[name] for name in required]

        for sequence, source in enumerate(files, start=1):
            description = source.stem.split("_", 1)[1]
            target = source.with_name(f"{day}{sequence:06d}_{description}.sql")
            if target.exists():
                raise FileExistsError(f"Refusing to overwrite migration {target.name}")
            source.rename(target)
            renames.append((source.name, target.name))

    by_version: dict[str, list[Path]] = defaultdict(list)
    for path in directory.glob("*.sql"):
        version = path.name.split("_", 1)[0]
        if re.fullmatch(r"\d{14}", version):
            by_version[version].append(path)

    occupied = set(by_version)
    for version in sorted(by_version):
        duplicates = sorted(by_version[version], key=lambda path: path.name)
        for source in duplicates[1:]:
            candidate = int(version) + 1
            while f"{candidate:014d}" in occupied:
                candidate += 1
            target = source.with_name(f"{candidate:014d}_{source.stem.split('_', 1)[1]}.sql")
            if target.exists():
                raise FileExistsError(f"Refusing to overwrite migration {target.name}")
            source.rename(target)
            occupied.add(f"{candidate:014d}")
            renames.append((source.name, target.name))

    versions = [path.name.split("_", 1)[0] for path in directory.glob("*.sql")]
    if any(not re.fullmatch(r"\d{14}", version) for version in versions):
        raise ValueError("Disposable migrations must all have 14-digit versions")
    if len(versions) != len(set(versions)):
        raise ValueError("Disposable migrations contain duplicate versions")
    return renames


def main() -> None:
    if len(sys.argv) != 2:
        raise SystemExit("usage: normalize-legacy-migrations.py MIGRATION_DIR")
    directory = Path(sys.argv[1])
    for source, target in normalize(directory):
        print(f"{source} -> {target}")


if __name__ == "__main__":
    main()

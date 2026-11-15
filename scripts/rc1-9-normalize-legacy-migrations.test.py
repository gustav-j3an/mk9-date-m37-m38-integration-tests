from pathlib import Path
import subprocess
import sys
import tempfile
import unittest


SCRIPT = Path(__file__).with_name("rc1-9-normalize-legacy-migrations.py")


class LegacyMigrationNormalizationTests(unittest.TestCase):
    def test_versions_are_unique_and_profile_dependency_order_is_preserved(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            directory = Path(temp_dir)
            files = {
                "20260930_add_status_to_profiles.sql": "ALTER TABLE public.profiles ADD status text;\n",
                "20260930_create_import_tables.sql": "CREATE TABLE public.import_history(id int);\n",
                "20260930_create_profiles.sql": "CREATE TABLE public.profiles(id int);\n",
                "20260930_update_rotas_structure.sql": "ALTER TABLE public.rotas ADD weekday bool;\n",
                "20261001_create_visits_tables.sql": "CREATE TABLE public.visits(id int);\n",
                "20261020160000_add_whatsapp_group.sql": "ALTER TABLE public.industrias ADD grupo text;\n",
                "20261020160000_mk9_faltas.sql": "CREATE TABLE public.faltas(id int);\n",
                "20261020160001_existing.sql": "SELECT 1;\n",
            }
            for name, contents in files.items():
                (directory / name).write_text(contents, encoding="utf-8")

            result = subprocess.run(
                [sys.executable, str(SCRIPT), str(directory)],
                check=True,
                capture_output=True,
                text=True,
            )

            names = sorted(path.name for path in directory.glob("*.sql"))
            self.assertEqual(
                names[:5],
                [
                    "20260930000001_create_profiles.sql",
                    "20260930000002_add_status_to_profiles.sql",
                    "20260930000003_create_import_tables.sql",
                    "20260930000004_update_rotas_structure.sql",
                    "20261001000001_create_visits_tables.sql",
                ],
            )
            self.assertEqual(len({name.split("_", 1)[0] for name in names}), len(names))
            for old_name, contents in files.items():
                description = old_name.split("_", 1)[1]
                candidates = list(directory.glob(f"*_{description}"))
                self.assertEqual(len(candidates), 1)
                self.assertEqual(candidates[0].read_text(encoding="utf-8"), contents)
            self.assertEqual(result.stdout.count(" -> "), len(files) - 3 + 1)
            collision_names = sorted(path.name for path in directory.glob("2026102016*.sql"))
            self.assertEqual(
                collision_names,
                [
                    "20261020160000_add_whatsapp_group.sql",
                    "20261020160001_existing.sql",
                    "20261020160002_mk9_faltas.sql",
                ],
            )

    def test_unknown_20260930_file_aborts_without_renaming(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            directory = Path(temp_dir)
            names = [
                "20260930_add_status_to_profiles.sql",
                "20260930_create_import_tables.sql",
                "20260930_create_profiles.sql",
                "20260930_update_rotas_structure.sql",
                "20260930_unexpected.sql",
            ]
            for name in names:
                (directory / name).write_text("-- fixture\n", encoding="utf-8")

            result = subprocess.run(
                [sys.executable, str(SCRIPT), str(directory)],
                capture_output=True,
                text=True,
            )

            self.assertNotEqual(result.returncode, 0)
            self.assertEqual(sorted(path.name for path in directory.glob("*.sql")), sorted(names))


if __name__ == "__main__":
    unittest.main()

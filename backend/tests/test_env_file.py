"""backend/.env loading: fills in missing variables, never overrides real ones."""
import os

from config.env import load_env_file


def test_loads_variables_from_env_file(tmp_path, monkeypatch):
    monkeypatch.delenv("AGAPE_TEST_DB_URL", raising=False)
    env = tmp_path / ".env"
    env.write_text("AGAPE_TEST_DB_URL=postgres://u:p@localhost:5432/agape\n")

    assert load_env_file(env) is True

    assert os.environ["AGAPE_TEST_DB_URL"] == "postgres://u:p@localhost:5432/agape"
    monkeypatch.delenv("AGAPE_TEST_DB_URL")


def test_real_environment_wins_over_env_file(tmp_path, monkeypatch):
    monkeypatch.setenv("AGAPE_TEST_DB_URL", "postgres://from-dashboard/db")
    env = tmp_path / ".env"
    env.write_text("AGAPE_TEST_DB_URL=postgres://from-file/db\n")

    load_env_file(env)

    assert os.environ["AGAPE_TEST_DB_URL"] == "postgres://from-dashboard/db"


def test_missing_env_file_is_fine(tmp_path):
    assert load_env_file(tmp_path / "does-not-exist") is False

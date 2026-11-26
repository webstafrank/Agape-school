"""Load local settings from a git-ignored ``.env`` file (development convenience)."""
from pathlib import Path

from dotenv import load_dotenv


def load_env_file(path: Path) -> bool:
    """Load KEY=value pairs from ``path`` into os.environ, if the file exists.

    Variables already set in the real environment win (override=False), so
    Railway/Render dashboard values are never replaced by a stray file.
    Returns True if the file was found.
    """
    if not path.is_file():
        return False
    load_dotenv(path, override=False)
    return True

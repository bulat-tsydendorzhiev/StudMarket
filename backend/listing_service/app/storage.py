import uuid
from pathlib import Path

from .config import settings


class LocalStorage:
    """Stores files on the local filesystem under ``<upload_dir>/<uuid>.<ext>``.

    Only the relative file name is kept in the database, so the underlying
    storage can be swapped for a remote backend later.
    """

    def __init__(self, root: Path) -> None:
        self.root = root

    def save(self, filename: str, content: bytes) -> None:
        path = self.root / filename
        self.root.mkdir(parents=True, exist_ok=True)
        path.write_bytes(content)

    def delete(self, filename: str) -> None:
        path = self.root / filename
        if path.exists():
            path.unlink()

    def path(self, filename: str) -> Path:
        return self.root / filename

    @staticmethod
    def make_filename(extension: str) -> str:
        return f"{uuid.uuid4()}.{extension}"


storage = LocalStorage(Path(settings.upload_dir))
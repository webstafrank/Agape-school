import secrets

# No look-alike characters (0/O, 1/l/I) so a password can be read aloud or copied by hand.
ALPHABET = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789"


def generate_password() -> str:
    """A strong one-time password like 'k7Rm4-Qx9pT' (~57 bits)."""
    chars = "".join(secrets.choice(ALPHABET) for _ in range(10))
    return f"{chars[:5]}-{chars[5:]}"

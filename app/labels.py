def normalize_catalog(value: str) -> str:
    return "".join((value or "").strip().upper().split())


def normalize_city(value: str) -> str:
    return (value or "").strip().replace("市", "")

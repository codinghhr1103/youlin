import os

ADMIN_USERNAME = os.environ.get("ADMIN_USERNAME", "youlinadmin")
ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "youlinadmin@youlin.local")
# 生产必须用环境变量。本地未设置时才用这个开发口令，切勿用于公网。
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "")
if not ADMIN_PASSWORD and not os.environ.get("RENDER"):
    ADMIN_PASSWORD = "youlin-local-admin"

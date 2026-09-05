#!/usr/bin/env python3
import json
import os
import shutil
import sqlite3
from datetime import datetime


APP_DIR = os.environ.get("APP_DIR", "/var/www/oracle_viles")
DATA_DIR = os.path.join(APP_DIR, "data")
DB_PATH = os.path.join(DATA_DIR, "veles.db")
STORE_PATH = os.path.join(DATA_DIR, "veles-store.json")


def empty_store():
    return {
        "nextUserId": 1,
        "nextRequestId": 1,
        "users": [],
        "userData": {},
        "requestLog": [],
    }


def has_table(cursor, name):
    row = cursor.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
        (name,),
    ).fetchone()
    return row is not None


def backup_data_dir():
    if not os.path.exists(DATA_DIR):
      os.makedirs(DATA_DIR, exist_ok=True)
      return None

    stamp = datetime.utcnow().strftime("%Y%m%d-%H%M%S")
    backup_path = os.path.join(APP_DIR, "data-backup-" + stamp)
    shutil.copytree(DATA_DIR, backup_path)
    return backup_path


def migrate():
    if os.path.exists(STORE_PATH):
        return {
            "ok": True,
            "skipped": True,
            "reason": "veles-store.json already exists",
            "out": STORE_PATH,
        }

    backup_path = backup_data_dir()
    store = empty_store()

    if os.path.exists(DB_PATH):
        con = sqlite3.connect(DB_PATH)
        con.row_factory = sqlite3.Row
        cur = con.cursor()

        try:
            cur.execute("PRAGMA wal_checkpoint(FULL)")
        except Exception:
            pass

        if has_table(cur, "users"):
            for row in cur.execute("SELECT * FROM users ORDER BY id"):
                user = dict(row)
                now = datetime.utcnow().isoformat() + "Z"
                store["users"].append({
                    "id": user.get("id"),
                    "email": user.get("email"),
                    "password_hash": user.get("password_hash"),
                    "name": user.get("name"),
                    "birth_date": user.get("birth_date"),
                    "plan": user.get("plan") or "free",
                    "daily_limit": user.get("daily_limit") or 15,
                    "created_at": user.get("created_at") or now,
                    "updated_at": user.get("updated_at") or now,
                })

        if has_table(cur, "user_data"):
            for row in cur.execute("SELECT * FROM user_data ORDER BY user_id"):
                data = dict(row)
                store["userData"][str(data.get("user_id"))] = data

        if has_table(cur, "request_log"):
            for row in cur.execute("SELECT * FROM request_log ORDER BY id"):
                item = dict(row)
                store["requestLog"].append({
                    "id": item.get("id"),
                    "user_id": item.get("user_id"),
                    "request_mode": item.get("request_mode") or "oracle",
                    "created_at": item.get("created_at") or datetime.utcnow().isoformat() + "Z",
                })

        con.close()

    user_ids = [user.get("id") or 0 for user in store["users"]]
    request_ids = [item.get("id") or 0 for item in store["requestLog"]]
    store["nextUserId"] = max(user_ids) + 1 if user_ids else 1
    store["nextRequestId"] = max(request_ids) + 1 if request_ids else 1

    tmp_path = STORE_PATH + ".tmp"
    with open(tmp_path, "w", encoding="utf-8") as f:
        json.dump(store, f, ensure_ascii=False, indent=2)
    os.replace(tmp_path, STORE_PATH)

    return {
        "ok": True,
        "backup": backup_path,
        "users": len(store["users"]),
        "userData": len(store["userData"]),
        "requestLog": len(store["requestLog"]),
        "out": STORE_PATH,
    }


if __name__ == "__main__":
    print(json.dumps(migrate(), ensure_ascii=False))

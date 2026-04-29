import os
import psycopg2
from psycopg2.extras import RealDictCursor
from contextlib import contextmanager


def get_connection():
    return psycopg2.connect(os.getenv("DATABASE_URL"))


@contextmanager
def get_cursor():
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            yield cur
        conn.commit()
    finally:
        conn.close()

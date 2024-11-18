import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

def reset_database():
    # Connection parameters
    dbname = "postgres"
    user = "fpl_user"
    password = "fpl_tacticos_league"
    host = "localhost"

    # Connect to the default 'postgres' database
    conn = psycopg2.connect(dbname=dbname, user=user, password=password, host=host)
    conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
    cur = conn.cursor()

    # Drop the existing database if it exists
    cur.execute("DROP DATABASE IF EXISTS fpl_league_hub")
    print("Dropped existing database (if it existed)")

    # Create a new database
    cur.execute("CREATE DATABASE fpl_league_hub")
    print("Created new database")

    # Close the connection
    cur.close()
    conn.close()

    print("Database reset complete")

if __name__ == "__main__":
    reset_database()
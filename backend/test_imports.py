# Place this file in backend/
from app.main import app

def test_import():
    print("Successfully imported app!")
    print(f"App routes: {app.routes}")

if __name__ == "__main__":
    test_import()
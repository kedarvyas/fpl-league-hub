import os
import sys

def check_environment():
    print("Current working directory:", os.getcwd())
    print("\nDirectory contents:", os.listdir())
    print("\nPython path:", sys.path)
    print("\nEnvironment variables:", dict(os.environ))

if __name__ == "__main__":
    check_environment()
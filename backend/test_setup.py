import os
import sys

def main():
    print("Current directory:", os.getcwd())
    print("Directory contents:", os.listdir())
    print("PYTHONPATH:", os.getenv("PYTHONPATH"))
    print("Python path:", sys.path)
    
    # Try to find requirements.txt
    if os.path.exists("requirements.txt"):
        print("Found requirements.txt")
        with open("requirements.txt") as f:
            print("Contents:", f.read())
    else:
        print("requirements.txt not found")
        print("Files in current directory:", os.listdir())

if __name__ == "__main__":
    main()
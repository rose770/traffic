import runpy
import traceback

try:
    print("Running main.py via runpy.run_path...", flush=True)
    runpy.run_path("main.py", run_name="__main__")
except Exception as e:
    print("Caught exception in main.py execution:", flush=True)
    traceback.print_exc()

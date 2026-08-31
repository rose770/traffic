import sys
import asyncio
import uvicorn
from main import app

async def run_server():
    print("Step A: Creating uvicorn config...", flush=True)
    config = uvicorn.Config(app=app, host="127.0.0.1", port=5000, log_level="info")
    server = uvicorn.Server(config)
    print("Step B: Starting server.serve()...", flush=True)
    await server.serve()
    print("Step C: server.serve() exited!", flush=True)

if __name__ == "__main__":
    if sys.stdout and hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(line_buffering=True)
    print("Main script starting asyncio.run(run_server())...", flush=True)
    asyncio.run(run_server())

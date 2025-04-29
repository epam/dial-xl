import uvicorn

from version import get_version

if __name__ == "__main__":
    uvicorn.run(
        get_version(),
        host="0.0.0.0",
        port=5000,
        use_colors=True,
        env_file="./.env",
    )

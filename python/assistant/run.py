import uvicorn

if __name__ == "__main__":
    uvicorn.run(
        "dial.xl.assistant.__main__:app",
        host="0.0.0.0",
        port=5000,
        env_file="./.env",
    )

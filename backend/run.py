#!/usr/bin/env python3
"""Quick start script for Udyog-Vaani backend."""
import uvicorn

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

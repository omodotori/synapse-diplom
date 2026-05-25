import asyncio
import os
import sys

from helpers import whisper, kokoro_tts, runtime
from helpers.print_style import PrintStyle

async def main():
    print("Preloading Whisper...")
    # Whisper base model
    await whisper.preload("base")
    
    print("Preloading Kokoro...")
    # Kokoro model
    await kokoro_tts._preload()
    
    print("Done!")

if __name__ == "__main__":
    asyncio.run(main())

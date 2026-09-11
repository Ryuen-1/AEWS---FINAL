import os
import sys
import requests
from dotenv import load_dotenv

load_dotenv()
API_KEY = os.getenv("OPENROUTER_API_KEY")

def review_file(file_path, prompt, model="openai/gpt-4o"):
    if not API_KEY:
        print("Error: OPENROUTER_API_KEY is not set in your environment variables.")
        return

    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            code = f.read()
    except FileNotFoundError:
        print(f"Error: File not found: {file_path}")
        return
    except Exception as e:
        print(f"Error reading file: {e}")
        return
    
    print(f"Reviewing {file_path}...")
    print("-" * 80)
    
    response = requests.post(
        "https://openrouter.ai/api/v1/chat/completions",
        headers={
            "Authorization": f"Bearer {API_KEY}",
            "HTTP-Referer": "http://localhost:5173",
            "X-Title": "AEWS System",
            "Content-Type": "application/json",
        },
        json={
            "model": model,
            "messages": [
                {
                    "role": "system",
                    "content": "You are an expert code reviewer for an Academic Early Warning System (AEWS) built with FastAPI and React."
                },
                {
                    "role": "user",
                    "content": f"{prompt}\n\nCode:\n```\n{code}\n```"
                },
            ],
        },
    )
    
    if response.status_code != 200:
        print(f"Error: API request failed with status {response.status_code}")
        print(response.text)
        return
    
    result = response.json()
    print(result["choices"][0]["message"]["content"])
    print("-" * 80)
    print("Review complete.")

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python openrouter_review.py <file_path> <prompt> [model]")
        print("Example: python openrouter_review.py backend/app/routers/classes.py \"Review for security\"")
        sys.exit(1)
    
    file_path = sys.argv[1]
    prompt = sys.argv[2]
    model = sys.argv[3] if len(sys.argv) > 3 else "openai/gpt-4o"
    
    review_file(file_path, prompt, model)
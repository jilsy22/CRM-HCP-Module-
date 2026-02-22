"""Quick test script to call the chat endpoint and print the raw response."""
import urllib.request
import json

url = "http://localhost:8000/api/chat/"
data = json.dumps({"session_id": "test-001", "message": "Search for cardiologists"}).encode()
req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"})
try:
    with urllib.request.urlopen(req, timeout=60) as resp:
        body = resp.read().decode()
        print("SUCCESS:", body)
except urllib.error.HTTPError as e:
    body = e.read().decode()
    print("HTTP ERROR", e.code, ":", body)
except Exception as ex:
    print("ERROR:", ex)

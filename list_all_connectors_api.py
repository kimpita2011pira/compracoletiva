import os
import requests

api_key = os.environ.get("LOVABLE_API_KEY")
headers = {
    "Authorization": f"Bearer {api_key}"
}

# This is an internal URL often used for listing connections linked to the project
resp = requests.get("https://api.lovable.dev/v1/connections", headers=headers)
print(f"Connections list: {resp.status_code}")
if resp.status_code == 200:
    print(resp.json())


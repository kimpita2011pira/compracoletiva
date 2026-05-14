import os
import requests

api_key = os.environ.get("LOVABLE_API_KEY")
connection_id = "std_01krhdyfvme4r9pctxwvpbnnm5"

headers = {
    "Authorization": f"Bearer {api_key}",
    "X-Lovable-Connection-Id": connection_id
}

# Try a very simple request to check if the connection itself is working/accessible
resp = requests.get("https://google-search-console.gateway.lovable.dev/", headers=headers)
print(f"Root check: {resp.status_code}")

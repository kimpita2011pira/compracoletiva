import os
import requests

api_key = os.environ.get("LOVABLE_API_KEY")
connection_id = "std_01krhdyfvme4r9pctxwvpbnnm5"

headers = {
    "Authorization": f"Bearer {api_key}",
    "X-Lovable-Connection-Id": connection_id
}

resp = requests.get(
    "https://google-search-console.gateway.lovable.dev/webmasters/v3/sites",
    headers=headers
)
print(f"Status: {resp.status_code}")
print(f"Body: {resp.text}")

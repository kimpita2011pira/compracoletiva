import os
import requests

api_key = os.environ.get("LOVABLE_API_KEY")
connection_id = "std_01krhdyfvme4r9pctxwvpbnnm5"

headers = {
    "Authorization": f"Bearer {api_key}",
    "X-Lovable-Connection-Id": connection_id
}

# Testing the standard base URL for the API
resp = requests.get(
    "https://google-search-console.gateway.lovable.dev/webmasters/v3/sites",
    headers=headers
)
print(f"Standard GSC Gateway attempt: {resp.status_code}")

# Testing without 'webmasters/' prefix if applicable
resp2 = requests.get(
    "https://google-search-console.gateway.lovable.dev/v3/sites",
    headers=headers
)
print(f"Alternative GSC Gateway attempt: {resp2.status_code}")

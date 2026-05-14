import os
import requests

api_key = os.environ.get("LOVABLE_API_KEY")
connection_id = "std_01krhdyfvme4r9pctxwvpbnnm5"

headers = {
    "Authorization": f"Bearer {api_key}",
    "X-Lovable-Connection-Id": connection_id
}

# Maybe the path doesn't include 'webmasters/'?
resp = requests.get("https://google-search-console.gateway.lovable.dev/v3/sites", headers=headers)
print(f"V3 Sites: {resp.status_code}")

# Or maybe it's under 'searchconsole/v1'?
resp2 = requests.get("https://google-search-console.gateway.lovable.dev/searchconsole/v1/sites", headers=headers)
print(f"Search Console V1 Sites: {resp2.status_code}")


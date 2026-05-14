import os
import requests

api_key = os.environ.get("LOVABLE_API_KEY")
connection_id = "std_01krhdyfvme4r9pctxwvpbnnm5"

headers = {
    "Authorization": f"Bearer {api_key}",
    "X-Lovable-Connection-Id": connection_id
}

# The Google Search Console API base is https://www.googleapis.com/webmasters/v3/
# Through the gateway, it should be https://google_search_console.gateway.lovable.dev/webmasters/v3/
# Wait, the connector_id is google_search_console (with underscores), but URLs usually use hyphens.
# Let's try both.

urls = [
    "https://google-search-console.gateway.lovable.dev/webmasters/v3/sites",
    "https://google_search_console.gateway.lovable.dev/webmasters/v3/sites",
    "https://google-search-console.gateway.lovable.dev/searchconsole/v1/urlInspection/index:inspect"
]

for url in urls:
    try:
        resp = requests.get(url, headers=headers) if "inspect" not in url else requests.post(url, headers=headers, json={})
        print(f"URL: {url} -> Status: {resp.status_code}")
    except Exception as e:
        print(f"URL: {url} -> Error: {e}")


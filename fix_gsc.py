import os
import requests
import json

api_key = os.environ.get("LOVABLE_API_KEY")
connection_id = "std_01krhdyfvme4r9pctxwvpbnnm5"
# Google requires the site URL to be exactly as registered
site_url = "https://compracoletiva.lovable.app/"

headers = {
    "Authorization": f"Bearer {api_key}",
    "X-Lovable-Connection-Id": connection_id,
    "Content-Type": "application/json"
}

# The actual gateway URL structure is usually https://google-search-console.gateway.lovable.dev/
# But the paths inside follow the Google API: /webmasters/v3/sites

# 1. Add site
print(f"Adding site: {site_url}")
add_url = f"https://google-search-console.gateway.lovable.dev/webmasters/v3/sites/{site_url.replace('/', '%2F')}"
add_resp = requests.put(add_url, headers=headers)
print(f"Add response: {add_resp.status_code}")

# 2. Verify site
print(f"Verifying site: {site_url}")
# For the verification API, the path is often /siteVerification/v1/verify
# Let's try the common one first
verify_url = f"https://google-search-console.gateway.lovable.dev/webmasters/v3/sites/{site_url.replace('/', '%2F')}/verify"
# Wait, site verification is a different API in Google (siteVerification v1)
# But GSC also has an internal verification trigger.

# Let's try to list sites again to see if it was added
list_resp = requests.get("https://google-search-console.gateway.lovable.dev/webmasters/v3/sites", headers=headers)
print(f"List response: {list_resp.status_code} {list_resp.text}")


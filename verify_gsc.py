import os
import requests
import json

api_key = os.environ.get("LOVABLE_API_KEY")
connection_id = "std_01krhdyfvme4r9pctxwvpbnnm5"
site_url = "https://compracoletiva.lovable.app/"

headers = {
    "Authorization": f"Bearer {api_key}",
    "X-Lovable-Connection-Id": connection_id,
    "Content-Type": "application/json"
}

# 1. Attempt to add/verify the site
# Endpoint: sites.add
# https://developers.google.com/webmaster-tools/v1/sites/add
print(f"Adding site: {site_url}")
add_resp = requests.put(
    f"https://google-search-console.gateway.lovable.dev/webmasters/v3/sites/{site_url.replace('/', '%2F')}",
    headers=headers
)
print(f"Add response: {add_resp.status_code} {add_resp.text}")

# 2. Verify the site
# Endpoint: verification.verify
# https://developers.google.com/webmaster-tools/v1/verification/verify
print(f"Verifying site: {site_url}")
verify_data = {
    "verificationMethod": "META"
}
verify_resp = requests.post(
    f"https://google-search-console.gateway.lovable.dev/webmasters/v3/verification/verify/{site_url.replace('/', '%2F')}",
    headers=headers,
    json=verify_data
)
print(f"Verify response: {verify_resp.status_code} {verify_resp.text}")

# 3. Check current status
# Endpoint: sites.get
print(f"Getting site status: {site_url}")
get_resp = requests.get(
    f"https://google-search-console.gateway.lovable.dev/webmasters/v3/sites/{site_url.replace('/', '%2F')}",
    headers=headers
)
print(f"Status response: {get_resp.status_code} {get_resp.text}")


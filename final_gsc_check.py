import os
import requests

api_key = os.environ.get("LOVABLE_API_KEY")
connection_id = "std_01krhdyfvme4r9pctxwvpbnnm5"
site_url = "https://compracoletiva.lovable.app/"

headers = {
    "Authorization": f"Bearer {api_key}",
    "X-Lovable-Connection-Id": connection_id
}

# According to typical gateway behavior:
# GET https://google-search-console.gateway.lovable.dev/webmasters/v3/sites
# should return the list of sites.

resp = requests.get(
    "https://google-search-console.gateway.lovable.dev/webmasters/v3/sites",
    headers=headers
)

print(f"GSC Sites Call: {resp.status_code}")
if resp.status_code == 200:
    print(f"Data: {resp.text}")
else:
    print(f"Error: {resp.text}")


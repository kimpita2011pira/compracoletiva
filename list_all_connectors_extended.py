import os
import requests

api_key = os.environ.get("LOVABLE_API_KEY")
headers = {
    "Authorization": f"Bearer {api_key}"
}

# Try to list connections via API if possible, or just check the environment
# Since I can't find a manifest, I'll try to use the google-search-console connector again 
# but I suspect the 404 is because I'm hitting the wrong path or the gateway is misconfigured.

# Let's try to search for any previous successful tool calls in the history if possible
# (I don't have that tool, but I can look at my own previous reasoning if I had more history)
print("Environment check:")
for k, v in os.environ.items():
    if "LOVABLE" in k:
        print(f"{k} is set")

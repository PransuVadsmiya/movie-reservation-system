import urllib.request
import urllib.error
import json

data = json.dumps({
    "email": "admin@example.com",
    "password": "change_this_admin_password"
}).encode("utf-8")

req = urllib.request.Request("http://localhost:8001/auth/login", data=data, headers={"Content-Type": "application/json"})

try:
    with urllib.request.urlopen(req) as res:
        print("Status:", res.status)
        print(res.read().decode("utf-8"))
except urllib.error.HTTPError as e:
    print("HTTP Error:", e.code)
    print(e.read().decode("utf-8"))
except Exception as e:
    print("Error:", e)

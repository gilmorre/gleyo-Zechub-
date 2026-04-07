import requests
import json

def get_guest_token():
    headers = {
        "Authorization": "Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAA..."
    }
    r = requests.post(
        "https://api.twitter.com/1.1/guest/activate.json",
        headers=headers
    )
    return r.json()['guest_token']


def get_tweet(tweet_id):
    guest_token = get_guest_token()

    headers = {
        "Authorization": "Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAA...",
        "x-guest-token": guest_token
    }

    url = f"https://api.twitter.com/2/timeline/conversation/{tweet_id}.json"

    r = requests.get(url, headers=headers)
    data = r.json()

    tweet = data["globalObjects"]["tweets"][tweet_id]
    user = data["globalObjects"]["users"][tweet["user_id_str"]]

    return {
        "text": tweet["full_text"],
        "replies": tweet["reply_count"],
        "id": tweet["id_str"],
        "username": user["screen_name"]
    }


tweet_data = get_tweet("1997674960899260486")
print(json.dumps(tweet_data, indent=2))

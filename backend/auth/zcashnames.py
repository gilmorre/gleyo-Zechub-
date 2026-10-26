#!/usr/bin/env python3
"""
Resolve a Zcash name to its address.

  python zcashnames.py "alice.zec"                       # ZCashNames indexer (default)
  python zcashnames.py "alice" --source zcashme          # ZcashMe ZNS registry
  python zcashnames.py --source zcashme --list           # list every name in ZcashMe registry
  python zcashnames.py "alice.zec" --raw
  python zcashnames.py --serve                           # Flask: GET /resolve/<name>?source=zcashme

Sources:
  zcashnames -> https://indexer.zcashnames.co        (names like alice.zec)
  zcashme    -> https://light.zcash.me/zns-mainnet-test  (names like alice, JSON-RPC)

Needs: pip install requests flask
"""
import argparse
import json
import os
import re
import sys

import requests

ZCASHNAMES_API = "https://indexer.zcashnames.co"
ZCASHME_API = "https://light.zcash.me/zns-mainnet-test"
ZONES = ("zcash", "zec", "private", "secure", "safe")
ZN_NAME_RE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*\.(%s)$" % "|".join(ZONES))
ZM_LABEL_RE = re.compile(r"^[a-z0-9]{1,62}$")
UA_RE = re.compile(r"^u1[0-9a-z]{50,}$")  # mainnet unified address
TIMEOUT = 10


class ZnsError(Exception):
    pass


# ---------------------------------------------------------------- ZCashNames
def zn_normalize(name: str) -> str:
    name = name.strip().lower()
    label = name.rsplit(".", 1)[0]
    if not ZN_NAME_RE.match(name) or not (1 <= len(label) <= 64):
        raise ZnsError(
            f"'{name}' is not a valid ZCashNames name. Use label.zone, zone one of: {', '.join(ZONES)}"
        )
    return name


def zn_get_json(url):
    try:
        r = requests.get(url, timeout=TIMEOUT)
    except requests.RequestException as e:
        raise ZnsError(f"Could not reach {url}: {e}")
    try:
        data = r.json()
    except ValueError:
        raise ZnsError(f"Non-JSON answer from {url} (HTTP {r.status_code})")
    if isinstance(data, dict) and "error" in data:
        err = data["error"]
        msg = err.get("error_message") if isinstance(err, dict) else err
        raise ZnsError(str(msg))
    if not isinstance(data, dict) or "response" not in data:
        raise ZnsError(f"Unexpected answer: {json.dumps(data)[:200]}")
    return data["response"]


def resolve_zcashnames(name: str, api: str) -> dict:
    name = zn_normalize(name)
    api = api.rstrip("/")

    synced = None
    try:
        synced = zn_get_json(f"{api}/v1.0/info").get("indexer_synced")
    except ZnsError:
        pass

    data = zn_get_json(f"{api}/v1.0/resolve/{name}")

    if data.get("proof_terminal") != "Occupied":
        raise ZnsError(f"'{name}' is not a confirmed registration (proof_terminal={data.get('proof_terminal')!r})")
    if data.get("domain_name", "").lower() != name:
        raise ZnsError(f"Node answered for a different name: {data.get('domain_name')!r}")
    if data.get("proof_depth") != len(data.get("merkle_proof", [])):
        raise ZnsError("Malformed proof: proof_depth does not match merkle_proof length")

    address = data.get("target_address")
    if not address or not UA_RE.match(address):
        raise ZnsError(f"Resolved value does not look like a unified address: {address!r}")

    return {
        "source": "zcashnames",
        "name": name,
        "address": address,
        "owner": data.get("owner_pubkey"),
        "root": data.get("smt_root"),
        "node_synced": synced,
        "raw": data,
    }


# -------------------------------------------------------------------- ZcashMe
def zm_rpc(api: str, method: str, params=None):
    payload = {"jsonrpc": "2.0", "id": 1, "method": method}
    if params is not None:
        payload["params"] = params
    try:
        r = requests.post(api, json=payload, timeout=TIMEOUT)
        data = r.json()
    except requests.RequestException as e:
        raise ZnsError(f"Could not reach {api}: {e}")
    except ValueError:
        raise ZnsError(f"Non-JSON answer from {api}")
    if "error" in data:
        raise ZnsError(f"RPC error: {data['error']}")
    return data.get("result")


def zm_label(name: str) -> str:
    # accept "alice" or "alice.zec": ZcashMe names have no zone
    label = name.strip().lower().split(".")[0]
    if not ZM_LABEL_RE.match(label):
        raise ZnsError(f"'{name}' is not a valid ZcashMe name (a-z and 0-9 only, 1-62 chars)")
    return label


def resolve_zcashme(name: str, api: str) -> dict:
    label = zm_label(name)
    data = zm_rpc(api, "resolve", [label])
    if not data:
        raise ZnsError(f"'{label}' is not registered in the ZcashMe registry")
    if data.get("name", "").lower() != label:
        raise ZnsError(f"Node answered for a different name: {data.get('name')!r}")
    address = data.get("address")
    if not address or not UA_RE.match(address):
        raise ZnsError(f"Resolved value does not look like a unified address: {address!r}")

    status = {}
    try:
        status = zm_rpc(api, "status") or {}
    except ZnsError:
        pass

    return {
        "source": "zcashme",
        "name": label,
        "address": address,
        "owner": data.get("pubkey") or "admin-signed",
        "root": None,
        "node_synced": None,
        "synced_height": status.get("synced_height"),
        "raw": data,
    }


def list_zcashme(api: str):
    names, offset = [], 0
    while True:
        page = zm_rpc(api, "resolve", ["", 100, offset]) or []
        names.extend(page)
        if len(page) < 100:
            break
        offset += 100
    return names


# ----------------------------------------------------------------------- main
def resolve(name: str, source: str = "zcashnames", api: str = None) -> dict:
    if source == "zcashme":
        return resolve_zcashme(name, (api or ZCASHME_API).rstrip("/"))
    return resolve_zcashnames(name, (api or ZCASHNAMES_API).rstrip("/"))


def main():
    p = argparse.ArgumentParser()
    p.add_argument("name", nargs="?", help='e.g. "alice.zec" (zcashnames) or "alice" (zcashme)')
    p.add_argument("--source", choices=["zcashnames", "zcashme"], default=os.environ.get("ZNS_SOURCE", "zcashnames"))
    p.add_argument("--api", default=os.environ.get("ZNS_API"), help="override the API base URL")
    p.add_argument("--list", action="store_true", help="list all names (zcashme source only)")
    p.add_argument("--serve", action="store_true", help="run a small Flask endpoint")
    p.add_argument("--raw", action="store_true", help="print the full API response")
    args = p.parse_args()

    if args.serve:
        from flask import Flask, jsonify, request

        app = Flask(__name__)

        @app.get("/resolve/<name>")
        def _resolve(name):
            try:
                res = resolve(name, request.args.get("source", args.source), args.api)
                return jsonify({k: v for k, v in res.items() if k != "raw"})
            except ZnsError as e:
                return jsonify({"error": str(e)}), 400

        app.run(host="127.0.0.1", port=5055)
        return

    if args.list:
        if args.source != "zcashme":
            sys.exit("--list only works with --source zcashme (ZCashNames has no list-all call)")
        try:
            names = list_zcashme((args.api or ZCASHME_API).rstrip("/"))
        except ZnsError as e:
            sys.exit(f"ERROR: {e}")
        print(f"{len(names)} registered names")
        for n in names:
            print(f"  {n.get('name'):<25} {n.get('address')}")
        return

    if not args.name:
        p.error('give a name, e.g. python zcashnames.py "alice.zec"')

    try:
        res = resolve(args.name, args.source, args.api)
    except ZnsError as e:
        sys.exit(f"ERROR: {e}")

    print(f"source:  {res['source']}")
    print(f"name:    {res['name']}")
    print(f"address: {res['address']}")
    print(f"owner:   {res['owner']}")
    if res.get("root"):
        print(f"root:    {res['root']}")
    if res["node_synced"] is False:
        print("WARNING: this node reports indexer_synced=false, the answer may be stale")
    if args.raw:
        print(json.dumps(res["raw"], indent=2))


if __name__ == "__main__":
    main()
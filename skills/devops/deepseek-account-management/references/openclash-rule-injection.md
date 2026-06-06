# OpenClash Rule Injection Technical Details

## Why custom_rules.list Fails for AND Rules

OpenClash loads `custom_rules.list` via `yml_rules_change.sh` (L118):
```ruby
CUSTOM_RULE = YAML.load_file('/etc/openclash/custom/openclash_custom_rules.list')
```

Then processes each rule string through `transformed_rules` (L168):
```ruby
transformed_rules = rules_array.map{|x|
  parts = x.split(',')  # ← THIS destroys AND syntax
  ...
}
```

AND rule `AND,((DOMAIN-SUFFIX,deepseek.com),(SRC-IP-CIDR,192.168.2.13/32)),🐟 漏网之鱼-2.13` gets split into:
- parts[0] = `AND`
- parts[1] = `((DOMAIN-SUFFIX` → invalid IP, not useful

Then rule validation (L177) extracts target group by `x.split(',')[-1]` and checks if it exists in `CONFIG_GROUP`. If the group isn't in the config yet, the rule is silently skipped: `"Skiped The Custom Rule Because Group & Proxy Not Found"`.

## Why Ruby YAML.dump Corrupts Clash Config

```ruby
YAML.dump(config, file)  # ← NEVER do this
```

Problems:
- AND rule strings get re-serialized differently
- Emoji proxy names may be converted to Unicode escape sequences
- Rule ordering and quoting may change
- `SrcIPCIDR` fields can appear as separate rules instead of AND sub-conditions

## Working Approach: Direct Text Injection + API Reload

```bash
# 1. Backup config
ssh 2.11 'sudo cp "/etc/openclash/config/CF Pages.yaml" /tmp/cf_work.yaml'

# 2. Insert new proxy group before rules: section
ssh 2.11 'sudo sed -i "/^rules:/i\\
- name: \"🐟 漏网之鱼-2.13\"\\
  type: select\\
  use:\\
  - Provider_822BE9\\
  filter: \".*\"\\
  proxies:\\
  - \"♻️ 自动选择\"\\
" /tmp/cf_work.yaml'

# 3. Insert AND rule as first rule after rules: section
ssh 2.11 'sudo sed -i "/^rules:/a\\
- \"AND,((DOMAIN-SUFFIX,deepseek.com),(SRC-IP-CIDR,192.168.2.13/32)),🐟 漏网之鱼-2.13\"\\
" /tmp/cf_work.yaml'

# 4. Deploy
ssh 2.11 'sudo cp /tmp/cf_work.yaml "/etc/openclash/config/CF Pages.yaml"'

# 5. Hot reload via Python (not curl — Hermes terminal mangles Bearer auth)
python3 -c "
import urllib.request, json
url = 'http://192.168.2.11:9090/configs?force=true'
payload = json.dumps({'path': '/etc/openclash/config/CF Pages.yaml'}).encode()
req = urllib.request.Request(url, data=payload, method='PUT')
req.add_header('Authorization', 'Bearer ruanrn')
req.add_header('Content-Type', 'application/json')
urllib.request.urlopen(req, timeout=10)  # 204 = success
"

# 6. Verify
python3 -c "
import urllib.request, json, urllib.parse
req = urllib.request.Request('http://192.168.2.11:9090/rules')
req.add_header('Authorization', 'Bearer ruanrn')
rules = json.loads(urllib.request.urlopen(req, timeout=10).read())['rules']
print(rules[0])  # Should be: {'type': 'AND', 'payload': '((DomainSuffix,deepseek.com) && (SrcIPCIDR,192.168.2.13/32))'}
"
```

## Persistence: Surviving Subscription Refresh

Direct CF Pages.yaml edits are overwritten when OpenClash refreshes the subscription. For persistence:

**Option A**: `openclash_custom_overwrite.sh` with sed text injection (NOT Ruby YAML.dump):
```bash
# In openclash_custom_overwrite.sh, before exit 0:
sudo sed -i "/^rules:/i\\
- name: \"🐟 漏网之鱼-2.13\"\\
..." "$CONFIG_FILE"
```

**Option B**: Lock the subscription (disable auto-update in OpenClash UI).

## Key File Locations (2.11)

| File | Purpose |
|------|---------|
| `/etc/openclash/config/CF Pages.yaml` | Main Clash config (subscription output) |
| `/etc/openclash/custom/openclash_custom_rules.list` | Custom rules (prepended to rules section) |
| `/etc/openclash/custom/openclash_custom_overwrite.sh` | Post-processing script |
| `/usr/share/openclash/yml_rules_change.sh` | Rule injection logic (L118-200) |
| `/usr/share/openclash/ruby.sh` | Ruby helper functions (ruby_arr_insert_hash etc.) |
| `/etc/openclash/overwrite/default` | Contains `ENABLE_CUSTOM_CLASH_RULES = 1` |

## Quick Start Mode (Critical)

When OpenClash logs show `"Quick Start Mode, Skip Modify The Config File"`, the ENTIRE custom rules pipeline is bypassed:
- `custom_rules.list` is NOT loaded into the config
- `yml_rules_change.sh` runs but its output is not applied
- `openclash_custom_overwrite.sh` still runs but may have no effect on rules

**Hot reload (`PUT /configs`) only reloads the YAML file** — it does NOT re-run the custom rules pipeline. Only a full OpenClash restart (`/etc/init.d/openclash restart`) re-processes everything, but even then Quick Start Mode may skip rules.

**The only reliable method is direct sed injection into CF Pages.yaml + hot reload.** See "Working Approach" section above.

```bash
# Simple rule injection (no AND, no new group needed)
RULE_LINE=$(printf '- "DOMAIN-SUFFIX,deepseek.com,🐟 漞网之鱼"')
ssh 2.11 "sudo sed -i '/^rules:/a\\$RULE_LINE' '/etc/openclash/config/CF Pages.yaml'"
# Then hot reload via Python urllib (see above)
```

## Operational Pitfalls

- **🐟 漏网之鱼 defaults to `🎯 全球直连` after config restore** — All HTTPS breaks with SSL EOF. Always verify and restore to `♻️ 自动选择` after any config change.
- **IP check endpoint reliability**: `api.ipify.org` and `ipinfo.io` may return SSL EOF or 403 through certain proxy nodes. `https://checkip.amazonaws.com` is the most reliable fallback.
- **AND rule injected but traffic routing unverified**: Rule confirmed in Clash API `GET /rules` as `[AND]`, but exit IP remained CN. Root cause: all nodes in the subscription (CF Workers + independent US node) are judged CN by DeepSeek's GeoIP, regardless of ipinfo.io's country code. The AND rule itself works — the problem is node selection.
- **DeepSeek GeoIP vs ipinfo.io**: ipinfo.io says `US`/`MO` but DeepSeek HTML meta says `CN`. Verify via `<meta name="region">` in the sign_up page HTML, not ipinfo.io.

#!/usr/bin/env python3
"""IMAP poller: wait for DeepSeek verification code, forward to stdout."""
import imaplib, email, re, sys, time

IMAP_HOST = 'imap.163.com'
IMAP_PORT = 993
IMAP_USER = 'rayruanrn@163.com'
IMAP_PASS = 'BDvFEeeimuFpAdiQ'
TARGET_EMAIL = sys.argv[1] if len(sys.argv) > 1 else None
POLL_INTERVAL = 5
MAX_WAIT = 120  # 2 minutes


def poll_verification_code(target_email):
    mail = imaplib.IMAP4_SSL(IMAP_HOST, IMAP_PORT)
    mail.xatom('ID ("name" "Hermes" "version" "1.0")')
    mail.login(IMAP_USER, IMAP_PASS)
    mail.select('INBOX')

    start = time.time()
    seen_ids = set()

    while time.time() - start < MAX_WAIT:
        status, msgs = mail.search(None, 'UNSEEN')
        if status != 'OK':
            break
        msg_ids = msgs[0].split() if msgs[0] else []

        for mid in msg_ids:
            mid_str = mid.decode() if isinstance(mid, bytes) else mid
            if mid_str in seen_ids:
                continue
            seen_ids.add(mid_str)

            status, data = mail.fetch(mid, '(RFC822)')
            if status != 'OK':
                continue
            raw = data[0][1]
            msg = email.message_from_bytes(raw)

            # Check if this is for our target
            to_addr = msg.get('To', '').lower()
            if target_email and target_email.lower() not in to_addr:
                continue

            # Extract body
            body = ''
            if msg.is_multipart():
                for part in msg.walk():
                    ct = part.get_content_type()
                    if ct == 'text/plain':
                        body = part.get_payload(decode=True).decode('utf-8', errors='ignore')
                        break
                    elif ct == 'text/html':
                        body = part.get_payload(decode=True).decode('utf-8', errors='ignore')
            else:
                body = msg.get_payload(decode=True).decode('utf-8', errors='ignore') if msg.get_payload() else ''

            # Extract verification code (6-digit preferred)
            codes = re.findall(r'\b(\d{4,8})\b', body)
            six = [c for c in codes if 100000 <= int(c) <= 999999]
            four = [c for c in codes if 1000 <= int(c) <= 9999]
            code = six[0] if six else (four[0] if four else None)

            if code:
                # Mark as seen
                mail.store(mid, '+FLAGS', '\\Seen')
                print(f"CODE:{code}")
                mail.logout()
                return code

            # Not a verification code email, mark seen and continue
            mail.store(mid, '+FLAGS', '\\Seen')

        elapsed = int(time.time() - start)
        remaining = MAX_WAIT - elapsed
        if remaining <= 0:
            break
        sys.stderr.write(f"  Waiting... ({elapsed}s/{MAX_WAIT}s)\n")
        time.sleep(POLL_INTERVAL)

    mail.logout()
    return None


if __name__ == '__main__':
    target = sys.argv[1] if len(sys.argv) > 1 else None
    code = poll_verification_code(target)
    if code:
        sys.exit(0)
    else:
        sys.stderr.write("TIMEOUT: No verification code received\n")
        sys.exit(1)

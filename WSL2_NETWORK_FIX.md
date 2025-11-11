# WSL2 Network Connectivity Fix

## Problem
You're getting "TypeError: fetch failed" when trying to connect to Supabase from WSL2. This is a common WSL2 network issue.

## Quick Fixes

### Option 1: Fix WSL2 DNS (Recommended)
```bash
# Create/update resolv.conf
sudo bash -c 'echo "nameserver 8.8.8.8" > /etc/resolv.conf'
sudo bash -c 'echo "nameserver 8.8.4.4" >> /etc/resolv.conf'
```

### Option 2: Restart WSL2 Network
From Windows PowerShell (as Administrator):
```powershell
wsl --shutdown
# Then restart your WSL2 terminal
```

### Option 3: Use Windows Host Network
If the above doesn't work, you can try using Windows' DNS:
```bash
# Get Windows host IP
cat /etc/resolv.conf | grep nameserver | awk '{print $2}' | head -1
# Use that IP as your DNS server
```

### Option 4: Test Connection
Test if you can reach Supabase:
```bash
curl -v https://oggywslgbubnrfdfnmbb.supabase.co
```

If this fails, it confirms a network issue.

## Alternative: Use Localhost Proxy
If network issues persist, you might need to:
1. Run the Next.js server on Windows instead of WSL2
2. Or set up a proxy through Windows

## Verify Fix
After applying a fix, test the connection:
```bash
curl -I https://oggywslgbubnrfdfnmbb.supabase.co
```

You should see HTTP 200 or 301/302 responses, not connection errors.



# Infra Runbook — tst environment

## First-time VPS setup

1. Provision a Hetzner CX21 (Ubuntu 22.04, Falkenstein region).
2. SSH in as root and run the bootstrap script:
   ```bash
   bash scripts/bootstrap-vps.sh
   ```
3. Add the `deploy` user's SSH public key:
   ```bash
   mkdir -p /home/deploy/.ssh
   echo 'YOUR_ED25519_PUBLIC_KEY' >> /home/deploy/.ssh/authorized_keys
   chown -R deploy:deploy /home/deploy/.ssh
   chmod 700 /home/deploy/.ssh && chmod 600 /home/deploy/.ssh/authorized_keys
   ```
4. Copy infra files to the VPS:
   ```bash
   scp infra/docker-compose.tst.yml infra/Caddyfile infra/Dockerfile.pocketbase deploy@<vps-ip>:/srv/amg/
   scp scripts/deploy-tst.sh deploy@<vps-ip>:/home/deploy/
   ssh deploy@<vps-ip> chmod +x /home/deploy/deploy-tst.sh
   ```
5. Create `/srv/amg/.env.tst` from the example template and fill in real values:
   ```bash
   scp infra/.env.tst.example deploy@<vps-ip>:/srv/amg/.env.tst
   ssh deploy@<vps-ip> nano /srv/amg/.env.tst
   ```
6. Run the first deploy:
   ```bash
   ssh deploy@<vps-ip> /home/deploy/deploy-tst.sh tst
   ```

## DNS configuration

Register your domain at any registrar. Create an A record:

```
tst.yourdomain.com  →  <vps-ip-address>
```

DNS propagation can take 5–30 minutes. Caddy will automatically request a Let's Encrypt certificate once the domain resolves to the VPS IP. No manual cert steps required.

## Secrets rotation

1. Update the value in `/srv/amg/.env.tst` on the VPS:
   ```bash
   ssh deploy@<vps-ip> nano /srv/amg/.env.tst
   ```
2. Restart only the app container to pick up the new value:
   ```bash
   ssh deploy@<vps-ip> "cd /srv/amg && docker compose -f docker-compose.tst.yml restart app"
   ```
3. For deploy SSH key rotation: generate a new Ed25519 key pair, update `TST_SSH_KEY` in GitHub Actions secrets, add the new public key to the VPS, then remove the old one from `/home/deploy/.ssh/authorized_keys`.

## Rollback

Rollback to a previous immutable image tag (visible in GHCR):

```bash
ssh deploy@<vps-ip> "cd /srv/amg && IMAGE_TAG=sha-<prev-sha> docker compose -f docker-compose.tst.yml up -d app"
```

The previous image must still exist in GHCR (images are pruned after 7 days via `deploy-tst.sh`).

## Disaster recovery (rebuild from scratch)

1. Provision a new Hetzner CX21.
2. Run `bootstrap-vps.sh` (see First-time VPS setup above).
3. Restore `pb_data` from backup if available (for `tst` this volume is intentionally ephemeral — skip if demo data loss is acceptable).
4. Re-copy infra files and `.env.tst` to `/srv/amg/`.
5. Run `deploy-tst.sh tst` or use any `sha-<commit>` tag from GHCR.
6. Update DNS A record to the new VPS IP.

## Common issues

**Caddy returns `no certificate` or ACME error**
- Verify DNS A record resolves to VPS IP: `dig tst.yourdomain.com +short`
- Ensure ports 80 and 443 are open in the Hetzner firewall.

**Health check fails after deploy**
- Check app logs: `ssh deploy@<vps-ip> "cd /srv/amg && docker compose -f docker-compose.tst.yml logs app --tail 50"`
- Verify `.env.tst` has all required variables.

**PocketBase admin UI not reachable**
- By design — it is blocked by Caddy. Access via SSH tunnel:
  ```bash
  ssh -L 8090:localhost:8090 deploy@<vps-ip>
  ```
  Then open `http://localhost:8090/_/` in your browser.

**Container restarts in a loop**
- Run `docker compose -f docker-compose.tst.yml logs --tail 100` to read error output.

# Production security baseline

This document records the security boundary agreed for the local-network
production deployment of the Lumber Tally Dashboard. It separates controls
enforced by this repository from controls configured by the deployment owner in
TrueNAS and the site network.

## Request path and trust boundary

```text
Authorized LAN device -- HTTP by IP --> nginx -- HTTP(S) --> Bronze API
```

The dashboard is available only on the intended local network. It has no public
DNS record, Internet ingress, port forwarding, Cloudflare Tunnel, or
application-owned user accounts. Access to the permitted network is the
authorization boundary: anyone who can connect to the dashboard IP and port can
read the dashboard.

Plain HTTP by IP is accepted for this deployment. Consequently, traffic is not
encrypted between the browser and nginx, and the browser cannot verify the
server's identity. Do not extend this design to guest Wi-Fi, an untrusted VLAN,
or the public Internet. A trusted HTTPS certificate or authenticated reverse
proxy is required if the network boundary changes.

## Repository-enforced controls

- The final image contains static assets and an unprivileged nginx process, not
  the Node.js build toolchain.
- nginx sends a restrictive content security policy, clickjacking protection,
  content-type protection, referrer policy, and permissions policy.
- `/api/` accepts only `GET` and `HEAD`; write methods return HTTP 405.
- `/api/` responses are marked `Cache-Control: no-store`.
- Authorization and Cookie request headers are removed before a request is
  forwarded to the Bronze API.
- The service worker bypasses `/api/` and caches only the application shell.
- All profiles keep API and fixture rows only in memory. On startup the client
  deletes every mill-specific IndexedDB database left by older releases.
- The Compose example publishes the selected dashboard port for LAN access.
- Compose requires an explicit image reference; production uses a tested commit
  tag or registry digest rather than `latest`.

## Deployment-owner controls

The deployment owner is responsible for configuring and verifying:

- no router port forwarding, public ingress, or exposure from a guest or
  otherwise untrusted network;
- a TrueNAS firewall or VLAN rule limiting the dashboard port to the intended
  business LAN;
- a fixed TrueNAS address or local DNS reservation so the dashboard location is
  stable;
- an API origin reachable from the dashboard container but not exposed to an
  unnecessary network;
- a pinned dashboard image release or digest;
- TrueNAS accounts, container configuration, log rotation, time synchronization,
  monitoring, updates, backups, and rollback.

If per-user identity, revocation, or access auditing becomes a requirement,
network-only authorization is insufficient. Add an authenticated reverse proxy
before making the dashboard available to a broader network.

## Production acceptance checks

Before release, verify all of the following:

1. An intended LAN workstation can load the dashboard using the TrueNAS IP and
   configured dashboard port.
2. A device on guest Wi-Fi or another unapproved VLAN cannot connect.
3. The router has no port-forwarding rule for the dashboard port.
4. `/api/bronze/tables` returns data and includes
   `Cache-Control: no-store`.
5. `POST`, `PUT`, `PATCH`, and `DELETE` requests below `/api/` return 405 and do
   not reach the Bronze service.
6. Browser developer tools show no mill database named
   `lumber-tally-dashboard-<mill>` after a production load and reload.
7. Cache Storage contains no `/api/` responses. Service-worker/PWA features may
   be unavailable because an HTTP IP address is not a browser secure context.
8. With the API available, `/readyz` succeeds and Docker reports the container
   healthy. With nginx still running but the API stopped, `/healthz` succeeds,
   `/readyz` fails, and Docker reports the container unhealthy.
9. Container restart, update, and rollback procedures succeed.

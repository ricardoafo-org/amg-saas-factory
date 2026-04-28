# Inner pro Caddy. HTTP-only (port 80) while pro is fronted by the shared
# edge router on the tst VPS (FEAT-057 fake-pro). TLS terminates at the edge
# (Caddyfile.edge); this caddy is reached via the `amg_edge` docker network
# using the `pro-caddy` alias.
#
# When pro moves to its own VPS, revert this to `{$PRO_DOMAIN} {` and re-add
# `ports: 80/443` in docker-compose.pro.yml.

{
    auto_https off
    servers {
        trusted_proxies static private_ranges
    }
}

:80 {
    encode zstd gzip

    # PocketBase admin UI is NEVER publicly reachable on pro.
    # Must come BEFORE handle_path /pb/* — handle blocks are mutually exclusive
    # in Caddy v2: first match wins.
    handle /pb/_* {
        respond 404
    }

    # Proxy /pb/* to PocketBase (for client-side API calls only).
    handle_path /pb/* {
        reverse_proxy pocketbase:8090
    }

    # Everything else to Next.js.
    handle {
        reverse_proxy app:3000 {
            header_up X-Forwarded-Proto {scheme}
            header_up X-Real-IP {remote_host}
        }
    }

    # Access logging — method + path + status only, no bodies, no headers.
    log {
        output stdout
        format console
        level INFO
    }
}

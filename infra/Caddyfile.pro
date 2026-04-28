{$PRO_DOMAIN} {
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

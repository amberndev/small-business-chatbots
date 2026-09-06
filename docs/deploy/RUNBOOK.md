# Deployment runbook

Deployment target: `root@5.189.146.5` with DNS `chatbots.ambern.dev -> 5.189.146.5`.

## Application

1. Clone or update the public repository and branch:
   `git clone --branch feature/three-chatbot-portfolio-case https://github.com/amberndev/small-business-chatbots.git /var/www/small-business-chatbots`
2. Install dependencies with `npm ci` and run `npm run build`.
3. The server-side environment accepts these variable names only: `OPENROUTER_API_KEY`, `OPENROUTER_MODEL`, `OPENROUTER_SITE_URL`, `OPENROUTER_APP_NAME`, and `DATABASE_URL`. No values are recorded in this document.
4. The application was packaged as `ambern-small-business-chatbots:latest` using a Node 22 Alpine image. The container runs as `chatbots-app` on the `mailcowdockerized_mailcow-network` Docker network, with `--restart unless-stopped`, exposing port 3000 internally.

## Proxy and TLS

5. Mailcow's existing Nginx container remains the public listener on ports 80 and 443. Its custom `ambern.conf` contains an HTTP server for `chatbots.ambern.dev` that redirects to HTTPS and an HTTPS server that proxies to `http://chatbots-app:3000`.
6. Security headers include `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, and `Referrer-Policy: strict-origin-when-cross-origin`.
7. A Let's Encrypt certificate was issued with Certbot's webroot challenge and copied into Mailcow's mounted SSL directory as `chatbots-cert.pem` and `chatbots-key.pem`; the private key is not stored in Git. Certbot's renewal timer is enabled. Reload the Mailcow Nginx container after renewal if the container does not pick up the renewed certificate automatically.

## Verification

8. `docker ps` reports `chatbots-app` running; `docker inspect chatbots-app` confirms the restart policy and network.
9. The following public routes returned HTTP 200: `/selected-work/small-business-chatbots`, `/demos/dental-chatbot`, `/demos/real-estate-chatbot`, and `/demos/home-services-chatbot`.
10. `POST /api/chat` with a consented fictional Dental greeting returned a valid `ChatResponse` and `demoMode: true` because no OpenRouter key is configured. No real or sensitive values were submitted.

The previous VPS `5.189.148.196` was not modified. The old host deployment on `5.189.146.5` was replaced by the Docker deployment described above; the public site and mailcow services remain in place.

# Deployment runbook

Deployment target: `root@5.189.146.5` with DNS `chatbots.ambern.dev -> 5.189.146.5`.

## Application

1. Clone or update the public repository and branch:
   `git clone --branch feature/three-chatbot-portfolio-case https://github.com/amberndev/small-business-chatbots.git /var/www/small-business-chatbots`
2. Install dependencies with `npm ci` and run `npm run build`.
3. Configure `OPENROUTER_API_KEY`, `OPENROUTER_MODEL`, `OPENROUTER_SITE_URL`, `OPENROUTER_APP_NAME`, and `DATABASE_URL` as needed. `APP_ORIGIN` sets the public browser origin (defaults to `https://chatbots.ambern.dev`); set it for other deployments so HTTPS requests remain valid behind the internal HTTP proxy. No secret values are recorded in this document.
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

## Origin and banner fix (2026-09-06)

- Active container `chatbots-app` runs image `ambern-small-business-chatbots:origin-fix`; the stopped previous container is retained as `chatbots-app-before-origin-fix` for rollback.
- Docker is installed through Snap: build from `/root/chatbots-origin-fix`, since `/var/www` is not visible to the confined Docker client. The source under `/var/www/small-business-chatbots` was also updated.
- Existing environment variables, Docker network and restart policy were preserved. Nginx configuration validation passed and Nginx was reloaded after the container replacement.
- All four public pages returned HTTP 200. A public HTTPS API conversation with the browser Origin header reached `completed`; an unrelated Origin returned HTTP 403.
- A Chromium browser completed the Dental booking flow through the confirmation button. The banner computed background was `rgb(251, 248, 241)` (`#fbf8f1`, matching ambern.dev), and the page had no horizontal overflow at 375px width.

## Calendar and request experience (2026-09-06)

- Active image: `ambern-small-business-chatbots:calendar`; rollback container: `chatbots-app-before-calendar`. Build context: `/root/chatbots-calendar`.
- Server-generated sample availability covers the next 45 days in `Australia/Sydney`. Past dates, closed days and unavailable times are rejected server-side; availability is revalidated on confirmation. This is fictional capacity, not live inventory, and confirming does not reserve a slot.
- Added month navigation, time selection, request progress, date/time editing preserving contact fields, keyboard-accessible history and responsive presentation.
- Verification: 68 unit/integration tests, 10 desktop/mobile E2E tests, plus 2 targeted calendar accessibility and rescheduling E2E checks passed. Typecheck and production build passed; lint reported only three existing logo image warnings.
- Public API verified the calendar, rejection of a blocked time and final confirmation. Public Chromium verified date selection, rescheduling and confirmation, with no horizontal overflow at 375px. All four public pages returned HTTP 200.

## Property catalogue experience (2026-09-06)

- Active image: `ambern-small-business-chatbots:properties`; rollback container: `chatbots-app-before-properties`; build context: `/root/chatbots-properties`.
- Harbor Homes now presents Riverside Gardens, a fictional neighbourhood catalogue with six homes: sale, rental, sold and rented statuses, illustrative photos, map pins, bedroom and price filters, and an average available price/rent.
- Selecting an available home prepares a simulated viewing request in the chatbot and includes the property ID, address and illustrative price in the review. Sold, rented and unknown property IDs are rejected server-side.
- No external maps, geolocation, listing feed, market data or real booking integration is used. All properties, prices, photos and locations are marked as fictional or illustrative.
- Verification: 73 unit/integration tests and 12 desktop/mobile E2E tests passed. Public checks confirmed the Harbor Homes heading, three sale cards, three rental cards and no horizontal overflow. All four public routes returned HTTP 200 after deployment.

## USD and property film polish (2026-09-06)

- Active image: `ambern-small-business-chatbots:properties2`; rollback container: `chatbots-app-before-properties2`.
- Property prices and filters now use USD (`USD 785,000`, rental prices shown as `USD … / week`).
- Requesting a demo viewing waits for the assistant section to render before scrolling, so the selected property and chatbot remain visible together. Public Chromium verified the assistant position after clicking the request button.
- Added muted, looping 4-second MP4 property films with poster fallbacks for the four illustrative home photographs. Videos are presentation previews only and are documented in `public/properties/CREDITS.md`.
- Public Chromium verified the USD label, video source `/properties/willow.mp4`, successful scroll to the assistant and HTTP 200 pages. Existing lint output remains four non-blocking Next image warnings.

## Viewing panel scroll fix (2026-09-06)

- Active image: `ambern-small-business-chatbots:properties6`; rollback container: `chatbots-app-before-mobile-panel`.
- Clicking “Request a demo viewing” now scrolls directly to the chatbot after the selected-property state renders. The initial property chat hides redundant quick replies and uses a compact message history; the calendar expands when “Start this viewing request” is selected.
- Public browser verification: chatbot top at approximately 100px below the sticky notice, height 612px on desktop (720px viewport) and 566px on mobile (667px viewport), so the initial panel fits without manual scrolling. Public pages returned HTTP 200.

## Contact conversion block (2026-09-06)

- Active image: `ambern-small-business-chatbots:contact3`; rollback container: `chatbots-app-before-contact-form3`.
- Replaced the indicative AUD estimate block with a contact form addressed to `vinicius@ambern.dev`, plus a WhatsApp link to `+55 53 98106 2741` in the section and footer.
- The form uses `mailto:` to open the visitor's email app with the entered fictional details. No SMTP or server-side email provider is configured.
- Verification: 73 unit/integration tests, typecheck, four public route HTTP 200 checks, and public Chromium selectors for the contact heading, email link and WhatsApp links.

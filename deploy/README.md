# Deploy the Orvo storefront

The storefront runs as the `orvo-web` Compose project on `127.0.0.1:3602`.
Nginx serves `orvo.bd` and `www.orvo.bd`. The storefront calls Orvo's ERP on the
same host at `http://127.0.0.1:3503`. Product images come from `https://erp.orvo.bd`.

1. Clone `https://github.com/itsxifat/orvo.git` to `/srv/orvo-web`. Use the `main`
   branch and pull with `git pull --ff-only` for updates.
2. Create or update `/etc/orvo-web/web.env` with mode `0600`. Use
   [the env example](../.env.local.example) for the variable names. Set the site
   key and secret issued in ERP → Website → Connection and generate a separate
   `NEXTAUTH_SECRET`. Keep the env file outside the checkout.
3. From `/srv/orvo-web`, build and start the site.

   ```sh
   sudo docker compose -f deploy/compose.yml --env-file /etc/orvo-web/web.env up -d --build
   curl -fsS 'http://127.0.0.1:3602/api/health?erp=1'
   ```

   The health check should return `{"ok":true,"erp":"ok"}`.

4. For the first deploy, install the Nginx config and issue a certificate after
   the DNS records point to the server.

   ```sh
   sudo install -m 644 docs/nginx-tracking.conf /etc/nginx/snippets/orvo-tracking-proxy.conf
   sudo install -m 644 deploy/nginx/orvo.bd.conf /etc/nginx/sites-available/orvo.bd.conf
   sudo ln -s /etc/nginx/sites-available/orvo.bd.conf /etc/nginx/sites-enabled/orvo.bd.conf
   sudo nginx -t && sudo systemctl reload nginx
   sudo certbot --nginx -d orvo.bd -d www.orvo.bd --redirect
   ```

5. Check the homepage, shop and `/api/health?erp=1` over HTTPS.
   `https://orvo.bd/admin` redirects staff to `https://erp.orvo.bd/`.

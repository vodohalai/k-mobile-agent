# K-Mobile Agent Setup

## 1. Login to Cloudflare
```bash
npx wrangler login
```

## 2. Create Resources

### KV Namespace (Session Store)
```bash
npx wrangler kv namespace create k-mobile-sessions
```
*Copy the `id` from the output and update `wrangler.toml` (`SESSION_STORE` id).*

### D1 Database (App DB)
```bash
npx wrangler d1 create k-mobile-db
```
*Copy the `database_id` from the output and update `wrangler.toml` (`APP_DB` database_id).*

### Vectorize Index (Document Index)
```bash
npx wrangler vectorize create k-mobile-index --dimensions=768 --metric=cosine
```
*No need to update `wrangler.toml` if the name matches `k-mobile-index`.*

## 3. Configure Facebook Messenger
1. Go to [Meta for Developers](https://developers.facebook.com/).
2. Create an App and setup **Messenger**.
3. Generate a **Page Access Token**.
4. Update `wrangler.toml`:
   - `FB_PAGE_ACCESS_TOKEN`: Paste your generated token.
   - `FB_VERIFY_TOKEN`: Set a secure string (e.g., "my_secure_verify_token").
   - `OPENAI_API_KEY`: Your OpenAI API Key.
   - `GEMINI_API_KEY`: Your Google Gemini API Key.
   - `SYSTEM_PROMPT`: Custom system prompt for the AI.
5. Setup Webhook:
   - Callback URL: `https://k-mobile-agent.vodohalai170293.workers.dev/webhook`
   - Verify Token: The value you set for `FB_VERIFY_TOKEN`.

## 4. Deploy
```bash
npm run deploy
```

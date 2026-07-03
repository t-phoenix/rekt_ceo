# Frontend Integration Guide for Rekt Automations API

This helper document is designed for frontend developers and AI agents building UIs on top of the Rekt Automations FastAPI backend. It outlines all available endpoints, required requests, query parameters, and highly customizable payload configurations to leverage the full functionality of the backend graph seamlessly.

## 🚀 Base Configuration

- **Base URL:** `http://localhost:8000/api` (or your production domain)
- **CORS:** Enabled for all (`*`) by default, so you can call directly from browser frameworks like React, Next.js, or Vue.
- **Swagger Docs:** Interactive documentation is always accessible at `http://localhost:8000/docs`

---

## 📊 1. Data Retrieval Endpoints

Use these endpoints to build dashboards tracking automations, status, and generated outputs dynamically from Supabase. All data endpoints are fetched synchronously.

### **Fetch Automation Runs**
Retrieves the history of all pipeline runs. Use this to poll the `status` of an ongoing workflow.

* **Endpoint:** `GET /data/runs`
* **Query Parameters:**
  * `status` *(string, optional)*: Filter by current status (e.g. "running", "text_complete", "meme_complete")
  * `start_date` *(string, optional)*: ISO datetime string
  * `end_date` *(string, optional)*: ISO datetime string
  * `limit` *(int, default=50)*: Maximum number of runs to return
  * `latest` *(bool, default=false)*: Returns only the single absolute latest run if true

### **Fetch Table Outputs**
Dynamic router to pull data from any completed node's resulting table.

* **Endpoint:** `GET /data/{table_name}`
* **Path Variables:**
  * `table_name`: One of:
    * `rekt_meme_automation_runs`
    * `rekt_meme_content_generations`
    * `rekt_meme_trend_research`
    * `rekt_meme_generations`
    * `rekt_meme_twitter_engagement`
    * `rekt_competition_research`
    * `rekt_kol_research`
* **Query Parameters:** 
  * `start_date`, `end_date`, `limit`, `latest` (same as `/data/runs`)

---

## 🤖 2. Triggering Workflows (Async)

These endpoints run heavily customizable LangGraph operations. Because they perform LLM calls and network scraping, they operate via **FastAPI BackgroundTasks**.

**All workflow endpoints return:**
```json
{
  "message": "Workflow started successfully",
  "run_id": "run_2026xxxx_xxxx_xxxx"
}
```
*You should use the returned `run_id` to poll `GET /data/runs` for completion status and output linking!*

### **1. Trend Research Flow**
* **Endpoint:** `POST /workflows/trend-research`
* **Payload Config (JSON):**
  * `limit` *(int, default=5)*: Number of trends to fetch/process. Expose this via a slider on the UI.
  * `timeframe` *(string, default="7d")*: Custom timeframe string.
  * `custom_keywords` *(array of strings, optional)*: High weightage. Injects explicit hashtags to force consideration (e.g. `["$REKT", "memecoin"]`).
  * `platforms` *(array of strings, optional)*: e.g. `["twitter"]`.

### **2. KOL Discovery & Research Flow**
* **Endpoint:** `POST /workflows/kol-research`
* **Payload Config (JSON):**
  * `target_niche` *(string, optional)*: Overrides the default "tech/web3" niche to something extremely specific (e.g. "pumpfun degens", "AI agents").
  * `min_followers` *(int, optional)*: Sets lower bound threshold.
  * `max_followers` *(int, optional)*: Sets upper bound ceiling for engagement authenticity filtering.
  * `platforms` *(array of strings, optional)*.

### **3. Competition Research Flow**
* **Endpoint:** `POST /workflows/competition-research`
* **Payload Config (JSON):**
  * `competitor_handles` *(array of strings, optional)*: Expose an input for users to manually type handles (e.g., `["@elonmusk", "@another_brand"]`), bypassing database configurations. 
  * `analysis_depth` *(string, default="basic")*: Allowed values are `"basic"` or `"deep"`. Use a toggle button on the UI.

### **4. Text Content Generation Flow**
* **Endpoint:** `POST /workflows/text-content`
* **Payload Config (JSON):**
  * `business_context` *(string, optional)*: A large textarea. Appends manual user knowledge instantly to the RAG database to dictate exactly what the post will be about.
  * `tone` *(string, optional)*: e.g., "savage", "edgy", "professional", "informative". Extremely high weightage for adjusting LLM prompt voices.
  * `platforms` *(array of strings, optional)*: Restricts outputs to e.g., `["twitter", "linkedin"]`.

### **5. Meme Generation Flow**
* **Endpoint:** `POST /workflows/meme-generation`
* **Payload Config (JSON):**
  * `theme` *(string, optional)*: A specific topic prompt (e.g. "when the dev rugs").
  * `tone` *(string, optional)*: Humor style.
  * `template_preference` *(string, optional)*: This is a powerful feature for the UI. Offer users a dropdown of known template categories (e.g., "reaction_memes", "success_failure"). It forces the LLM to skip its own discovery and use this template aesthetic.
  * `platforms` *(array of strings, optional)*: Optimize image dimensions.

### **6. Twitter Engagement Flow**
* **Endpoint:** `POST /workflows/twitter-engagement`
* **Payload Config (JSON):**
  * `target_accounts` *(array of strings, optional)*: Scopes recent engagements EXCLUSIVELY to these provided accounts if set, overriding standard API scraping.
  * `reply_tone` *(string, optional)*: Adjusts the internal Rekt CEO persona (e.g. "supportive", "grim reaper").

### **7. Animation Flow** *(Future Proofing)*
* **Endpoint:** `POST /workflows/animation`
* **Payload Config (JSON):**
  * `prompt` *(string, optional)*: Explicit text constraint for the animation engine.
  * `style` *(string, default="auto")*: Can be set manually by dropdown (`"blink"`, `"bounce"`, `"shake"`, `"glow"`, `"zoom"`, `"none"`).

---

## 🎨 Frontend Implementation Example

Here is a recommended setup flow in a modern framework (like React):

1. **User configures a Custom Workflow** via forms mapping to the payloads above.
2. **Hit the corresponding `POST /workflows/...`** endpoint with the JSON payload.
   ```javascript
   const res = await fetch("http://localhost:8000/api/workflows/meme-generation", {
     method: "POST",
     headers: {"Content-Type": "application/json"},
     body: JSON.stringify({
       template_preference: "reaction_memes",
       tone: "edgy",
       theme: "AI agents copying my code"
     })
   });
   const { run_id } = await res.json();
   ```
3. **Poll for completion** using `GET /data/runs?latest=true&limit=1` to check if `status` changes from `"running"` to the appropriate completed state.
4. **Display results** by pulling from the specific table, e.g. `GET /data/rekt_meme_generations?latest=true`.

---

## 🗄️ 3. Database Schema Reference

When you query `GET /data/{table_name}`, the backend returns an array of JSON objects matching the structural columns of that Supabase table. Below is what you can expect to find inside the data rows for rendering beautiful frontend dashboards.

### `rekt_meme_automation_runs`
The master tracking table for all workflow executions.
* **`id`** *(uuid)*: The `run_id` returned by every async workflow trigger.
* **`status`** *(string)*: e.g., `"running"`, `"trend_complete"`, `"text_complete"`, `"meme_complete"`, etc.
* **`configuration`** *(jsonb)*: The exact snapshot of parameters sent in the API payload or CLI.
* **`created_at`** *(timestamp)*

### `rekt_meme_content_generations` (Text Flow)
* **`run_id`** *(uuid)*: Foreign key.
* **`platforms`** *(string array)*: Which platforms are included below.
* **`trends_data`** *(jsonb)*: Includes `selected_topic`, `relevance_score`, `analysis`.
* **`business_context`** *(jsonb)*: The context provided to the LLM.
* **`generated_text`** *(jsonb)*: The actual outputs! Shaped `{ "twitter": { "post": "...", "hashtags": [...] }, "instagram": { "caption": "..." } }`.

### `rekt_meme_generations` (Meme Flow)
* **`run_id`** *(uuid)*: Foreign key.
* **`sentiment`** *(string)*: The vibe analyzed from the text (e.g., `joy`, `triumph`).
* **`template_used`** *(string)*: Exact image filename of the chosen meme format.
* **`meme_text`** *(jsonb)*: Shaped `{ "top_text": "...", "bottom_text": "..." }`.
* **`image_storage_path`** *(string)*: The relative path in the `rekt_media` Supabase Storage bucket to fetch the actual image URL.

### `rekt_meme_trend_research` (Trend Flow)
* **`run_id`** *(uuid)*: Foreign key.
* **`timeframe`** *(string)*: E.g., `"7d"`.
* **`topics`** *(jsonb)*: An array of detailed trend objects (`[{"topic": "...", "momentum": 0.8, "tweet_volume": 42069, ...}, ...]`)

### `rekt_kol_research` (KOL Flow)
* **`run_id`** *(uuid)*: Foreign key.
* **`target_criteria`** *(jsonb)*: The niches and keywords searched.
* **`identified_kols`** *(jsonb)*: Rich array of influencers. E.g., `[{"handle": "rektceo", "followers": 100000, "compatibility_score": 95, "alignment_reasoning": "..."}, ...]`.
* **`engagement_plans`** *(jsonb)*: The LLM-drafted custom reply strategies ready to copy-paste.

### `rekt_competition_research` (Competition Flow)
* **`run_id`** *(uuid)*: Foreign key.
* **`competitors`** *(string array)*: E.g., `["@blknoiz06", "@keyboardmonkey3"]`
* **`intermediary_metadata`** *(jsonb)*: Raw tweets scraped.
* **`processed_data`** *(jsonb)*: Ranked lists of top performing posts.
* **`result_output`** *(jsonb)*: The extracted 'Alpha' strategy. Includes `high_level_summary`, `top_hooks`, `tone_analysis`.

### `rekt_meme_twitter_engagement` (Engagement Flow)
* **`run_id`** *(uuid)*: Foreign key.
* **`session_metadata`** *(jsonb)*: High level stats (tweets found, average likes).
* **`scraped_tweets`** *(jsonb)*: The raw list of trending crypto queries.
* **`scored_tweets`** *(jsonb)*: Ranked via "Rekt Alignment".
* **`suggested_replies`** *(jsonb)*: Actionable, drafted savage responses with a `reply_strategy` breakdown. Can be sent directly to X/Twitter APIs via the UI!

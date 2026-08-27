# Advanced Brandification API - Frontend Integration Guide

This document outlines how to integrate the advanced, agent-based brandification pipeline into the main Rekt CEO website frontend.

## The Architecture

The advanced pipeline runs in three phases:
1. **Vision Strategy**: A Vision LLM (GPT-4o) analyzes the user's uploaded image and decides *what* and *how* to brandify (e.g. adding a monogram to a t-shirt, or a neon sign to a wall).
2. **Human-in-the-Loop (HITL) Review**: The frontend displays the AI's proposed strategy to the user so they can approve or modify it.
3. **Execution**: The chosen strategy is sent to an inpainting model (StableStudio GPT Image 2) to render the final image without destroying the original meme's layout or style.

## Recommended Frontend Flow

### 1. Upload & Analysis
When a user uploads an image on the frontend, upload it to the backend server. The backend will:
- Save the image to Vercel Blob (or AWS S3).
- Call the Vision Agent to generate the strategy.

**Backend Endpoint Example:** `POST /api/brandify/analyze`
**Request Body:** FormData with the image file.
**Response:**
```json
{
  "imageUrl": "https://vercel.blob.core.windows.net/.../image.jpg",
  "strategy": {
    "target_element": "The character's t-shirt",
    "reasoning": "The t-shirt is a large, blank canvas perfect for a high-fashion Rekt CEO monogram.",
    "inpaint_prompt": "Replace the t-shirt with a high-fashion black and white monogram pattern featuring the words REKT CEO..."
  }
}
```

### 2. The HITL Review UI (The "Dashboard")
Present a small dashboard to the user. This makes them feel like a "Creative Director".
- Display the original `imageUrl`.
- Display the proposed `target_element` and `reasoning`.
- **User Action:** Provide an "Approve" button, and an optional text input: "Any specific tweaks? (e.g., 'make the pattern neon instead')".

### 3. Execution & Generation
Once the user approves the strategy, send the final prompt to the execution endpoint.

**Backend Endpoint Example:** `POST /api/brandify/generate`
**Request Body:**
```json
{
  "imageUrl": "https://vercel.blob.core.windows.net/.../image.jpg",
  "finalPrompt": "Replace the t-shirt with a high-fashion black and white monogram pattern featuring the words REKT CEO... Ensure the rest of the original meme remains 100% untouched. DO NOT alter the original art style."
}
```
**Response:**
```json
{
  "jobId": "job_123456",
  "pollUrl": "https://stablestudio.dev/api/jobs/job_123456"
}
```

### 4. Polling & Result
Since generation takes 10-60 seconds, the frontend should poll the backend (which in turn polls `pollUrl`) every 5-10 seconds.
- Show a cool "Agent at work..." loading animation.
- Once complete, display the final branded image.

## Considerations for Implementation
- **Vercel Functions timeout:** If using Next.js/Vercel serverless functions, the polling phase must be handled carefully to avoid the 10-second serverless timeout. It is recommended to have the frontend poll a status endpoint rather than keeping a single HTTP connection open.
- **Cost:** Each generation costs ~$0.30 - $0.50. You may want to gate this feature behind a login or token holding requirement.

const DEFAULT_DEV_URL = 'http://localhost:8000/api'

function resolveWorkflowsApiUrl(): string {
  const configured = import.meta.env.VITE_WORKFLOWS_API_URL?.trim()
  if (configured) {
    return configured.replace(/\/$/, '')
  }
  if (import.meta.env.PROD) {
    return ''
  }
  return DEFAULT_DEV_URL
}

export const WORKFLOWS_API_URL = resolveWorkflowsApiUrl()

export function getWorkflowsApiMisconfigurationMessage(): string | null {
  if (WORKFLOWS_API_URL) return null
  return (
    'Workflows API URL is not configured. Set VITE_WORKFLOWS_API_URL on the admin ' +
    'deploy (e.g. https://your-automations-service.onrender.com/api) and redeploy. ' +
    'This is separate from VITE_API_URL and from the meme text API at rekt-automations.'
  )
}

function assertWorkflowsApiConfigured() {
  const message = getWorkflowsApiMisconfigurationMessage()
  if (message) throw new Error(message)
}

export interface WorkflowRun {
    id: string
    status: string
    configuration: any
    created_at: string
}

export const workflowsApi = {
    async getRuns(params?: { status?: string, limit?: number, latest?: boolean }): Promise<WorkflowRun[]> {
        assertWorkflowsApiConfigured()
        const url = new URL(`${WORKFLOWS_API_URL}/data/runs`)
        if (params) {
            Object.entries(params).forEach(([key, value]) => {
                if (value !== undefined) {
                    url.searchParams.append(key, value.toString())
                }
            })
        }
        const res = await fetch(url.toString())
        if (!res.ok) throw new Error('Failed to fetch runs')
        const data = await res.json()
        if (data && Array.isArray(data.data)) return data.data
        if (Array.isArray(data)) return data
        return []
    },

    async getTableData(tableName: string, params?: { limit?: number, latest?: boolean }): Promise<any[]> {
        assertWorkflowsApiConfigured()
        const url = new URL(`${WORKFLOWS_API_URL}/data/${tableName}`)
        if (params) {
            Object.entries(params).forEach(([key, value]) => {
                if (value !== undefined) {
                    url.searchParams.append(key, value.toString())
                }
            })
        }
        const res = await fetch(url.toString())
        if (!res.ok) throw new Error(`Failed to fetch data for ${tableName}`)
        const data = await res.json()
        if (data && Array.isArray(data.data)) return data.data
        if (Array.isArray(data)) return data
        return []
    },

    async triggerWorkflow(endpoint: string, payload: any): Promise<{ message: string, run_id: string }> {
        assertWorkflowsApiConfigured()
        const url = new URL(`${WORKFLOWS_API_URL}/workflows/${endpoint}`)
        const res = await fetch(url.toString(), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })
        if (!res.ok) {
            const err = await res.json().catch(() => ({}))
            throw new Error(err.detail || err.message || `Failed to trigger ${endpoint} workflow`)
        }
        return await res.json()
    }
}

import { useState, useEffect, useCallback } from 'react'
import { workflowsApi, type WorkflowRun } from '../services/workflowsApi'

export type TableName =
    | 'rekt_meme_automation_runs'
    | 'rekt_meme_content_generations'
    | 'rekt_meme_trend_research'
    | 'rekt_meme_generations'
    | 'rekt_meme_twitter_engagement'
    | 'rekt_competition_research'
    | 'rekt_kol_research'

interface UseWorkflowsDataReturn {
    runs: WorkflowRun[]
    tableData: any[]
    isLoadingRuns: boolean
    isLoadingTable: boolean
    error: Error | null
    fetchRuns: () => Promise<void>
    fetchTableData: (tableName: TableName) => Promise<void>
    activeTable: TableName | null
}

export function useWorkflows(): UseWorkflowsDataReturn {
    const [runs, setRuns] = useState<WorkflowRun[]>([])
    const [tableData, setTableData] = useState<any[]>([])
    const [activeTable, setActiveTable] = useState<TableName | null>(null)

    const [isLoadingRuns, setIsLoadingRuns] = useState(false)
    const [isLoadingTable, setIsLoadingTable] = useState(false)
    const [error, setError] = useState<Error | null>(null)

    const fetchRuns = useCallback(async () => {
        setIsLoadingRuns(true)
        setError(null)
        try {
            const data = await workflowsApi.getRuns({ limit: 50 })
            setRuns(data)
        } catch (err) {
            setError(err instanceof Error ? err : new Error('Failed to fetch runs'))
        } finally {
            setIsLoadingRuns(false)
        }
    }, [])

    const fetchTableData = useCallback(async (tableName: TableName) => {
        setIsLoadingTable(true)
        setError(null)
        setActiveTable(tableName)
        try {
            const data = await workflowsApi.getTableData(tableName, { limit: 50 })
            setTableData(data)
        } catch (err) {
            setError(err instanceof Error ? err : new Error(`Failed to fetch ${tableName}`))
            setTableData([])
        } finally {
            setIsLoadingTable(false)
        }
    }, [])

    useEffect(() => {
        fetchRuns()
    }, [fetchRuns])

    return {
        runs,
        tableData,
        isLoadingRuns,
        isLoadingTable,
        error,
        fetchRuns,
        fetchTableData,
        activeTable
    }
}

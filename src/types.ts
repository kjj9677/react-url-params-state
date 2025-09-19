export type SingleType = 'string' | 'number' | 'boolean' | 'date'

export interface QueryparamTypeMap {
    string: string
    number: number
    boolean: boolean
    date: Date
    'string[]': string[]
    object: Record<string, unknown>
}

export type QueryParamType = keyof QueryparamTypeMap

export type QueryparamConfig = Record<string, QueryParamType>

export type QueryParamResult<T extends QueryparamConfig> = {
    [K in keyof T]?: QueryparamTypeMap[T[K]]
}

export type DefaultValues<T extends QueryparamConfig> = {
    [K in keyof T]?: QueryparamTypeMap[T[K]]
}

export type ValidationConfig<T extends QueryparamConfig> = {
    [K in keyof T]?: (value: QueryparamTypeMap[T[K]]) => boolean
}

export type CustomSerializers<T extends QueryparamConfig> = {
    [K in keyof T]?: {
        serialize: (value: QueryparamTypeMap[T[K]]) => string
        parse: (value: string) => QueryparamTypeMap[T[K]] | undefined
    }
}

export type HistoryMode = 'push' | 'replace'

export interface UseQueryParamsOptions<T extends QueryparamConfig> {
    sortKeys?: boolean
    defaultHistory?: HistoryMode
    defaultValues?: DefaultValues<T>
    validation?: ValidationConfig<T>
    customSerializers?: CustomSerializers<T>
    onError?: (error: Error, key: string, value: unknown) => void
}
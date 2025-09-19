'use client'

import { useCallback, useEffect, useState } from 'react'
import {
    SingleType,
    QueryparamTypeMap,
    QueryparamConfig,
    QueryParamResult,
    UseQueryParamsOptions,
    DefaultValues,
    ValidationConfig,
    CustomSerializers,
    HistoryMode
} from './types'

const isFiniteNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
const isStringArray = (v: unknown): v is string[] => Array.isArray(v) && v.every((x) => typeof x === 'string')

function typedKeys<T extends Record<string, unknown>>(o: T): (keyof T)[] {
    return Object.keys(o) as (keyof T)[]
}

function getSearchParams(): URLSearchParams {
    return new URLSearchParams(typeof window === 'undefined' ? '' : window.location.search)
}

function toSortedQueryString(sp: URLSearchParams): string {
    const entries = Array.from(sp.entries()).sort(([a], [b]) => a.localeCompare(b))
    return new URLSearchParams(entries).toString()
}

function shallowEqual<T>(a: T, b: T): boolean {
    if (a === b) {
        return true
    }
    if (!a || !b || typeof a !== 'object' || typeof b !== 'object') {
        return false
    }
    const aObj = a as Record<string, unknown>
    const bObj = b as Record<string, unknown>
    const aKeys = Object.keys(aObj)
    const bKeys = Object.keys(bObj)

    if (aKeys.length !== bKeys.length) {
        return false
    }

    return aKeys.every((k) => aObj[k] === bObj[k])
}

const v = {
    parseSingle<T extends SingleType>(
        value: string | null,
        type: T,
        customParser?: (value: string) => QueryparamTypeMap[T] | undefined,
        onError?: (error: Error, key: string, value: unknown) => void,
        key?: string,
    ): QueryparamTypeMap[T] | undefined {
        if (value == null) {
            return undefined
        }

        try {
            if (customParser) {
                return customParser(value)
            }

            switch (type) {
                case 'string':
                    return value as QueryparamTypeMap[T]
                case 'number': {
                    const n = Number(value)
                    if (!Number.isFinite(n)) {
                        throw new Error(`Invalid number: ${value}`)
                    }
                    return n as QueryparamTypeMap[T]
                }
                case 'boolean': {
                    if (['true', '1'].includes(value)) {
                        return true as QueryparamTypeMap[T]
                    }
                    if (['false', '0'].includes(value)) {
                        return false as QueryparamTypeMap[T]
                    }
                    throw new Error(`Invalid boolean: ${value}`)
                }
                case 'date': {
                    const date = new Date(value)
                    if (isNaN(date.getTime())) {
                        throw new Error(`Invalid date: ${value}`)
                    }
                    return date as QueryparamTypeMap[T]
                }
                default:
                    return undefined
            }
        } catch (error) {
            if (onError && key) {
                onError(error as Error, key, value)
            }
            return undefined
        }
    },

    serializeSingle<T extends SingleType>(
        value: unknown,
        type: T,
        customSerializer?: (value: QueryparamTypeMap[T]) => string,
        onError?: (error: Error, key: string, value: unknown) => void,
        key?: string,
    ): string | undefined {
        try {
            if (customSerializer) {
                return customSerializer(value as QueryparamTypeMap[T])
            }

            switch (type) {
                case 'string':
                    return typeof value === 'string' ? value : undefined
                case 'number':
                    return isFiniteNumber(value) ? String(value) : undefined
                case 'boolean':
                    return typeof value === 'boolean' ? (value ? 'true' : 'false') : undefined
                case 'date':
                    return value instanceof Date ? value.toISOString() : undefined
                default:
                    return undefined
            }
        } catch (error) {
            if (onError && key) {
                onError(error as Error, key, value)
            }
            return undefined
        }
    },

    parseObject(value: string | null): Record<string, unknown> | undefined {
        if (value == null) {
            return undefined
        }
        try {
            return JSON.parse(decodeURIComponent(value))
        } catch {
            return undefined
        }
    },

    serializeObject(value: unknown): string | undefined {
        try {
            return encodeURIComponent(JSON.stringify(value))
        } catch {
            return undefined
        }
    },
}

const pushStateEventManager = (() => {
    let subs: (() => void)[] = []
    return {
        notify: () => subs.forEach((cb) => cb()),
        addEventListener: (cb: () => void) => subs.push(cb),
        removeEventListener: (cb: () => void) => {
            subs = subs.filter((fn) => fn !== cb)
        },
    }
})()

let isHistoryPatched = false
let originalPushState: typeof history.pushState | null = null
let originalReplaceState: typeof history.replaceState | null = null
let patchCount = 0

function patchHistory() {
    if (isHistoryPatched || typeof window === 'undefined') {
        return
    }

    originalPushState = history.pushState
    originalReplaceState = history.replaceState
    patchCount++

    history.pushState = function (...args) {
        originalPushState!.apply(this, args)
        pushStateEventManager.notify()
    }

    history.replaceState = function (...args) {
        originalReplaceState!.apply(this, args)
        pushStateEventManager.notify()
    }

    isHistoryPatched = true

    if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.log('[react-url-params-state] History API patched')
    }
}

function unpatchHistory() {
    if (!isHistoryPatched || typeof window === 'undefined') {
        return
    }

    patchCount--

    if (patchCount <= 0 && originalPushState && originalReplaceState) {
        history.pushState = originalPushState
        history.replaceState = originalReplaceState
        originalPushState = null
        originalReplaceState = null
        isHistoryPatched = false
        patchCount = 0

        if (process.env.NODE_ENV === 'development') {
            // eslint-disable-next-line no-console
            console.log('[react-url-params-state] History API restored')
        }
    }
}

function applyUrl(newUrl: string, mode: HistoryMode = 'replace'): void {
    if (typeof window === 'undefined') {
        return
    }

    const fn = mode === 'push' ? 'pushState' : 'replaceState'
    window.history[fn]({}, '', newUrl)
    pushStateEventManager.notify()
}

export function useQueryParams<T extends QueryparamConfig>(
    config: T,
    options: UseQueryParamsOptions<T> = {},
): [QueryParamResult<T>, (patch: Partial<QueryParamResult<T>>, mode?: HistoryMode) => void] {
    const {
        sortKeys = false,
        defaultHistory = 'replace',
        defaultValues = {} as DefaultValues<T>,
        validation = {} as ValidationConfig<T>,
        customSerializers = {} as CustomSerializers<T>,
        onError,
    } = options

    const getParams = useCallback((): QueryParamResult<T> => {
        const sp = getSearchParams()
        const out = {} as QueryParamResult<T>

        for (const key of typedKeys(config)) {
            const type = config[key]
            const keyStr = String(key)
            const customParser = customSerializers[key]?.parse

            if (type === 'string[]') {
                const values = sp.getAll(keyStr)
                out[key] = (
                    values.length ? values : (defaultValues[key] as string[]) || []
                ) as QueryParamResult<T>[typeof key]
            } else if (type === 'object') {
                const parsed = v.parseObject(sp.get(keyStr))
                out[key] = (parsed ?? defaultValues[key]) as QueryParamResult<T>[typeof key]
            } else {
                const parsed = v.parseSingle(
                    sp.get(keyStr),
                    type as SingleType,
                    customParser as ((value: string) => string | number | boolean | Date | undefined) | undefined,
                    onError,
                    keyStr,
                )
                out[key] = (parsed ?? defaultValues[key]) as QueryParamResult<T>[typeof key]
            }

            const validator = validation[key]
            if (validator && out[key] != null && !validator(out[key] as QueryparamTypeMap[T[typeof key]])) {
                if (onError) {
                    onError(new Error(`Validation failed for ${keyStr}`), keyStr, out[key])
                }
                out[key] = defaultValues[key] as QueryParamResult<T>[typeof key]
            }
        }
        return out
    }, [config, defaultValues, validation, customSerializers, onError])

    const [params, _setParams] = useState<QueryParamResult<T>>(() => getParams())

    const setParams = useCallback((next: QueryParamResult<T>) => {
        _setParams((prev) => {
            if (shallowEqual(prev, next)) {
                return prev
            }
            const merged = { ...prev, ...next }
            if (process.env.NODE_ENV === 'development') {
                // eslint-disable-next-line no-console
                console.log('[react-url-params-state] State updated:', { prev, next, merged })
            }
            return merged
        })
    }, [])

    const syncParams = useCallback(
        (patch: Partial<QueryParamResult<T>>, mode?: HistoryMode) => {
            if (typeof window === 'undefined') {
                return
            }

            const sp = getSearchParams()
            const before = sortKeys ? toSortedQueryString(sp) : sp.toString()

            for (const key of typedKeys(patch)) {
                const type = config[key]
                const nextVal = patch[key]
                const keyStr = String(key)
                const customSerializer = customSerializers[key]?.serialize

                if (type === 'string[]') {
                    sp.delete(keyStr)
                    if (isStringArray(nextVal) && nextVal.length > 0) {
                        nextVal.forEach((value) => sp.append(keyStr, value))
                    }
                } else if (type === 'object') {
                    const serialized = v.serializeObject(nextVal)
                    if (serialized != null) {
                        sp.set(keyStr, serialized)
                    } else {
                        sp.delete(keyStr)
                    }
                } else {
                    const serialized = v.serializeSingle(
                        nextVal,
                        type as SingleType,
                        customSerializer as ((value: string | number | boolean | Date) => string) | undefined,
                        onError,
                        keyStr,
                    )
                    if (serialized != null) {
                        sp.set(keyStr, serialized)
                    } else {
                        sp.delete(keyStr)
                    }
                }
            }

            const after = sortKeys ? toSortedQueryString(sp) : sp.toString()
            if (after !== before) {
                const newUrl = window.location.pathname + (after ? `?${after}` : '') + window.location.hash
                applyUrl(newUrl, mode ?? defaultHistory)
            }
        },
        [config, customSerializers, onError, sortKeys, defaultHistory],
    )

    useEffect(() => {
        patchHistory()

        const handle = () => {
            const newParams = getParams()
            if (process.env.NODE_ENV === 'development') {
                // eslint-disable-next-line no-console
                console.log('[react-url-params-state] URL changed, updating state:', newParams)
            }
            setParams(newParams)
        }

        window.addEventListener('popstate', handle)
        pushStateEventManager.addEventListener(handle)

        return () => {
            window.removeEventListener('popstate', handle)
            pushStateEventManager.removeEventListener(handle)
            unpatchHistory()
        }
    }, [getParams, setParams])

    return [params, syncParams]
}
# react-url-params-state

A powerful React hook for synchronizing component state with URL query parameters. Keep your application state in sync with the URL automatically, supporting type safety, validation, and seamless navigation.

## Features

- ✨ **Type-Safe**: Full TypeScript support with automatic type inference
- 🔄 **Bidirectional Sync**: URL ↔ State synchronization
- 🎯 **Multiple Types**: Support for string, number, boolean, date, arrays, and objects
- 🛡️ **Validation**: Built-in validation with custom validators
- 🔧 **Customizable**: Custom serializers and history modes
- ⚡ **Performance**: Optimized with shallow comparison and memoization
- 🌐 **Universal**: Works with Next.js, React Router, and any navigation library

## Installation

```bash
npm install react-url-params-state
# or
yarn add react-url-params-state
# or
pnpm add react-url-params-state
```

## Quick Start

```tsx
import { useQueryParams } from 'react-url-params-state'

function SearchPage() {
  const [params, setParams] = useQueryParams({
    search: 'string',
    page: 'number',
    category: 'string'
  })

  return (
    <div>
      <input
        value={params.search || ''}
        onChange={(e) => setParams({ search: e.target.value })}
        placeholder="Search..."
      />

      <select
        value={params.category || ''}
        onChange={(e) => setParams({ category: e.target.value })}
      >
        <option value="">All Categories</option>
        <option value="electronics">Electronics</option>
        <option value="books">Books</option>
      </select>

      <button onClick={() => setParams({ page: (params.page || 0) + 1 })}>
        Next Page
      </button>
    </div>
  )
}
```

## Supported Types

### Basic Types
```tsx
const [params, setParams] = useQueryParams({
  name: 'string',        // ?name=john
  age: 'number',         // ?age=25
  active: 'boolean',     // ?active=true
  birthday: 'date',      // ?birthday=2023-01-01T00:00:00.000Z
})
```

### Arrays and Objects
```tsx
const [params, setParams] = useQueryParams({
  tags: 'string[]',      // ?tags=react&tags=typescript
  filters: 'object',     // ?filters=%7B%22status%22%3A%22active%22%7D
})
```

## Configuration Options

### Default Values
```tsx
const [params, setParams] = useQueryParams(
  {
    page: 'number',
    sort: 'string'
  },
  {
    defaultValues: {
      page: 1,
      sort: 'name'
    }
  }
)
```

**Default Values Behavior:**
- Default values are automatically synced to the URL on initial mount
- If a parameter is not present in the URL, its default value will be added
- This ensures complete URL-state synchronization and better bookmarking support

### Validation
```tsx
const [params, setParams] = useQueryParams(
  {
    page: 'number',
    email: 'string'
  },
  {
    validation: {
      page: (value) => value > 0,
      email: (value) => value.includes('@')
    },
    validationFailureMode: 'remove', // 'keep' | 'remove' | 'useDefault'
    onError: (error, key, value) => {
      console.warn(`Validation failed for ${key}:`, error.message)
    }
  }
)
```

**Validation Failure Modes:**
- `'keep'` - Keep invalid values in URL (original behavior)
- `'remove'` - Remove invalid values from URL (default)
- `'useDefault'` - Replace invalid values with default values in URL

### Custom Serializers
```tsx
const [params, setParams] = useQueryParams(
  {
    coordinates: 'string'
  },
  {
    customSerializers: {
      coordinates: {
        serialize: (value: {lat: number, lng: number}) => `${value.lat},${value.lng}`,
        parse: (value: string) => {
          const [lat, lng] = value.split(',').map(Number)
          return { lat, lng }
        }
      }
    }
  }
)
```

### History Mode
```tsx
const [params, setParams] = useQueryParams(
  { search: 'string' },
  { defaultHistory: 'push' } // or 'replace'
)

// Or per update
setParams({ search: 'new search' }, 'push')
```

## Advanced Usage

### Sorting Query Parameters
```tsx
const [params, setParams] = useQueryParams(
  { b: 'string', a: 'string' },
  { sortKeys: true } // URL will be ?a=value&b=value
)
```

### Error Handling
```tsx
const [params, setParams] = useQueryParams(
  { count: 'number' },
  {
    onError: (error, key, value) => {
      // Handle parsing or validation errors
      console.error(`Error with ${key}:`, error.message)
      // Could show user notification, fallback value, etc.
    }
  }
)
```

## TypeScript Support

The library provides full type safety:

```tsx
const [params, setParams] = useQueryParams({
  page: 'number',
  active: 'boolean',
  tags: 'string[]'
})

// ✅ TypeScript knows the exact types
params.page    // number | undefined
params.active  // boolean | undefined
params.tags    // string[] | undefined

// ✅ Type-safe updates
setParams({ page: 2 })              // ✅ OK
setParams({ page: 'invalid' })      // ❌ TypeScript error
setParams({ nonExistent: 'value' }) // ❌ TypeScript error
```

## Browser Compatibility

- ✅ Modern browsers (Chrome, Firefox, Safari, Edge)
- ✅ React 16.8+ (hooks support required)
- ✅ Next.js (App Router and Pages Router)
- ✅ React Router
- ✅ Any client-side navigation library

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT © jujuclub
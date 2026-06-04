---
description: "Use when creating or modifying React components in GymFlow. Covers component structure, hooks, styling with Tailwind, and client/server boundaries."
applyTo: "src/components/**"
---

# React Component Guidelines for GymFlow

## Component Structure

### File Naming
- **PascalCase** for component files: `MemberForm.tsx`, `AttendanceCard.tsx`
- **Colocate styles**: Use Tailwind classes directly in the component
- **Export default**: One component per file

### Basic Component Template

```typescript
'use client'

import { useState } from 'react'

export default function ComponentName() {
  const [state, setState] = useState('')

  return (
    <div className="p-4">
      {/* Component JSX */}
    </div>
  )
}
```

## Client vs Server Components

### Use `'use client'` When:
- Component uses React hooks (useState, useEffect, etc.)
- Component handles user events (onClick, onChange, etc.)
- Component accesses browser APIs (localStorage, window, etc.)
- Component uses context (useContext)

### Keep as Server Components When:
- Component only renders static content
- Component fetches data directly
- Component needs to keep secrets (API keys)—use sparingly, prefer API routes

Example:

```typescript
// Server component (no 'use client' directive)
export default async function MemberList() {
  const members = await getMembersFromDB()
  
  return (
    <div>
      {members.map(member => (
        <MemberCard key={member.id} member={member} />
      ))}
    </div>
  )
}

// Client component
'use client'

import MemberCard from './MemberCard'

export default function MemberList({ members }) {
  const [filter, setFilter] = useState('')
  
  return (
    <div>
      {members.filter(m => m.name.includes(filter)).map(member => (
        <MemberCard key={member.id} member={member} />
      ))}
    </div>
  )
}
```

## Styling with Tailwind

### Utility Classes
Always use Tailwind utility classes—never inline styles:

```typescript
// ✅ Good
<button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
  Click me
</button>

// ❌ Avoid
<button style={{ padding: '8px 16px', backgroundColor: '#2563eb' }}>
  Click me
</button>
```

### Common Layout Patterns

```typescript
// Flex row
<div className="flex gap-4">
  <div>Item 1</div>
  <div>Item 2</div>
</div>

// Flex column
<div className="flex flex-col gap-4">
  <div>Item 1</div>
  <div>Item 2</div>
</div>

// Grid
<div className="grid grid-cols-3 gap-4">
  {items.map(item => <div key={item.id}>{item.name}</div>)}
</div>

// Centered content
<div className="flex items-center justify-center h-screen">
  <div>Centered content</div>
</div>
```

### Spacing & Sizing
- **Padding/Margin**: `p-4`, `m-2`, `px-4`, `py-2`, `gap-4`
- **Width**: `w-full`, `w-1/2`, `w-96`
- **Height**: `h-full`, `h-screen`, `h-12`
- **Rounded corners**: `rounded`, `rounded-lg`, `rounded-full`

## React Hooks

### useState
```typescript
const [count, setCount] = useState(0)

return (
  <button onClick={() => setCount(count + 1)}>
    Count: {count}
  </button>
)
```

### useEffect
```typescript
useEffect(() => {
  // Run once on mount
  fetchData()
}, [])

useEffect(() => {
  // Run when dependency changes
  updateUI(selectedMember)
}, [selectedMember])
```

### useCallback
```typescript
const handleSubmit = useCallback((formData) => {
  // Only recreate function if dependencies change
  submitForm(formData)
}, [dependency])
```

## Form Components

Standard pattern for form handling:

```typescript
'use client'

import { useState } from 'react'

export default function MemberForm() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: ''
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (!response.ok) throw new Error('Failed to create member')

      const { data } = await response.json()
      // Handle success (redirect, show message, etc)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-md mx-auto">
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">Name</label>
        <input
          type="text"
          name="name"
          value={formData.name}
          onChange={handleChange}
          required
          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">{error}</div>}

      <button
        type="submit"
        disabled={loading}
        className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Submitting...' : 'Submit'}
      </button>
    </form>
  )
}
```

## Props & TypeScript

Always type your props:

```typescript
interface MemberCardProps {
  memberId: string
  name: string
  email: string
  status: 'active' | 'inactive'
  onDelete?: (id: string) => void
}

export default function MemberCard({ 
  memberId, 
  name, 
  email, 
  status,
  onDelete 
}: MemberCardProps) {
  return (
    <div className="p-4 border rounded-lg">
      <h3 className="font-bold">{name}</h3>
      <p className="text-gray-600">{email}</p>
      <span className={`px-2 py-1 rounded text-sm ${status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
        {status}
      </span>
      {onDelete && (
        <button onClick={() => onDelete(memberId)} className="mt-2 text-red-600">
          Delete
        </button>
      )}
    </div>
  )
}
```

## Performance

- **Use lazy loading** for large lists with `virtualization` or pagination
- **Memoize expensive components** with `React.memo` if they receive unchanged props
- **Use useCallback** to prevent unnecessary re-renders of child components

## Testing

Test components in development:

```bash
# Start dev server
npm run dev

# Navigate to component's page and test interactions
# Verify state changes
# Check console for errors
```

For advanced testing, use the test utilities in `tests/` folder.

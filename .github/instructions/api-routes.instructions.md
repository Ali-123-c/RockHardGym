---
description: "Use when writing or modifying Next.js API routes for GymFlow. Covers request/response patterns, error handling, Supabase integration, and validation."
applyTo: "src/app/api/**"
---

# API Route Guidelines for GymFlow

## Structure & Naming

All API routes follow this pattern:
```
src/app/api/[feature]/[action]/route.ts
```

Examples:
- `src/app/api/members/read/route.ts` – GET members
- `src/app/api/members/[id]/route.ts` – GET, PUT, DELETE single member
- `src/app/api/attendance/mark/route.ts` – POST attendance record
- `src/app/api/fingerprint/scan/route.ts` – POST fingerprint scan

## Standard Response Shape

Always return consistent JSON structure:

```typescript
// Success response
{ data: T, message?: string }

// Error response
{ error: string, message?: string }
```

With appropriate HTTP status codes:
- **200** – OK (GET, PUT success)
- **201** – Created (POST success)
- **400** – Bad Request (validation failed)
- **404** – Not Found
- **500** – Server Error

## Request Validation Template

```typescript
// Validate request body
const body = await request.json()

if (!body.name || typeof body.name !== 'string') {
  return Response.json(
    { error: 'Validation failed', message: 'name is required and must be a string' },
    { status: 400 }
  )
}

// Use parsed, safe data
const { name } = body
```

## Supabase Integration Template

```typescript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Use service role for admin ops
)

export async function GET(request: Request) {
  try {
    const { data, error } = await supabase
      .from('members')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error

    return Response.json({ data })
  } catch (error) {
    console.error('Failed to fetch members:', error)
    return Response.json(
      { error: 'Failed to fetch members' },
      { status: 500 }
    )
  }
}
```

## Error Handling

Always wrap operations in try-catch:

```typescript
try {
  // Database operation or validation
  const result = await supabase.from('table').select('*')
  
  if (result.error) throw result.error
  
  return Response.json({ data: result.data })
} catch (error) {
  const message = error instanceof Error ? error.message : 'Unknown error'
  console.error('Operation failed:', message)
  
  return Response.json(
    { error: 'Operation failed', message },
    { status: 500 }
  )
}
```

## Common Operations

### GET with Filtering
```typescript
const { data, error } = await supabase
  .from('members')
  .select('*')
  .eq('status', 'active')
  .order('name', { ascending: true })
```

### POST (Create)
```typescript
const { data, error } = await supabase
  .from('members')
  .insert([{ name, email, phone }])
  .select()
```

### PUT (Update)
```typescript
const { data, error } = await supabase
  .from('members')
  .update({ name, email })
  .eq('id', id)
  .select()
```

### DELETE
```typescript
const { data, error } = await supabase
  .from('members')
  .delete()
  .eq('id', id)
```

## Security

- **Never expose `SUPABASE_SERVICE_ROLE_KEY` to client**—use in server routes only
- Use `NEXT_PUBLIC_SUPABASE_ANON_KEY` for client-side queries with RLS policies
- Always validate input on the server
- Log errors for debugging but don't leak details to client
- Configure Supabase RLS policies for table-level security

## Response Headers

Include appropriate headers:

```typescript
const response = Response.json({ data })
response.headers.set('Content-Type', 'application/json')
response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate')
return response
```

## Testing

Test API routes with:

```bash
# GET
curl http://localhost:3000/api/members

# POST
curl -X POST http://localhost:3000/api/members \
  -H "Content-Type: application/json" \
  -d '{"name":"John","email":"john@example.com"}'

# PUT
curl -X PUT http://localhost:3000/api/members/1 \
  -H "Content-Type: application/json" \
  -d '{"name":"John Updated"}'

# DELETE
curl -X DELETE http://localhost:3000/api/members/1
```

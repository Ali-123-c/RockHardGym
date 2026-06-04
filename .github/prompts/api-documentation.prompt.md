---
description: "Generate API endpoint documentation for GymFlow. Use when creating or updating REST API documentation with request/response examples."
agent: "agent"
---

Generate API documentation for the provided endpoint:

## Documentation Format

For each endpoint, include:

### 1. Endpoint Summary
- **Method & Path**: `POST /api/members`
- **Description**: One line explaining what it does
- **Authentication**: Required or optional
- **Authorization**: Which roles can access

### 2. Request
- **Headers**: Content-Type, Authorization, etc.
- **Query Parameters** (if any)
- **Request Body**: JSON schema with types
- **Validation Rules**: What fields are required, constraints

### 3. Response
- **Success Response** (200, 201): Example JSON with all fields
- **Error Responses** (400, 404, 500): Example error objects
- **Status Codes**: All possible status codes with meanings

### 4. Examples
- **cURL example**: Complete command with data
- **JavaScript/Fetch example**: TypeScript code using fetch
- **Python example**: Using requests library

### 5. Notes
- Side effects (database changes, logs created)
- Rate limiting info (if applicable)
- Related endpoints
- Deprecated warnings (if applicable)

## Template

```markdown
## POST /api/members

Create a new member in the gym database.

**Authentication**: Required (service role key)
**Authorization**: Admin only

### Request

**Headers**
\`\`\`
Content-Type: application/json
Authorization: Bearer YOUR_SERVICE_ROLE_KEY
\`\`\`

**Body**
\`\`\`json
{
  "name": "string",
  "email": "string (email format)",
  "phone": "string",
  "membership_type": "string"
}
\`\`\`

### Response

**Success (201)**
\`\`\`json
{
  "data": {
    "id": "uuid",
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "555-1234",
    "membership_type": "premium",
    "created_at": "2026-06-02T12:00:00Z"
  }
}
\`\`\`

**Error (400)**
\`\`\`json
{
  "error": "Validation failed",
  "message": "email must be a valid email address"
}
\`\`\`

### Examples

**cURL**
\`\`\`bash
curl -X POST http://localhost:3000/api/members \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "555-1234",
    "membership_type": "premium"
  }'
\`\`\`
```

Generate complete, production-ready documentation that developers can use immediately.

---
name: component-generation
description: "Generate React components with TypeScript, Tailwind styling, and proper structure. Use when creating new UI components, forms, cards, or layout elements for GymFlow."
---

# Component Generation Skill

Generate production-ready React components following GymFlow patterns.

## When to Use

- Creating new UI components (buttons, cards, modals)
- Building form components with validation
- Creating layout components for pages
- Generating data display components (tables, lists, cards)
- Building interactive components with hooks

## Procedure

### 1. Describe the Component

Provide:
- Component name (e.g., "MemberCard", "AttendanceForm")
- Props it should accept
- Visual appearance (layout, styling)
- Interactions (clicks, submissions, etc.)

Example prompt:
```
Create a MemberCard component that displays:
- Member name, email, phone
- Active/inactive status badge
- Edit and Delete buttons
- Accept props: member (object), onEdit, onDelete callbacks
```

### 2. Generate Component

The generated component will:
- Include TypeScript interfaces for props
- Use `'use client'` for interactive components
- Apply Tailwind CSS utility classes
- Follow GymFlow naming conventions
- Include form components with proper event handling

### 3. Integration

1. Save to `src/components/[ComponentName].tsx`
2. Import into parent components
3. Pass required props
4. Test in dev server

## Common Component Patterns

### Display Component (No State)

```typescript
interface MemberCardProps {
  member: Member
  onEdit?: (id: string) => void
}

export default function MemberCard({ member, onEdit }: MemberCardProps) {
  return (
    <div className="p-4 border rounded-lg">
      <h3>{member.name}</h3>
      {onEdit && <button onClick={() => onEdit(member.id)}>Edit</button>}
    </div>
  )
}
```

### Form Component (With State)

```typescript
'use client'

import { useState } from 'react'

export default function MemberForm() {
  const [formData, setFormData] = useState({ name: '', email: '' })
  
  const handleSubmit = async (e) => {
    e.preventDefault()
    // Submit logic
  }
  
  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
    </form>
  )
}
```

### List/Grid Component

```typescript
interface ListProps {
  items: Item[]
  renderItem: (item: Item) => React.ReactNode
}

export default function List({ items, renderItem }: ListProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {items.map(item => (
        <div key={item.id}>{renderItem(item)}</div>
      ))}
    </div>
  )
}
```

## Output Format

After describing your component, type:
```
/component-generation

[Component description]
```

The skill will generate:
- Complete `.tsx` file with full implementation
- TypeScript interfaces for all props
- Tailwind CSS styling
- Proper React hooks usage
- Error handling where appropriate

## Tips

- Be specific about styling (colors, sizes, layout)
- Mention interactions (clicks, form submissions)
- Specify if component is for display, form, or layout
- Indicate responsive design needs (mobile, tablet, desktop)
- Ask for accessibility features (labels, ARIA attributes)

## Next Steps

1. Review generated component
2. Adjust styling or props as needed
3. Add to `src/components/`
4. Test in development server
5. Update parent components to use it

# Component Documentation

This document describes the key React components in the Academic Early Warning System.

## Components

### Layout Components

#### DashboardLayout
Main layout wrapper for dashboard pages.

**Props:**
- `children`: React children
- `user`: Current user object
- `role`: User role

**Usage:**
```jsx
<DashboardLayout user={user} role="instructor">
  <PageContent />
</DashboardLayout>
```

---

#### DashboardPageHeader
Page header component with title and actions.

**Props:**
- `title`: Page title
- `subtitle`: Optional subtitle
- `actions`: Optional action buttons

**Usage:**
```jsx
<DashboardPageHeader
  title="My Classes"
  subtitle="Manage your classes and students"
  actions={<button>Add Class</button>}
/>
```

---

### UI Components

#### ErrorBoundary
Catches React errors and displays a fallback UI.

**Props:**
- `children`: React children

**Usage:**
```jsx
<ErrorBoundary>
  <App />
</ErrorBoundary>
```

---

#### ToastContainer
Displays toast notifications.

**Usage:**
```jsx
<ToastContainer />
```

**Toast Types:**
- Success (green)
- Error (red)
- Warning (amber)
- Info (blue)

---

#### Skeleton
Loading skeleton components for better perceived performance.

**Components:**
- `ClassCardSkeleton`: Class card placeholder
- `ClassListSkeleton`: List of class cards
- `TableRowSkeleton`: Table row placeholder
- `TableSkeleton`: Table with multiple rows
- `StudentCardSkeleton`: Student card placeholder
- `DashboardStatsSkeleton`: Stats cards placeholder
- `ButtonSkeleton`: Button placeholder
- `PageHeaderSkeleton`: Page header placeholder

**Usage:**
```jsx
import { ClassListSkeleton } from '../components/Skeleton'

function ClassList() {
  const { data: classes, isLoading } = useInstructorClasses(userId)
  
  if (isLoading) return <ClassListSkeleton />
  return <ClassListContent classes={classes} />
}
```

---

### Page Components

#### InstructorDashboard
Main dashboard for instructors.

**Features:**
- View all classes
- Create new classes
- Upload classlists
- Archive classes
- View student list

**State:**
- `classesList`: Array of classes
- `activeTab`: Current tab (classes/students)
- `showAddClassModal`: Modal visibility
- `archivingId`: ID of class being archived

---

#### ClassDetails
Detailed view of a single class.

**Features:**
- View class information
- View enrolled students
- Upload gradesheet
- Upload attendance
- Run predictions
- Archive class

---

#### AmuStaffDashboard
Main dashboard for AMU staff.

**Features:**
- View all referrals
- View overview statistics
- Access student details
- Generate reports

---

#### AdminDashboard
Main dashboard for administrators.

**Features:**
- View all users
- Approve/reject accounts
- View system statistics
- Access activity logs
- Configure system settings

---

### Context Providers

#### AuthProvider
Provides authentication context to the app.

**State:**
- `user`: Current user object
- `role`: User role
- `isAuthenticated`: Boolean

**Methods:**
- `login(data)`: Log in user
- `logout()`: Log out user
- `updateUser(updates)`: Update user data

**Usage:**
```jsx
const { user, login, logout } = useAuth()
```

---

#### ToastProvider
Provides toast notification context.

**Methods:**
- `success(message)`: Show success toast
- `error(message)`: Show error toast
- `warning(message)`: Show warning toast
- `info(message)`: Show info toast

**Usage:**
```jsx
const { success, error } = useToast()

try {
  await doSomething()
  success('Action completed')
} catch (err) {
  error('Action failed')
}
```

---

#### NotificationsProvider
Provides notifications context.

**State:**
- `notifications`: Array of notifications
- `unreadCount`: Number of unread notifications

**Methods:**
- `markAsRead(id)`: Mark notification as read
- `markAllAsRead()`: Mark all as read

---

### Custom Hooks

#### useInstructorClasses
Fetch instructor classes with React Query.

**Parameters:**
- `instructorId`: Instructor user ID

**Returns:**
```javascript
{
  data: classes[],
  isLoading: boolean,
  error: Error,
  refetch: Function
}
```

---

#### useClass
Fetch a single class.

**Parameters:**
- `classId`: Class ID

**Returns:**
```javascript
{
  data: class,
  isLoading: boolean,
  error: Error,
  refetch: Function
}
```

---

#### useCreateClass
Mutation to create a class.

**Usage:**
```jsx
const createClass = useCreateClass()

const handleCreate = async (classData) => {
  await createClass.mutateAsync(classData)
}
```

---

## Accessibility

All components follow WCAG 2.1 AA guidelines:

- Semantic HTML elements
- ARIA labels where needed
- Keyboard navigation support
- Focus indicators
- Color contrast (minimum 4.5:1)
- Screen reader support

## Styling

Components use Tailwind CSS utility classes. Custom theme colors are defined in `index.css`:

```css
--instructor-accent: 37 99 235;
--instructor-accent-muted: 219 234 254;
--instructor-surface: 248 250 252;
```

## Performance

- Code splitting with React.lazy()
- Memoization with React.memo()
- Caching with React Query
- Lazy loading of heavy components

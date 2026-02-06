# Super Admin Dashboard - Visual Architecture

## Dashboard Layout Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    HEADER (Fixed, Height: ~56px)                       │
│  [Menu]  Super Admin Dashboard                          [Logout Button] │
├──────────────┬──────────────────────────────────────────────────────────┤
│              │                                                          │
│   SIDEBAR    │              MAIN CONTENT AREA                          │
│   Fixed      │         (Dynamic - router-outlet)                       │
│  (250px)     │                                                          │
│              │     ┌──────────────────────────────────────────┐        │
│ ┌──────────┐ │     │                                          │        │
│ │Dashboard │ │     │  Current Page Component                 │        │
│ │          │ │     │  (Changes with navigation)              │        │
│ ├──────────┤ │     │                                          │        │
│ │Approvals │ │     │    Content scrolls here                 │        │
│ │(5)       │ │     │                                          │        │
│ ├──────────┤ │     │                                          │        │
│ │Depts     │ │     │                                          │        │
│ │          │ │     │    Sidebar & Header always visible     │        │
│ ├──────────┤ │     │                                          │        │
│ │Lock (2)  │ │     │                                          │        │
│ │          │ │     └──────────────────────────────────────────┘        │
│ ├──────────┤ │                                                          │
│ │Security  │ │                                                          │
│ │          │ │                                                          │
│ ├──────────┤ │                                                          │
│ │Analytics │ │                                                          │
│ │          │ │                                                          │
│ ├──────────┤ │                                                          │
│ │  Admin   │ │                                                          │
│ │  Menu    │ │                                                          │
│ └──────────┘ │                                                          │
└──────────────┴──────────────────────────────────────────────────────────┘

Desktop View (> 768px): Sidebar always visible
Mobile View (< 768px): Sidebar slides in from left
```

## Routing Structure

```
AppRouting
│
└─ /super-admin (SuperAdminLayoutComponent)
   │
   ├─ / (root)
   │  └─ SuperAdminDashboardPage
   │     "Dashboard overview, statistics, quick actions"
   │
   ├─ /user-approvals
   │  └─ UserApprovalsPage [Badge: 5]
   │     "Review pending user registrations"
   │
   ├─ /department-heads
   │  └─ DepartmentHeadsPage
   │     "Manage department head assignments"
   │
   ├─ /departments
   │  └─ DepartmentsPage
   │     "Create and manage departments"
   │
   ├─ /lock-accounts
   │  └─ LockAccountsPage [Badge: 2]
   │     "Lock/unlock user accounts"
   │
   ├─ /view-all-data
   │  └─ ViewAllDataPage
   │     "Bulk view all system data"
   │
   ├─ /security-rules
   │  └─ SecurityRulesPage
   │     "Configure security policies"
   │
   ├─ /events-moderation
   │  └─ EventsModerationPage
   │     "Review and moderate events"
   │
   └─ /analytics
      └─ AnalyticsPage
         "View system analytics and reports"
```

## Component Hierarchy

```
AppComponent
│
└─ RouterOutlet
   │
   └─ SuperAdminLayoutComponent (Parent Layout)
      │
      ├─ ion-header
      │  ├─ Menu Button (Mobile only)
      │  ├─ Title
      │  └─ Logout Button
      │
      ├─ div.layout-container
      │  │
      │  ├─ aside.sidebar (Fixed)
      │  │  │
      │  │  ├─ .sidebar-header
      │  │  │  └─ "Admin Menu"
      │  │  │
      │  │  ├─ nav.sidebar-nav
      │  │  │  └─ a.nav-item (repeated for each menu item)
      │  │  │     ├─ ion-icon
      │  │  │     ├─ span (label)
      │  │  │     └─ span.nav-badge (optional)
      │  │  │
      │  │  └─ .sidebar-footer
      │  │     └─ .admin-info
      │  │
      │  └─ main.main-content (Flex: 1)
      │     │
      │     └─ RouterOutlet
      │        │
      │        └─ Child Page Component
      │           ├─ .page-header
      │           ├─ .page-content
      │           ├─ .page-actions
      │           └─ ... specific content ...
      │
      └─ div.sidebar-overlay (Mobile only)
```

## Data Flow Diagram

```
User Interaction
│
├─ Click Menu Item
│  │
│  └─ (click)="closeMobileMenu()" triggers
│     │
│     └─ [routerLink]="item.path" navigates
│        │
│        └─ Angular Router matches route
│           │
│           └─ Child route component resolves
│              │
│              └─ Component loads in router-outlet
│                 │
│                 └─ Page renders
│                    │
│                    └─ routerLinkActive="active"
│                       applies to nav-item
│                       │
│                       └─ CSS .active class highlights menu
│
└─ Browser Back/Forward Button
   │
   └─ Angular Router handles navigation
      │
      └─ Component changes in router-outlet
         (Sidebar stays visible)
```

## State Management Flow

```
┌─────────────────────────────────────────────────────────┐
│           SuperAdminLayoutComponent State               │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  menuOpen: boolean = false                              │
│  ├─ Toggles menu visibility on mobile                  │
│  ├─ Updated by toggleMenu()                            │
│  └─ Watched by HTML with [class.open]                 │
│                                                         │
│  menuItems: MenuItem[] = [ ... ]                        │
│  ├─ Static menu definition                             │
│  ├─ Can be updated from services                       │
│  └─ Rendered in template with *ngFor                   │
│                                                         │
│  Router: Angular Router (injected)                      │
│  ├─ Provides current URL via router.url                │
│  ├─ Used by isActive() to highlight menu              │
│  └─ Used by navigateTo() for programmatic nav         │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## Navigation Pattern

```
Template Layer
│
├─ routerLink binding
│  │
│  ├─ [routerLink]="item.path"
│  │  └─ Navigates to path
│  │
│  ├─ routerLinkActive="active"
│  │  └─ Adds .active class when route matches
│  │
│  └─ [routerLinkActiveOptions]="{ exact: false }"
│     └─ Partial URL match (not exact)
│
Component Layer
│
├─ isActive(path) method
│  └─ Checked if router.url includes path
│
├─ closeMobileMenu() method
│  ├─ Checks window width
│  └─ Sets menuOpen = false if mobile
│
└─ Router events
   └─ Automatically handled by routerLinkActive
```

## Responsive Design Breakpoints

```
┌────────────────────────────────────────────────────────┐
│                    DESKTOP (≥768px)                    │
├─────────────┬──────────────────────────────────────────┤
│             │                                          │
│  SIDEBAR    │        MAIN CONTENT AREA                │
│  VISIBLE    │                                          │
│  (250px)    │        - No menu button                 │
│             │        - Full width content              │
│             │        - Sidebar always visible          │
└─────────────┴──────────────────────────────────────────┘

┌────────────────────────────────────────────────────────┐
│                    MOBILE (<768px)                     │
├────────────────────────────────────────────────────────┤
│ [Menu]       MAIN CONTENT AREA                         │
│              (Full width when sidebar closed)           │
├─────────────────────────────────────────────────────────┤
│                                                        │
│  SIDEBAR                                               │
│  (Slides in)                  [Overlay behind]        │
│  ┌──────────────┐                                     │
│  │ Menu Items   │                                     │
│  │              │                                     │
│  └──────────────┘                                     │
└────────────────────────────────────────────────────────┘
```

## Menu Item Structure

```
├─ Icon (Ionicons)
│  └─ 18px size, color: #6b7280
│     Hover: changes to #148245
│     Active: changes to #0f6138
│
├─ Label (Text)
│  └─ Font size: 14px, weight: 500
│     Normal: #1f2937
│     Hover: no change
│     Active: weight 600, color: #0f6138
│
└─ Badge (Optional Notification Counter)
   └─ Types: warning, danger, success
      Size: 20px height, min 20px width
      Position: right side of menu item
      Background: colored based on type
      Text: white, centered
```

## CSS Class Structure

```
.layout-container
├─ .sidebar
│  ├─ .sidebar-header
│  │  ├─ .logo-section
│  │  └─ .close-icon
│  │
│  ├─ .sidebar-nav
│  │  └─ .nav-item (with .active state)
│  │     ├─ .nav-icon
│  │     ├─ .nav-label
│  │     └─ .nav-badge (.badge-warning, .badge-danger, .badge-success)
│  │
│  └─ .sidebar-footer
│     └─ .admin-info
│        ├─ .admin-avatar
│        └─ .admin-details
│
└─ .main-content
   └─ .content-wrapper
      └─ router-outlet (child component renders here)

.sidebar-overlay (mobile only)
└─ Semi-transparent background
```

## Event Flow Diagram

```
User Action                 Handler                 Result
───────────────────────────────────────────────────────────

Click Menu Item      →  routerLink evaluates   →  Router navigates
                        closeMobileMenu()          Content changes
                        
Router navigates     →  RouterOutlet detects  →  Child component
                        route change              loads in outlet
                        
Route changes        →  routerLinkActive      →  .active class
                        evaluates                 applied to:
                        isActive() checks        - selected nav item
                                                 - CSS styles it
                        
Window resize        →  CSS media query       →  Layout adjusts:
(<768px)               @media (max-width)        - sidebar hidden
                                                 - menu button shows
                        
Click overlay        →  (click)="closeMobileMenu()" →  Menu closes
(mobile)                window.innerWidth check        menuOpen = false
                                                       

Browser back        →  Angular Router        →  Previous route
button                 handles navigation        Component changes
                       routerLinkActive         .active updates
                       updates
```

## Active State Detection

```
User navigates to: /super-admin/user-approvals
│
└─ Router matches child route
   │
   └─ routerLinkActive="active" evaluates
      │
      └─ Checks if current URL includes item.path
         │
         ├─ YES → Add .active class to nav-item
         │        Apply .active CSS styling:
         │        - Background: green gradient
         │        - Border-left: 4px solid green
         │        - Text: bold, darker color
         │        - Icon: darker color
         │
         └─ NO → Remove .active class
                  Use default nav-item styling
```

## Mobile Menu Animation

```
Default State (menuOpen = false)
│
├─ DOM: .sidebar { transform: translateX(-100%) }
│
├─ Display: Sidebar is offscreen to the left
│
└─ Overlay: display: none

User clicks menu button (toggleMenu())
│
├─ menuOpen = true
│
├─ [class.open]="menuOpen" triggers
│
└─ CSS: .sidebar.open { transform: translateX(0) }
   │
   └─ Sidebar slides in from left (smooth transition)
      Overlay appears with fade-in animation

User clicks menu item or overlay (closeMobileMenu())
│
├─ menuOpen = false (on mobile only)
│
├─ CSS removes .open class
│
└─ Sidebar slides back out to left
   Overlay fades out
```

## Performance Optimization Strategy

```
Current Implementation
├─ Eager loading of all child route components
├─ Suitable for: Small to medium dashboards
└─ Page load: ~200-500ms (depends on component complexity)

Potential Optimization (Lazy Loading)
├─ Load page components on-demand
├─ Reduces initial bundle size
├─ Suitable for: Large dashboards with many pages
└─ Page load: First page ~200ms, subsequent ~50-100ms
```

## Security Architecture

```
Authentication
└─ Guard navigation with auth service
   ├─ Before entering /super-admin
   ├─ Verify user role = "super-admin"
   └─ Redirect if unauthorized

Authorization  
└─ Control menu item visibility
   ├─ Hide items based on user permissions
   ├─ Disable buttons conditionally
   └─ API guards on backend (second layer)
```

---

**Legend:**
- `[ ]` = HTML element
- `{ }` = TypeScript/logic
- `<---->` = Two-way binding
- `-->` = One-way flow
- `→` = Data/navigation flow

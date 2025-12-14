# Design Guidelines: Volleyball Recruiting Contact Tracker

## Design Approach
**System Selected**: Linear-inspired productivity design
**Rationale**: This is a utility-focused productivity tool requiring efficient data management, clear information hierarchy, and streamlined workflows. Linear's clean, modern aesthetic with excellent typography and subtle interactions perfectly suits college recruiting contact management.

## Typography
- **Primary Font**: Inter (via Google Fonts)
- **Headings**: font-semibold to font-bold, sizes from text-2xl (dashboard headers) to text-sm (table headers)
- **Body Text**: font-normal, text-sm to text-base for readability
- **Labels**: font-medium, text-xs to text-sm, slightly muted

## Layout System
**Spacing Units**: Use Tailwind units of 2, 4, 6, and 8 consistently
- Component padding: p-4 to p-6
- Section gaps: gap-4 to gap-6
- Page margins: p-6 to p-8
- Card spacing: space-y-4

**Grid Structure**:
- Dashboard: 3-column grid for metric cards (grid-cols-1 md:grid-cols-3)
- Contact list: Full-width table with responsive cards on mobile
- Forms: Single column, max-w-2xl centered

## Core Components

**Dashboard**:
- Metric cards showing: Total Coaches, Pending Reminders, Recent Contacts, This Month's Outreach
- Upcoming reminders list with due dates
- Recent activity timeline
- Quick actions: "Add Coach", "Send Email", "Set Reminder"

**Contact Management**:
- Searchable/filterable contact table with columns: Name, School, Position, Last Contact, Next Follow-up, Status
- Row actions: View Details, Send Email, Log Contact, Set Reminder
- Status badges (Contacted, Awaiting Response, Follow-up Needed, Not Contacted)

**Email Composer**:
- Template selector dropdown
- Recipient list with checkboxes for batch selection
- Template preview with highlighted merge fields ({{coach_name}}, {{school}}, {{salutation}})
- Split view: Recipients list (left) | Email preview (right)
- Gmail connection status indicator

**Contact Detail Page**:
- Header: Coach name, school, position, contact info
- Tabs: Overview, Contact History, Reminders, Notes
- Timeline of all interactions with dates and types
- Quick action buttons for common tasks

**Forms**:
- Clean input fields with labels
- Inline validation feedback
- Date pickers for reminders
- Dropdown for contact method selection
- Rich text area for notes

**Navigation**:
- Top navigation bar with: Dashboard, Coaches, Templates, Reminders, Settings
- User profile/settings in top-right
- Active state indicated with subtle accent

## Component Specifications

**Cards**: Rounded corners (rounded-lg), subtle shadows (shadow-sm), white/light backgrounds

**Tables**: Striped rows for readability, hover states, sortable columns, sticky headers

**Buttons**:
- Primary: Solid fills for main actions (Add Coach, Send Email)
- Secondary: Outlined for supporting actions
- Ghost: Text-only for tertiary actions

**Badges**: Rounded-full, small text, status-specific styling

**Form Inputs**: Consistent height (h-10), focus rings, placeholder text, clear labels above inputs

## Animations
Minimal and purposeful only:
- Subtle transitions on hover states (transition-colors duration-150)
- Smooth page transitions
- Loading states for email sending
- No distracting animations

## Images
**No hero image required** - this is a productivity application. Focus on clean interface design and data presentation.

## Special Features
- Empty states with helpful prompts ("Add your first coach to get started")
- Gmail connection status banner when not configured
- Template variable chips in email composer showing available merge fields
- Reminder notification badges
- Export functionality for contact lists
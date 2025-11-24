# Tech Stack & Resources

This document outlines the complete technology stack, tools, and resources used in the TaskSnap Frontend project.

## Core Framework & Language

### Next.js 14.2.5
- **Purpose**: React framework with App Router for server-side rendering, routing, and optimization
- **Why**: Provides excellent developer experience, built-in routing, API routes, and production optimizations
- **Resources**:
  - [Next.js Documentation](https://nextjs.org/docs)
  - [App Router Guide](https://nextjs.org/docs/app)
  - [Next.js Learn](https://nextjs.org/learn)

### TypeScript 5.5.3
- **Purpose**: Type-safe JavaScript with static type checking
- **Why**: Catches errors at compile time, improves developer experience, and enhances code maintainability
- **Resources**:
  - [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
  - [TypeScript Deep Dive](https://basarat.gitbook.io/typescript/)

### React 18.3.1
- **Purpose**: UI library for building component-based interfaces
- **Why**: Industry standard, excellent ecosystem, and strong community support
- **Resources**:
  - [React Documentation](https://react.dev/)
  - [React Beta Docs](https://beta.react.dev/)

---

## Styling & Design System

### Tailwind CSS 3.4.4
- **Purpose**: Utility-first CSS framework for rapid UI development
- **Why**: Enables consistent design tokens, rapid prototyping, and maintainable styles
- **Resources**:
  - [Tailwind CSS Documentation](https://tailwindcss.com/docs)
  - [Tailwind UI Components](https://tailwindui.com/)
  - [Tailwind Play](https://play.tailwindcss.com/)

### tailwindcss-animate 1.0.7
- **Purpose**: Animation utilities for Tailwind CSS
- **Why**: Provides smooth transitions and animations with minimal configuration
- **Resources**:
  - [tailwindcss-animate GitHub](https://github.com/jamiebuilds/tailwindcss-animate)

### shadcn/ui + Radix UI
- **Purpose**: Accessible, customizable component library built on Radix UI primitives
- **Why**: Provides accessible components out of the box, fully customizable, and copy-pasteable
- **Components Used**:
  - `@radix-ui/react-dialog` - Modal dialogs
  - `@radix-ui/react-dropdown-menu` - Dropdown menus
  - `@radix-ui/react-select` - Select inputs
  - `@radix-ui/react-switch` - Toggle switches
  - `@radix-ui/react-tabs` - Tab navigation
  - `@radix-ui/react-toast` - Toast notifications
  - `@radix-ui/react-avatar` - Avatar components
  - `@radix-ui/react-progress` - Progress indicators
  - `@radix-ui/react-scroll-area` - Custom scrollbars
- **Resources**:
  - [shadcn/ui Documentation](https://ui.shadcn.com/)
  - [Radix UI Documentation](https://www.radix-ui.com/)
  - [shadcn/ui Components](https://ui.shadcn.com/docs/components)

### lucide-react 0.363.0
- **Purpose**: Icon library with consistent design
- **Why**: Beautiful, consistent icons with tree-shaking support
- **Resources**:
  - [Lucide Icons](https://lucide.dev/)
  - [Icon Search](https://lucide.dev/icons/)

---

## State Management & Data Fetching

### Zustand 4.5.2
- **Purpose**: Lightweight state management for client-side state (auth, UI flags)
- **Why**: Simple API, minimal boilerplate, and excellent TypeScript support
- **Use Cases**: Authentication state, UI state (sidebar open/closed, theme)
- **Resources**:
  - [Zustand Documentation](https://zustand-demo.pmnd.rs/)
  - [Zustand GitHub](https://github.com/pmndrs/zustand)

### TanStack Query (React Query) 5.28.4
- **Purpose**: Server state management, data fetching, caching, and synchronization
- **Why**: Handles caching, refetching, optimistic updates, and loading/error states automatically
- **Use Cases**: API data fetching, client data, task data, email data
- **Resources**:
  - [TanStack Query Documentation](https://tanstack.com/query/latest)
  - [TanStack Query Tutorial](https://tanstack.com/query/latest/docs/react/overview)

---

## Forms & Validation

### React Hook Form 7.51.3
- **Purpose**: Performant form library with minimal re-renders
- **Why**: Excellent performance, simple API, and great TypeScript support
- **Resources**:
  - [React Hook Form Documentation](https://react-hook-form.com/)
  - [React Hook Form Examples](https://react-hook-form.com/get-started)

### Zod 3.23.8
- **Purpose**: TypeScript-first schema validation library
- **Why**: Type-safe validation, excellent error messages, and seamless integration with React Hook Form
- **Resources**:
  - [Zod Documentation](https://zod.dev/)
  - [Zod GitHub](https://github.com/colinhacks/zod)

---

## UI Interactions & Accessibility

### @dnd-kit 6.1.0
- **Purpose**: Modern drag and drop library for React
- **Packages**:
  - `@dnd-kit/core` - Core drag and drop functionality
  - `@dnd-kit/sortable` - Sortable list components
  - `@dnd-kit/utilities` - Helper utilities
- **Why**: Accessible, performant, and keyboard-friendly drag and drop
- **Use Cases**: Kanban board task management
- **Resources**:
  - [dnd-kit Documentation](https://docs.dndkit.com/)
  - [dnd-kit Examples](https://docs.dndkit.com/examples)

### react-resizable-panels 2.0.15
- **Purpose**: Resizable panel components
- **Why**: Provides flexible layout with resizable panels
- **Resources**:
  - [react-resizable-panels GitHub](https://github.com/bvaughn/react-resizable-panels)

---

## HTTP Client & API

### Axios 1.7.2
- **Purpose**: Promise-based HTTP client for API requests
- **Why**: Interceptors, request/response transformation, and better error handling than fetch
- **Resources**:
  - [Axios Documentation](https://axios-http.com/docs/intro)

### MSW (Mock Service Worker) 2.3.1
- **Purpose**: API mocking for development and testing
- **Why**: Intercepts network requests at the service worker level, works in both browser and Node.js
- **Use Cases**: Mock API responses during development, test API interactions
- **Resources**:
  - [MSW Documentation](https://mswjs.io/)
  - [MSW GitHub](https://github.com/mswjs/msw)

---

## Testing

### Vitest 1.6.0
- **Purpose**: Fast unit test framework powered by Vite
- **Why**: Fast, compatible with Jest API, excellent TypeScript support, and built-in watch mode
- **Resources**:
  - [Vitest Documentation](https://vitest.dev/)
  - [Vitest Guide](https://vitest.dev/guide/)

### React Testing Library 16.0.0
- **Purpose**: Simple and complete testing utilities for React components
- **Why**: Encourages testing user behavior rather than implementation details
- **Resources**:
  - [React Testing Library Documentation](https://testing-library.com/react)
  - [Testing Library Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

### @testing-library/jest-dom 6.4.2
- **Purpose**: Custom Jest matchers for DOM elements
- **Why**: Provides helpful assertions for testing DOM elements
- **Resources**:
  - [jest-dom Documentation](https://github.com/testing-library/jest-dom)

### @testing-library/user-event 14.5.2
- **Purpose**: Simulate user interactions in tests
- **Why**: More realistic user interaction simulation than fireEvent
- **Resources**:
  - [user-event Documentation](https://testing-library.com/docs/user-event/intro)

---

## Component Documentation

### Storybook 8.0.0
- **Purpose**: Component development environment and documentation
- **Why**: Isolated component development, visual testing, and component documentation
- **Addons**:
  - `@storybook/addon-essentials` - Essential addons
  - `@storybook/addon-interactions` - Interaction testing
  - `@storybook/addon-links` - Navigation between stories
- **Resources**:
  - [Storybook Documentation](https://storybook.js.org/docs)
  - [Storybook Tutorial](https://storybook.js.org/tutorials/intro-to-storybook/)

---

## Utilities & Helpers

### class-variance-authority 0.7.0
- **Purpose**: Utility for creating variant-based component APIs
- **Why**: Type-safe component variants (e.g., button sizes, colors)
- **Resources**:
  - [CVA GitHub](https://github.com/joe-bell/cva)

### clsx 2.1.1
- **Purpose**: Utility for constructing className strings conditionally
- **Why**: Clean conditional class name handling
- **Resources**:
  - [clsx GitHub](https://github.com/lukeed/clsx)

### tailwind-merge 2.4.0
- **Purpose**: Merge Tailwind CSS classes without style conflicts
- **Why**: Intelligently merges conflicting Tailwind classes
- **Resources**:
  - [tailwind-merge GitHub](https://github.com/dcastil/tailwind-merge)

---

## Build Tools & Configuration

### PostCSS 8.4.38
- **Purpose**: CSS transformation tool
- **Why**: Processes Tailwind CSS and applies autoprefixer
- **Resources**:
  - [PostCSS Documentation](https://postcss.org/)

### Autoprefixer 10.4.19
- **Purpose**: Automatically adds vendor prefixes to CSS
- **Why**: Ensures cross-browser compatibility
- **Resources**:
  - [Autoprefixer GitHub](https://github.com/postcss/autoprefixer)

### ESLint 8.57.0
- **Purpose**: JavaScript/TypeScript linter
- **Why**: Catches bugs and enforces code quality
- **Configuration**: `eslint-config-next` for Next.js-specific rules
- **Resources**:
  - [ESLint Documentation](https://eslint.org/docs/latest/)
  - [Next.js ESLint Config](https://nextjs.org/docs/app/building-your-application/configuring/eslint)

---

## Development Tools

### Node.js 18+
- **Purpose**: JavaScript runtime environment
- **Why**: Required for running Next.js and build tools
- **Resources**:
  - [Node.js Documentation](https://nodejs.org/docs)

### npm / yarn
- **Purpose**: Package managers
- **Why**: Install and manage project dependencies
- **Resources**:
  - [npm Documentation](https://docs.npmjs.com/)
  - [Yarn Documentation](https://yarnpkg.com/getting-started)

---

## Project-Specific Tools

### Feature Flags
- **Location**: `src/config/featureFlags.ts`
- **Purpose**: Control feature visibility via environment variables
- **Usage**: `FEATURE_FLAGS=kanban,email_integration`

### Analytics
- **Location**: `src/lib/analytics.ts`
- **Purpose**: Analytics event tracking wrapper
- **Usage**: Centralized analytics tracking for user events

### API Client
- **Location**: `src/lib/api/client.ts`
- **Purpose**: Configured Axios instance with interceptors
- **Usage**: Centralized API request handling

---

## Design & Development Resources

### Design System
- **Location**: `docs/design-system.md` (to be created)
- **Contents**: Color palette, typography, spacing, components

### UI Specifications
- **Location**: `docs/ui-specs/` (to be created)
- **Contents**: Component specifications, layouts, responsive breakpoints

### Component Stories
- **Location**: `src/components/**/*.stories.tsx`
- **Purpose**: Storybook stories for all components
- **States**: Default, loading, empty, error, mobile viewport

---

## Best Practices & Guidelines

### Code Style
- TypeScript strict mode enabled
- ESLint with Next.js config
- Consistent component structure (primitives → domain)

### Accessibility
- ARIA labels on all interactive elements
- Keyboard navigation support
- Screen reader compatibility
- Color contrast compliance (WCAG AA)

### Responsive Design
- Mobile-first approach
- Breakpoints: mobile (<768px), tablet (768-1024px), desktop (>1024px)
- Touch-friendly interactions on mobile

### Testing Strategy
- Unit tests for components
- Integration tests for critical flows
- Accessibility tests with jest-axe
- Visual regression testing via Storybook

### Performance
- Code splitting with Next.js
- Image optimization
- Lazy loading for components
- Optimistic updates with TanStack Query

---

## Additional Resources

### Learning Resources
- [Next.js Learn Course](https://nextjs.org/learn)
- [React Patterns](https://reactpatterns.com/)
- [TypeScript Deep Dive](https://basarat.gitbook.io/typescript/)
- [Web.dev Accessibility](https://web.dev/accessible/)

### Community
- [Next.js Discord](https://nextjs.org/discord)
- [React Community](https://react.dev/community)
- [Stack Overflow](https://stackoverflow.com/questions/tagged/next.js)

### Design Inspiration
- [Dribbble](https://dribbble.com/)
- [Behance](https://www.behance.net/)
- [Mobbin](https://mobbin.com/) - Mobile design patterns

---

## Version Information

All package versions are locked in `package.json`. To update dependencies:

```bash
npm update
```

For major version updates, review breaking changes in respective documentation.

---

*Last updated: Based on package.json versions as of project initialization*




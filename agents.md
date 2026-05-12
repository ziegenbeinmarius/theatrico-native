# Theatrico Native — Agent Handbook

iOS React Native app that delivers real-time script prompts to performers on stage, operated remotely by a stage manager.

## Tech Stack

| Layer         | Technology                        | Version  |
|---------------|-----------------------------------|----------|
| Runtime       | Expo (managed workflow)           | ~52.x    |
| Navigation    | Expo Router (file-based routing)  | ~4.x     |
| Styling       | NativeWind (Tailwind CSS)         | ^4.x     |
| Language      | TypeScript                        | ^5.3     |
| Safe Areas    | react-native-safe-area-context    | 4.12.x   |
| Linting       | ESLint (eslint-config-expo)       | ^8.x     |
| Formatting    | Prettier                          | ^3.x     |

## Directory Structure

```
theatrico-native/
├── app/                        # Expo Router screens (file-based routing)
│   ├── _layout.tsx             # Root layout — SafeAreaProvider + Stack navigator
│   ├── index.tsx               # Home / join session screen
│   ├── operator/
│   │   └── index.tsx           # Operator dashboard (session management)
│   └── session/
│       └── [code].tsx          # Prompter view for a specific session code
├── src/
│   ├── components/             # Shared UI components
│   ├── hooks/                  # Custom React hooks
│   ├── services/               # External service integrations (API, WebSocket, etc.)
│   ├── domain/                 # Domain models, types, and business logic
│   └── lib/                   # Pure utilities and helpers
├── assets/                     # Static images and fonts
├── app.config.ts               # Dynamic Expo configuration
├── tailwind.config.js          # Tailwind config — brand colors, content paths
├── global.css                  # Tailwind directives — imported once in _layout.tsx
├── metro.config.js             # Metro config — withNativeWind wrapper
├── nativewind-env.d.ts         # TypeScript types for NativeWind className prop
├── tsconfig.json               # TypeScript — strict mode, @/* → src/* aliases
├── babel.config.js             # Babel — babel-preset-expo + nativewind/babel
├── .eslintrc.js                # ESLint config
├── .prettierrc                 # Prettier config
└── agents.md                   # This file
```

## Path Aliases

Import from `src/` using the `@/` alias:

```ts
import { MyComponent } from '@/components/MyComponent';
import { useSession } from '@/hooks/useSession';
```

## Styling with NativeWind

Use `className` props instead of `StyleSheet.create`. Custom brand colors are defined in `tailwind.config.js` under `theme.extend.colors.app`:

| Token           | Hex       | Usage                        |
|-----------------|-----------|------------------------------|
| `app-dark`      | `#1a1a2e` | Primary screen background    |
| `app-darker`    | `#0a0a1a` | Prompter/session background  |
| `app-card`      | `#16213e` | Card/panel background        |
| `app-input`     | `#0f3460` | Input field background       |
| `app-accent`    | `#e94560` | CTA buttons                  |
| `app-text`      | `#e0e0ff` | Primary text                 |
| `app-muted`     | `#8888bb` | Secondary/subtitle text      |
| `app-label`     | `#aaaacc` | Form labels                  |
| `app-tertiary`  | `#6666aa` | De-emphasised links          |
| `app-subtle`    | `#555577` | Background labels/codes      |

Dynamic values (e.g. `insets.top` from `useSafeAreaInsets`) cannot be expressed as static Tailwind classes — pass those via the `style` prop alongside `className`.

## Architecture Principles

### Clean Architecture
- **domain/** — pure business rules, no framework imports, easily unit-tested
- **services/** — I/O boundary: network calls, WebSocket connections, storage
- **hooks/** — bridge between services/domain and React components
- **components/** — presentational only; receive data via props or hooks

### SOLID
- **S**ingle Responsibility — each module has one reason to change
- **O**pen/Closed — extend via new files/interfaces, not by mutating existing modules
- **L**iskov Substitution — interfaces defined in domain/ can be swapped (e.g. mock vs real service)
- **I**nterface Segregation — keep service interfaces narrow and role-specific
- **D**ependency Inversion — components depend on hook abstractions, not concrete services

### Interface-Driven Development
Define interfaces in `src/domain/` before implementing services. This enables:
- Parallel development (UI against mocks, backend against real API)
- Easier unit testing with mock implementations
- Clean separation of concerns

## Key Files

| File                       | Purpose                                      |
|----------------------------|----------------------------------------------|
| `app/_layout.tsx`          | Root provider tree and navigation shell      |
| `app/index.tsx`            | Performer entry point — code input + join    |
| `app/operator/index.tsx`   | Operator panel — session control             |
| `app/session/[code].tsx`   | Live prompter view, driven by `code` param   |
| `app.config.ts`            | Bundle ID, scheme, Expo plugin config        |
| `tsconfig.json`            | Path aliases and strict TypeScript settings  |

## Development

```bash
npm install          # Install dependencies
npm start            # Start Expo dev server
npm run ios          # Run on iOS simulator
npm run lint         # Lint with ESLint
npm run typecheck    # Type-check with tsc
npm run format       # Auto-format with Prettier
```

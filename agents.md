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

## Backend / API Client

### Configuration

`src/lib/config.ts` reads `BACKEND_URL` from `expo-constants` extra config and falls back to `http://localhost:8080` for local dev.

### Domain Types (`src/domain/index.ts`)

Core TypeScript interfaces that mirror the Go backend JSON shapes:

| Type | Description |
|------|-------------|
| `Play` | Top-level script with nested `Act[]` |
| `Act` | Ordered collection of `Scene[]` |
| `Scene` | Ordered collection of `Line[]` |
| `Line` | Individual script line with character, text, and type |
| `Session` | Active prompter session with a `code`, `playId`, and `currentPosition` |
| `Position` | Pointer into the script: `{ playId, actId, sceneId, lineId }` |

WebSocket message union type `SessionMessage` covers three variants:
- `position_update` — operator moved the script cursor
- `transcript` — speech-to-text result (with `isFinal` flag)
- `error` — backend error with `code` and `message`

Service interfaces (`ITheatricoClient`, `ISessionWebSocket`, `IAudioWebSocket`) live in `src/domain/index.ts` and enable mock substitution in tests.

### REST Client (`src/services/api/theatricoClient.ts`)

`ITheatricoClient` implementation backed by native `fetch`:

| Method | Endpoint |
|--------|----------|
| `listPlays()` | `GET /api/plays` |
| `createSession(playId)` | `POST /api/sessions` |
| `getSession(code)` | `GET /api/sessions/:code` |

Throws `Error` on non-2xx responses. Exported singleton: `theatricoClient`.

### WebSocket Clients

#### `SessionWebSocket` (`src/services/api/websocket/SessionWebSocket.ts`)

Connects to `ws[s]://<backend>/api/sessions/:code/ws`. Features:
- Typed JSON message dispatch via `onMessage` / `offMessage` listeners
- Exponential backoff reconnect (up to 10 attempts, max 30 s)
- `connect()` / `disconnect()` lifecycle control

Factory: `createSessionWebSocket(code)` or `sessionWebSocketFactory(code)`.

#### `AudioWebSocket` (`src/services/api/websocket/AudioWebSocket.ts`)

Sends raw binary audio to `ws[s]://<backend>/api/sessions/:code/audio`. Features:
- Binary (`arraybuffer`) mode
- Queues `sendAudioChunk(buffer)` calls while reconnecting; flushes on re-open
- Same exponential backoff as `SessionWebSocket`

Factory: `createAudioWebSocket(code)`.

### React Query (`src/lib/queryClient.ts`)

Singleton `QueryClient` with `retry: 2` and `staleTime: 30 s`. Wrapped around the app in `app/_layout.tsx` via `<QueryClientProvider>`.

### Hooks

| Hook | Query key | Description |
|------|-----------|-------------|
| `usePlays()` | `['plays']` | Fetches all plays |
| `useSession(code)` | `['sessions', code]` | Fetches a single session; skips when `code` is empty |

Both hooks return the full React Query result object (`data`, `isLoading`, `error`, etc.).

## Speech Recognition

The speech recognition layer follows the strategy pattern: a common `ISpeechRecognizer` interface with two pluggable implementations, switchable at runtime without interrupting the session.

### Core types (`src/services/speech/ISpeechRecognizer.ts`)

| Type | Description |
|------|-------------|
| `RecognizeOptions` | `{ language?: string; contextHint?: string }` passed to `start()` |
| `RecognitionResult` | `{ text: string; isFinal: boolean; confidence?: number }` emitted by `onResult` |
| `ISpeechRecognizer` | Contract interface (see below) |

```ts
interface ISpeechRecognizer {
  readonly type: 'whisper' | 'native';
  start(options: RecognizeOptions): Promise<void>;
  stop(): Promise<void>;
  onResult(cb: (result: RecognitionResult) => void): () => void;  // returns unsubscribe
  onError(cb: (err: Error) => void): () => void;                  // returns unsubscribe
}
```

### WhisperRecognizer (`src/services/speech/WhisperRecognizer.ts`)

On-device transcription via `@mybigday/whisper.rn` (whisper.cpp bindings):

- **Model loading** — accepts `modelPath` (local file) or `modelUrl` (downloads to `FileSystem.cacheDirectory`). Supports a `onProgress` callback for download progress. Skips re-download when the file already exists.
- **Audio capture** — uses `expo-av` (`Audio.Recording`) at 16 kHz mono PCM. Each recording chunk is `CHUNK_DURATION_MS` (2 s) long and overlaps with the next by `OVERLAP_MS` (500 ms).
- **Transcription** — each chunk's `.wav` file is fed to `whisperCtx.transcribe()`. Results are emitted as partial (`isFinal: false`) results. The recognizer does **not** emit a final result automatically; callers should call `stop()` when done.
- **Native deps** are lazy-required at runtime so the class can be imported in Jest/web without crashing.

### NativeRecognizer (`src/services/speech/NativeRecognizer.ts`)

Wraps the `NativeSpeech` Expo module (see `modules/native-speech/`) which talks to Apple's `SFSpeechRecognizer`:

- Calls `requestPermissionsAsync()` before starting (throws if denied).
- Subscribes to `onResult` / `onError` events from `NativeSpeechEmitter`.
- Cleans up listeners on `stop()`.
- Native module is lazy-required for web/test compat.

### NativeSpeech Expo Module (`modules/native-speech/`)

| File | Purpose |
|------|---------|
| `index.ts` | Public re-exports |
| `src/NativeSpeechModule.ts` | `requireNativeModule` binding + `EventEmitter` |
| `ios/NativeSpeechModule.swift` | Swift implementation |

**Swift implementation** (`NativeSpeechModule.swift`):
- Uses `SFSpeechAudioBufferRecognitionRequest` with `shouldReportPartialResults = true`.
- Optionally injects `contextualStrings` from `contextHint` to improve domain accuracy.
- Installs an `AVAudioEngine` tap on the input node and feeds buffers directly to the recognition request — zero-copy streaming.
- **60s session limit** — Apple enforces ~60 s per recognition task. The module uses a `Timer` firing every 50 s to swap out the recognition request and start a fresh task while the audio engine keeps running, providing seamless continuation.
- Emits `onResult` events with `{ text, isFinal, confidence }` and `onError` events with `{ code, message }`.

### SpeechRecognizerFactory (`src/services/speech/SpeechRecognizerFactory.ts`)

```ts
createSpeechRecognizer(type: 'whisper' | 'native'): ISpeechRecognizer
```

Returns the appropriate concrete implementation. Add new implementations here when extending the strategy.

### SpeechRecognizerContext (`src/context/SpeechRecognizerContext.tsx`)

React context that holds the active recognizer instance and handles runtime hot-swapping:

- Default impl on mount: `native`.
- On first render, reads `@theatrico/speech_recognizer_type` from `AsyncStorage` and switches if a previous selection exists.
- `switchRecognizer(type)` persists the choice to AsyncStorage and replaces the recognizer in state. Any component holding a ref to the old recognizer should call `stop()` first.

Wrap the app (or a subtree) with `<SpeechRecognizerProvider>`:

```tsx
// app/_layout.tsx
<SpeechRecognizerProvider>
  <Stack />
</SpeechRecognizerProvider>
```

### useSpeechRecognizer hook (`src/hooks/useSpeechRecognizer.ts`)

```ts
const { recognizer, switchRecognizer } = useSpeechRecognizer();
```

Convenience wrapper around `useSpeechRecognizerContext`. Throws if used outside `SpeechRecognizerProvider`.

### Unit tests (`src/__tests__/services/speech/ISpeechRecognizer.test.ts`)

Contract tests verify the `ISpeechRecognizer` interface against both mock implementations (whisper + native). They test:
- `type` discriminant value
- `start()` / `stop()` lifecycle
- `onResult` / `onError` subscribe + unsubscribe
- Multiple simultaneous listeners
- Optional `confidence` in `RecognitionResult`

Run with: `npm test`

## Operator Screen (Sprint 4)

### Overview

The operator console (`app/operator/index.tsx`) gives stage managers full session control. It receives a `code` URL param (set by the home screen after `POST /api/sessions`).

### Data Flow

```
expo-av (Audio.Recording)
        │ raw audio chunks (base64 → ArrayBuffer)
        ▼
AudioWebSocket  ──────────────────►  backend /api/sessions/:code/audio

ISpeechRecognizer (NativeRecognizer | WhisperRecognizer)
        │ RecognitionResult { text, isFinal }
        ▼
useOperatorSession.transcriptItems  ──►  TranscriptLog component

SessionWebSocket  ◄──────────────────  backend /api/sessions/:code/ws
        │ position_update | transcript | error
        ▼
useOperatorSession.currentPosition  ──►  ScriptPositionCard component
```

### useOperatorSession hook (`src/hooks/useOperatorSession.ts`)

Central orchestration hook. Accepts a `sessionCode` string and returns:

| Field | Type | Description |
|-------|------|-------------|
| `session` | `Session \| undefined` | Fetched via React Query |
| `play` | `Play \| null` | Play data for the session's playId |
| `isLoading` | `boolean` | True while session/play queries are pending |
| `isRecording` | `boolean` | True while mic is active |
| `transcriptItems` | `TranscriptItem[]` | Merged local + server transcript |
| `currentPosition` | `Position \| null` | Current script cursor |
| `wsDisconnected` | `boolean` | True after `error` WS message |
| `error` | `Error \| null` | Session load error |
| `startRecording()` | `() => Promise<void>` | Requests mic permission, starts recognizer + audio capture |
| `stopRecording()` | `() => Promise<void>` | Stops recognizer + audio capture |
| `togglePause()` | `() => Promise<void>` | PATCH session status active↔paused |
| `movePrev()` | `() => Promise<void>` | PATCH position to previous line |
| `moveNext()` | `() => Promise<void>` | PATCH position to next line |

Audio capture uses a chunked stop/restart loop (`CHUNK_DURATION_MS = 3000`). Each chunk is base64-decoded and sent via `audioWsRef.current.sendAudioChunk()`. The `ISpeechRecognizer` (from `SpeechRecognizerContext`) runs in parallel for local transcript display.

**Transcript merging**: Partial results replace the last partial entry; final results are appended. This applies to both local recognizer results and server `transcript` WebSocket messages.

### Components

| Component | File | Props | Purpose |
|-----------|------|-------|---------|
| `RecognizerToggle` | `src/components/RecognizerToggle.tsx` | `value`, `onChange`, `disabled` | Segmented control; disables Native on non-iOS |
| `TranscriptLog` | `src/components/TranscriptLog.tsx` | `items: TranscriptItem[]` | Auto-scrolling FlatList; partial=gray, final=white |
| `ScriptPositionCard` | `src/components/ScriptPositionCard.tsx` | `play`, `position` | Current act/scene/line + next-line preview |

### scriptUtils (`src/lib/scriptUtils.ts`)

Pure helpers shared by the hook (navigation) and ScriptPositionCard (display):

```ts
flattenLines(play: Play): FlatLine[]       // ordered array of all lines across acts/scenes
findLineIndex(lines: FlatLine[], lineId: string): number
```

`FlatLine` carries `{ position, line, actTitle, sceneTitle, act, scene }`.

### Home Screen Updates (Sprint 4)

`app/index.tsx` now serves both roles:
- **Operator** — scrollable play list (via `usePlays`), "Create Session →" button calls `POST /api/sessions`, navigates to `/operator?code=XYZ`
- **Audience** — enter session code, "Join Session" navigates to `/session/:code`

### Permission Handling

`startRecording()` in `useOperatorSession` calls `Audio.requestPermissionsAsync()` before touching the microphone. If permission is denied it throws `'Microphone permission denied'`; the operator screen catches this and shows an `Alert`. The `NativeRecognizer` also independently calls `NativeSpeech.requestPermissionsAsync()` (iOS `SFSpeechRecognizer` requires a separate speech recognition permission).

### Provider Tree

`app/_layout.tsx` now wraps the app in `<SpeechRecognizerProvider>` (Sprint 4 addition, outside the `<Stack>` so all screens share one recognizer instance):

```
QueryClientProvider
  SafeAreaProvider
    SpeechRecognizerProvider   ← Sprint 4
      Stack
```

### New REST Endpoints Used

| Method | Path | Purpose |
|--------|------|---------|
| `PATCH` | `/api/sessions/:code` | Toggle pause (`{ status: 'paused' | 'active' }`) |
| `PATCH` | `/api/sessions/:code/position` | Move cursor (`Position` body) |

Both are implemented in `theatricoClient.ts` as `updateStatus()` and `updatePosition()`, and declared on `ITheatricoClient` in `src/domain/index.ts`.

## Development

```bash
npm install          # Install dependencies
npm start            # Start Expo dev server
npm run ios          # Run on iOS simulator
npm run lint         # Lint with ESLint
npm run typecheck    # Type-check with tsc
npm run format       # Auto-format with Prettier
npm test             # Run Jest unit tests
```

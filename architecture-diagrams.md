# Pulse Dash - Architecture Diagrams

## 1. System Architecture Overview

```mermaid
graph TB
    subgraph Client["Game Client (React + Canvas)"]
        UI[UI Layer<br/>React Components]
        GameEngine[Game Engine<br/>Physics & Logic]
        ReplaySystem[Replay System]
        StatsTracker[Stats Tracker<br/>%, Attempts, Stars]
    end

    subgraph Backend["Supabase Backend"]
        Auth[Supabase Auth<br/>Email + Password]
        DB[(Supabase Database)]
    end

    subgraph External["External Services"]
        AI[OpenRouter API<br/>AI Trash-Talk]
    end

    Player((Player)) --> UI
    UI --> GameEngine
    GameEngine --> StatsTracker
    GameEngine --> ReplaySystem

    UI <--> Auth
    StatsTracker <--> DB
    ReplaySystem <--> DB

    GameEngine -.->|On Death<br/>Optional| AI
    AI -.->|Trash-Talk| UI

    Auth --> DB

    style Client fill:#e1f5ff
    style Backend fill:#fff4e1
    style External fill:#ffe1f5
```

## 2. Database Schema Relationships

```mermaid
erDiagram
    profiles ||--o{ progress : "has"
    profiles ||--o{ attempts : "has"
    profiles ||--o{ replays : "saves"
    levels ||--o{ progress : "tracks"
    levels ||--o{ attempts : "counts"
    levels ||--o{ replays : "records"

    profiles {
        UUID id PK
        TEXT username
        INTEGER total_stars
        BOOLEAN ai_trash_talk_enabled
        TIMESTAMP created_at
    }

    levels {
        UUID id PK
        TEXT name
        TEXT difficulty
        INTEGER stars
        BOOLEAN is_main_level
        JSON level_data
    }

    progress {
        UUID id PK
        UUID user_id FK
        UUID level_id FK
        BOOLEAN completed
        INTEGER best_percent
        TIMESTAMP completed_at
    }

    attempts {
        UUID id PK
        UUID user_id FK
        UUID level_id FK
        INTEGER attempt_count
        TIMESTAMP updated_at
    }

    replays {
        UUID id PK
        UUID user_id FK
        UUID level_id FK
        JSON input_data
        INTEGER fps
        TIMESTAMP created_at
    }
```

## 3. Gameplay Flow - Attempt & Death Cycle

```mermaid
sequenceDiagram
    actor Player
    participant UI as Game UI
    participant Engine as Game Engine
    participant Stats as Stats Tracker
    participant DB as Supabase DB
    participant AI as OpenRouter API

    Player->>UI: Start Level
    UI->>Engine: Initialize Game
    Engine->>DB: Increment Attempt Counter
    activate DB
    DB-->>Engine: Counter Updated
    deactivate DB

    Engine->>Engine: Run Physics Loop
    Engine->>Stats: Update Current %

    alt Player Dies
        Engine->>Stats: Calculate Final %
        Stats->>Stats: Compare with Best %

        alt New Personal Best
            Stats->>DB: Update best_percent
            activate DB
            DB-->>Stats: % Saved
            deactivate DB
        end

        alt AI Trash-Talk Enabled
            Engine->>AI: Request Trash-Talk
            activate AI
            AI-->>Engine: "Git gud lol"
            deactivate AI
            Engine->>UI: Show Death Screen + AI Line
        else AI Disabled
            Engine->>UI: Show Death Screen
        end

        UI->>Player: Display Stats
    end
```

## 4. Level Completion & Star Award Flow

```mermaid
flowchart TD
    Start([Player Reaches 100%]) --> CheckType{Is Main Level?}

    CheckType -->|No| UpdateProgress[Update Progress<br/>completed = true<br/>best_percent = 100]
    CheckType -->|Yes| CheckCompleted{Already<br/>Completed?}

    CheckCompleted -->|Yes| UpdateProgress
    CheckCompleted -->|No| AwardStars[Award Stars to Profile<br/>total_stars += level.stars]

    AwardStars --> UpdateProgress
    UpdateProgress --> SaveTimestamp[Set completed_at = NOW]
    SaveTimestamp --> UpdateLeaderboard[Leaderboard Auto-Updates]
    UpdateLeaderboard --> ShowCompletion[Display Completion Screen]
    ShowCompletion --> End([End])

    style Start fill:#90EE90
    style AwardStars fill:#FFD700
    style ShowCompletion fill:#87CEEB
    style End fill:#90EE90
```

## 5. Level Select Info Button Flow

```mermaid
sequenceDiagram
    actor Player
    participant LevelSelect as Level Select Screen
    participant DB as Supabase DB
    participant Modal as Info Modal

    Player->>LevelSelect: Click Info Button
    LevelSelect->>DB: Query Progress & Attempts

    Note over DB: SELECT best_percent,<br/>attempt_count, completed<br/>WHERE user_id = ? AND level_id = ?

    activate DB
    DB-->>LevelSelect: Return Stats
    deactivate DB

    LevelSelect->>Modal: Display Data

    Note over Modal: Shows:<br/>✓ Best % Reached<br/>✓ Total Attempts<br/>✓ Completion Status<br/>✓ Stars Available

    Modal-->>Player: Stats Displayed
```

## 6. User Journey - Main Navigation Flow

```mermaid
stateDiagram-v2
    [*] --> Login: Open Game
    Login --> MainMenu: Authenticate

    MainMenu --> LevelSelect: Play
    MainMenu --> Profile: View Profile
    MainMenu --> Settings: Configure
    MainMenu --> Leaderboard: Rankings

    LevelSelect --> GamePlay: Select Level
    LevelSelect --> LevelInfo: Info Button
    LevelInfo --> LevelSelect: Close

    GamePlay --> PauseMenu: Pause
    GamePlay --> DeathScreen: Die
    GamePlay --> CompletionScreen: Win

    PauseMenu --> GamePlay: Resume
    PauseMenu --> LevelSelect: Quit

    DeathScreen --> GamePlay: Retry
    DeathScreen --> LevelSelect: Quit

    CompletionScreen --> LevelSelect: Continue

    Profile --> MainMenu: Back
    Settings --> MainMenu: Back
    Leaderboard --> MainMenu: Back

    note right of DeathScreen
        Shows:
        - Current %
        - Best %
        - Attempts
        - AI Trash-Talk (if enabled)
    end note

    note right of CompletionScreen
        Shows:
        - Stars Earned
        - Total Attempts
        - Updated Leaderboard Position
    end note
```

## 7. Data Security - RLS Policy Structure

```mermaid
flowchart LR
    subgraph Public["Public Data (No Auth Required)"]
        P1[Level List]
        P2[Level Difficulty]
        P3[Leaderboard<br/>usernames + stars]
    end

    subgraph Private["Private Data (User-Scoped RLS)"]
        R1[Best %]
        R2[Attempts]
        R3[Completion Status]
        R4[AI Settings]
        R5[Saved Replays]
    end

    subgraph RLS["Row Level Security Policies"]
        RLS1[Users can only<br/>SELECT own data]
        RLS2[Users can only<br/>UPDATE own data]
        RLS3[best_percent can<br/>only INCREASE]
        RLS4[Stars awarded<br/>once per level]
    end

    Private --> RLS

    User((Authenticated<br/>User)) --> Private
    Anyone((Anyone)) --> Public

    style Public fill:#90EE90
    style Private fill:#FFB6C1
    style RLS fill:#FFD700
```

## 8. Percentage Tracking System

```mermaid
flowchart TD
    Start([Game Loop Running]) --> CalcDist[Calculate Player Distance]
    CalcDist --> CalcPercent[Calculate %<br/>distance / level_length * 100]
    CalcPercent --> UpdateUI[Update UI Display]

    UpdateUI --> CheckDeath{Player<br/>Died?}

    CheckDeath -->|No| Start
    CheckDeath -->|Yes| GetBest[Fetch best_percent<br/>from DB]

    GetBest --> Compare{current %<br/>> best %?}

    Compare -->|Yes| UpdateDB[UPDATE progress<br/>SET best_percent =<br/>GREATEST(best_percent, current)]
    Compare -->|No| SkipUpdate[No DB Update Needed]

    UpdateDB --> ShowDeath[Show Death Screen<br/>with Stats]
    SkipUpdate --> ShowDeath

    ShowDeath --> End([End Attempt])

    style Start fill:#87CEEB
    style UpdateDB fill:#FFD700
    style ShowDeath fill:#FFB6C1
    style End fill:#FF6B6B
```

## 9. AI Trash-Talk Integration

```mermaid
sequenceDiagram
    participant Engine as Game Engine
    participant Settings as User Settings
    participant Cache as Local Cache
    participant AI as OpenRouter API
    participant UI as Death Screen

    Engine->>Settings: Check ai_trash_talk_enabled

    alt AI Disabled
        Settings-->>Engine: false
        Engine->>UI: Show Standard Death Message
    else AI Enabled
        Settings-->>Engine: true
        Engine->>Cache: Check Recent Trash-Talk

        alt Cache Hit (< 30s old)
            Cache-->>Engine: Cached Message
            Engine->>UI: Display Cached Trash-Talk
        else Cache Miss
            Engine->>AI: POST /chat/completions
            Note over Engine,AI: Prompt: "Player died at X%<br/>on difficulty Y.<br/>Short sarcastic comment."

            activate AI
            AI-->>Engine: "Maybe try jumping next time?"
            deactivate AI

            Engine->>Cache: Store Message
            Engine->>UI: Display AI Trash-Talk
        end
    end
```

## 10. Replay System Architecture

```mermaid
flowchart TB
    subgraph Recording["Replay Recording"]
        R1[Input Listener] --> R2[Timestamp Inputs]
        R2 --> R3[Store in Memory Array]
        R3 --> R4{Save<br/>Replay?}
        R4 -->|Yes| R5[Compress Data]
        R4 -->|No| R6[Discard]
        R5 --> R7[(Save to DB)]
    end

    subgraph Playback["Replay Playback"]
        P1[(Load from DB)] --> P2[Decompress Data]
        P2 --> P3[Create Virtual Input Stream]
        P3 --> P4[Run Deterministic Physics]
        P4 --> P5[Render Replay]
    end

    R7 -.->|User Selects Replay| P1

    subgraph DataStructure["Replay Data Structure"]
        D1["JSON Array:<br/>[{frame: 120, input: 'jump'},<br/>{frame: 145, input: 'release'},<br/>...]"]
    end

    R3 --> DataStructure
    DataStructure --> P3

    style Recording fill:#E1F5FF
    style Playback fill:#FFE1F5
    style DataStructure fill:#FFFACD
```

---

## Quick Reference: Key Data Operations

### Attempt Increment (Every Game Start)
```sql
INSERT INTO attempts (user_id, level_id, attempt_count)
VALUES (:user_id, :level_id, 1)
ON CONFLICT (user_id, level_id)
DO UPDATE SET attempt_count = attempts.attempt_count + 1
```

### Best Percentage Update (On Death if Higher)
```sql
UPDATE progress
SET best_percent = GREATEST(best_percent, :current_percent)
WHERE user_id = :user_id AND level_id = :level_id
```

### Level Completion + Star Award (100% First Time)
```sql
-- Transaction Start
UPDATE progress SET completed = true, best_percent = 100, completed_at = NOW();
UPDATE profiles SET total_stars = total_stars + :stars WHERE id = :user_id;
-- Transaction End
```

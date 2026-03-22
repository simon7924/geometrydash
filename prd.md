📄 Product Requirements Document (PRD)
Project Name

(Working Title): Pulse Dash
(Geometry Dash–inspired rhythm platformer)

Student Name

Simon

Date

February 2026

1. Overview
1.1 Product Summary

This project is a Geometry Dash–inspired 2D rhythm-based platformer where players attempt to complete a sequence of levels using precise timing and fast reaction skills.

The goal of the game is not to earn a score, but to progress by completing levels. Each level has a fixed difficulty, fixed speed segments, and deterministic physics. Players retry levels until completion, with the game tracking attempts and progress.

The game includes:

Account-based progress saving

Per-level attempt tracking

Best percentage tracking per level

A global star-based leaderboard

A replay system

A humorous AI-generated death message feature (optional, user-controlled)

2. Goals & Non-Goals
2.1 Goals

Replicate Geometry Dash–style gameplay and physics

Provide persistent player progress across sessions

Encourage mastery through retries, not scoring

Add light AI flavor without affecting gameplay fairness

Maintain simple, readable backend architecture

2.2 Non-Goals

No dynamic difficulty adjustment

No AI-generated or AI-modified levels

No gradual speed scaling

No competitive real-time multiplayer

No traditional scoring system

3. Target Audience

Players familiar with Geometry Dash or rhythm platformers

Casual to hardcore players who enjoy retry-based progression

Students / developers interested in clean game architecture

4. Core Gameplay
4.1 Player Objective

Complete all main levels

Each completed main level awards stars

Stars contribute to a global leaderboard

4.2 Movement & Physics

The game replicates Geometry Dash-style physics:

Horizontal movement is constant

Vertical movement is controlled via input (jump / gravity flip)

Physics are deterministic (same input → same result)

No randomness in gameplay physics

Speed Rules

Player speed never gradually increases

Speed changes only occur when the player hits a speed portal

Speed is fixed per segment of the level

4.3 Game Modes

The game supports standard Geometry Dash–style modes:

Cube

Ship

Ball

UFO

Wave

Spider

Each mode has:

Fixed physics

Mode-specific gravity or input behavior

Deterministic movement

5. Level Design
5.1 Level Types

Main Levels

Award stars on completion

Required for leaderboard progression

Practice / Optional Levels

No stars

Used for learning mechanics

5.2 Difficulty

Each level has:

A fixed difficulty rating (e.g. Easy, Normal, Hard, Insane)

Fixed obstacles

Fixed speed segments

Difficulty does not adapt or change.

6. Progress Tracking
6.1 Attempts

Every time a player starts a level, their attempt count increases

Attempts are tracked per level

Attempts are saved to the player’s account

A small info button on each level allows the player to view:

Attempt count

Best percentage reached

6.2 Best Percentage

The game tracks the highest percentage reached per level

Updated on every death if progress exceeds previous best

Stored persistently

6.3 Completion

When a level is completed:

completed = true

best_percent = 100

Stars are awarded (if it is a main level)

7. Replay System
7.1 Purpose

The replay system allows players to:

Review a full attempt after death or completion

Analyze mistakes

View hitboxes during replay

7.2 How Replays Work

Replays are not video files

The game records:

Input events

Timing data

Replays are reconstructed deterministically

7.3 Replay Lifecycle

Replay data exists only in memory

If the player:

Restarts

Leaves the level

Starts a new attempt
→ Replay data is automatically deleted

Replays are not saved permanently by default

8. AI Feature (Optional)
8.1 Description

An optional AI feature provides funny trash-talk lines when the player dies.

Examples:

“That spike read you like a book.”

“Confidence was high. Survival was not.”

8.2 Rules

AI does not affect gameplay

AI does not change levels

AI does not assist the player

Purely cosmetic / humorous

8.3 User Control

The feature is disabled by default

Users can enable/disable it in Settings

Preference is saved to the user’s account

9. Leaderboard System
9.1 Stars

Each completed main level awards a fixed number of stars

Stars are added to the player’s total

9.2 Leaderboard

Global leaderboard shows:

Username

Total stars

Displays Top 10 players

Read-only and publicly visible

10. User Accounts & Authentication
10.1 Authentication

Email/password authentication via Supabase Auth

Each user has a unique account

10.2 Profile Creation

When a user signs up:

A profile is automatically created using a database trigger

Username defaults to Player_<id> if none is provided

11. Backend Architecture
11.1 Database Tables (Only Two)
profiles

Stores account-level data:

Column	Type	Description
id	UUID (PK)	Matches auth.users.id
username	TEXT	Player display name
total_stars	INT	Total stars earned
ai_trash_talk_enabled	BOOLEAN	AI feature toggle
created_at	TIMESTAMPTZ	Account creation time

12.2 scores Table

Stores per-level progress per player.

Each row represents:

One player on one level

Column	Type	Description
id	UUID (PK)	Auto-generated
player_id	UUID (FK → profiles.id)	Player reference
level_id	TEXT	Level identifier
attempts	INT	Attempt counter
best_percent	INT	Highest % reached
completed	BOOLEAN	Completion status
stars_earned	INT	Stars earned for this level
updated_at	TIMESTAMPTZ	Last update time

A unique constraint ensures:

(player_id, level_id)

11.2 Security

Row Level Security (RLS) enabled

Users can only read/write their own data

Leaderboard data is publicly readable

12. Technical Stack
Frontend

HTML/CSS + Canvas or Phaser

JavaScript / TypeScript

Deterministic game loop

Backend

Supabase

Auth

PostgreSQL

RLS

AI

OpenRouter API

Used only for text generation

13. Success Criteria

The project is successful if:

Gameplay feels consistent and fair

Player progress persists across sessions

Attempts and best percentages are accurate

Leaderboard updates correctly

AI feature is optional and non-intrusive

System remains simple and understandable

14. Future Improvements (Optional)

Replay saving (opt-in)

Ghost replays

Practice checkpoints

Custom levels

Visual stat graphs

15. Summary

This project focuses on:

Clean gameplay replication

Strong data design

Deterministic systems

Optional AI flavor

Clear separation between gameplay and backend
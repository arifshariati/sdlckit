---
name: board
description: "Delivery board: status of every epic and ticket in this repo, rendered by the script at no cost. With --report, the delivery manager adds a short narrative."
category: team
version: 0.1.0
status: current
verified: 2026-10-18
claudeCodeVersion: 2.1.302
argument-hint: "[--report]"
allowed-tools: Bash, Read, Task
---
`D` = `sdlckit-delivery`. Arguments: **$ARGUMENTS**

1. Run `D board` and show its output as-is (it also writes `.delivery/BOARD.md`).
2. Only if `--report` was passed: run `D model delivery-manager`, pass its `model` and `effort`, dispatch `sdlckit-team:delivery-manager`
   (mode `status`) with the repo root, and show its summary, Blocked, Waiting-for-you and Risks
   sections after the board. Otherwise do not dispatch anything — the board is free.
3. If anything is waiting for the user, end with the exact next command (`/sdlckit-team:po`, `/sdlckit-team:refine E-###`,
   `/sdlckit-team:accept E-###`, or the blocked ticket's question).

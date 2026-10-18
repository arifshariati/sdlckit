---
name: "board"
description: "Delivery board: status of every epic and ticket in this repo, rendered by the script at no cost. With --report, the delivery manager adds a short narrative."
argument-hint: "[--report]"
allowed-tools: "Bash, Read, Task"
---
`D` = `sdlckit-delivery`. Arguments: **$ARGUMENTS**

1. Run `D board` and show its output as-is (it also writes `.delivery/BOARD.md`).
2. Only if `--report` was passed: run `D model delivery-manager`, dispatch `sdlckit-team:delivery-manager`
   (mode `status`) with the repo root, and show its summary, Blocked, Waiting-for-you and Risks
   sections after the board. Otherwise do not dispatch anything — the board is free.
3. If anything is waiting for the user, end with the exact next command (`/sdlckit-team:po`, `/sdlckit-team:refine E-###`,
   `/sdlckit-team:accept E-###`, or the blocked ticket's question).

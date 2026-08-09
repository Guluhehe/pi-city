# Pi City v0.8 — Art Pass

V0.8 is a visual-integration release. It does not add new Agent semantics.

## Problem

The v0.7 experience had the right product rhythm, but the realtime world still separated into three visible layers: a clean GLB model, sparse procedural filler, and a rectangular concept matte. That made the harbor read as a visualization rather than one continuous place.

## Changes

### 1. UV-free material weathering

Imported GLB materials are patched at shader compile time. Local-space deterministic noise adds subtle coarse/fine surface variation and vertical weathering without requiring UV authoring. Weathering strength varies by masonry, timber and metal classes. Glass remains a separate thin transparent material.

### 2. Matte/world fusion

The concept matte now uses a custom shader with side/top/bottom feathering and warm horizon haze. Wide shots can use more of the concept-art density without revealing a rectangular image plane; close shots still pull the matte back.

### 3. Atmospheric depth

Two low-opacity haze curtains and a deterministic field of distant warm practical lights create depth between realtime districts and the matte skyline.

### 4. District fabric

Low-rise utility sheds, service roofs, stacks and lit windows now occupy the gaps between the five Hero Buildings. This is intentionally cheaper geometry than the GLB assets: its job is continuity and scale, not inspection.

## Non-goals

- Branch / Compaction
- new Agent semantics
- additional dashboards
- replacing the concept matte with fake telemetry

## Validation boundary

The code, shaders, GLB manifest, runtime journey timing and static-site asset paths can be validated in the current environment. Real visual tuning still requires a normal WebGL browser; Chromium in this container cannot initialize EGL/SwiftShader.
